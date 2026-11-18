/* v113: accessible lobby enhancements; leaves original game mechanics intact. */
(()=>{'use strict';
function enhance(){const room=document.getElementById('gr63');if(!room||room.querySelector('.tl113-searchbar'))return;
const grid=room.querySelector('.gr63-grid');if(!grid)return;
const filters=room.querySelector('.gr63-filters');
const intro=document.createElement('div');intro.className='tl113-intro';intro.innerHTML='<span class="tl113-kicker">THE LOCAL • ARCADE COLLECTION</span><h3 class="tl113-title">Choose your next challenge</h3><p class="tl113-sub">Pick a table, challenge the computer or settle in for a classic. Your favourite games, all in one place.</p>';
const search=document.createElement('div');search.className='tl113-searchbar';
const label=document.createElement('label');label.textContent='⌕';label.htmlFor='tl113-search';
const input=document.createElement('input');input.id='tl113-search';input.type='search';input.placeholder='Find pool, darts, solitaire and more…';input.setAttribute('aria-label','Search arcade games');
const count=document.createElement('span');count.className='tl113-count';count.setAttribute('aria-live','polite');
search.append(label,input,count);intro.append(search);
(filters||grid).insertAdjacentElement('beforebegin',intro);
const empty=document.createElement('p');empty.className='tl113-empty';empty.hidden=true;empty.textContent='No games match your search. Try another title.';grid.insertAdjacentElement('afterend',empty);
function update(){const q=input.value.trim().toLowerCase();let visible=0;for(const card of grid.querySelectorAll('.gr63-card')){const match=card.textContent.toLowerCase().includes(q);card.classList.toggle('tl113-search-hidden',!match);card.style.display=match?'':'none';if(match&&!card.hidden)visible++}count.textContent=visible+' games';empty.hidden=visible!==0}
input.addEventListener('input',update);filters?.addEventListener('click',()=>setTimeout(update,0));update();
}
function init(){enhance();const observer=new MutationObserver(()=>{if(document.getElementById('gr63')&&!document.querySelector('#gr63 .tl113-searchbar'))enhance()});observer.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
