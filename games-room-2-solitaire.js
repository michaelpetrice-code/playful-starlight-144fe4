import {freshKlondike,applyKlondike,klondikeHint,validKlondikeSave} from './games/klondike.mjs';
const suits=['♠','♥','♦','♣'],ranks=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function mount({root,say,record,coach,registerCleanup}){
 const storageKey='tl2-klondike-resume-v2';let state=null,selected=null,history=[],recorded=false;
 try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&validKlondikeSave(saved.state)){state=saved.state;recorded=!!saved.recorded;}}catch{}
 state||=freshKlondike();
 const shell=document.createElement('div');shell.className='tl2-solitaire';shell.innerHTML='<div class="tl2-toolbar"><strong>KLONDIKE SOLITAIRE</strong><span class="tl2-score"></span><button type="button" data-action="undo">Undo</button><button type="button" data-action="hint">Hint</button><button type="button" data-action="auto">Auto foundations</button><label>Draw <select data-action="draw"><option value="1">1</option><option value="3">3</option></select></label><button type="button" data-action="new">New deal</button></div><div class="tl2-board"><div class="tl2-top"></div><div class="tl2-columns"></div></div><p class="tl2-help">Select a face-up card, then its destination. Kings start empty columns; foundations build by suit from Ace. Your deal resumes on this device.</p>';
 root.replaceChildren(shell);const top=shell.querySelector('.tl2-top'),columns=shell.querySelector('.tl2-columns'),stat=shell.querySelector('.tl2-score');
 const label=c=>ranks[c.rank]+suits[c.suit];
 function store(){try{localStorage.setItem(storageKey,JSON.stringify({state,recorded}));}catch{}}
 function move(action){try{const next=applyKlondike(state,action);history.push(structuredClone(state));if(history.length>100)history.shift();state=next;selected=null;finish();render();return true;}catch(e){say(e.message);return false;}}
 function finish(){if(state.won){if(!recorded){recorded=true;record('wins');}say('Congratulations! You completed this deal.');}else say('Move saved. '+state.moves+' moves.');}
 function restore(){if(!history.length){say('No move to undo.');return;}state=history.pop();selected=null;render();say('Last move undone.');}
 function hint(){const h=klondikeHint(state);if(!h){say('No legal move found. Try Undo or a new deal.');return;}if(h.type==='draw'){say('Draw from or recycle the stock.');return;}const from=h.from.kind==='waste'?'the waste':'column '+(h.from.pile+1);say('Move from '+from+' to '+(h.type==='foundation'?'the '+suits[h.to]+' foundation':'column '+(h.to+1))+'.');}
 function fresh(){state=freshKlondike(Number(shell.querySelector('select').value));selected=null;history=[];recorded=false;render();say('New deal. Build descending alternating-colour columns.');}
 function card(c,action,description,chosen=false){const b=document.createElement('button');b.type='button';b.className='tl2-card'+(c&&(c.suit===1||c.suit===2)?' red':'')+(c&&!c.up?' back':'')+(chosen?' chosen':'');b.textContent=c?(c.up?label(c):'✦'):description;b.setAttribute('aria-label',c?(c.up?label(c):'Face-down card'):description);b.disabled=!!c&&!c.up&&description!=='Stock';b.onclick=action;return b;}
 function columnClick(pile,index){if(selected&&selected.kind!=='column'||selected&&selected.pile!==pile){if(index===state.cols[pile].length-1&&move({type:'column',from:selected,to:pile}))return;}selected={kind:'column',pile,index};render();}
 function render(){stat.textContent='Moves '+state.moves+' · Score '+state.score;top.replaceChildren();columns.replaceChildren();shell.querySelector('select').value=state.drawCount;
  top.append(card(state.stock.at(-1),()=>move({type:'draw'}),state.stock.length?'Stock':state.waste.length?'Recycle':'Empty'));
  top.append(card(state.waste.at(-1),()=>{if(state.waste.length){selected={kind:'waste'};render();}},'Waste',selected?.kind==='waste'));
  top.append(document.createElement('div'));
  state.foundations.forEach((pile,i)=>top.append(card(pile.at(-1),()=>{if(selected)move({type:'foundation',from:selected,to:i});else if(pile.length){selected={kind:'foundation',pile:i};render();}},suits[i]+' foundation',selected?.kind==='foundation'&&selected.pile===i)));
  state.cols.forEach((pile,i)=>{const column=document.createElement('div');column.className='tl2-column';column.setAttribute('aria-label','Column '+(i+1));if(!pile.length)column.append(card(null,()=>selected&&move({type:'column',from:selected,to:i}),'Empty column '+(i+1)+' — King only'));pile.forEach((c,j)=>{const b=card(c,()=>columnClick(i,j),'',selected?.kind==='column'&&selected.pile===i&&j>=selected.index);b.style.setProperty('--card-index',j);b.classList.add('tl2-stacked');column.append(b);});columns.append(column);});store();
 }
 shell.querySelector('[data-action=undo]').onclick=restore;shell.querySelector('[data-action=hint]').onclick=hint;shell.querySelector('[data-action=new]').onclick=fresh;shell.querySelector('select').onchange=fresh;
 shell.querySelector('[data-action=auto]').onclick=()=>{let moved=0;for(let i=0;i<52;i++){const h=klondikeHint(state);if(!h||h.type!=='foundation'||!move(h))break;moved++;if(state.won)break;}if(!moved)say('No foundation move is available.');};
 coach(()=> 'Use Hint for a legal move. Auto foundations only moves currently available cards; Undo reverses the last move.');registerCleanup(store);render();say(state.moves?'Your saved Solitaire deal has resumed.':'New Solitaire deal. Select a card and its destination.');
}
window.TL2Solitaire=mount;
