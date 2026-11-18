import { sharedPage, publishedShareButton, focusSharedItem } from './page-share.js?v=173';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client=null,identity=null,allowed=false,verified='',items=[];
const types={event:'Events',prize:'Prizes',notice:'Notices',date:'Important dates'};
export function mountClubAdmin(sb, user, root){
 client=sb;identity=user;allowed=Boolean(sb&&user);
 if(allowed)open(root);
}
async function fetchItems(){
 const {data,error}=await client.from('local_club_content').select('*').order('event_date',{ascending:true,nullsFirst:false}).limit(300);
 if(error)throw error;items=data||[];
}
function open(root){
 if(!allowed||!identity)return;
 let backdrop=document.getElementById('tl82-backdrop');
 if(backdrop)backdrop.remove();
 backdrop=document.createElement('div');backdrop.id='tl149-club-content';
 backdrop.innerHTML=`<section class="tl82-modal" aria-label="Club content editor">
 <div class="tl82-top"><div><small>THE LOCAL · MANAGEMENT</small><h2>⚙ Admin control panel</h2></div></div>
 <p class="tl82-muted">Manage club content and administrator email alerts.</p><div id="tl101-notification-settings" class="tl101-notification-settings"><h3>✉ Administrator notifications</h3><p>Loading secure email preferences…</p></div>
 <div class="tl82-grid"><div><label>Category<select id="tl82-kind">${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
 <label>Title<input id="tl82-title" maxlength="120" placeholder="e.g. Chase the Lady"></label>
 <label>Details<textarea id="tl82-detail" maxlength="2000" rows="3" placeholder="Information for members"></textarea></label>
 <label>Date & time<input id="tl82-date" type="datetime-local"></label>
 <label>Prize amount (£)<input id="tl82-prize" type="number" min="0" step=".01" placeholder="1000.00"></label>
 <label>Status<select id="tl82-status"><option value="published">Published</option><option value="draft">Draft</option><option value="sold_out">Sold out</option></select></label>
 <input type="hidden" id="tl82-id"><div class="tl82-actions"><button id="tl82-save">Save changes</button><button id="tl82-clear" type="button">New item</button></div></div>
 <div><h3>Current items</h3><div id="tl82-list">Loading…</div></div></div>
 <p id="tl82-message" role="status"></p></section>`;
 root.replaceChildren(backdrop);
 backdrop.querySelector('#tl82-clear').onclick=clear;
 backdrop.querySelector('#tl82-save').onclick=save;
 backdrop.querySelector('#tl82-list').onclick=async e=>{
  const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');
  if(edit){const item=items.find(i=>i.id===edit.dataset.edit);if(item)fill(item)}
  if(del){if(!confirm('Delete this item permanently?'))return;try{const {error}=await client.from('local_club_content').delete().eq('id',del.dataset.delete);if(error)throw error;await reload();message('Item deleted.')}catch(err){message(err.message,true)}}
 };
 reload();
 loadNotifications();
}
function message(s,bad=false){const el=document.getElementById('tl82-message');if(el){el.textContent=s;el.style.color=bad?'#ff9292':'#9cf3cd'}}
function val(id){return document.getElementById('tl82-'+id)?.value||''}
function clear(){['id','title','detail','date','prize'].forEach(k=>document.getElementById('tl82-'+k).value='');document.getElementById('tl82-kind').value='event';document.getElementById('tl82-status').value='published';message('Ready to create a new item.')}
function fill(i){for(const [key,v] of Object.entries({id:i.id,kind:i.kind,title:i.title,detail:i.details,date:i.event_date?.slice(0,16)||'',prize:i.prize_amount??'',status:i.status}))document.getElementById('tl82-'+key).value=v??'';message('Editing '+i.title)}
async function save(){
 if(!allowed)return;
 const title=val('title').trim();if(!title){message('Please enter a title.',true);return}
 const payload={kind:val('kind'),title,details:val('detail').trim(),event_date:val('date')?new Date(val('date')).toISOString():null,prize_amount:val('prize')===''?null:Number(val('prize')),status:val('status')};
 if(!Number.isFinite(payload.prize_amount)&&payload.prize_amount!==null){message('Invalid prize amount.',true);return}
 const button=document.getElementById('tl82-save');button.disabled=true;
 try{
  const id=val('id');const query=id?client.from('local_club_content').update(payload).eq('id',id):client.from('local_club_content').insert(payload);
  const {error}=await query;if(error)throw error;clear();await reload();message('Saved successfully. Members can now see published information.');window.dispatchEvent(new Event('tl82-content-updated'));
 }catch(err){message('Could not save: '+err.message,true)}finally{button.disabled=false}
}
async function reload(){
 const el=document.getElementById('tl82-list');if(!el)return;
 try{await fetchItems();el.innerHTML=items.map(i=>`<article class="tl82-item"><div><strong>${esc(i.title)}</strong><small>${esc(types[i.kind]||i.kind)} · ${esc(i.status)} ${i.event_date?'· '+new Date(i.event_date).toLocaleString('en-GB'):''}</small>${i.prize_amount!==null?`<span>£${Number(i.prize_amount).toLocaleString('en-GB',{minimumFractionDigits:2})}</span>`:''}</div><div><button data-edit="${i.id}">Edit</button><button data-delete="${i.id}" class="tl82-danger">Delete</button></div></article>`).join('')||'<p>No items yet. Add your first event or prize.</p>'}catch(err){el.textContent='Could not load items: '+err.message}
}
const focusedClubItems = new Set();
export async function renderClubContent(sb,section,notify,target=document.getElementById('tl82-public')){
 if(!target||!sb)return null;
 try{const {data,error}=await sb.from('local_club_content').select('id,kind,title,details,event_date,prize_amount,status').neq('status','draft').order('event_date',{ascending:true,nullsFirst:false}).limit(60);if(error)throw error;
 const filtered=(data||[]).filter(i=>section==='Events'?['event','date','prize'].includes(i.kind):['notice','prize','event'].includes(i.kind));
 target.innerHTML=filtered.length?`<h2>Club updates & prizes</h2><div class="tl82-public-grid">${filtered.map(i=>`<article data-club-item="${esc(i.id)}"><small>${esc(types[i.kind]||i.kind)}${i.status==='sold_out'?' · SOLD OUT':''}</small><h3>${esc(i.title)}</h3>${i.details?`<p>${esc(i.details)}</p>`:''}${i.event_date?`<p>📅 ${new Date(i.event_date).toLocaleString('en-GB')}</p>`:''}${i.prize_amount!==null?`<strong>Prize: £${Number(i.prize_amount).toLocaleString('en-GB',{minimumFractionDigits:2})}</strong>`:''}</article>`).join('')}</div>`:'';
 if(section==='Events'){
  const link=sharedPage();
  target.querySelectorAll('[data-club-item]').forEach(article=>{
    const item=filtered.find(row=>row.id===article.dataset.clubItem);
    if(!item)return;
    const button=publishedShareButton({page:'events',item:item.id,source:'club',title:item.title,notify});
    if(button)article.append(button);
    if(link?.source==='club'&&link.published===item.id&&!document.documentElement.classList.contains('tl-auth-locked')&&!focusedClubItems.has(item.id)){
      focusedClubItems.add(item.id);
      focusSharedItem(article);
    }
  });
 }
 return filtered.length;
 }catch(e){console.warn('Club content unavailable',e.message);target.textContent='';return null}
}

