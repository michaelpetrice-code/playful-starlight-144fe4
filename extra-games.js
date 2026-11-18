
// Extra offline-friendly mini-games. Scores are posted through the existing app score API.
const puzzles=[
 {q:"Which number is the bullseye worth in standard darts?",a:["25","50","60"],correct:1},
 {q:"How many reds are on the table at the start of a snooker frame?",a:["12","15","16"],correct:1},
 {q:"What is the highest possible break in standard snooker?",a:["147","155","180"],correct:0},
 {q:"How many balls are in a standard eight-ball pool rack?",a:["12","15","16"],correct:1},
 {q:"What is a hat-trick in football?",a:["Three goals by one player","Three corners","Three penalties"],correct:0},
 {q:"What is a double top in darts?",a:["Double 10","Double 20","Treble 20"],correct:1},
 {q:"How many points is the black ball worth in snooker?",a:["5","6","7"],correct:2},
 {q:"How many players are on the pitch per football team at kick-off?",a:["10","11","12"],correct:1}
];
const emojis=['🍺','🎯','🎱','⚽','🏆','🍕','🎮','🚢'];
let mode='memory',memory=[],revealed=[],matched=[],turns=0,locked=false,quizIndex=0,quizScore=0,quizDone=false,guessSecret=0,guessCount=0,guessFinished=false;
const $=id=>document.getElementById(id);
function mix(a){return a.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v)}
function resetMemory(){memory=mix([...emojis.slice(0,6),...emojis.slice(0,6)]);revealed=[];matched=[];turns=0;locked=false}
function resetGuess(){guessSecret=Math.floor(Math.random()*100)+1;guessCount=0;guessFinished=false}
resetMemory();resetGuess();
function home(){return `<div class="mini-games-menu"><button data-mini="memory">🧠 Memory Match</button><button data-mini="higher">🃏 Higher or Lower</button><button data-mini="quiz">⚡ Lads' Sports Quiz</button><button data-mini="guess">🔢 Guess the Number</button></div>`}
export function extraGamesView(){return `<section class="panel"><h2>🎮 More games for the lads</h2><p class="muted">Four quick games for a bit of competition. No stakes or real-money betting.</p>${home()}<div id="miniGameArea"></div></section>`}
export function bindExtraGames({add,who,notice}){
 const score=async(g,p)=>{try{await add('game_score',{by:who(),game:g,points:p});notice(`${p} points recorded!`)}catch(e){notice('Could not save score: '+e.message)}};
 const draw=()=>{
 let html='';
 if(mode==='memory'){html=`<h3>🧠 Memory Match</h3><p>Match all six pairs. Turns: ${turns}</p><div class="mini-memory">${memory.map((v,i)=>`<button data-flip="${i}" ${matched.includes(i)?'disabled':''}>${matched.includes(i)||revealed.includes(i)?v:'?'}</button>`).join('')}</div><p>${matched.length===12?'All pairs found! 🏆':''}</p><button data-restart="memory">New game</button>`}
 if(mode==='higher'){html=`<h3>🃏 Higher or Lower</h3><p>Guess whether the next card is higher or lower. Ace is high. Equal cards end the run.</p><p id="higherStatus">Press Start to play</p><button id="startHigher">Start / Restart</button><div class="row"><button id="higherUp" disabled>Higher</button><button id="higherDown" disabled>Lower</button></div>`}
 if(mode==='quiz'){const q=puzzles[quizIndex];html=`<h3>⚡ Lads' Sports Quiz</h3><p>Question ${Math.min(quizIndex+1,puzzles.length)} of ${puzzles.length} · Score ${quizScore}</p>${quizDone?`<p>Finished! ${quizScore}/${puzzles.length} correct.</p><button data-restart="quiz">Play again</button>`:`<p><strong>${q.q}</strong></p><div class="mini-answers">${q.a.map((a,i)=>`<button data-answer="${i}">${a}</button>`).join('')}</div>`}`}
 if(mode==='guess'){html=`<h3>🔢 Guess the Number</h3><p>I'm thinking of a number between 1 and 100.</p><form id="guessForm"><input type="number" min="1" max="100" id="guessValue" required placeholder="Your guess" ${guessFinished?'disabled':''}><button ${guessFinished?'disabled':''}>Guess</button></form><p id="guessHint">Guesses: ${guessCount}</p><button data-restart="guess">New number</button>`}
 $('miniGameArea').innerHTML=html;
 document.querySelectorAll('[data-restart]').forEach(b=>b.onclick=()=>{if(mode==='memory')resetMemory();if(mode==='quiz'){quizIndex=0;quizScore=0;quizDone=false}if(mode==='guess')resetGuess();draw()});
 document.querySelectorAll('[data-flip]').forEach(b=>b.onclick=async()=>{let i=+b.dataset.flip;if(locked||matched.includes(i)||revealed.includes(i))return;revealed.push(i);if(revealed.length===2){turns++;if(memory[revealed[0]]===memory[revealed[1]]){matched.push(...revealed);revealed=[];draw();if(matched.length===12)await score('memory',Math.max(10,70-turns*3))}else{locked=true;draw();setTimeout(()=>{revealed=[];locked=false;if($('miniGameArea'))draw()},750)}}else draw()});
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=async()=>{if(+b.dataset.answer===puzzles[quizIndex].correct)quizScore++;quizIndex++;if(quizIndex===puzzles.length){quizDone=true;draw();await score('sportsquiz',quizScore*5)}else draw()});
 const gf=$('guessForm');if(gf)gf.onsubmit=async e=>{e.preventDefault();if(guessFinished)return;const v=+$('guessValue').value;if(!Number.isInteger(v)||v<1||v>100)return;guessCount++;if(v===guessSecret){guessFinished=true;draw();$('guessHint').textContent=`Correct in ${guessCount} guesses!`;await score('numberguess',Math.max(5,35-guessCount*3))}else{$('guessHint').textContent=`${v<guessSecret?'Higher!':'Lower!'} · Guesses: ${guessCount}`;$('guessValue').value='';$('guessValue').focus()}};
 const start=$('startHigher');if(start){let current=0,run=0,done=true;const status=$('higherStatus'),up=$('higherUp'),down=$('higherDown');const pick=()=>Math.floor(Math.random()*13)+1;start.onclick=()=>{current=pick();run=0;done=false;status.textContent=`Current card: ${current===1?'Ace':current===11?'Jack':current===12?'Queen':current===13?'King':current}`;up.disabled=down.disabled=false};const play=async higher=>{if(done)return;const next=pick(),correct=higher?next>current:next<current;if(correct){run++;current=next;status.textContent=`Correct! Next card: ${next}. Streak: ${run}`;if(run>=10){done=true;up.disabled=down.disabled=true;status.textContent=`10-card streak! 🏆`;await score('higherlower',30)}}else{done=true;up.disabled=down.disabled=true;status.textContent=`Next card was ${next}. Your streak: ${run}.`;if(run>0)await score('higherlower',Math.min(run*3,27))}};up.onclick=()=>play(true);down.onclick=()=>play(false)}}
 };
 document.querySelectorAll('[data-mini]').forEach(b=>b.onclick=()=>{mode=b.dataset.mini;draw()});draw()
}
