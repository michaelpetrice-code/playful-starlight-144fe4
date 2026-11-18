// Read-only public Coombe updates. Separate website session: no auth sign-in here.
const cfg=window.LADS_CONFIG||{};
const root=document.getElementById('view');
let records={content:[],tickets:[]},error='',last=0,loading=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const price=p=>'£'+(Number(p||0)/100).toFixed(2);
function isHome(){return !!root?.querySelector('.local45-hero')}
function html(){
 const prize=records.content.find(x=>x.kind==='prize');
 const news=records.content.filter(x=>x.kind==='news').slice(0,3);
 const events=records.content.filter(x=>x.kind==='event').slice(0,4);
 const tickets=records.tickets.slice(0,4);
 return `<div class="club-sync-title"><span>COOMBE SOCIAL CLUB</span><small>Shared club updates</small></div>`+
 (prize?`<article class="club-sync-highlight"><strong>Chase the Lady</strong><span>Current prize £${Number(prize.payload?.amount||0).toLocaleString('en-GB')}</span><p>${esc(prize.payload?.note||'')}</p></article>`:'')+
 [...news,...events].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).map(x=>`<article class="club-sync-entry"><b>${esc(x.payload?.title||'Club update')}</b><small>${x.kind==='event'?'Event':'News'}${x.payload?.date?' · '+esc(x.payload.date):''}</small><p>${esc(x.payload?.text||x.payload?.details||'')}</p>${x.payload?.image_url&&/^https:\/\//.test(x.payload.image_url)?`<img loading="lazy" src="${esc(x.payload.image_url)}" alt="Event poster">`:''}</article>`).join('')+
 (tickets.length?`<h3>Club tickets</h3>${tickets.map(t=>`<article class="club-sync-entry"><b>${esc(t.title)}</b><small>${esc(t.event_date)} · ${price(t.price_pence)}</small><p>${esc(t.description||'')}</p></article>`).join('')}`:'')+
 (!records.content.length&&!tickets.length?`<p>${error?'Shared club updates unavailable: '+esc(error):'No club updates have been published yet.'}</p>`:'')+
 `<p class="club-sync-footnote">Published by Coombe Social Club. Bookings and account access remain on the Coombe website.</p>`;
}
function draw(){if(!isHome()){document.getElementById('coombe-shared-feed')?.remove();return}let node=document.getElementById('coombe-shared-feed');if(!node){node=document.createElement('section');node.id='coombe-shared-feed';node.className='coombe-shared-feed';root.append(node)}const next=html();if(node.innerHTML!==next)node.innerHTML=next}
async function fetchUpdates(){if(loading||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;loading=true;try{
 const base=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:cfg.supabaseAnonKey};
 const [a,b]=await Promise.all([
 fetch(base+'club_content?select=kind,payload,created_at&club_slug=eq.coombe&order=created_at.desc&limit=100',{headers}),
 fetch(base+'club_tickets?select=title,description,event_date,price_pence&club_slug=eq.coombe&published=eq.true&order=event_date.asc&limit=40',{headers})
 ]);
 if(!a.ok||!b.ok)throw Error('Shared database not installed or access unavailable');
 records={content:await a.json(),tickets:await b.json()};error='';last=Date.now();draw();
 }catch(e){error=e.message;draw()}finally{loading=false}}
const observer=new MutationObserver(()=>{if(isHome()&&!document.getElementById('coombe-shared-feed'))draw()});
if(root)observer.observe(root,{childList:true});
fetchUpdates();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-last>30000)fetchUpdates()});
setInterval(()=>{if(!document.hidden)fetchUpdates()},60000);
