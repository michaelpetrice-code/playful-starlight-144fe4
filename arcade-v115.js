/* v115: shared, non-invasive controls for the existing game engines. */
(()=>{'use strict';
const KEY='tl-arcade-sound-enabled-v115';let enabled=false;try{enabled=localStorage.getItem(KEY)==='yes'}catch{}
let context=null,launches=0;
function tone(){if(!enabled)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;context??=new C();if(context.state==='suspended')context.resume();const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.setValueAtTime(530,context.currentTime);o.frequency.exponentialRampToValueAtTime(720,context.currentTime+.09);g.gain.setValueAtTime(.035,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.13);o.connect(g);g.connect(context.destination);o.start();o.stop(context.currentTime+.14)}catch{}}
function enhance(){const room=document.getElementById('gr63');if(!room||room.querySelector('.tl115-tools'))return;const grid=room.querySelector('.gr63-grid');if(!grid)return;
const bar=document.createElement('div');bar.className='tl115-tools';bar.setAttribute('aria-label','Arcade preferences');
const title=document.createElement('strong');title.textContent='Arcade controls';const sound=document.createElement('button');sound.type='button';const count=document.createElement('span');count.className='tl115-played';count.setAttribute('aria-live','polite');const hint=document.createElement('span');hint.className='tl115-hint';hint.textContent='Sound is optional. Original game rules and controls are retained.';
function update(){sound.textContent=enabled?'♫ Sound on':'♪ Sound off';sound.setAttribute('aria-pressed',String(enabled));count.textContent=`Games opened this session: ${launches}`}
sound.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem(KEY,enabled?'yes':'no')}catch{}update();tone()});
const competitions=document.createElement('a');competitions.href='community-competitions.html';competitions.className='tl116-competition-link';competitions.textContent='🏆 Club tournaments & leaderboards';const practice=document.createElement('a');practice.href='games-room-next.html';practice.className='tl116-competition-link tl184-practice-link';practice.textContent='✨ Improved Arcade · AI game coach & practice';bar.append(title,sound,hint,count,practice,competitions);grid.insertAdjacentElement('beforebegin',bar);
// Count launches on original game cards; do not intercept the game's click handling.
grid.addEventListener('click',e=>{const card=e.target.closest('.gr63-card');if(!card)return;launches++;update();tone()});update();}
function init(){enhance();const obs=new MutationObserver(()=>{if(document.getElementById('gr63')&&!document.querySelector('#gr63 .tl115-tools'))enhance()});obs.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
