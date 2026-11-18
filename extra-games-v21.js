const questions = [
  ['How many reds start a snooker frame?', ['12','15','16'], 1],
  ['What is the bullseye worth in darts?', ['25','50','60'], 1],
  ['How many players start a football match per side?', ['10','11','12'], 1],
  ['How many balls are in an eight-ball pool rack?', ['12','15','16'], 1],
  ['What is a standard maximum snooker break?', ['147','155','180'], 0]
];
const symbols=['🍺','🎯','🎱','⚽','🏆','🎮'];
let selected='memory';
const el=id=>document.getElementById(id);
const shuffle=a=>a.map(v=>({v,k:Math.random()})).sort((a,b)=>a.k-b.k).map(x=>x.v);
let cards=[],visible=[],matched=[],moves=0,blocked=false;
let question=0,correct=0,finished=false;
let secret=0,guesses=0,guessed=false;
let currentCard=0,streak=0,cardEnded=true;
function newMemory(){cards=shuffle([...symbols,...symbols]);visible=[];matched=[];moves=0;blocked=false}
function newNumber(){secret=Math.floor(Math.random()*100)+1;guesses=0;guessed=false}
newMemory();newNumber();
export function extraGamesView(){return `<section class="panel"><h2>🎮 More games</h2><p>Quick games for everyone. No gambling or stakes.</p><div class="mini-games-menu">${[['memory','🧠 Memory Match'],['higher','🃏 Higher or Lower'],['quiz','⚡ Sports Quiz'],['guess','🔢 Guess the Number']].map(([id,label])=>`<button type="button" data-mini="${id}">${label}</button>`).join('')}</div><div id="miniGameArea"></div></section>`}
export function bindExtraGames({add,who,notice}){
  const score=async(name,points)=>{try{await add('game_score',{by:who(),game:name,points});notice(`${points} points recorded`)}catch(err){notice('Could not record score')}};
  const draw=()=>{
    const area=el('miniGameArea');if(!area)return;
    if(selected==='memory'){
      area.innerHTML=`<h3>Memory Match</h3><p>Turns: ${moves}</p><div class="mini-memory">${cards.map((v,i)=>`<button type="button" data-card="${i}" ${matched.includes(i)?'disabled':''}>${matched.includes(i)||visible.includes(i)?v:'?'}</button>`).join('')}</div><p>${matched.length===12?'All pairs matched!':''}</p><button type="button" id="memoryRestart">New game</button>`;
      el('memoryRestart').onclick=()=>{newMemory();draw()};
      area.querySelectorAll('[data-card]').forEach(button=>button.onclick=async()=>{
        const i=Number(button.dataset.card);if(blocked||visible.includes(i)||matched.includes(i))return;
        visible.push(i);
        if(visible.length===2){moves++;if(cards[visible[0]]===cards[visible[1]]){matched.push(...visible);visible=[];draw();if(matched.length===12)await score('memory',Math.max(10,70-moves*3))}else{blocked=true;draw();setTimeout(()=>{visible=[];blocked=false;draw()},800)}}else draw();
      });
    }
    if(selected==='quiz'){
      if(finished){area.innerHTML=`<h3>Sports Quiz</h3><p>Finished: ${correct} of ${questions.length} correct.</p><button id="quizRestart">Play again</button>`;el('quizRestart').onclick=()=>{question=0;correct=0;finished=false;draw()};return}
      const q=questions[question];area.innerHTML=`<h3>Sports Quiz</h3><p>Question ${question+1}/${questions.length} · Score ${correct}</p><p><strong>${q[0]}</strong></p><div class="mini-answers">${q[1].map((answer,i)=>`<button data-answer="${i}">${answer}</button>`).join('')}</div>`;
      area.querySelectorAll('[data-answer]').forEach(button=>button.onclick=async()=>{if(Number(button.dataset.answer)===q[2])correct++;question++;if(question>=questions.length){finished=true;draw();await score('sportsquiz',correct*5)}else draw()});
    }
    if(selected==='guess'){
      area.innerHTML=`<h3>Guess the Number</h3><p>Find the number between 1 and 100.</p><form id="numberForm"><input type="number" id="numberValue" min="1" max="100" required ${guessed?'disabled':''}><button ${guessed?'disabled':''}>Guess</button></form><p id="numberHint">${guesses} guesses${guessed?' · Correct!':''}</p><button id="numberRestart">New number</button>`;
      el('numberRestart').onclick=()=>{newNumber();draw()};
      el('numberForm').onsubmit=async event=>{event.preventDefault();if(guessed)return;const value=Number(el('numberValue').value);if(!Number.isInteger(value)||value<1||value>100)return;guesses++;if(value===secret){guessed=true;draw();await score('numberguess',Math.max(5,35-guesses*3))}else{el('numberHint').textContent=`${value<secret?'Higher!':'Lower!'} · ${guesses} guesses`;el('numberValue').value=''}};
    }
    if(selected==='higher'){
      area.innerHTML=`<h3>Higher or Lower</h3><p>Guess whether the next card is higher or lower (Ace = 1).</p><p id="cardStatus">${cardEnded?'Press Start to play':`Current card: ${currentCard} · Streak: ${streak}`}</p><button id="cardStart">Start / Restart</button><div class="row"><button id="cardHigher" ${cardEnded?'disabled':''}>Higher</button><button id="cardLower" ${cardEnded?'disabled':''}>Lower</button></div>`;
      el('cardStart').onclick=()=>{currentCard=Math.floor(Math.random()*13)+1;streak=0;cardEnded=false;draw()};
      const play=async higher=>{if(cardEnded)return;const next=Math.floor(Math.random()*13)+1;const win=higher?next>currentCard:next<currentCard;if(win){streak++;currentCard=next;if(streak===10){cardEnded=true;draw();el('cardStatus').textContent='Ten in a row!';await score('higherlower',30)}else draw()}else{cardEnded=true;draw();el('cardStatus').textContent=`Next card: ${next}. Streak: ${streak}`;if(streak)await score('higherlower',Math.min(27,streak*3))}};
      el('cardHigher').onclick=()=>play(true);el('cardLower').onclick=()=>play(false);
    }
  };
  document.querySelectorAll('[data-mini]').forEach(button=>button.onclick=()=>{selected=button.dataset.mini;draw()});
  draw();
}
