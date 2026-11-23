const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=s=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s||'');
export function createSocialExperience({win=window,doc=document,openPage,openTable}){
 let scope=null,revision=0,loadedAt=0,tables=[],pending=false,dock=null;
 const view=doc.getElementById('view');if(!view)return {update(){},clear(){}};
 const layout=doc.createElement('div');layout.id='social-layout';view.before(layout);
 let bar=doc.getElementById('local-page-navigation');if(!bar){bar=doc.createElement('nav');bar.id='local-page-navigation';bar.hidden=true;bar.setAttribute('aria-label','Page navigation');}layout.before(bar);
 const left=doc.createElement('aside');left.className='social-left';left.setAttribute('aria-label','Explore The Local');
 const right=doc.createElement('aside');right.className='social-right';right.setAttribute('aria-label','Your tables and plans');layout.append(left,view,right);
 const common=[
  ['Home','⌂','Home'],
  ['Venue Hub','⌖','Find a Local'],
  ['Virtual Pub Tables','♧','Virtual Tables'],
  ['Football','⚽','Football'],
  ['Pub Quiz Pro','★','Pub Quiz Pro'],
  ['The Local DJ','♫','The Local DJ'],
  ['Race Night','♞','Horse & dog racing'],
  ['Buy, Sell or Give Away','▱','Buy, Sell or Give Away'],
  ['Trades & Services','⚒','Local Tradesman'],
  ['Who’s Up for It?','▦','What’s on'],
  ['Private Chats','☏','Messages'],
  ['Arcade','♜','Games Room'],
 ];
 function bind(root){
  root.querySelectorAll('[data-social-page]').forEach(button=>{
   button.onclick=()=>{
    const page=button.dataset.socialPage;
    if(page==='Pub Quiz Pro')win.location.assign('pub-quiz-pro.html');
    else openPage(page);
   };
  });
 }
 function closeDock(){dock?.remove();dock=null;}
 function openDock(t){
  if(!win.matchMedia('(min-width:1200px)').matches){openTable(t);return;}
  closeDock();dock=doc.createElement('section');dock.className='social-chat-dock';dock.setAttribute('aria-label',t.name+' conversation');
  dock.innerHTML=`<div class="social-chat-heading"><strong>${esc(t.name)}</strong><button type="button" data-expand aria-label="Open conversation page">↗</button><button type="button" data-close aria-label="Close conversation">×</button></div><iframe title="${esc(t.name)} table chat" allow="camera 'self'; microphone 'self'; autoplay 'self'"></iframe>`;
  dock.querySelector('iframe').src='secure-tables.html?'+new URLSearchParams({table:t.id,venue:t.venue_id,embedded:'1'});
  dock.querySelector('[data-close]').onclick=closeDock;dock.querySelector('[data-expand]').onclick=()=>{closeDock();openTable(t)};doc.body.append(dock);
 }
 win.addEventListener('message',e=>{const frame=dock?.querySelector('iframe');if(!frame||e.origin!==win.location.origin||e.source!==frame.contentWindow)return;
  if(e.data?.type==='tl-table-route-clear'){closeDock();return;}
  if(e.data?.type==='tl-table-conversation')frame.contentWindow.postMessage({type:'tl-table-viewport',height:frame.getBoundingClientRect().height,compact:true},win.location.origin);
 });
 function drawRight(records){
  const now=Date.now();const events=records.filter(r=>r.kind==='event'&&r.data&&new Date(r.data.date).getTime()>=now).sort((a,b)=>new Date(a.data.date)-new Date(b.data.date)).slice(0,3);
  right.innerHTML=`<section class="social-side-card"><div class="social-side-heading"><h2>Your tables</h2><button type="button" data-social-page="Virtual Pub Tables">See all</button></div><div class="social-table-list">${tables.length?tables.slice(0,5).map((t,i)=>`<button type="button" data-social-table="${i}"><span class="social-table-avatar" aria-hidden="true">${esc(t.name?.slice(0,1)||'T')}</span><span><strong>${esc(t.name)}</strong><small>Open the conversation</small></span><span aria-hidden="true">›</span></button>`).join(''):`<p>${pending?'Loading your tables…':'Your conversations start here.'}</p><button type="button" data-social-page="Virtual Pub Tables">Find or create a table</button>`}</div></section><section class="social-side-card"><div class="social-side-heading"><h2>Coming up</h2></div>${events.length?events.map(e=>`<button class="social-event-link" data-social-page="Who’s Up for It?"><strong>${esc(e.data.title||'Community event')}</strong><small>${esc(new Date(e.data.date).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}))}</small></button>`).join(''):'<p>Find your next reason to get together.</p><button data-social-page="Who’s Up for It?">Discover events & plans</button>'}</section><section class="social-side-card social-venue-pitch"><span class="social-eyebrow">FOR VENUE OWNERS</span><h2>Your venue.<br>Your community.</h2><p>Give members one place for your news, events and conversations.</p><button data-social-page="Venue App Builder">Build your own app →</button><small>Venue subscriptions are separate.</small></section>`;
  bind(right);right.querySelectorAll('[data-social-table]').forEach(b=>b.onclick=()=>openDock(tables[Number(b.dataset.socialTable)]));
 }
 function clear(){revision++;scope=null;tables=[];loadedAt=0;pending=false;closeDock();doc.documentElement.classList.remove('social-member');left.replaceChildren();right.replaceChildren();}
 function update({user,groupId,profileName='Your profile',profileImage='',tab,admin=false,records=[],sb}){
  if(!user){clear();return;}
  const key=user.id+':'+(groupId||'');if(scope!==key){clear();scope=key;}
  doc.documentElement.classList.add('social-member');layout.classList.toggle('social-wide',['Administration','Venue App Builder','Arcade','Games','Football','Virtual Pub Tables','The Local DJ','Race Night'].includes(tab));
  if(tab==='Virtual Pub Tables')closeDock();
  left.innerHTML=`<button class="social-profile-link" data-social-page="Account">${profileImage?`<img src="${esc(profileImage)}" alt="" width="40" height="40">`:'<span class="social-table-avatar" aria-hidden="true">'+esc(profileName.slice(0,1))+'</span>'}<strong>${esc(profileName)}</strong></button><div class="social-desktop-menu" role="navigation" aria-label="Desktop navigation">${common.map(([page,icon,label])=>`<button data-social-page="${page}" ${page===tab?'aria-current="page"':''}><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}<button data-social-more>••• More features</button>${admin?'<button data-social-page="Administration">Administration</button>':''}</div><div class="social-left-footer"><button data-social-page="Venue App Builder">Build your own app →</button><small>For your venue or community</small></div>`;
  bind(left);left.querySelector('[data-social-more]').onclick=()=>{doc.getElementById('moreNav')?.click();doc.getElementById('moreSearch')?.focus()};drawRight(records);
  const header=doc.querySelector('.local-app-header');if(header&&!header.querySelector('.social-header-search')){const b=doc.createElement('button');b.className='social-header-search';b.textContent='⌕ Search The Local';b.onclick=()=>{doc.getElementById('moreNav')?.click();doc.getElementById('moreSearch')?.focus()};header.querySelector('.tl-header-logo')?.after(b);}
  if(sb&&!pending&&Date.now()-loadedAt>60000){const turn=revision;pending=true;drawRight(records);(async()=>{try{
   const membership=await sb.from('tl_table_members').select('table_id').eq('user_id',user.id).eq('status','approved').limit(30);if(membership.error)throw membership.error;
   const ids=(membership.data||[]).map(r=>r.table_id).filter(uuid);let list=[];
   if(ids.length){const result=await sb.from('tl_tables').select('id,name,venue_id').in('id',ids);if(result.error)throw result.error;list=(result.data||[]).filter(t=>uuid(t.id)&&uuid(t.venue_id));}
   if(turn!==revision)return;tables=list;loadedAt=Date.now();
  }catch{if(turn===revision){tables=[];loadedAt=Date.now();}}finally{if(turn===revision){pending=false;drawRight(records);}}})();}
 }
 return {update,clear};
}
export function installVisitorShowcase(doc,introduction,gallery){
 const shell=doc.querySelector('#tl-auth-gate .tl-auth-shell');if(!shell||doc.getElementById('social-welcome-features'))return;
 const section=doc.createElement('div');section.id='social-welcome-features';section.innerHTML=introduction+gallery;shell.append(section);
 const heading=shell.querySelector('.tl-auth-brand p');if(heading)heading.textContent='Your people. Your plans. Your Local. Free to join, full of things to discover.';
}
