
(()=>{
'use strict';
const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=E('button','v192-btn',label);b.type='button';b.onclick=fn;return b};
const cueRules={
 pocket(b,W,H){return [[37,37],[W/2,27],[W-37,37],[37,H-37],[W/2,H-27],[W-37,H-37]].some(([x,y])=>Math.hypot(b.x-x,b.y-y)<23)},
 collide(a,b,R){
  if(!a.alive||!b.alive)return false;
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.00001;
  if(d>=2*R)return false;
  const nx=dx/d,ny=dy/d,over=2*R-d;
  a.x-=nx*over/2;b.x+=nx*over/2;a.y-=ny*over/2;b.y+=ny*over/2;
  const impulse=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
  if(impulse>0){a.vx-=impulse*nx*.97;a.vy-=impulse*ny*.97;b.vx+=impulse*nx*.97;b.vy+=impulse*ny*.97}
  return true;
 },
 outcome(potted,sn){return {foul:potted.some(n=>n===0),objectBalls:potted.filter(n=>n!==0).length,respots:potted.filter(n=>n===0||(sn&&n>1))}}
};
function cue({root,say,record,coach,registerCleanup},kind){
let alive=true, raf=0, balls=[],turn=0,shots=0,scored=0,aim={x:0,y:0},drag=null,settling=false,pendingRespots=[];
const sn=kind==='snooker',W=840,H=450,R=sn?10:12;
const panel=E('div','v192-panel');const info=E('div','v192-status');
const canvas=E('canvas','v192-table');canvas.width=W;canvas.height=H;canvas.setAttribute('aria-label',sn?'Snooker table with draggable cue aiming':'Pool table with draggable cue aiming');
const controls=E('div','v192-actions');const power=E('input');power.type='range';power.min=15;power.max=100;power.value=57;power.setAttribute('aria-label','Shot power');controls.append(E('span','', 'Power'),power,btn('Reset rack',setup));panel.append(info,canvas,controls);root.append(panel);
const ctx=canvas.getContext('2d');const color=['#ffffff','#f6d647','#2862b6','#c32f42','#7a3bb2','#e58c2c','#237e55','#1b1b22','#f6d647','#2862b6','#c32f42','#7a3bb2','#e58c2c','#237e55','#1b1b22','#1b1b22'];
function add(x,y,n){balls.push({x,y,vx:0,vy:0,n,alive:true,spot:{x,y}})}
function setup(){cancelAnimationFrame(raf);pendingRespots=[];settling=false;balls=[];shots=0;scored=0;turn=0;add(215,225,0);if(sn){for(let row=0;row<5;row++)for(let j=0;j<=row;j++)add(540+row*19,225+(j-row/2)*21,1);[[300,225,2],[370,225,3],[440,225,4],[490,225,5],[730,225,6],[240,225,7]].forEach(([x,y,n])=>add(x,y,n))}
else {let k=1;for(let row=0;row<5;row++)for(let j=0;j<=row;j++)add(520+row*24,225+(j-row/2)*25,k++);}
info.textContent=sn?'Snooker practice · Pot reds and colours · Drag back from the white ball to shoot':'Pool physics practice · Drag back from the cue ball to aim and release';say('Aim by dragging away from the target direction.');render()}
function pocket(b){return cueRules.pocket(b,W,H)}
function frame(){if(!alive)return;raf=0;let moving=false;for(let sub=0;sub<3;sub++){
for(const b of balls){if(!b.alive)continue;b.x+=b.vx/3;b.y+=b.vy/3;b.vx*=.989;b.vy*=.989;if(Math.abs(b.vx)<.015)b.vx=0;if(Math.abs(b.vy)<.015)b.vy=0;
if(b.vx||b.vy)moving=true;
if(pocket(b)){b.alive=false;b.vx=b.vy=0;pendingRespots.push(b);if(b.n===0)say('Cue ball potted — foul. Ball in hand after the shot.');else{scored++;say('Ball potted: '+scored)}continue}
if(b.x<R+34){b.x=R+34;b.vx=Math.abs(b.vx)*.86}if(b.x>W-R-34){b.x=W-R-34;b.vx=-Math.abs(b.vx)*.86}
if(b.y<R+33){b.y=R+33;b.vy=Math.abs(b.vy)*.86}if(b.y>H-R-33){b.y=H-R-33;b.vy=-Math.abs(b.vy)*.86}

}
for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)cueRules.collide(balls[i],balls[j],R);
}
render();if(moving){raf=requestAnimationFrame(frame)}else{settling=false;const toRespot=pendingRespots;pendingRespots=[];for(const b of toRespot){if(b.n!==0&&(!sn||b.n===1))continue;const target=b.n===0?{x:215,y:225}:b.spot;let x=target.x,y=target.y;let free=false;for(let attempt=0;attempt<200;attempt++){const ring=Math.ceil(Math.sqrt(attempt)),offset=attempt===0?0:attempt-(ring-1)*(ring-1),side=Math.max(1,2*ring),angle=offset*Math.PI*2/side,candidateX=Math.max(50,Math.min(W-50,target.x+Math.cos(angle)*ring*(2*R+2))),candidateY=Math.max(50,Math.min(H-50,target.y+Math.sin(angle)*ring*(2*R+2)));if(!pocket({x:candidateX,y:candidateY})&&!balls.some(other=>other!==b&&other.alive&&Math.hypot(other.x-candidateX,other.y-candidateY)<2*R+1)){x=candidateX;y=candidateY;free=true;break}}if(free){b.x=x;b.y=y;b.vx=b.vy=0;b.alive=true}else{pendingRespots.push(b);say('Respot waiting for a free space on the table.')}}render();info.textContent=`${sn?'Snooker':'Pool'} practice · ${shots} shots · ${scored} potted · Drag back from the white ball to shoot`}}
function render(){ctx.clearRect(0,0,W,H);const wood=ctx.createLinearGradient(0,0,W,H);wood.addColorStop(0,'#b18448');wood.addColorStop(.5,'#54321e');wood.addColorStop(1,'#c39b58');ctx.fillStyle=wood;ctx.fillRect(0,0,W,H);ctx.fillStyle='#093e34';ctx.fillRect(26,25,W-52,H-50);let felt=ctx.createRadialGradient(380,170,20,420,220,500);felt.addColorStop(0,'#237a61');felt.addColorStop(1,'#0b4d3e');ctx.fillStyle=felt;ctx.fillRect(35,34,W-70,H-68);ctx.strokeStyle='#a8cbb7';ctx.lineWidth=1;if(sn){ctx.beginPath();ctx.moveTo(240,35);ctx.lineTo(240,H-35);ctx.stroke();ctx.beginPath();ctx.arc(240,225,75,-Math.PI/2,Math.PI/2);ctx.stroke()}
for(const [x,y] of [[37,37],[W/2,27],[W-37,37],[37,H-37],[W/2,H-27],[W-37,H-37]]){ctx.fillStyle='#061b1b';ctx.beginPath();ctx.arc(x,y,22,0,7);ctx.fill()}
for(const b of balls){if(!b.alive)continue;ctx.beginPath();ctx.ellipse(b.x+3,b.y+4,R+1,R*.8,0,0,7);ctx.fillStyle='#061d19a8';ctx.fill();const grad=ctx.createRadialGradient(b.x-4,b.y-5,1,b.x,b.y,R);grad.addColorStop(0,'#ffffff');grad.addColorStop(.28,color[b.n%color.length]);grad.addColorStop(1,'#101f1c');ctx.beginPath();ctx.arc(b.x,b.y,R,0,7);ctx.fillStyle=grad;ctx.fill();if(!sn&&b.n){ctx.beginPath();ctx.arc(b.x,b.y,5,0,7);ctx.fillStyle='#f8f2dd';ctx.fill();ctx.fillStyle='#101d1a';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText(b.n,b.x,b.y+2)}}
if(drag){const cue=balls[0],dx=drag.x-cue.x,dy=drag.y-cue.y;ctx.strokeStyle='#f1d4a3';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(cue.x+dx*.15,cue.y+dy*.15);ctx.lineTo(cue.x+dx*.15+dx*1.2,cue.y+dy*.15+dy*1.2);ctx.stroke();ctx.setLineDash([8,7]);ctx.strokeStyle='#fff9bf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cue.x,cue.y);ctx.lineTo(cue.x-dx*2,cue.y-dy*2);ctx.stroke();ctx.setLineDash([])}}
function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{if(settling||!balls[0].alive||pendingRespots.length||balls.some(b=>b.alive&&(Math.abs(b.vx)+Math.abs(b.vy)>.03)))return;drag=pos(e);canvas.setPointerCapture(e.pointerId);render()});
canvas.addEventListener('pointermove',e=>{if(drag){drag=pos(e);render()}});
canvas.addEventListener('pointercancel',()=>{drag=null;render()});
canvas.addEventListener('pointerup',e=>{if(!drag)return;const q=balls[0];if(q.alive){let dx=q.x-drag.x,dy=q.y-drag.y,d=Math.hypot(dx,dy);if(d>10){let v=Math.min(16,Math.max(2,d/18))*Number(power.value)/65;q.vx=dx/d*v;q.vy=dy/d*v;shots++;settling=true;raf=requestAnimationFrame(frame)}}drag=null;render()});
coach(()=>sn?'Use the white ball to pot a red, then a colour. This is physics practice, not full official snooker scoring.':'Drag away from your intended shot direction. Lower power gives better control of the cue ball.');
registerCleanup(()=>{alive=false;pendingRespots=[];cancelAnimationFrame(raf)});setup()
}
function darts({root,say,record,coach,registerCleanup},start=501){
let alive=true,score=start,bot=start,throws=0,turn=0,done=false,visitStart=start;
const wrap=E('div','v192-panel'),status=E('div','v192-status'),canvas=E('canvas','v192-dartboard');canvas.width=560;canvas.height=560;
const control=E('div','v192-actions'),mode=E('select');for(const m of ['Single','Double','Treble']){const o=E('option','',m);mode.append(o)}control.append(E('span','','Target ring'),mode,btn('New leg',reset));wrap.append(status,canvas,control);root.append(wrap);
const ctx=canvas.getContext('2d'),order=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
function draw(){ctx.clearRect(0,0,560,560);ctx.fillStyle='#152b28';ctx.fillRect(0,0,560,560);ctx.translate(280,280);
for(let i=0;i<20;i++){let a=-Math.PI/2+(i-.5)*Math.PI/10,b=a+Math.PI/10;for(let [outer,inner,col] of [[220,198,i%2?'#e5d5b3':'#1e2522'],[198,183,i%2?'#bd3b40':'#237657'],[183,120,i%2?'#e5d5b3':'#1e2522'],[120,105,i%2?'#bd3b40':'#237657']]){ctx.beginPath();ctx.arc(0,0,outer,a,b);ctx.arc(0,0,inner,b,a,true);ctx.closePath();ctx.fillStyle=col;ctx.fill()}ctx.fillStyle='#f7e5b9';ctx.font='bold 19px Arial';ctx.textAlign='center';ctx.fillText(order[i],Math.cos(a+Math.PI/20)*244,Math.sin(a+Math.PI/20)*244+6)}
for(const [r,c] of [[105,'#1b2521'],[37,'#217c5d'],[18,'#bb383d']]){ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fillStyle=c;ctx.fill()}ctx.setTransform(1,0,0,1,0,0)}
function reset(){score=bot=start;throws=0;turn=0;done=false;visitStart=start;status.textContent=`You ${score} · Computer ${bot} · Tap a segment to throw`;say('Double-out rules apply.');draw()}
function hit(x,y){const dx=x-280,dy=y-280,r=Math.hypot(dx,dy);if(r>220)return{points:0,double:false,label:'Miss'};if(r<=18)return{points:50,double:true,label:'Bullseye'};if(r<=37)return{points:25,double:false,label:'Outer bull'};let angle=(Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2);let index=Math.floor((angle+Math.PI/20)%(Math.PI*2)/(Math.PI/10)),n=order[index],mult=r>=183&&r<=198?2:r>=105&&r<=120?3:1;return{points:n*mult,double:mult===2,label:`${mult===3?'Treble':mult===2?'Double':'Single'} ${n}`}}
function apply(current,h){const rem=current-h.points;if(rem<0||rem===1||(rem===0&&!h.double))return{score:current,bust:true,win:false};return{score:rem,bust:false,win:rem===0}}
function botVisit(){
 const starting=bot;let bust=false,won=false;
 const doubles=Array.from({length:20},(_,i)=>({points:(i+1)*2,double:true,label:'Double '+(i+1)}));
 doubles.push({points:50,double:true,label:'Bullseye'});
 const singles=Array.from({length:20},(_,i)=>({points:i+1,double:false,label:'Single '+(i+1)}));
 const trebles=Array.from({length:20},(_,i)=>({points:(i+1)*3,double:false,label:'Treble '+(i+1)}));
 const candidates=[...doubles,...singles,...trebles,{points:25,double:false,label:'Outer bull'}];
 const isCheckout=n=>doubles.some(h=>h.points===n);
 function choose(remaining,dartsLeft){
   const direct=doubles.find(h=>h.points===remaining);if(direct)return direct;
   if(dartsLeft>1){
     const setup=candidates.filter(h=>h.points<remaining&&isCheckout(remaining-h.points));
     if(setup.length)return setup.sort((x,y)=>y.points-x.points)[0];
   }
   const safe=candidates.filter(h=>remaining-h.points>=2&&remaining-h.points!==1);
   if(!safe.length)return {points:0,double:false,label:'Miss'};
   return safe.sort((x,y)=>Math.abs(remaining-x.points-40)-Math.abs(remaining-y.points-40))[0];
 }
 for(let dart=0;dart<3;dart++){
   const h=choose(bot,3-dart),result=apply(bot,h);
   if(result.bust){bot=starting;bust=true;break}
   bot=result.score;
   if(result.win){won=true;break}
 }
 if(won){done=true;record('losses');say('Computer wins this leg with a double-out.')}
 else say('Computer visit: '+(bust?'bust, no score':(starting-bot)+' points')+'. Your turn.');
}
function throwAt(e){
 if(done||!alive)return;
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
 const x=(e.clientX-r.left)*560/r.width,y=(e.clientY-r.top)*560/r.height;
 if(throws%3===0)visitStart=score;
 const h=hit(x,y),res=apply(score,h);throws++;
 score=res.bust?visitStart:res.score;
 say(h.label+' · '+h.points+' points'+(res.bust?' · BUST':''));
 if(res.win){done=true;record('wins');say('You win! Double-out achieved.')}
 else if(res.bust||throws%3===0){
   if(res.bust)throws+= (3-throws%3)%3;
   botVisit();
 }
 status.textContent='You '+score+' · Computer '+bot+' · Darts thrown '+throws;
}
canvas.addEventListener('pointerup',throwAt);coach(()=>`Tap the board to aim. Double-out required; a checkout must finish on a double or inner bull. ${mode.value} is a practice reference: ring position determines actual score.`);registerCleanup(()=>{alive=false});reset()
}
window.TL192={cue,darts,rules:cueRules};
})();
