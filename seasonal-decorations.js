// Optional decorations, saved on this device. No moving effects or sound.
const choices = [
 ['off','Off'], ['christmas','Christmas'], ['new-year','New Year'],
 ['remembrance','Remembrance Day'], ['armed-forces','UK Armed Forces Day'],
 ['easter','Easter'], ['halloween','Halloween'], ['bonfire','Bonfire Night'],
 ['valentine','Valentine’s Day'], ['st-george','St George’s Day'],
 ['st-andrew','St Andrew’s Day'], ['st-david','St David’s Day'],
 ['st-patrick','St Patrick’s Day'], ['summer','Summer bank holiday']
];
const messages={christmas:['THE LOCAL · CHRISTMAS','A little Christmas magic','Good company. Warm welcomes. Festive memories.'],
 'new-year':['A NEW CHAPTER','Here’s to good company','New beginnings, shared with your local.'],
 remembrance:['WE WILL REMEMBER THEM','Lest we forget','A moment of reflection. A community that remembers.'],
 'armed-forces':['UK ARMED FORCES DAY','Together, we salute you','Honouring our serving personnel, veterans and families.'],
 easter:['SPRING AT THE LOCAL','A fresh season, together','Bright days and good company.'],
 halloween:['AFTER DARK AT THE LOCAL','A spirited gathering','Autumn nights. Legendary company.'],
 bonfire:['LIGHT UP THE NIGHT','A sparkling evening','Make memories with your community.'],
 valentine:['LOVE YOUR LOCAL','Better together','For friends, family and someone special.'],
 'st-george':['ST GEORGE’S DAY','Celebrate your community','Good company, close to home.'],
 'st-andrew':['ST ANDREW’S DAY','Here’s to your local','A warm welcome and a shared celebration.'],
 'st-david':['ST DAVID’S DAY','A welcome in bloom','Celebrate the people who make your local.'],
 'st-patrick':['ST PATRICK’S DAY','A little Irish spirit','A warm welcome. A table for everyone.'],
 summer:['SUMMER AT THE LOCAL','Long days, great company','Make the most of your bank holiday.']};
