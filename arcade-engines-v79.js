import {renderPremiumCue} from './cue-render-v114.js';
import {initialReferee,adjudicate,placeCueBall,respotColours} from './cue-referee-v95.js';
import {simulateShot,judgeEightBall,judgeSnooker} from './cue-physics-v94.js';
/* Arcade v73: standalone playable physics cue games and scored darts. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function startCueArcade(host,mode='pool'){
 host.innerHTML=`<section class="arc73"><div class="arc73-head"><strong>${mode==='pool'?'8-BALL POOL':'SNOOKER'} · ARCADE TABLE</strong><span class="arc73-score" aria-live="polite"></span></div><canvas width="900" height="480" aria-label="Interactive cue sports table" style="touch-action:none"></canvas><p>Drag back from the white cue ball to aim and set power, then release. Pot balls to score. Scratch penalties apply. Improved collision physics and shot feedback. This remains an arcade-rules table, not an official tournament referee.</p><div class="arc73-actions"><button data-reset>New rack</button><button data-guide aria-pressed="true">Aim guide: On</button><label class="v89-spin">Top/back spin <input type="range" data-spin min="-100" max="100" value="0" step="5"><output data-spin-value>0</output></label></div></section>`;
 const canvas=host.querySelector('canvas'),c=canvas.getContext('2d'),score=host.querySelector('.arc73-score');let balls=[],drag=null,guide=true,points=0,shots=0,frame=0,raf=0,pots=0,lastShot='Ready',shotPots=0,turn=0,groups=[null,null],firstHit=null,shotBalls=[],scratch=false,phase='red',colorsLeft=[2,3,4,5,6,7],gameOver=false,spin=0,referee=initialReferee(mode),beforeShot=[];
 const W=900,H=480,left=48,right=852,top=48,bottom=432,r=mode==='pool'?12:10;
 const pockets=[[left,top],[450,top],[right,top],[left,bottom],[450,bottom],[right,bottom]];
 function reset(){cancelAnimationFrame(raf);balls=[{x:230,y:240,vx:0,vy:0,color:'#fff',number:0,live:true}];points=shots=pots=shotPots=0;turn=0;groups=[null,null];firstHit=null;shotBalls=[];scratch=false;phase='red';colorsLeft=[2,3,4,5,6,7];gameOver=false;spin=0;host.querySelector('[data-spin]').value='0';host.querySelector('[data-spin-value]').textContent='0';lastShot='Ready';drag=null;referee=initialReferee(mode);
 if(mode==='pool'){let n=1;for(let row=0;row<5;row++)for(let j=0;j<=row;j++){const number=row===2&&j===1?8:(n===8?n++:n);if(number!==8)n++;balls.push({x:650+row*23,y:240+(j-row/2)*26,vx:0,vy:0,color:['#f3cb3b','#1c78c9','#da4447','#703eaf','#f18b39','#26946b','#a43c4e','#181818'][n%8],number,live:true})}}
 else {for(let i=0;i<15;i++){let row=Math.floor((Math.sqrt(8*i+1)-1)/2),j=i-row*(row+1)/2;balls.push({x:625+row*20,y:240+(j-row/2)*22,vx:0,vy:0,color:'#c92b42',number:1,live:true})}['#f2c63c','#258f59','#956f42','#3475cf','#ee9bb5','#171717'].forEach((color,i)=>balls.push({x:[380,420,470,500,530,560][i],y:240+(i%2?45:-45),vx:0,vy:0,color,number:[2,3,4,5,6,7][i],live:true}))}
 update();render()}
 function update(){score.textContent=`${gameOver?'Frame finished':mode==='pool'?'Player '+(turn+1)+(groups[turn]?' · '+groups[turn]:' · Open table'):'Snooker · '+(phase==='red'?'Red on':phase==='colour'?'Colour on':'Clear colours')} · ${mode==='snooker'?'Scores '+referee.scores.join('–'):'Shots '+shots} · Potted ${pots} · ${lastShot}`}
 function render(){renderPremiumCue(c,balls,{W,H,left,right,top,bottom,r,mode,pockets,drag,guide});}
 // Four physics substeps per frame reduce tunnelling on powerful shots.
 function tick(){
  let moving=false;
  for(let step=0;step<4;step++){
   for(let i=0;i<balls.length;i++){
    const a=balls[i];if(!a.live)continue;
    a.x+=a.vx/4;a.y+=a.vy/4;
    const friction=Math.pow(.982,1/4);a.vx*=friction;a.vy*=friction;
    if(Math.hypot(a.vx,a.vy)<.045)a.vx=a.vy=0;
    else moving=true;
    let potted=false;
    for(const [px,py] of pockets){
     if(Math.hypot(a.x-px,a.y-py)<21){
      if(a.number===0){a.live=false;a.vx=a.vy=0;scratch=true;lastShot='Cue ball potted'}else{a.live=false;a.vx=a.vy=0;shotBalls.push(a);pots++;shotPots++;lastShot='Potted '+(mode==='pool'?'ball '+a.number:a.number+' points')}
      potted=true;break;
     }
    }
    if(potted)continue;
    if(a.x<left+r||a.x>right-r){a.x=clamp(a.x,left+r,right-r);a.vx*=-.92}
    if(a.y<top+r||a.y>bottom-r){a.y=clamp(a.y,top+r,bottom-r);a.vy*=-.92}
    for(let j=i+1;j<balls.length;j++){
     const b=balls[j];if(!b.live)continue;
     const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.0001;
     if(d>=2*r)continue;
     const nx=dx/d,ny=dy/d,over=2*r-d;
     a.x-=nx*over/2;a.y-=ny*over/2;b.x+=nx*over/2;b.y+=ny*over/2;
     const relative=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
     if(relative>0){if(!firstHit&&(i===0||j===0))firstHit=(i===0?b:a).number;const impulse=relative*.985;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny}
    }
   }
  }
  if(!moving&&!balls[0].live){
   const cue=balls[0];
   // Place cue ball in the baulk area without overlapping other balls.
   let placed=false;
   for(let gx=220;gx>=left+3*r&&!placed;gx-=2*r)
    for(let gy=240;gy<=bottom-r&&!placed;gy+=2*r)
     if(balls.slice(1).every(b=>!b.live||Math.hypot(b.x-gx,b.y-gy)>2*r+2)){
      cue.x=gx;cue.y=gy;cue.live=true;placed=true;
     }
  }
  if(!moving&&raf)resolveShot();
  update();render();
  if(moving)raf=requestAnimationFrame(tick);else raf=0;
 }
 function resolveShot(sim){
  const before=beforeShot;
  referee=adjudicate(referee,before,sim,balls);
  turn=referee.turn;groups=referee.groups;phase=referee.phase;
  gameOver=referee.finished;lastShot=referee.message;
  if(mode==='snooker'){
   // Reds stay down; colours are returned except during the final clearance.
   if(referee.phase!=='clear'||referee.message.startsWith('Foul'))respotColours(balls,r);
  }
  if(referee.ballInHand)placeCueBall(balls,r);
  points=referee.scores[0];
 }
 function point(e){const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height}}
 canvas.addEventListener('pointerdown',e=>{if(raf||gameOver||!balls[0].live)return;drag=point(e);canvas.setPointerCapture(e.pointerId);render()});canvas.addEventListener('pointermove',e=>{if(drag){drag=point(e);render()}});
 canvas.addEventListener('pointerup',e=>{if(!drag||raf)return;const p=point(e),cue=balls[0];let dx=cue.x-p.x,dy=cue.y-p.y,d=Math.hypot(dx,dy);drag=null;if(d<8){render();return}let power=Math.min(d/18,16);cue.vx=dx/d*power;cue.vy=dy/d*power;cue.vx+=spin*0.012*dy/d;cue.vy-=spin*0.012*dx/d;shots++;shotPots=0;firstHit=null;shotBalls=[];scratch=false;lastShot='Shot '+shots;beforeShot=balls.map(b=>({...b}));
 const sim=simulateShot(balls,{angle:Math.atan2(dy,dx),power,spin,side:0,radius:r});
 firstHit=sim.firstHit;scratch=sim.potted.includes(0);
 shotBalls=sim.potted.filter(n=>n!==0).map(n=>({number:n}));
 pots+=shotBalls.length;shotPots=shotBalls.length;
 let f=0;const frames=sim.frames;
 const playback=()=>{if(!host.isConnected){raf=0;return}
  const frame=frames[Math.min(f,frames.length-1)];
  frame.forEach((v,i)=>{balls[i].x=v.x;balls[i].y=v.y;balls[i].live=v.live});
  render();if(++f<frames.length){raf=requestAnimationFrame(playback)}
  else{balls.forEach((b,i)=>{b.x=sim.balls[i].x;b.y=sim.balls[i].y;b.live=sim.balls[i].live;b.vx=b.vy=0});
   resolveShot(sim);raf=0;update();render()}
 };
 update();raf=requestAnimationFrame(playback)});
 host.querySelector('[data-spin]').oninput=e=>{spin=Number(e.target.value)/100;host.querySelector('[data-spin-value]').textContent=e.target.value};host.querySelector('[data-reset]').onclick=reset;host.querySelector('[data-guide]').onclick=e=>{guide=!guide;e.target.textContent='Aim guide: '+(guide?'On':'Off');e.target.setAttribute('aria-pressed',String(guide));render()};reset();
 return()=>cancelAnimationFrame(raf)
}

export function startDartsArcade(host){
 host.innerHTML=`<section class="arc73 v88-darts"><div class="arc73-head"><strong>🎯 DARTS · MATCH PLAY</strong><span class="arc73-score" aria-live="polite"></span></div>
 <div class="v88-scoreboard"><div><small>YOU</small><strong data-you>501</strong><small data-your-legs>Legs 0</small></div><div><small>VS</small><strong>🎯</strong><small data-visit>3 darts</small></div><div><small>COMPUTER</small><strong data-ai>501</strong><small data-ai-legs>Legs 0</small></div></div>
 <canvas width="600" height="600" aria-label="Interactive dartboard: tap to throw"></canvas>
 <div class="v88-options"><label>Starting score <select data-start><option value="501">501</option><option value="301">301</option></select></label><label>Opponent <select data-difficulty><option value="easy">Beginner</option><option value="medium" selected>Club player</option><option value="hard">Expert</option></select></label><label>Match <select data-legs><option value="1">1 leg</option><option value="3" selected>Best of 3</option><option value="5">Best of 5</option></select></label></div>
 <p>Tap the board to throw. Finish on a double or inner bull. Three darts per visit. The computer plays automatically. Use the checkout hint to plan your finish.</p>
 <div class="arc73-actions"><button data-reset>New match</button><button data-next>Finish visit / Computer throws</button></div><div class="v88-matchlog" role="status" aria-live="polite"></div></section>`;
 const canvas=host.querySelector('canvas'),c=canvas.getContext('2d'),score=host.querySelector('.arc73-score'),log=host.querySelector('.v88-matchlog');
 const nums=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
 let start=501,remaining=[501,501],legs=[0,0],throws=0,visit=501,hits=[],finished=false,waiting=false,history=[],timer=null;
 const el=q=>host.querySelector(q),random=(a,b)=>a+Math.random()*(b-a);
 function checkout(n){
  if(n>170||n<2)return 'Build your score';
  if(n===50)return 'Bull';
  if(n<=40&&n%2===0)return 'D'+n/2;
  for(let triple=20;triple>=1;triple--)for(let d=20;d>=1;d--)if(3*triple+2*d===n)return 'T'+triple+' · D'+d;
  for(let d=20;d>=1;d--)if(n-2*d>=1&&n-2*d<=20)return (n-2*d)+' · D'+d;
  return 'Set up a double';
 }
 function segment(x,y){
  const dx=x-300,dy=y-300,d=Math.hypot(dx,dy);
  if(d<=17)return {score:50,double:true,name:'Bull'};
  if(d<=38)return {score:25,double:false,name:'25'};
  if(d>255)return {score:0,double:false,name:'Miss'};
  const a=(Math.atan2(dy,dx)+Math.PI/2+Math.PI*2+Math.PI/20)%(Math.PI*2);
  const number=nums[Math.floor(a/(Math.PI/10))%20];
  const multi=d>=235?2:d>=141&&d<=156?3:1;
  return {score:number*multi,double:multi===2,name:(multi===3?'T':multi===2?'D':'')+number};
 }
 function dartTarget(n,skill){
  if(n<=40&&n%2===0)return {number:n/2,multi:2};
  if(n===50)return {number:25,multi:2};
  if(n<=60){for(let d=20;d>=1;d--)if(n-2*d>=1&&n-2*d<=20)return {number:n-2*d,multi:1}}
  if(n<=170&&n>=62){for(let t=20;t>=1;t--)for(let d=20;d>=1;d--)if(t*3+d*2===n)return {number:t,multi:3}}
  return {number:20,multi:3};
 }
 function aiThrow(){
  const difficulty=el('[data-difficulty]').value;
  const accuracy={easy:.38,medium:.67,hard:.86}[difficulty];
  const aim=dartTarget(remaining[1],accuracy);
  const idx=nums.indexOf(aim.number===25?20:aim.number);
  const angle=-Math.PI/2+idx*Math.PI/10;
  const radius=aim.number===25?9:aim.multi===3?149:aim.multi===2?242:105;
  const spread={easy:76,medium:34,hard:13}[difficulty];
  const x=300+Math.cos(angle)*radius+random(-spread,spread);
  const y=300+Math.sin(angle)*radius+random(-spread,spread);
  return segment(x,y);
 }
 function apply(player,hit){
  const before=remaining[player],after=before-hit.score;
  if(after<0||after===1||(after===0&&!hit.double))return {bust:true,win:false};
  remaining[player]=after;return {bust:false,win:after===0};
 }
 function draw(){
  c.clearRect(0,0,600,600);c.fillStyle='#102328';c.fillRect(0,0,600,600);
  for(let i=0;i<20;i++){
   const a0=-Math.PI/2-Math.PI/20+i*Math.PI/10,a1=a0+Math.PI/10;
   for(const [outer,inner,color] of [[255,0,i%2?'#eee6cb':'#222b2a'],[250,235,i%2?'#268e65':'#c73842'],[231,160,i%2?'#eee6cb':'#222b2a'],[156,141,i%2?'#268e65':'#c73842']]){
    c.beginPath();c.arc(300,300,outer,a0,a1);c.arc(300,300,inner,a1,a0,true);c.closePath();c.fillStyle=color;c.fill();
   }
   const a=-Math.PI/2+i*Math.PI/10;c.fillStyle='#f9dfac';c.font='bold 18px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(nums[i],300+Math.cos(a)*277,300+Math.sin(a)*277);
  }
  for(const [rad,col] of [[38,'#278f64'],[17,'#cc3748']]){c.beginPath();c.arc(300,300,rad,0,7);c.fillStyle=col;c.fill()}
  hits.forEach((h,i)=>{c.strokeStyle=i%2?'#fff7a8':'#ffce4b';c.lineWidth=3;c.beginPath();c.moveTo(h.x-8,h.y-8);c.lineTo(h.x+8,h.y+8);c.moveTo(h.x+8,h.y-8);c.lineTo(h.x-8,h.y+8);c.stroke()});
  el('[data-you]').textContent=remaining[0];el('[data-ai]').textContent=remaining[1];
  el('[data-your-legs]').textContent='Legs '+legs[0];el('[data-ai-legs]').textContent='Legs '+legs[1];
  el('[data-visit]').textContent=finished?'Match over':waiting?'Computer turn':(3-throws)+' darts left';
  score.textContent=finished?'Match finished':`Checkout: ${checkout(remaining[0])}`;
  el('[data-next]').disabled=finished||waiting;
  log.innerHTML=history.slice(-6).reverse().map(x=>`<div>${x}</div>`).join('');
 }
 function resetLeg(){remaining=[start,start];throws=0;visit=start;hits=[];waiting=false}
 function winLeg(player){
  legs[player]++;history.push((player?'Computer':'You')+' won the leg!');
  if(legs[player]>=Math.ceil(Number(el('[data-legs]').value)/2)){finished=true;history.push(player?'Computer wins the match.':'You win the match!')}
  else resetLeg();
 }
 function computerVisit(){
  if(finished)return;
  waiting=true;draw();
  timer=setTimeout(()=>{
   if(!host.isConnected)return;
   const from=remaining[1];let bust=false;
   for(let i=0;i<3&&!finished;i++){
    const hit=aiThrow(),result=apply(1,hit);
    if(result.bust){remaining[1]=from;bust=true;break}
    if(result.win){winLeg(1);break}
   }
   history.push('Computer: '+(bust?'bust':from+' → '+remaining[1]));
   waiting=false;throws=0;visit=remaining[0];hits=[];draw();
  },550);
 }
 canvas.addEventListener('click',e=>{
  if(finished||waiting||throws===3)return;
  const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*600/rect.width,y=(e.clientY-rect.top)*600/rect.height;
  const hit=segment(x,y);hits.push({x,y});throws++;
  const result=apply(0,hit);history.push('You: '+hit.name+(result.bust?' · BUST':''));
  if(result.bust){remaining[0]=visit;throws=3}
  if(result.win){winLeg(0);if(!finished){draw();computerVisit();return}}
  draw();if(throws===3&&!finished)computerVisit();
 });
 el('[data-next]').onclick=()=>{if(finished||waiting)return;computerVisit()};
 function reset(){clearTimeout(timer);start=Number(el('[data-start]').value);legs=[0,0];history=[];finished=false;resetLeg();draw()}
 el('[data-reset]').onclick=reset;
 reset();return()=>clearTimeout(timer);
}
