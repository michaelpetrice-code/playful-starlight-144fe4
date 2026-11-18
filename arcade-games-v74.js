
/* Arcade v74: self-contained offline games; no third-party calls. */
const R=n=>Math.floor(Math.random()*n);
const shell=(root,title,subtitle)=>{root.innerHTML=`<section class="v74"><div class="v74-head"><div><small>THE LOCAL • ARCADE</small><h2>${title}</h2><p>${subtitle}</p></div><button class="v74-restart">↻ New game</button></div><div class="v74-play"></div><div class="v74-foot" aria-live="polite"></div></section>`;return [root.querySelector('.v74-play'),root.querySelector('.v74-foot'),root.querySelector('.v74-restart')]};
export function startBattleships(root){
 const [play,status,restart]=shell(root,'BATTLESHIPS','You vs computer · two fleets · first to sink all ships wins');
 let enemy,player,shots,aiShots,over,turns;
 function makeFleet(){const occupied=new Set(),ships=[];for(const size of [5,4,3,3,2]){let placed=false;for(let tries=0;tries<2000&&!placed;tries++){const x=R(10),y=R(10),horizontal=R(2)===1;const cells=Array.from({length:size},(_,i)=>[x+(horizontal?i:0),y+(horizontal?0:i)]);if(cells.every(([cx,cy])=>cx<10&&cy<10&&[-1,0,1].every(dx=>[-1,0,1].every(dy=>!occupied.has((cy+dy)*10+cx+dx))))){const ship=new Set(cells.map(([cx,cy])=>cy*10+cx));ships.push(ship);ship.forEach(v=>occupied.add(v));placed=true}}if(!placed)throw Error('Fleet placement failed')}return {occupied,ships}}
 function reset(){enemy=makeFleet();player=makeFleet();shots=new Set();aiShots=new Set();turns=0;over='';draw()}
 function hits(f,attacks){return [...f.occupied].filter(x=>attacks.has(x)).length}
 function board(f,attacks,reveal){return '<div class="v74-grid v74-sea">'+Array.from({length:100},(_,i)=>{const hit=attacks.has(i),ship=f.occupied.has(i),sunk=f.ships.some(c=>[...c].every(x=>attacks.has(x))&&c.has(i));return `<button type="button" data-cell="${i}" aria-label="${String.fromCharCode(65+i%10)}${Math.floor(i/10)+1}" class="${hit?(ship?'hit':'miss'):reveal&&ship?'v80-ship':''} ${sunk?'v80-sunk':''}" ${hit||over||reveal?'disabled':''}>${hit?(ship?'✹':'·'):reveal&&ship?'▰':' '}</button>`}).join('')+'</div>'}
 function draw(){play.innerHTML=`<div class="v80-battle"><div><h3>Enemy waters</h3>${board(enemy,shots,false)}</div><div><h3>Your fleet</h3>${board(player,aiShots,true)}</div></div>`;status.textContent=over?`${over} · ${turns} turns`:`You: ${hits(enemy,shots)}/${enemy.occupied.size} hits · Computer: ${hits(player,aiShots)}/${player.occupied.size} hits`;
 play.querySelectorAll('.v80-battle>div:first-child [data-cell]').forEach(b=>b.onclick=()=>{const cell=+b.dataset.cell;if(shots.has(cell)||over)return;shots.add(cell);turns++;if(hits(enemy,shots)===enemy.occupied.size){over='YOU WIN';draw();return}const available=Array.from({length:100},(_,i)=>i).filter(i=>!aiShots.has(i));if(available.length){const activeHits=[...aiShots].filter(i=>player.occupied.has(i)&&!player.ships.some(ship=>ship.has(i)&&[...ship].every(c=>aiShots.has(c))));
const candidate=available.filter(i=>activeHits.some(j=>Math.abs(Math.floor(i/10)-Math.floor(j/10))+Math.abs(i%10-j%10)===1));
const hunt=available.filter(i=>(Math.floor(i/10)+i%10)%2===0);
const choices=candidate.length?candidate:hunt.length?hunt:available;
aiShots.add(choices[R(choices.length)])}if(hits(player,aiShots)===player.occupied.size)over='COMPUTER WINS';draw()})}
 restart.onclick=reset;reset()
}
const puzzles=[
 {words:['ARCADE','GAMES','FRIENDS','LOCAL','DARTS','POOL'],size:10},
 {words:['BATTLE','WINNER','SCORE','PUZZLE','CLUB','PLAYER'],size:10},
 {words:['SNooker'.toUpperCase(),'CARDS','ROUND','SPORT','TABLE','MATCH'],size:10}
];
export function startWordSearch(root){
 const [play,status,restart]=shell(root,'WORD SEARCH','Select the first and last letters of a word');
 let grid,words,found,first,foundCells;
 function reset(){const p=puzzles[R(puzzles.length)];words=[];found=new Set();foundCells=new Set();first=null;grid=Array.from({length:100},()=>null);
 for(const word of p.words){for(let attempt=0;attempt<200;attempt++){let dx=[0,1,1,-1][R(4)],dy=[1,0,1,1][R(4)],x=R(10),y=R(10);let cells=[...word].map((_,i)=>[x+i*dx,y+i*dy]);if(cells.every(([a,b],i)=>a>=0&&a<10&&b>=0&&b<10&&(!grid[b*10+a]||grid[b*10+a]===word[i]))){cells.forEach(([a,b],i)=>grid[b*10+a]=word[i]);words.push(word);break}}}
 grid=grid.map(x=>x||'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[R(26)]);draw()}
 function draw(){play.innerHTML=`<div class="v74-words">${words.map(w=>`<span class="${found.has(w)?'done':''}">${w}</span>`).join('')}</div><div class="v74-grid v74-letters">${grid.map((c,i)=>`<button data-i="${i}" class="${first===i?'selected':foundCells.has(i)?'done':''}">${c}</button>`).join('')}</div>`;status.textContent=found.size===words.length?'ALL WORDS FOUND!':`${found.size}/${words.length} found · tap two endpoints`;play.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{let end=+b.dataset.i;if(first===null){first=end;draw();return}let ax=first%10,ay=Math.floor(first/10),bx=end%10,by=Math.floor(end/10),dx=Math.sign(bx-ax),dy=Math.sign(by-ay),len=Math.max(Math.abs(bx-ax),Math.abs(by-ay))+1;let valid=(ax===bx||ay===by||Math.abs(bx-ax)===Math.abs(by-ay));let str=valid?Array.from({length:len},(_,k)=>grid[(ay+k*dy)*10+ax+k*dx]).join(''):'';let match=words.find(w=>!found.has(w)&&(w===str||w===str.split('').reverse().join('')));if(match){found.add(match);for(let k=0;k<len;k++)foundCells.add((ay+k*dy)*10+ax+k*dx)}first=null;draw()})}
 restart.onclick=reset;reset()
}
const crossPuzzles=[
 {rows:['POOL#','A#V##','S#E##','S#N##'],clues:['Across: POOL — cue sport (4)','Down: PASS — move to another player (4)','Down: OVEN — kitchen appliance (4)']},
 {rows:['DARTS','A#O##','R#U##','T#N##','S#D##'],clues:['Across: DARTS — target sport (5)','Down: DARTS — arrows thrown at a board (5)','Down: ROUND — a turn of play (5)']}
];
export function startCrossword(root){
 const [play,status,restart]=shell(root,'CROSSWORD','Fill the grid, then check your answers');
 let puzzle,values,checked;
 function reset(){puzzle=crossPuzzles[R(crossPuzzles.length)];values=Array.from({length:puzzle.rows.join('').length},()=>'');checked=false;draw()}
 function draw(){const answer=puzzle.rows.join(''),cols=puzzle.rows[0].length;
 play.innerHTML=`<div class="v74-cross" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${[...answer].map((c,i)=>c==='#'?'<span class="blocked"></span>':`<input maxlength="1" aria-label="Row ${Math.floor(i/cols)+1} column ${i%cols+1}" data-i="${i}" value="${values[i]}" autocomplete="off" autocapitalize="characters" spellcheck="false" ${checked&&values[i]&&values[i]!==c?'style="border-color:#ff6e75"':''}>`).join('')}</div><div class="v74-clues">${puzzle.clues.map(c=>`<p>${c}</p>`).join('')}</div><button class="v74-check">Check answers</button>`;
 play.querySelectorAll('input').forEach(input=>input.oninput=()=>{const i=+input.dataset.i;values[i]=input.value.toUpperCase().replace(/[^A-Z]/g,'');input.value=values[i];checked=false;const next=[...play.querySelectorAll('input')].find(x=>+x.dataset.i>i&&!x.value);next?.focus()});
 play.querySelector('.v74-check').onclick=()=>{checked=true;const correct=values.filter((v,i)=>answer[i]!=='#'&&v===answer[i]).length,total=[...answer].filter(c=>c!=='#').length;status.textContent=correct===total?'PERFECT — CROSSWORD COMPLETE!':`${correct} of ${total} correct · incorrect letters highlighted`;draw()};
 }
 restart.onclick=reset;reset()
}
export function startBlocks(root){
 const [play,status,restart]=shell(root,'BLOCK DROP','Move and rotate falling blocks · clear lines');
 const W=10,H=18,shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0],[1,0],[1,1]],[[0,1],[0,1],[1,1]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]];
 let board,piece,x,y,score,over,timer,paused=false,lines=0,nextPiece=null;
 const collide=(px,py,s)=>s.some((row,j)=>row.some((v,i)=>v&&(px+i<0||px+i>=W||py+j>=H||(py+j>=0&&board[py+j][px+i]))));
 function spawn(){piece=(nextPiece||shapes[R(shapes.length)]).map(r=>r.slice());nextPiece=shapes[R(shapes.length)];x=3;y=0;if(collide(x,y,piece))over=true}
 function reset(){clearInterval(timer);board=Array.from({length:H},()=>Array(W).fill(0));score=0;lines=0;nextPiece=null;over=false;paused=false;spawn();timer=setInterval(()=>{if(!root.isConnected||!root.querySelector(".v74")){clearInterval(timer);return}tick()},550);draw()}
 function lock(){piece.forEach((row,j)=>row.forEach((v,i)=>{if(v&&y+j>=0)board[y+j][x+i]=1}));for(let j=H-1;j>=0;j--)if(board[j].every(Boolean)){board.splice(j,1);board.unshift(Array(W).fill(0));score+=100*(1+Math.floor(lines/10));lines++;j++}spawn()}
 function tick(){if(paused)return;if(over){clearInterval(timer);draw();return}if(!collide(x,y+1,piece))y++;else lock();draw()}
 function move(dx){if(!over&&!paused&&!collide(x+dx,y,piece)){x+=dx;draw()}}
 function rotate(){if(paused||over)return;const next=piece[0].map((_,i)=>piece.map(r=>r[i]).reverse());if(!collide(x,y,next)){piece=next;draw()}}
 function drop(){if(over||paused)return;while(!collide(x,y+1,piece))y++;tick()}
 function draw(){let grid=board.map(r=>r.slice());if(!over)piece.forEach((r,j)=>r.forEach((v,i)=>{if(v&&y+j>=0&&y+j<H)grid[y+j][x+i]=2}));play.innerHTML=`<div class="v74-grid v74-blocks">${grid.flat().map(v=>`<span class="b${v}"></span>`).join('')}</div><div class="v87-next">Next piece: <span class="v87-mini">${nextPiece.map(row=>row.map(v=>v?"■":"·").join(" ")).join(" / ")}</span> · Level ${1+Math.floor(lines/10)} · Lines ${lines}</div><div class="v74-controls"><button data-m="-1">◀</button><button data-rotate>⟳</button><button data-m="1">▶</button><button data-drop>▼ Drop</button><button data-pause>${paused?"▶ Resume":"Ⅱ Pause"}</button></div>`;status.textContent=over?`GAME OVER · ${score} points`:`Score ${score} · ${paused?"PAUSED":"clear rows to score"}`;play.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>move(+b.dataset.m));play.querySelector('[data-rotate]').onclick=rotate;play.querySelector('[data-drop]').onclick=drop;play.querySelector('[data-pause]').onclick=()=>{paused=!paused;draw()}}
 const key=e=>{if(!root.isConnected||!root.querySelector('.v74')){document.removeEventListener('keydown',key);return}if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key)){if(!root.closest('[hidden]'))e.preventDefault();({ArrowLeft:()=>move(-1),ArrowRight:()=>move(1),ArrowDown:tick,ArrowUp:rotate,' ':drop}[e.key])()}};
 document.addEventListener('keydown',key);restart.onclick=reset;reset()
}
