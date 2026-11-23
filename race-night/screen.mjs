import {validMessage,videoFile} from './core.mjs';
const session=location.hash.slice(1);const $=id=>document.getElementById(id);const video=$('screen-video');let url='',audioEnabled=false,desired=false,position=0,volume=.8,lastHost=Date.now();
const channel=/^[a-f0-9-]{36}$/i.test(session)&&typeof BroadcastChannel==='function'?new BroadcastChannel('local-racing-'+session):null;
function send(type,data={}){channel?.postMessage({session,type,...data});}
function status(error=''){send('status',{paused:video.paused,error});}
async function play(){try{video.muted=!audioEnabled;await video.play();$('screen-error').textContent='';status();}catch{$('screen-error').textContent='Press Enable screen audio to allow playback in this window.';status('Click Enable screen audio on the projector.');}}
if(!channel)$('screen-message').textContent='Open this view using the host’s TV / projector button.';
if(channel)channel.onmessage=async e=>{const m=e.data;if(!validMessage(m,session))return;lastHost=Date.now();
 if(m.type==='load'){
  if(!(m.file instanceof Blob)||!videoFile(m.file))return;video.pause();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(m.file);video.src=url;position=Number(m.time)||0;desired=Boolean(m.playing);volume=Number.isFinite(m.volume)?Math.max(0,Math.min(1,m.volume)):.8;video.volume=volume;video.muted=!audioEnabled;$('screen-course').textContent=String(m.course).slice(0,60)+' · Race '+m.number;$('screen-welcome').hidden=true;video.hidden=false;
 }
 if(m.type==='control'){
  if(m.action==='clear'){video.pause();video.removeAttribute('src');video.load();if(url)URL.revokeObjectURL(url);url='';$('screen-welcome').hidden=false;$('screen-course').textContent='Waiting for the host';desired=false;return;}
  if(Number.isFinite(m.volume)){volume=Math.max(0,Math.min(1,m.volume));video.volume=volume;}
  if(['play','seek','sync'].includes(m.action)&&Number.isFinite(m.time)&&Number.isFinite(video.duration)&&Math.abs(video.currentTime-m.time)>(m.action==='sync'?1:0.1))video.currentTime=Math.max(0,Math.min(video.duration,m.time));
  if(m.action==='play'||m.action==='sync'&&m.playing){desired=true;await play();}if(m.action==='pause'){desired=false;video.pause();}
 }
 if(m.type==='close'){video.pause();desired=false;$('screen-error').textContent='The host closed Race Night. Reopen it to continue.';}
};
video.onloadedmetadata=()=>{if(Number.isFinite(video.duration))video.currentTime=Math.min(position,video.duration);if(desired)play();};video.onended=()=>status();video.onerror=()=>{if(video.getAttribute('src')){$('screen-error').textContent='This screen cannot play the selected video format.';status('Selected video format could not play.');}};
$('enable').onclick=async()=>{audioEnabled=true;video.muted=false;$('enable').textContent='Screen audio enabled';if(desired)await play();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('screen-error').textContent='Use your browser’s fullscreen or screen-mirroring controls.';}};
if(channel){send('ready');setInterval(()=>{status();if(desired&&Date.now()-lastHost>10000){video.pause();desired=false;$('screen-error').textContent='Host connection lost. Playback paused.';}},3000);}window.addEventListener('pagehide',()=>{video.pause();channel?.close();if(url)URL.revokeObjectURL(url);});
