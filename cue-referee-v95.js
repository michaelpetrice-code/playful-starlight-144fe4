/**
 * Cue referee: pure state transition for local 8-ball and snooker matches.
 * Official-rule-inspired competitive mode. Rare re-rack, miss, free-ball and
 * referee-discretion cases are not automated; see RELEASE-v95.md.
 */
const group=n=>n>=1&&n<=7?'solids':n>=9&&n<=15?'stripes':n===8?'eight':null;
const other=i=>1-i;
export function initialReferee(kind){return {kind,turn:0,scores:[0,0],groups:[null,null],phase:'red',nextColour:2,redsRemaining:15,colourOn:null,shots:0,finished:false,winner:null,message:'Ready to break',ballInHand:false,breakShot:true};}
export function adjudicate(state,preBalls,shot,postBalls){
 const s={...state,scores:[...state.scores],groups:[...state.groups],shots:state.shots+1};
 const turn=s.turn,opp=other(turn),pots=shot.potted.filter(n=>n!==0),scratch=shot.potted.includes(0),first=shot.firstHit;
 const preLive=n=>preBalls.filter(b=>b.live&&(b.number??b.n)===n).length;
 const rail=shot.events.some(e=>e.type==='cushion'&&shot.firstHit!==null&&e.step>=(shot.events.find(x=>x.type==='first-contact')?.step??Infinity));
 if(s.kind==='pool'){
  const own=s.groups[turn],opGroup=own==='solids'?'stripes':'solids';
  const remaining=own?preBalls.some(b=>b.live&&group(b.number??b.n)===own):false;
  const legalFirst=own?(remaining?group(first)===own:first===8):(first!==null&&first!==8);
  const foul=scratch||!legalFirst||(!pots.length&&!rail);
  const eight=pots.includes(8);
  if(eight){
   const legal=!foul&&own&&!remaining;
   s.finished=true;s.winner=legal?turn:opp;
   s.message=legal?'Legal eight-ball finish':'Eight-ball foul or premature pot';
   return s;
  }
  if(!foul&&!own&&!s.breakShot){
   const assigned=pots.map(group).find(x=>x==='solids'||x==='stripes');
   if(assigned){s.groups[turn]=assigned;s.groups[opp]=assigned==='solids'?'stripes':'solids'}
  }
  const target=s.groups[turn];
  const keep=!foul&&pots.some(n=>group(n)===target);
  s.turn=keep?turn:opp;s.ballInHand=foul;
  s.message=foul?'Foul: ball in hand for opponent':keep?'Legal pot: continue':'End of visit';
  s.breakShot=false;
  return s;
 }
 // Snooker: nominate a colour when colour is on. Default is highest legal
 // first-contact colour, so the interface does not require an extra tap.
 const redsBefore=preLive(1);
 const phase=s.phase;
 const nominated=phase==='colour'?(s.colourOn??(first>=2&&first<=7?first:2)):phase==='clear'?s.nextColour:1;
 const wrongFirst=first!==nominated;
 const wrongPot=pots.some(n=>n!==nominated);
 const foul=scratch||wrongFirst||wrongPot||first===null;
 const penalty=foul?Math.max(4,nominated,first||0,...pots):0;
 if(foul){s.scores[opp]+=penalty;s.turn=opp;s.ballInHand=scratch;s.message=`Foul: ${penalty} points to opponent`;
  if(phase==='colour')s.phase=redsBefore?'red':'clear';
 }else{
  const points=pots.reduce((a,b)=>a+b,0);
  s.scores[turn]+=points;
  const redsAfter=postBalls.filter(b=>b.live&&(b.number??b.n)===1).length;
  if(pots.length){
   if(phase==='red')s.phase='colour';
   else if(phase==='colour'){s.phase=redsAfter?'red':'clear';s.colourOn=null}
   else if(phase==='clear')s.nextColour++;
   s.message=`Break +${points}`;
  }else{
   s.turn=opp;s.message='End of visit';
   if(phase==='colour')s.phase=redsBefore?'red':'clear';
   if(phase==='red'&&!redsBefore)s.phase='clear';
  }
 }
 if(s.phase==='clear'&&s.nextColour>7){
  s.finished=true;s.winner=s.scores[0]===s.scores[1]?null:s.scores[0]>s.scores[1]?0:1;
  s.message=s.winner===null?'Scores tied: respotted black required':'Frame complete';
 }
 s.breakShot=false;
 return s;
}
export function placeCueBall(balls,radius=12){
 const cue=balls.find(b=>(b.number??b.n)===0);
 if(!cue)return false;
 for(let x=220;x>=65;x-=12)for(let y=240;y>=80;y-=18){
  if(balls.every(b=>b===cue||!b.live||Math.hypot(b.x-x,b.y-y)>radius*2+2)){
   cue.x=x;cue.y=y;cue.live=true;cue.vx=cue.vy=0;return true;
  }
 }
 return false;
}
export function respotColours(balls,radius=10){
 const spots={2:[380,195],3:[420,285],4:[470,195],5:[500,285],6:[530,195],7:[560,285]};
 for(const ball of balls.filter(b=>!b.live&&(b.number??b.n)>=2&&(b.number??b.n)<=7)){
  const n=ball.number??ball.n;let [x,y]=spots[n];
  for(let k=0;k<45;k++){
   if(balls.every(b=>b===ball||!b.live||Math.hypot(b.x-x,b.y-y)>radius*2+2)){ball.x=x;ball.y=y;ball.live=true;break}
   x=spots[n][0]-Math.ceil((k+1)/2)*radius*2.3;y=spots[n][1]+(k%2?1:-1)*radius*2;
  }
 }
}
