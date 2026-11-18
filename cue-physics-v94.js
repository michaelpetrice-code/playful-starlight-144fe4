/** Fixed-step, deterministic 2D cue-ball physics. All positions in canvas units. */
export const TABLE={left:48,right:852,top:48,bottom:432,pockets:[[48,48],[450,48],[852,48],[48,432],[450,432],[852,432]]};
export function simulateShot(initial,{angle,power,spin=0,side=0,radius=12,maxSteps=1800}={}){
 if(!Number.isFinite(angle)||!Number.isFinite(power)||power<0||power>20||!Number.isFinite(spin)||!Number.isFinite(side))throw Error('Invalid shot');
 const balls=initial.map(b=>({...b,vx:0,vy:0,rotation:0})),cue=balls.find(b=>b.number===0||b.n===0);
 if(!cue||!cue.live)throw Error('No cue ball');
 cue.vx=Math.cos(angle)*power;cue.vy=Math.sin(angle)*power;cue.spin=Math.max(-1,Math.min(1,spin));cue.side=Math.max(-1,Math.min(1,side));
 const events=[],frames=[],pocketRadius=radius*1.85,dt=.5,restitution=.965;
 let firstHit=null,cushionAfterContact=false,stopped=false;
 const magnitude=b=>Math.hypot(b.vx,b.vy);
 for(let step=0;step<maxSteps;step++){
  let moving=false;
  for(const b of balls){if(!b.live)continue;
   if(magnitude(b)>.028)moving=true;
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   const drag=Math.pow(.984,dt);b.vx*=drag;b.vy*=drag;
   if(b===cue&&b.spin){const forward=b.spin*.0025;const sideways=b.side*.0018;const vx=b.vx,vy=b.vy;b.vx+=vx*forward-vy*sideways;b.vy+=vy*forward+vx*sideways;b.spin*=.995;b.side*=.995}
   for(const [px,py] of TABLE.pockets){if(Math.hypot(b.x-px,b.y-py)<pocketRadius){b.live=false;b.vx=b.vy=0;events.push({type:'pot',ball:b.number??b.n,step});break}}
   if(!b.live)continue;
   if(b.x<TABLE.left+radius||b.x>TABLE.right-radius){b.x=Math.max(TABLE.left+radius,Math.min(TABLE.right-radius,b.x));b.vx*=-restitution;events.push({type:'cushion',ball:b.number??b.n,step});if(firstHit!==null)cushionAfterContact=true}
   if(b.y<TABLE.top+radius||b.y>TABLE.bottom-radius){b.y=Math.max(TABLE.top+radius,Math.min(TABLE.bottom-radius,b.y));b.vy*=-restitution;events.push({type:'cushion',ball:b.number??b.n,step});if(firstHit!==null)cushionAfterContact=true}
  }
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
   const a=balls[i],b=balls[j];if(!a.live||!b.live)continue;
   const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||1e-8;if(dist>=radius*2)continue;
   const nx=dx/dist,ny=dy/dist,overlap=radius*2-dist;
   a.x-=nx*overlap*.5;a.y-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;
   const normal=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
   if(normal<=0)continue;
   const impulse=normal*(1+restitution)/2;
   a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
   const an=a.number??a.n,bn=b.number??b.n;
   if(firstHit===null&&(an===0||bn===0)){firstHit=an===0?bn:an;events.push({type:'first-contact',ball:firstHit,step})}
   events.push({type:'collision',a:an,b:bn,step});
  }
  if(step%8===0)frames.push(balls.map(b=>({x:+b.x.toFixed(3),y:+b.y.toFixed(3),live:b.live})));
  if(!moving){stopped=true;break}
 }
 return {balls,events,frames,firstHit,cushionAfterContact,stopped,potted:events.filter(e=>e.type==='pot').map(e=>e.ball)};
}
/** Basic eight-ball adjudication; excludes break-shot special rules. */
export function judgeEightBall({firstHit,potted=[],cuePotted=false,group=null,ownRemaining=0,railAfterHit=false,openTable=group===null}){
 const kind=n=>n===8?'eight':n>=1&&n<=7?'solids':n>=9&&n<=15?'stripes':null;
 const legalFirst=openTable?firstHit!==null&&firstHit!==8:(ownRemaining?kind(firstHit)===group:firstHit===8);
 const foul=cuePotted||!legalFirst||(!potted.length&&!railAfterHit);
 const eight=potted.includes(8);
 if(eight)return {foul,finished:true,shooterWins:!foul&&!openTable&&ownRemaining===0,reason:foul?'Foul on eight ball':ownRemaining?'Eight ball potted early':'Eight ball legally potted'};
 const assign=openTable&&!foul?potted.map(kind).find(k=>k==='solids'||k==='stripes')||null:null;
 return {foul,finished:false,assign,keepTurn:!foul&&potted.some(n=>kind(n)===(group||assign)),reason:foul?'Foul · ball in hand':'Shot complete'};
}
/** Basic snooker turn adjudication: red / colour / ordered colours. */
export function judgeSnooker({phase='red',nextColour=2,firstHit,potted=[],cuePotted=false}){
 const target=phase==='red'?1:phase==='clear'?nextColour:null;
 const wrongContact=firstHit===null||(target!==null&&firstHit!==target)||(phase==='colour'&&firstHit===1);
 const wrongPot=potted.some(n=>phase==='red'?n!==1:phase==='colour'?n===1:n!==nextColour);
 const foul=cuePotted||wrongContact||wrongPot;
 const penalty=foul?Math.max(4,firstHit||0,...potted):0;
 const points=foul?0:potted.reduce((a,b)=>a+b,0);
 return {foul,penalty,points,keepTurn:!foul&&potted.length>0,reason:foul?`Foul · ${penalty} to opponent`:`Break +${points}`};
}
