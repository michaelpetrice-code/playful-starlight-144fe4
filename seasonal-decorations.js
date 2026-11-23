// Optional decorations, saved on this device. No moving effects or sound.
const choices = [
 ['off','Off',''], ['christmas','Christmas','🎄 ✦ 🎁'],
 ['new-year','New Year','✦ 🥂 ✦'], ['remembrance','Remembrance Day',''],
 ['armed-forces','UK Armed Forces Day','🇬🇧'], ['easter','Easter','🌷 🥚 🌼'],
 ['halloween','Halloween','🎃 🍂'], ['bonfire','Bonfire Night','✦ 🎆 ✦'],
 ['valentine','Valentine’s Day','♡ ♥ ♡'], ['st-george','St George’s Day','🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
 ['st-andrew','St Andrew’s Day','🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['st-david','St David’s Day','🌼 🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
 ['st-patrick','St Patrick’s Day','☘'], ['summer','Summer bank holiday','☀ 🌻']
];
const key='the-local-seasonal-decoration';
let selected='off';try{selected=localStorage.getItem(key)||'off'}catch{}
if(!choices.some(([id])=>id===selected))selected='off';
const header=document.querySelector('body>header');
if(header){
 const dialog=document.createElement('dialog');dialog.className='seasonal-dialog';dialog.setAttribute('aria-labelledby','seasonal-title');
 const title=document.createElement('h2');title.id='seasonal-title';title.textContent='Seasonal decorations';
 const note=document.createElement('p');note.textContent='Choose a decoration for The Local on this device. You can change it or turn it off at any time.';
 const label=document.createElement('label');label.htmlFor='seasonal-choice';label.textContent='Choose an occasion';
 const select=document.createElement('select');select.id='seasonal-choice';
 for(const [id,name] of choices){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option)}select.value=selected;
 const close=document.createElement('button');close.type='button';close.textContent='Done';close.addEventListener('click',()=>dialog.close());
 dialog.append(title,note,label,select,close);document.body.append(dialog);
 const strip=document.createElement('div');strip.className='seasonal-decoration';strip.setAttribute('aria-hidden','true');header.append(strip);
 function apply(){
  const [id,name,symbols]=choices.find(([id])=>id===selected);
  strip.hidden=id==='off';strip.replaceChildren();strip.dataset.occasion=id;
  if(id==='remembrance'){
   const poppy=document.createElement('span');poppy.className='seasonal-poppy';strip.append(poppy);
  }else{const motif=document.createElement('span');motif.textContent=symbols;strip.append(motif)}
  const caption=document.createElement('span');caption.textContent=name;strip.append(caption);
 }
 select.addEventListener('change',()=>{selected=select.value;try{localStorage.setItem(key,selected)}catch{}apply()});
 window.addEventListener('local-open-seasonal-decorations',()=>dialog.showModal());apply();
}

export function seasonalAdminView(){return '<section class="panel"><h2>Seasonal decorations</h2><p>Choose Christmas, Remembrance Day, UK Armed Forces Day or another seasonal occasion. Decorations are saved on this device.</p><button type="button" data-seasonal-open>Choose seasonal decorations</button></section>'}
export function bindSeasonalAdmin(root){root.querySelector('[data-seasonal-open]')?.addEventListener('click',()=>window.dispatchEvent(new Event('local-open-seasonal-decorations')))}
