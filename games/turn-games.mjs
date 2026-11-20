import {freshCueGame,cueTurn} from './cue-match.mjs';
export const onlineKinds=['noughts','connect','reversi','battleships','darts301','darts501','pool','snooker'];
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function freshGame(kind,random=Math.random){
 if(!onlineKinds.includes(kind))throw Error('Unsupported game');
 const s={kind,turn:0,finished:false,winner:null,moves:0};
 if(['pool','snooker'].includes(kind))s.cue=freshCueGame(kind);
 if(['connect','noughts','reversi'].includes(kind))s.board=Array(kind==='connect'?42:kind==='noughts'?9:64).fill(0);
 if(kind==='reversi'){s.board[27]=s.board[36]=2;s.board[28]=s.board[35]=1;}
 if(kind==='battleships'){s.fleets=[fleet(random),fleet(random)];s.shots=[[],[]];}
 if(kind.startsWith('darts')){s.scores=[Number(kind.slice(5)),Number(kind.slice(5))];s.darts=0;s.visitStart=s.scores[0];s.last=null;}
 return s;
}
function fleet(random){const ships=[],used=new Set();for(const length of [4,3,2]){let placed=false;for(let n=0;n<1000&&!placed;n++){const row=Math.floor(random()*8),col=Math.floor(random()*8),horizontal=random()<.5;if(horizontal?col+length>8:row+length>8)continue;const cells=Array.from({length},(_,i)=>(row+(horizontal?0:i))*8+col+(horizontal?i:0));if(cells.some(c=>used.has(c)))continue;cells.forEach(c=>used.add(c));ships.push(cells);placed=true;}if(!placed)throw Error('Fleet placement failed');}return ships;}
export function reversiFlips(board,cell,player){if(!integer(cell,0,63)||board[cell])return [];const out=[],r=cell>>3,c=cell%8;for(const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){let y=r+dr,x=c+dc,run=[];while(y>=0&&y<8&&x>=0&&x<8&&board[y*8+x]===3-player){run.push(y*8+x);y+=dr;x+=dc;}if(run.length&&y>=0&&y<8&&x>=0&&x<8&&board[y*8+x]===player)out.push(...run);}return out;}
export function dartHit(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1.2||Math.abs(y)>1.2)throw Error('Invalid dart aim');const r=Math.hypot(x,y);if(r>1)return {points:0,double:false,label:'Miss'};if(r<=18/220)return {points:50,double:true,label:'Bullseye'};if(r<=37/220)return {points:25,double:false,label:'Outer bull'};const a=(Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2),order=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5],n=order[Math.floor(((a+Math.PI/20)%(Math.PI*2))/(Math.PI/10))],m=r>=183/220&&r<=198/220?2:r>=105/220&&r<=120/220?3:1;return {points:n*m,double:m===2,label:(m===3?'Treble ':m===2?'Double ':'Single ')+n};}
function lineWinner(board,width,height,needed){for(let r=0;r<height;r++)for(let c=0;c<width;c++){const player=board[r*width+c];if(!player)continue;for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){if(r+dr*(needed-1)>=height||c+dc*(needed-1)<0||c+dc*(needed-1)>=width)continue;if(Array.from({length:needed},(_,n)=>board[(r+dr*n)*width+c+dc*n]).every(v=>v===player))return player-1;}}return null;}
export function turnGame(initial,actor,move){
 const s=structuredClone(initial);if(s.finished)throw Error('Match finished');if(actor!==s.turn)throw Error('Not your turn');const player=actor+1;
 if(s.kind==='noughts'){if(!integer(move.cell,0,8)||s.board[move.cell])throw Error('Choose an empty square');s.board[move.cell]=player;s.winner=lineWinner(s.board,3,3,3);s.finished=s.winner!==null||s.board.every(Boolean);}
 else if(s.kind==='connect'){if(!integer(move.column,0,6))throw Error('Choose a column');let cell=-1;for(let row=5;row>=0;row--)if(!s.board[row*7+move.column]){cell=row*7+move.column;break;}if(cell<0)throw Error('Column full');s.board[cell]=player;s.winner=lineWinner(s.board,7,6,4);s.finished=s.winner!==null||s.board.every(Boolean);}
 else if(s.kind==='reversi'){const flips=reversiFlips(s.board,move.cell,player);if(!flips.length)throw Error('Illegal Reversi move');s.board[move.cell]=player;flips.forEach(c=>s.board[c]=player);const legal=p=>s.board.some((_,i)=>reversiFlips(s.board,i,p).length);if(!legal(3-player)&&!legal(player)){s.finished=true;const a=s.board.filter(v=>v===1).length,b=s.board.filter(v=>v===2).length;s.winner=a===b?null:a>b?0:1;}s.turn=legal(3-player)?1-actor:actor;}
 else if(s.kind==='battleships'){if(!integer(move.cell,0,63)||s.shots[actor].some(h=>h.cell===move.cell))throw Error('Choose an untried square');const enemy=s.fleets[1-actor],ship=enemy.find(a=>a.includes(move.cell));const hit={cell:move.cell,hit:!!ship,sunk:false};s.shots[actor].push(hit);if(ship&&ship.every(c=>s.shots[actor].some(h=>h.cell===c))){for(const h of s.shots[actor])if(ship.includes(h.cell))h.sunk=true;}if(enemy.flat().every(c=>s.shots[actor].some(h=>h.cell===c))){s.finished=true;s.winner=actor;}s.last=hit;}
 else if(s.kind.startsWith('darts')){const h=dartHit(move.x,move.y);if(s.darts===0)s.visitStart=s.scores[actor];const next=s.scores[actor]-h.points,bust=next<0||next===1||(next===0&&!h.double);s.darts++;s.scores[actor]=bust?s.visitStart:next;s.last={...h,bust};if(next===0&&!bust){s.finished=true;s.winner=actor;}else if(bust||s.darts===3){s.darts=0;s.turn=1-actor;}else s.turn=actor;}
 else if(['pool','snooker'].includes(s.kind)){const out=cueTurn(s.cue,{...move,actor,version:s.cue.version});s.cue=out.game;s.turn=out.game.referee.turn;s.finished=out.game.referee.finished;s.winner=out.game.referee.winner;s.last={message:out.message,potted:out.shot.potted};}
 else throw Error('Unsupported game');
 if(['noughts','connect','battleships'].includes(s.kind)&&!s.finished)s.turn=1-actor;
 s.moves++;return s;
}
export function playerView(state,actor){if(![0,1].includes(actor))throw Error('Not a participant');const s=structuredClone(state);if(s.kind==='battleships'){s.ownFleet=s.fleets[actor];delete s.fleets;}return s;}
