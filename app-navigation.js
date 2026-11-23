export const pageRoutes={Home:'home','Local Updates':'feed','Virtual Pub Tables':'tables','Who’s Up for It?':'plans','Venue Hub':'venues','Venue Applications':'venue-applications','Venue App Builder':'venue-app-builder',Events:'events',Community:'community','Buy, Sell or Give Away':'marketplace','Trades & Services':'services',Rounds:'rounds',Photos:'photos',Football:'football','The Local DJ':'dj','Race Night':'race-night',Kitty:'kitty',Quiz:'quiz',Games:'games',Arcade:'arcade','More Games':'more-games',Tournaments:'tournaments',Leaderboard:'leaderboard',Alerts:'alerts',Install:'install',Account:'account','Report Behaviour':'report',Administration:'administration','Venue subscription':'billing','Private Chats':'messages','Create Post':'create-post'};
const aliases={'private-chats':'Private Chats',updates:'Local Updates',trades:'Trades & Services'};
export function readPageRoute(location){
 const p=new URL(location.href).searchParams,section=p.get('section');
 const page=Object.keys(pageRoutes).find(page=>pageRoutes[page]===section)||aliases[section]|| (Object.hasOwn(pageRoutes,section)?section:null);
 if(!page)return null;
 const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;const detail={};
 for(const key of ['venue','table','room'])if(uuid.test(p.get(key)||''))detail[key]=p.get(key);
 return {page,detail};
}
export function pageUrl(location,page,detail={}){
 const url=new URL(location.href);url.searchParams.set('section',pageRoutes[page]||'home');
 for(const key of ['venue','table','room'])url.searchParams.delete(key);
 for(const key of page==='Virtual Pub Tables'?['venue','table']:page==='Private Chats'?['room']:[])if(detail[key])url.searchParams.set(key,detail[key]);
 if(page!=='Virtual Pub Tables'||!detail.table)url.searchParams.delete('invite');
 if(url.hash==='#tables'||url.hash.startsWith('#page='))url.hash='';
 return url.pathname+url.search+url.hash;
}
export function captureFields(root){
 const saved=[];
 root?.querySelectorAll('input,textarea,select').forEach((field,index)=>{
  const key=field.id||field.name;
  if(!key||/password|secret|token|invite|code|card|iban|bank/i.test(key)||['password','file','hidden','checkbox','radio','submit'].includes(field.type)||field.autocomplete?.startsWith('cc-')||field.autocomplete==='one-time-code'||field.closest('#administration,#venue-billing,#venue-builder,.local-profile-panel'))return;
  saved.push({key,index,tag:field.tagName,value:String(field.value).slice(0,20000),focused:field.ownerDocument.activeElement===field});
 });return saved;
}
export function createAppNavigation({win,doc,getScope,getPage,setPage,render,setDetail=()=>{},label=page=>page}){
 let scope=null,current=null,index=0,popping=null,restoreObserver=null,ticket=0;const memory=new Map();
 const key=route=>JSON.stringify([route.page,route.detail||{}]);
 function snapshot(){if(current)memory.set(key(current),{y:win.scrollY||0,fields:captureFields(doc.getElementById('view'))});}
 function write(replace=false){win.history[replace?'replaceState':'pushState']({...win.history.state,localRoute:{...current,index}},'',pageUrl(win.location,current.page,current.detail));}
 function beforeRender(page){
  const nextScope=getScope();if(scope!==nextScope){memory.clear();scope=nextScope;current=null;index=0;popping=null;}
  snapshot();const previous=current;
  if(popping){current=popping;index=popping.index||0;popping=null;}
  else if(!current){const incoming=readPageRoute(win.location);current={page,detail:incoming?.page===page?incoming.detail:{}};write(true);}
  else if(page!==current.page){current={page,detail:memory.get('detail:'+page)||{}};index++;write();}
  setDetail(current.detail||{});memory.set('detail:'+current.page,current.detail||{});
  const changed=!previous||key(previous)!==key(current);const saved=memory.get(key(current));
  restoreObserver?.disconnect();restoreObserver=null;const thisTicket=++ticket;const done=new Set();
  function restore(){if(thisTicket!==ticket)return;for(const field of saved?.fields||[]){if(done.has(field.key))continue;const target=doc.getElementById(field.key)||[...doc.getElementById('view')?.querySelectorAll('[name]')||[]].find(n=>n.name===field.key);if(!target||target.tagName!==field.tag)continue;target.value=field.value;done.add(field.key);target.dispatchEvent(new win.Event('input',{bubbles:true}));if(field.focused&&!changed)target.focus({preventScroll:true});}}
  after=()=>{
   toolbar();restore();
   const view=doc.getElementById('view');if(view && win.MutationObserver && saved?.fields?.length){restoreObserver=new win.MutationObserver(restore);restoreObserver.observe(view,{childList:true,subtree:true});}
   win.requestAnimationFrame(()=>{if(thisTicket!==ticket)return;restore();win.scrollTo(0,saved?.y??(changed?0:win.scrollY));if(changed&&!saved){const heading=view?.querySelector('h1,h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}});
  };
 }
 let after=()=>{};
 function toolbar(){
  let bar=doc.getElementById('local-page-navigation');if(!bar){bar=doc.createElement('nav');bar.id='local-page-navigation';bar.setAttribute('aria-label','Page navigation');doc.getElementById('view')?.before(bar);}
  bar.replaceChildren();bar.hidden=!current||current.page==='Home';if(bar.hidden)return;
  const back=doc.createElement('button');back.type='button';back.textContent='← Back';back.setAttribute('aria-label','Back to previous screen');back.onclick=goBack;
  const title=doc.createElement('span');title.textContent=label(current.page);bar.append(back,title);
 }
 function goBack(){if(index>0)win.history.back();else{setPage('Home');render();}}
 function openDetail(detail){snapshot();if(!current)return;current={...current,detail,detailParent:true};memory.set('detail:'+current.page,detail);index++;write();}
 win.addEventListener('popstate',event=>{
  const route=event.state?.localRoute || readPageRoute(win.location);if(!route||!Object.hasOwn(pageRoutes,route.page))return;
  snapshot();popping=route;setPage(route.page);setDetail(route.detail||{});doc.getElementById('moreDrawer')?.setAttribute('hidden','');render();
 });
 return {beforeRender,afterRender:()=>after(),openDetail,closeDetail(){if(current?.detailParent&&index>0){win.history.back();return}current={...current,detail:{}};memory.set('detail:'+current.page,{});write(true);setDetail({});render()},goBack,detail:()=>current?.detail||{},clear(){memory.clear();current=null;scope=null;restoreObserver?.disconnect();++ticket;}};
}

export function tableFrameMatches(frame,detail){if(!frame)return false;const url=new URL(frame.src,'https://local.invalid');return (frame.dataset.openTable||url.searchParams.get('table')||'')===(detail.table||'') && (frame.dataset.openVenue||url.searchParams.get('venue')||'')===(detail.venue||'');}
export function createDraftStore(){let scope=null;const drafts=new Map();function use(next){if(scope!==next){drafts.clear();scope=next}}return {set(member,key,body){use(member);if(!member)return;if(body)drafts.set(key,String(body).slice(0,5000));else drafts.delete(key);if(drafts.size>50)drafts.delete(drafts.keys().next().value)},get(member,key){use(member);return drafts.get(key)||''},clear(){scope=null;drafts.clear()}}}
