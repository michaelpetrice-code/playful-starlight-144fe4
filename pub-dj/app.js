'use strict';
const $=id=>document.getElementById(id);
let state, demo=false, filter='All music', playingKey='', audioURL='', busy=false;
const audio=$('audio'); audio.volume=.75;
const seed=[{id:'golden',title:'Golden Hour',artist:'The Local Studio',mood:'Laid back'},{id:'friday',title:'Friday Lights',artist:'The Local Studio',mood:'Party'},{id:'after',title:'After Hours',artist:'The Local Studio',mood:'Laid back'}];
const voted=new Set();
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
 $('filters').replaceChildren(...moods.map(m=>{const b=button(m,()=>{filter=m;render();});b.setAttribute('aria-pressed',String(m===filter));return b;}));
 const selected=$('mix').value; $('mix').replaceChildren(...moods.map(m=>{const o=element('option',m);o.value=m;return o;}));$('mix').value=state.mode||selected;
 const query=$('search').value.toLowerCase();
 const tracks=state.tracks.filter(t=>(filter==='All music'||t.mood===filter)&&(t.title+' '+t.artist).toLowerCase().includes(query));
 $('tracks').replaceChildren(...tracks.map(t=>{const card=element('article',undefined,'track');const art=element('div','♫','art');art.setAttribute('aria-hidden','true');const info=element('div',undefined,'track-info');info.append(element('h3',t.title),element('p',t.artist+' · '+t.mood));const req=button('＋ Request song',async()=>{await api('request',{track:t.id});tell('Request sent. Staff will review it.');});req.disabled=!state.joined||!state.open;info.append(req);card.append(art,info);return card;}));
 if(state.tracks.length&&!tracks.length)$('tracks').append(element('p','No songs match your search.'));
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
