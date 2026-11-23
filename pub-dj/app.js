'use strict';
const $=id=>document.getElementById(id);
let state, demo=false, filter='All music', playingKey='', audioURL='', busy=false;
const audio=$('audio'); audio.volume=.75;
const seed=[{id:'golden',title:'Golden Hour',artist:'The Local Studio',mood:'Laid back'},{id:'friday',title:'Friday Lights',artist:'The Local Studio',mood:'Party'},{id:'after',title:'After Hours',artist:'The Local Studio',mood:'Laid back'}];
const voted=new Set();
const discovery=window.LocalDJDiscovery;
let libraryView='discover', catalogueSignature='';
let savedSongs=new Set();
try{const stored=JSON.parse(localStorage.getItem('local-dj-saved-v1')||'[]');if(Array.isArray(stored))savedSongs=new Set(stored.filter(id=>typeof id==='string'));}catch(e){}
function saveSong(id){
 if(savedSongs.has(id))savedSongs.delete(id);else savedSongs.add(id);
 try{localStorage.setItem('local-dj-saved-v1',JSON.stringify([...savedSongs]));}catch(e){tell('Saved for this visit. Your browser has disabled saved-song storage.');}
 renderCatalogue();
}

function tell(message){$('notice').textContent=message;}
async function api(path,data){
 if(demo){
  if(path==='join')state.joined=true;
  if(path==='login')state.host=true;
  if(path==='request'){
   if(!state.open)throw Error('Requests are paused');
   if(state.queue.some(r=>r.track===data.track))throw Error('Already in the queue — give it a vote.');
   state.queue.push({id:Date.now(),track:data.track,status:'pending',votes:0});
  }
  if(path==='vote'){const row=state.queue.find(r=>r.id===data.id);if(!voted.has(row.id)){row.votes++;row.voted=true;voted.add(row.id);}}
  if(path==='moderate'){const row=state.queue.find(r=>r.id===data.id);row.status=data.status;}
  if(path==='settings')Object.assign(state,data);
  if(path==='stop')state.current=null;
  if(path==='next'){
   const row=state.queue.filter(r=>r.status==='approved').sort((a,b)=>b.votes-a.votes||a.id-b.id)[0];
   const eligible=seed.filter(t=>state.mode==='All music'||t.mood===state.mode);
   const options=eligible.filter(t=>t.id!==state.current?.track);
   state.current={track:row?.track||(options[0]||eligible[0]||seed[0]).id,started:Date.now()};
   if(row)row.status='played';
  }
  render();return {ok:true};
 }
 const response=await fetch('api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to complete that action');await refresh();return result;
}
function element(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function button(label,fn,cls){const el=element('button',label,cls);el.type='button';el.onclick=async()=>{el.disabled=true;try{await fn();}catch(e){tell(e.message);}finally{el.disabled=false;}};return el;}
function trackById(id){return state.tracks.find(t=>t.id===id);}
async function refresh(){if(demo)return;const response=await fetch('api/state',{cache:'no-store'});if(!response.ok)throw Error('Venue connection unavailable');state=await response.json();render();}
function render(){
 $('connection').textContent=demo?'INTERACTIVE DEMO · THIS DEVICE':'VENUE PILOT · CONNECTED';
 $('venue').textContent=demo?'Try the customer experience and staff controls.':state.venue+' · Make tonight sound like you.';
 $('join-form').hidden=state.joined;
 $('join-info').textContent=state.joined?(state.open?'You’re in. Request a song or vote for your favourite.':'Requests are paused by the venue.'):(demo?'Use code 123456. Demo changes stay on this device.':'Ask staff for tonight’s venue code.');
 $('share').hidden=demo||!state.host;
 $('host-panel').hidden=!state.host;
 $('host-button').textContent=state.host?'Staff controls unlocked':'Staff controls';
 $('host-code').textContent='VENUE CODE · '+(state.code||'123456');
 $('requests').textContent=state.open?'Pause requests':'Reopen requests';
 $('collection-note').textContent=demo?'Original instrumental demos included. No commercial song catalogue connected.':state.tracks.length?'Venue-managed collection · Requests need staff approval.':'Join the venue to browse. Staff: add authorised audio files to the configured music folder.';
 const moods=['All music',...new Set(state.tracks.map(t=>t.mood).filter(m=>m!=='All music'))];
 renderCatalogue();
 const selected=$('mix').value; $('mix').replaceChildren(...moods.map(m=>{const o=element('option',m);o.value=m;return o;}));$('mix').value=state.mode||selected;
 const approved=state.queue.filter(r=>r.status==='approved').sort((a,b)=>b.votes-a.votes||a.id-b.id);
 $('queue-count').textContent=approved.length+' SONG'+(approved.length===1?'':'S');
 $('queue').replaceChildren(...approved.map(r=>queueRow(r,false)));
 if(!approved.length)$('queue').append(element('p','Your next great song could be the first.','muted'));
 $('pending').replaceChildren(...state.queue.filter(r=>r.status==='pending').map(r=>queueRow(r,true)));
 if(!$('pending').children.length)$('pending').append(element('p','All caught up. New requests will appear here.','muted'));
 const now=trackById(state.current?.track);
 $('now-title').textContent=now?.title||'Ready when you are';$('now-artist').textContent=now?.artist||'Staff can start the music from the control room.';
 $('audio').hidden=!state.host;
 $('audio-note').textContent=state.host?'Keep this host tab open. Connect this device to your pub speakers.':'Music plays through the pub speakers, not customer phones.';
 syncAudio();
}
function cover(track,small=false){
 const art=element('div',undefined,'cover-art tone-'+discovery.colour(track.id)+(small?' cover-small':''));art.setAttribute('aria-hidden','true');
 art.append(element('span',discovery.initials(track.title),'cover-letter'),element('span','THE LOCAL · MUSIC ROOM','cover-label'));return art;
}
function requestButton(track){
 const queued=state.queue.find(r=>r.track===track.id&&['pending','approved'].includes(r.status));
 const req=button(queued?(queued.status==='pending'?'Awaiting approval':'In the queue'):'＋ Request',async()=>{await api('request',{track:track.id});tell('Request sent. Staff will review it.');},'request-track');
 req.setAttribute('aria-label',(queued?'Already requested: ':'Request ')+track.title+' by '+track.artist);req.dataset.focusKey='request-'+track.id;
 req.disabled=!state.joined||!state.open||Boolean(queued);return req;
}
function trackCard(track,index){
 const card=element('article',undefined,'track discovery-track');
 const visual=element('div',undefined,'cover-wrap');visual.append(cover(track));
 const save=button(savedSongs.has(track.id)?'♥':'♡',()=>saveSong(track.id),'save-track');
 save.dataset.focusKey='save-'+track.id;save.setAttribute('aria-label',(savedSongs.has(track.id)?'Unsave ':'Save ')+track.title);save.setAttribute('aria-pressed',String(savedSongs.has(track.id)));visual.append(save);
 const info=element('div',undefined,'track-info');info.append(element('h4',track.title),element('p',track.artist),element('span',track.mood||'Venue collection','track-mood'));
 card.append(element('span',String(index+1).padStart(2,'0'),'track-rank'),visual,info,requestButton(track));return card;
}
function renderCatalogue(){
 const query=$('search').value;const signature=JSON.stringify([state.tracks,state.queue,state.joined,state.open,query,filter,libraryView,[...savedSongs]]);
 if(signature===catalogueSignature)return;catalogueSignature=signature;
 const focused=document.activeElement?.dataset?.focusKey;
 for(const tab of $('browse-tabs').querySelectorAll('button'))tab.setAttribute('aria-pressed',String(tab.dataset.view===libraryView));
 const moods=['All music',...new Set(state.tracks.map(t=>t.mood).filter(m=>m&&m!=='All music'))];
 $('filters').replaceChildren(...moods.map(m=>{const b=button(m,()=>{filter=m;renderCatalogue();});b.dataset.focusKey='mood-'+m;b.setAttribute('aria-pressed',String(m===filter));return b;}));
 const explore=libraryView==='discover'&&!query.trim()&&filter==='All music';
 $('discovery-feature').hidden=!explore;$('mood-section').hidden=!explore||!state.tracks.length;
 $('mood-cards').replaceChildren(...discovery.moods(state.tracks).map(m=>{
  const b=button('',()=>{filter=m.name;libraryView='songs';renderCatalogue();},'mood-card tone-'+discovery.colour(m.name));b.append(element('strong',m.name),element('small',m.count+' song'+(m.count===1?'':'s')),element('span','↗','mood-arrow'));return b;
 }));
 const popular=discovery.popular(state.tracks,state.queue);$('popular-section').hidden=!explore||!popular.length;
 $('popular-tracks').replaceChildren(...popular.slice(0,4).map(({track,votes})=>{
  const row=element('div',undefined,'popular-track');const title=element('div',undefined,'popular-info');title.append(element('strong',track.title),element('small',votes+' vote'+(votes===1?'':'s')));row.append(cover(track,true),title,requestButton(track));return row;
 }));
 const matches=discovery.select(state.tracks,{query,mood:filter,savedOnly:libraryView==='saved',saved:[...savedSongs]});
 $('artists').hidden=libraryView!=='artists';$('tracks').hidden=libraryView==='artists';
 $('tracks').classList.toggle('song-list',libraryView==='songs');
 $('results-title').textContent=query.trim()?'Search results':libraryView==='saved'?'Your saved songs':libraryView==='artists'?'Meet the artists':filter!=='All music'?filter:libraryView==='songs'?'All songs':'Explore the collection';
 $('results-count').textContent=matches.length+' song'+(matches.length===1?'':'s');
 $('tracks').replaceChildren(...matches.map(trackCard));
 $('artists').replaceChildren(...discovery.artists(matches).map(artist=>{
  const b=button('',()=>{$('search').value=artist.name;libraryView='songs';renderCatalogue();},'artist-card');
  b.append(element('span',discovery.initials(artist.name),'artist-avatar tone-'+discovery.colour(artist.name)),element('strong',artist.name),element('small',artist.tracks.length+' song'+(artist.tracks.length===1?'':'s')));b.setAttribute('aria-label','Browse songs by '+artist.name);return b;
 }));
 if(!matches.length){const empty=element('div',undefined,'library-empty');empty.append(element('strong',libraryView==='saved'?'Your favourites start here':'No songs to show yet'),element('p',libraryView==='saved'?'Tap a heart on a song to save it on this device.':!state.tracks.length?'Join the venue to discover its music collection.':'Try a different search or choose All music.'));(libraryView==='artists'?$('artists'):$('tracks')).append(empty);}
 if(libraryView==='saved')$('collection-note').textContent='Saved on this device · Requesting a song still needs staff approval.';
 if(focused){const target=[...document.querySelectorAll('[data-focus-key]')].find(el=>el.dataset.focusKey===focused);if(target&&!target.disabled)target.focus({preventScroll:true});}
}
$('browse-tabs').onclick=e=>{const tab=e.target.closest('button[data-view]');if(tab){libraryView=tab.dataset.view;render();}};
$('browse-all').onclick=()=>{libraryView='songs';filter='All music';$('search').value='';render();$('results-title').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
function queueRow(r,pending){const track=trackById(r.track);const row=element('div',undefined,'queue-row');const song=element('div',undefined,'song');song.append(element('strong',track?.title||'Unavailable track'),element('small',track?.artist||''));row.append(song);if(pending){row.append(button('Approve',()=>api('moderate',{id:r.id,status:'approved'})),button('Decline',()=>api('moderate',{id:r.id,status:'rejected'}),'ghost'));}else{const vote=button('↑ '+r.votes,()=>api('vote',{id:r.id}),'ghost');vote.setAttribute('aria-label','Vote for '+(track?.title||'song')+' · '+r.votes+' votes');vote.disabled=!state.joined||!state.open||r.voted;row.append(vote);if(state.host)row.append(button('Remove',()=>api('moderate',{id:r.id,status:'rejected'}),'ghost'));}return row;}
async function syncAudio(){
 const key=state.host&&state.current?state.current.track+':'+state.current.started:'';
 if(key===playingKey)return;playingKey=key;audio.pause();$('audio').closest('.playing').classList.remove('active');
 if(audioURL){URL.revokeObjectURL(audioURL);audioURL='';}audio.removeAttribute('src');
 if(!key)return;
 try{
  if(demo){audio.src='demo/'+state.current.track+'.wav';}
  else{const response=await fetch('api/audio/'+state.current.track);if(!response.ok)throw Error('Unable to load audio');const blob=await response.blob();if(key!==playingKey)return;audioURL=URL.createObjectURL(blob);audio.src=audioURL;}
  await audio.play();
 }catch(e){tell(e.name==='NotAllowedError'?'Press play on the audio controls to enable the speakers.':e.message);}
}
$('search').oninput=()=>state&&render();
$('join-form').onsubmit=async e=>{e.preventDefault();try{if(demo&&$('code').value!=='123456')throw Error('Use demo venue code 123456');await api('join',{code:$('code').value});tell('Welcome. Pick something you love.');}catch(err){tell(err.message);}};
$('host-button').onclick=()=>{if(state?.host){$('host-panel').scrollIntoView({behavior:'smooth'});return;}if(demo){api('login');tell('Demo staff controls unlocked. Live venues require a host password.');}else $('login').showModal();};
$('cancel-login').onclick=()=>$('login').close();
$('login-form').onsubmit=async e=>{e.preventDefault();try{await api('login',{password:$('password').value});$('password').value='';$('login').close();}catch(err){$('login-error').textContent=err.message;}};
async function hostAction(path,data){if(busy)return;busy=true;try{await api(path,data);}catch(e){tell(e.message);}finally{busy=false;}}
$('next').onclick=()=>hostAction('next');$('stop').onclick=()=>hostAction('stop');
$('requests').onclick=()=>hostAction('settings',{open:!state.open});$('mix').onchange=()=>hostAction('settings',{mode:$('mix').value});
$('volume').oninput=()=>audio.volume=Number($('volume').value)/100;
$('screen').onclick=()=>window.open(location.pathname+'?screen=1','local-dj-screen','noopener');
$('share').onclick=async()=>{try{const url=new URL(location.href);url.search='';url.hash='';await navigator.clipboard.writeText(url.href);tell('Join link copied. Display the venue code alongside it.');}catch(e){tell('Copy this page’s address and share the venue code.');}};
// The projector never plays a second audio stream, even if it shares the staff cookie.
const projector=new URLSearchParams(location.search).has('screen');
if(projector){document.body.classList.add('screen');syncAudio=()=>{};}
audio.onended=()=>hostAction('next');audio.onplay=()=>$('audio').closest('.playing').classList.add('active');audio.onpause=()=>$('audio').closest('.playing').classList.remove('active');
audio.onerror=()=>{if(audio.getAttribute('src'))tell('Audio could not play. Check this file or choose the next song.');};
(async()=>{
 try{await refresh();}
 catch(e){demo=true;state={venue:'The Local',joined:false,host:false,open:true,current:null,mode:'All music',tracks:seed,queue:[{id:1,track:'friday',status:'approved',votes:4}]};render();tell('Interactive preview: join with 123456, then try staff controls. Changes are local to this tab.');}
 if(!demo)setInterval(()=>refresh().catch(()=>tell('Connection lost. Reconnecting…')),3000);
})();