function ornament(id){
 const pine=`<g stroke="#37634b" stroke-width="2" fill="none"><path d="M0 20Q85 55 164 13" stroke="#71845a"/><path d="M12 24l-2-20m3 21L0 37m29-7L25 5m5 26L13 48m36-14L43 6m8 28L34 56m38-23L64 6m9 28L58 55m37-26L88 3m9 25L89 48m29-28l-5-19m6 18l-2 22m22-32l-4-14m5 14l4 18"/></g>`;
 const bauble=(x,y,r,c)=>`<path d="M${x} 8v${y-r-8}" stroke="#c6a460"/><rect x="${x-4}" y="${y-r-4}" width="8" height="6" rx="1" fill="#d7b977"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${c})"/><path d="M${x-r*.5} ${y-r*.55}q-5 8-3 13" stroke="#fff5" stroke-width="3" fill="none" stroke-linecap="round"/>`;
 let art='';
 if(id==='christmas')art=`${pine}${bauble(35,76,16,'ruby')}${bauble(90,59,11,'gold')}${bauble(130,89,21,'gold')}<path d="M111 22l13 8-13 6 4-14 5 15Z" fill="#f7d38c"/><g fill="#fff0bf"><circle cx="8" cy="61" r="1.5"/><circle cx="158" cy="50" r="2"/><circle cx="75" cy="104" r="1.5"/></g>`;
 else if(id==='remembrance')art=`<path d="M84 112Q89 66 77 29" stroke="#566f41" stroke-width="3" fill="none"/><path d="M85 90Q105 60 121 74Q113 94 85 90" fill="#45643d"/><g fill="url(#ruby)"><ellipse cx="65" cy="45" rx="23" ry="20" transform="rotate(-25 65 45)"/><ellipse cx="91" cy="45" rx="23" ry="20" transform="rotate(25 91 45)"/><ellipse cx="64" cy="67" rx="22" ry="19"/><ellipse cx="92" cy="67" rx="22" ry="19"/></g><circle cx="78" cy="56" r="12" fill="#142019"/><circle cx="78" cy="56" r="7" fill="#080d0b"/>`;
 else if(['armed-forces','st-george','st-andrew','st-david'].includes(id)){
 const flag=id==='armed-forces'?`<path d="M0 0l100 60M100 0L0 60" stroke="#eee4cf" stroke-width="14"/><path d="M0 0l100 60M100 0L0 60" stroke="#a6323a" stroke-width="5"/><path d="M50 0v60M0 30h100" stroke="#eee4cf" stroke-width="20"/><path d="M50 0v60M0 30h100" stroke="#a6323a" stroke-width="11"/>`:id==='st-george'?'<path d="M50 0v60M0 30h100" stroke="#b32c39" stroke-width="14"/>':id==='st-andrew'?'<path d="M0 0l100 60M100 0L0 60" stroke="#eee4cf" stroke-width="12"/>':'<path d="M50 0v60M0 30h100" stroke="#dcc272" stroke-width="14"/>';
 art=`<g transform="translate(28 30)"><rect width="100" height="60" rx="2" fill="${id==='st-george'?'#eee4cf':id==='st-david'?'#141e19':'#203c64'}"/>${flag}<rect width="100" height="60" rx="2" fill="none" stroke="#e8cb8a"/></g><path d="M23 25v88" stroke="#c6a460" stroke-width="3"/>`;
 }else if(['bonfire','new-year'].includes(id))art=`<g stroke="#e5c17a" stroke-width="2" stroke-linecap="round">${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<path d="M${80+Math.cos(a)*22} ${60+Math.sin(a)*22}l${Math.cos(a)*25} ${Math.sin(a)*25}"/>`}).join('')}</g><circle cx="80" cy="60" r="5" fill="#f3d794"/><g fill="#d9ac61"><circle cx="25" cy="25" r="2"/><circle cx="133" cy="90" r="3"/><circle cx="120" cy="18" r="2"/></g>`;
 else if(id==='easter')art='<g stroke="#d8c697"><path d="M71 94C22 94 39 23 60 22C81 23 107 94 71 94Z" fill="#8eaa8b"/><path d="M103 103C66 103 80 41 101 37C122 40 143 103 103 103Z" fill="#d7b679"/></g><path d="M43 63l13 9 13-9 13 9m0 11l12-8 12 8 12-8 12 8" stroke="#fff0c9" stroke-width="3"/><g fill="#f5e9bf"><circle cx="58" cy="45" r="3"/><circle cx="103" cy="58" r="3"/></g>';
 else if(id==='valentine')art='<path d="M80 98L35 55C7 24 54 3 80 35C106 3 153 24 125 55Z" fill="url(#ruby)" stroke="#d8ad70"/>';
 else if(id==='halloween')art='<path d="M80 33q-7-16 8-23" stroke="#8a9957" stroke-width="6" fill="none"/><g fill="#b77732" stroke="#e3b56e"><ellipse cx="80" cy="69" rx="53" ry="35"/><ellipse cx="80" cy="69" rx="33" ry="35"/><ellipse cx="80" cy="69" rx="14" ry="35"/></g><path d="M46 66l13-13 9 15m24 0l9-15 13 13M61 83q19 15 38 0" fill="#263523" stroke="#263523" stroke-width="3"/>';
 else if(id==='st-patrick')art='<g fill="#3b7957" stroke="#b2aa69"><path d="M80 102Q95 73 80 52" fill="none" stroke-width="4"/><path d="M80 57C25 35 61 1 80 29C99 1 135 35 80 57Z"/><path d="M79 60C47 19 6 56 37 74C18 103 65 114 79 60Z"/><path d="M83 60C115 19 156 56 125 74C144 103 97 114 83 60Z"/></g>';
 else art=`<g transform="translate(80 60)" fill="#e8cf87">${Array.from({length:8},(_,i)=>`<ellipse cx="0" cy="-25" rx="11" ry="22" transform="rotate(${i*45})"/>`).join('')}<circle r="14" fill="#b88b3f"/><circle r="8" fill="#775a2f"/></g><path d="M80 106v12" stroke="#5b8354" stroke-width="3"/>`;
 return `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="gold" cx=".3" cy=".2"><stop stop-color="#fff1bf"/><stop offset=".5" stop-color="#ddba68"/><stop offset="1" stop-color="#8e612b"/></radialGradient><radialGradient id="ruby" cx=".3" cy=".2"><stop stop-color="#ed7370"/><stop offset=".5" stop-color="#b92e3c"/><stop offset="1" stop-color="#581822"/></radialGradient></defs>${art}</svg>`;
}
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
 const strip=document.createElement('div');strip.className='seasonal-decoration';strip.setAttribute('role','region');strip.setAttribute('aria-label','Seasonal welcome');header.append(strip);
 function apply(){
  const [id,name]=choices.find(([id])=>id===selected);
  strip.hidden=id==='off';strip.replaceChildren();strip.dataset.occasion=id;
  document.documentElement.dataset.season=id;
  if(id==='off')return;
  const [eyebrow,heading,description]=messages[id];
  const art=document.createElement('div');art.className='seasonal-art';art.innerHTML=ornament(id);
  const copy=document.createElement('div');copy.className='seasonal-copy';
  for(const [tag,cls,text] of [['span','seasonal-eyebrow',eyebrow],['strong','seasonal-heading',heading],['span','seasonal-description',description]]){const node=document.createElement(tag);node.className=cls;node.textContent=text;copy.append(node)}
  strip.append(art,copy);

 }
 select.addEventListener('change',()=>{selected=select.value;try{localStorage.setItem(key,selected)}catch{}apply()});
 window.addEventListener('local-open-seasonal-decorations',()=>dialog.showModal());apply();
}

export function seasonalAdminView(){return '<section class="panel"><h2>Seasonal decorations</h2><p>Choose Christmas, Remembrance Day, UK Armed Forces Day or another seasonal occasion. Decorations are saved on this device.</p><button type="button" data-seasonal-open>Choose seasonal decorations</button></section>'}
export function bindSeasonalAdmin(root){root.querySelector('[data-seasonal-open]')?.addEventListener('click',()=>window.dispatchEvent(new Event('local-open-seasonal-decorations')))}
