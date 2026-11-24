(function(root){
'use strict';
function resolve(value){
 let url;try{url=new URL(value.trim());}catch{throw Error('Paste a full YouTube video or SoundCloud track link.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Use a secure official YouTube or SoundCloud link.');
 const host=url.hostname.toLowerCase();let id;
 if(host==='youtu.be')id=url.pathname.slice(1);
 else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host)){if(url.pathname==='/watch')id=url.searchParams.get('v');else{const match=url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/);id=match?.[1];}}
 if(id){if(!/^[\w-]{11}$/.test(id))throw Error('That YouTube video link is incomplete.');return {provider:'YouTube',page:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube.com/embed/'+id+'?playsinline=1&autoplay=0&rel=0'};}
 if(['soundcloud.com','www.soundcloud.com'].includes(host)&&/^\/[\w-]+\/[\w-]+\/?$/.test(url.pathname)&&!/^\/(search|discover|you|charts|settings)\b/.test(url.pathname)){const page='https://soundcloud.com'+url.pathname.replace(/\/$/,'');return {provider:'SoundCloud',page,embed:'https://w.soundcloud.com/player/?url='+encodeURIComponent(page)+'&auto_play=false&show_artwork=true&show_user=true'};}
 throw Error('This source has no connected preview player. Use its official site, or import a permitted audio file through Staff controls.');
}
root.LocalDJPersonalPlayer={resolve};
const $=id=>document.getElementById(id);if(!$('personal-player-form'))return;
const panel=$('personal-player-panel'),slot=$('personal-player-slot'),status=$('personal-player-status');
function stop(message='Player closed.'){slot.replaceChildren();$('personal-player-close').hidden=true;$('personal-player-original').hidden=true;status.textContent=message;}
$('personal-player-form').onsubmit=e=>{e.preventDefault();try{
 if(new URLSearchParams(location.search).has('screen'))throw Error('Personal listening is unavailable in venue screen view.');
 if(!$('audio').paused)throw Error('Pause venue playback before opening a personal player on this device.');
 const item=resolve($('personal-player-url').value);stop();const frame=document.createElement('iframe');frame.src=item.embed;frame.title=item.provider+' personal listening player';frame.allow='encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';slot.append(frame);$('personal-player-close').hidden=false;const link=$('personal-player-original');link.href=item.page;link.hidden=false;link.textContent='Open on '+item.provider+' ↗';status.textContent='Press Play inside the '+item.provider+' player. Availability, advertisements and restrictions are controlled by '+item.provider+'. If it cannot play here, use the official-site link.';
 }catch(error){stop(error.message);}};
$('personal-player-close').onclick=()=>stop();panel.addEventListener('toggle',()=>{if(!panel.open)stop();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Player closed when this page left view.');});root.addEventListener('pagehide',()=>stop());$('audio').addEventListener('play',()=>stop('Personal player closed because venue playback started.'));
})(window);
