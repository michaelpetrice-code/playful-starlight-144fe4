(function(root){
 'use strict';
 const cfg=root.LADS_CONFIG||{};const base=cfg.supabaseUrl;const key=cfg.supabaseAnonKey;
 const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
 const read=k=>{try{return sessionStorage.getItem(k);}catch{return null;}};const write=(k,v)=>{try{if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v);}catch{}};
 let room=new URLSearchParams(location.search).get('room')||read('local-dj-room')||'';let auth;try{auth=JSON.parse(read('local-dj-auth')||'null');}catch{}
 let catalogueHash='',cachedTracks=[];const clearCatalogue=()=>{catalogueHash='';cachedTracks=[];};
 const clientId=random();const files=new Map();
 async function token(){
  if(!auth&&read('local-dj-signed-out')!=='1'){try{const saved=JSON.parse(localStorage.getItem('sb-'+new URL(base).hostname.split('.')[0]+'-auth-token')||'null');if(saved?.access_token&&saved.expires_at*1000>Date.now()+30000)auth={access_token:saved.access_token,expires_at:saved.expires_at};}catch{}}
  if(auth?.expires_at&&auth.expires_at*1000<Date.now()+30000&&auth.refresh_token){const r=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refresh_token})});if(r.ok){auth=await r.json();write('local-dj-auth',JSON.stringify(auth));}else{auth=null;write('local-dj-auth',null);}}
  return auth?.access_token;
 }
 async function call(action,data={}){if(!base||!key)throw Error('The Local connection is not configured');const bearer=await token();const r=await fetch(base+'/functions/v1/local-dj',{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},body:JSON.stringify({action,...(action==='state'&&catalogueHash?{catalogueHash}:{}),code:room,member:read('local-dj-member-'+room),...data}),signal:AbortSignal.timeout(20000)});const result=await r.json();if(!r.ok)throw Error(result.error||result.message||'Unable to connect');if(Array.isArray(result.tracks)){cachedTracks=result.tracks;catalogueHash=result.catalogueHash||'';}else if(result.tracksUnchanged){if(!catalogueHash||result.catalogueHash!==catalogueHash)throw Error('Music collection changed. Rejoin the room.');result.tracks=cachedTracks;}return result;}
 function setRoom(code){if(code!==room)clearCatalogue();room=code;write('local-dj-room',code);const url=new URL(location.href);if(code)url.searchParams.set('room',code);else url.searchParams.delete('room');url.searchParams.delete('checkout');history.replaceState(null,'',url);}
 async function join(code){setRoom(code);let member=read('local-dj-member-'+code);if(!member){member=random();write('local-dj-member-'+code,member);}return call('join',{member});}
 async function login(email,password){const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const result=await r.json();if(!r.ok)throw Error(result.msg||result.error_description||'Unable to sign in. Use your Local account.');auth=result;write('local-dj-signed-out',null);write('local-dj-auth',JSON.stringify(auth));return call('access');}
 async function importFiles(selected){
  if(selected.length>500)throw Error('Choose up to 500 songs.');const tracks=[];
  for(const file of selected){if(!/\.(mp3|wav|ogg|m4a)$/i.test(file.name)||file.size>50*1024*1024)throw Error('Use MP3, WAV, OGG or M4A files below 50 MB each.');const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(file.name+'|'+file.size+'|'+file.lastModified));const id=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');files.set(id,file);const parts=file.name.replace(/\.[^.]+$/,'').split(' - ');tracks.push({id,title:(parts.length>1?parts[1]:parts[0]).slice(0,140),artist:(parts.length>1?parts[0]:'Venue collection').slice(0,140),mood:(parts[2]||'All music').slice(0,60)});}
  return call('catalogue',{data:{tracks}});
 }
 function audioURL(id){const free=root.LocalDJFreeMusic?.url(id);if(free)return free;if(files.has(id))return URL.createObjectURL(files.get(id));if(['golden','friday','after'].includes(id))return 'demo/'+id+'.wav';throw Error('Select the venue music files on this playback device again.');}
 root.LocalDJCloud={clientId,status:()=>call('status'),state:()=>call('state'),access:()=>call('access'),login,join,setRoom,get room(){return room;},call,importFiles,audioURL,async logout(){auth=null;clearCatalogue();write('local-dj-auth',null);write('local-dj-signed-out','1');},command:(action,data)=>call(action,{data:{...data,client:clientId}})};
})(window);