const notificationTypes=[
 ['registration','New member registrations'],['member_report','Member reports / safety'],['venue_request','Venue approval requests'],
 ['marketplace_report','Marketplace reports'],['event_review','Events awaiting approval'],['security','Account and admin security'],
 ['technical','Technical failures'],['daily_summary','Daily summary'],['weekly_summary','Weekly activity report']
];
async function loadNotifications(){
 const el=document.getElementById('tl101-notification-settings');if(!el||!allowed)return;
 try{
  const {data,error}=await client.from('local_admin_notification_settings').select('*').order('event_type');
  if(error)throw error;
  const byType=new Map((data||[]).map(x=>[x.event_type,x]));
  el.innerHTML=`<h3>✉ Administrator email notifications</h3><p>Choose which alerts are sent to your verified administrator email. Email delivery requires the server-side installation described in NOTIFICATIONS-v101-SETUP.md.</p>
  <div class="tl101-notify-grid">${notificationTypes.map(([id,title])=>{const v=byType.get(id);return `<label><input type="checkbox" data-notify="${id}" ${v?.enabled?'checked':''}> ${esc(title)}</label>`}).join('')}</div>
  <label>Standard delivery<select id="tl101-delivery"><option value="immediate">Immediately</option><option value="hourly">Hourly digest</option><option value="daily">Daily digest</option></select></label>
  <div class="tl82-actions"><button type="button" id="tl101-save-notify">Save notification settings</button><button type="button" id="tl101-view-notify">View recent alerts</button></div>
  <div id="tl101-notify-status" role="status"></div><div id="tl101-notify-history"></div>`;
  const cadence=(data||[]).find(x=>!['daily_summary','weekly_summary'].includes(x.event_type))?.cadence||'immediate';
  el.querySelector('#tl101-delivery').value=cadence;
  el.querySelector('#tl101-save-notify').onclick=async()=>{
   const btn=el.querySelector('#tl101-save-notify');btn.disabled=true;
   try{
    const payload=notificationTypes.map(([event_type])=>({event_type,enabled:!!el.querySelector(`[data-notify="${event_type}"]`).checked,cadence:['daily_summary','weekly_summary'].includes(event_type)?(event_type==='daily_summary'?'daily':'weekly'):el.querySelector('#tl101-delivery').value}));
    const {error}=await client.from('local_admin_notification_settings').upsert(payload,{onConflict:'event_type'});
    if(error)throw error;
    el.querySelector('#tl101-notify-status').textContent='Notification preferences saved.';
   }catch(e){el.querySelector('#tl101-notify-status').textContent='Unable to save: '+e.message}finally{btn.disabled=false}
  };
  el.querySelector('#tl101-view-notify').onclick=async()=>{
   const target=el.querySelector('#tl101-notify-history');target.textContent='Loading…';
   const {data,error}=await client.from('local_admin_notifications').select('event_type,subject,created_at,status').order('created_at',{ascending:false}).limit(20);
   target.innerHTML=error?`<p>${esc(error.message)}</p>`:(data||[]).map(x=>`<p><strong>${esc(x.subject)}</strong><small> · ${esc(x.event_type)} · ${esc(x.status)} · ${new Date(x.created_at).toLocaleString('en-GB')}</small></p>`).join('')||'<p>No alerts recorded yet.</p>';
  };
 }catch(e){el.innerHTML=`<h3>✉ Administrator notifications</h3><p>Notification database not installed. Run the v101 SQL migration first. ${esc(e.message)}</p>`}
}
