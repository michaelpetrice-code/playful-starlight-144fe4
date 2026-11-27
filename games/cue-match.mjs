import {simulateShot,TABLE} from '../cue-physics-v94.js';
import {initialReferee,adjudicate,placeCueBall} from '../cue-referee-v95.js';
export function freshCueGame(kind='pool'){
 if(!['pool','snooker'].includes(kind))throw Error('Unknown cue game');
 const balls=[{id:0,n:0,x:215,y:240,live:true}];
 const add=(n,x,y)=>balls.push({id:balls.length,n,x,y,live:true});
 if(kind==='pool'){
  const order=[1,9,2,10,8,3,11,4,12,5,6,13,7,14,15];let k=0;
  for(let r=0;r<5;r++)for(let j=0;j<=r;j++)add(order[k++],635+r*21.1,240+(j-r/2)*24.4);
 }else{
  for(let r=0;r<5;r++)for(let j=0;j<=r;j++)add(1,640+r*17.6,240+(j-r/2)*20.4);
  for(const [n,x,y] of [[2,240,314],[3,240,166],[4,240,240],[5,450,240],[6,615,240],[7,780,240]])add(n,x,y);
 }
 return {kind,balls,referee:initialReferee(kind),version:0};
}
const number=b=>b.n??b.number;
export function legalCueTargets(game){const s=game.referee;
 if(game.kind==='snooker')return s.phase==='red'?[1]:s.phase==='clear'?[s.nextColour]:s.colourOn?[s.colourOn]:[2,3,4,5,6,7];
 const group=s.groups[s.turn];const targets=game.balls.filter(b=>b.live&&number(b)!==0&&number(b)!==8&&(!group||(group==='solids'?number(b)<8:number(b)>8))).map(number);
 return targets.length?targets:[8];
}
const spots={2:[240,314],3:[240,166],4:[240,240],5:[450,240],6:[615,240],7:[780,240],8:[635,240]};
function respot(game,ball,radius){const [sx,sy]=spots[number(ball)]||[215,240];
 for(let i=0;i<1000;i++){const angle=i*2.399963,dist=i?Math.sqrt(i)*(radius*1.1):0,x=sx+Math.cos(angle)*dist,y=sy+Math.sin(angle)*dist;
  if(x<TABLE.left+radius||x>TABLE.right-radius||y<TABLE.top+radius||y>TABLE.bottom-radius)continue;
  if(game.balls.every(b=>b===ball||!b.live||Math.hypot(b.x-x,b.y-y)>=radius*2+.1)){Object.assign(ball,{x,y,live:true,vx:0,vy:0});return;}
 }throw Error('No legal respot available');
}
export function cueTurn(initial,input){
 const game=structuredClone(initial),s=game.referee,r=game.kind==='snooker'?10:12;
 if(s.finished)throw Error('Match has finished');
 if(input.version!==game.version)throw Error('Outdated match state');
 if(input.actor!==s.turn)throw Error('Not your turn');
 if(input.position){
  if(!s.ballInHand)throw Error('Ball in hand is not available');
  const {x,y}=input.position;if(!Number.isFinite(x)||!Number.isFinite(y)||x<TABLE.left+r||x>TABLE.right-r||y<TABLE.top+r||y>TABLE.bottom-r)throw Error('Place the white within the cushions');
  if(game.kind==='snooker'&&(x>240||Math.hypot(x-240,y-240)>74))throw Error('Place the white in the D');
  if(game.balls.some(b=>b.live&&number(b)!==0&&Math.hypot(b.x-x,b.y-y)<2*r+.1))throw Error('The white overlaps another ball');
  Object.assign(game.balls.find(b=>number(b)===0),{x,y,live:true});
 }
 const before=structuredClone(game.balls),shot=simulateShot(before,{...input,radius:r});
 if(!shot.stopped)throw Error('Shot did not settle; no state was saved');
 game.balls=shot.balls;
 game.referee=adjudicate(s,before,shot,game.balls);const next=game.referee;
 if(game.kind==='pool'&&s.breakShot){
  const black=game.balls.find(b=>number(b)===8);
  if(shot.potted.includes(8)){respot(game,black,r);next.finished=false;next.winner=null;next.message='Eight on the break: respotted.';}
  const rails=new Set(shot.events.filter(e=>e.type==='cushion'&&e.ball!==0).map(e=>e.ball));
  const legal=shot.firstHit!==null&&!shot.potted.includes(0)&&(shot.potted.some(n=>n!==0)||rails.size>=4);
  next.turn=legal&&shot.potted.some(n=>n!==0)?s.turn:1-s.turn;next.ballInHand=!legal;
  if(!legal)next.message='Break foul: ball in hand for opponent.';
  next.groups=[null,null];
 }
 if(game.kind==='snooker'){
  // Reds stay down. Colours return only when required, never resurrecting an earlier clearance.
  for(const ball of game.balls.filter(b=>!b.live&&number(b)>=2&&number(b)<=7&&shot.potted.includes(number(b)))){
   if(s.phase!=='clear'||next.message.startsWith('Foul'))respot(game,ball,r);
  }
  const blackOnly=s.phase==='clear'&&s.nextColour===7;
  if(blackOnly&&(shot.potted.includes(7)||next.message.startsWith('Foul'))){
   if(next.scores[0]===next.scores[1]){next.finished=false;next.winner=null;next.phase='clear';next.nextColour=7;next.turn=1-s.turn;next.ballInHand=true;respot(game,game.balls.find(b=>number(b)===7),r);next.message='Scores tied: respotted black decides the frame.';}
   else{next.finished=true;next.winner=next.scores[0]>next.scores[1]?0:1;next.message='Frame complete.';}
  }
 }
 if(!game.balls.find(b=>number(b)===0).live){if(!placeCueBall(game.balls,r))throw Error('No legal cue-ball position');next.ballInHand=true;}
 game.version++;
 return {game,frames:shot.frames,shot:{firstHit:shot.firstHit,potted:shot.potted,events:shot.events},message:next.message};
}
export function computerCueShot(game,difficulty='normal',random=Math.random){
 const cue=game.balls.find(b=>number(b)===0),targets=legalCueTargets(game),objects=game.balls.filter(b=>b.live&&targets.includes(number(b)));
 const options=[];const radius=game.kind==='snooker'?10:12;
 const clearance=(ax,ay,bx,by,ignore)=>{const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;if(len<1e-8)return 0;return game.balls.reduce((min,o)=>{if(!o.live||ignore.includes(o))return min;const t=Math.max(0,Math.min(1,((o.x-ax)*dx+(o.y-ay)*dy)/len));return Math.min(min,Math.hypot(o.x-ax-t*dx,o.y-ay-t*dy));},Infinity);};
 for(const b of objects)for(const [px,py] of TABLE.pockets){const dx=px-b.x,dy=py-b.y,d=Math.hypot(dx,dy),gx=b.x-dx/d*radius*2,gy=b.y-dy/d*radius*2;
  if(d<1e-6)continue;const travel=Math.hypot(gx-cue.x,gy-cue.y);if(travel<1e-6)continue;const cut=((gx-cue.x)*dx+(gy-cue.y)*dy)/(travel*d);const blocked=clearance(cue.x,cue.y,gx,gy,[cue,b])<2*radius||clearance(b.x,b.y,px,py,[cue,b])<2*radius;const cost=d+travel+(blocked?2500:0)+(cut<0.15?1800:0)+(1-cut)*240;options.push({angle:Math.atan2(gy-cue.y,gx-cue.x),power:Math.min(19,Math.max(6,(d+travel)/65)),cost});
 }
 options.sort((a,b)=>a.cost-b.cost);let best=options[0]||{angle:0,power:8};
 if(difficulty!=='easy'){
  let value=-Infinity;for(const option of options.slice(0,difficulty==='hard'?12:4)){try{const out=cueTurn(game,{...option,version:game.version,actor:game.referee.turn});const ns=out.game.referee;const score=ns.finished?(ns.winner===game.referee.turn?10000:-10000):ns.ballInHand?-200:out.shot.potted.filter(n=>n!==0).length*60+(ns.turn===game.referee.turn?10:0)-option.cost/200;if(score>value){value=score;best=option;}}catch{}}
 }
 const spread=difficulty==='easy'?.11:difficulty==='normal'?.035:.008;
 return {...best,angle:best.angle+(random()-.5)*spread,power:Math.min(20,best.power),spin:0,side:0,actor:game.referee.turn,version:game.version};
}
