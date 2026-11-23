// Seasonal artwork is composited inside the existing logo dimensions.
const choices = [
 ['auto','Automatic (UK calendar)'], ['off','Off'], ['christmas','Christmas'], ['new-year','New Year'],
 ['remembrance','Remembrance Day'], ['armed-forces','UK Armed Forces Day'],
 ['easter','Easter'], ['halloween','Halloween'], ['bonfire','Bonfire Night'],
 ['valentine','Valentine’s Day'], ['st-george','St George’s Day'],
 ['st-andrew','St Andrew’s Day'], ['st-david','St David’s Day'],
 ['st-patrick','St Patrick’s Day'], ['summer','Summer bank holiday']
];
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
// Dates are evaluated in London even when a visitor is travelling.
export function seasonForDate(date = new Date()) {
 const values = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date);
 const part = type => Number(values.find(value => value.type === type).value);
 const year = part('year'), month = part('month'), day = part('day');
 const utc = (m,d) => Date.UTC(year,m-1,d);
 const today = utc(month,day), weekday = (m,d) => new Date(utc(m,d)).getUTCDay();
 const within = (m,start,end) => month === m && day >= start && day <= end;
 const secondSunday = 8 + (7-weekday(11,8))%7;
 if (month === 11 && (day === 11 || day === secondSunday)) return 'remembrance';
 const lastSaturday = 30 - (weekday(6,30)+1)%7;
 if (within(6,lastSaturday-2,lastSaturday+1)) return 'armed-forces';
 if (month === 11 && day === 30) return 'st-andrew';
 if (within(11,23,30) || within(12,1,26)) return 'christmas';
 if (within(12,27,31) || within(1,1,2)) return 'new-year';
 if (within(10,27,31)) return 'halloween';
 if (within(11,3,6)) return 'bonfire';
 if (within(2,13,14)) return 'valentine';
 if (month === 3 && day === 1) return 'st-david';
 if (month === 3 && day === 17) return 'st-patrick';
 if (month === 4 && day === 23) return 'st-george';
 const summerMonday = 31 - (weekday(8,31)+6)%7;
 if (within(8,summerMonday-2,summerMonday)) return 'summer';

 // Gregorian Easter Sunday, with Good Friday through Easter Monday.
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4;
 const h=(19*a+b-d-Math.floor((b-Math.floor((b+8)/25)+1)/3)+15)%30;
 const l=(32+2*e+2*Math.floor(c/4)-h-c%4)%7;
 const m=Math.floor((a+11*h+22*l)/451), p=h+l-7*m+114;
 const easter=utc(Math.floor(p/31),p%31+1), oneDay=86400000;
 return today >= easter-2*oneDay && today <= easter+oneDay ? 'easter' : 'off';
}

const key='the-local-logo-season-v2';
const originalImages = new WeakMap();
let selected='auto';
let revision=0;

function loadImage(source) {
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=reject;
  image.src=source;
 });
}

async function decorate(image,id,turn) {
 const original=originalImages.get(image) || image.getAttribute('src');
 if (!original) return;
 originalImages.set(image,original);
 if(id==='off'){image.src=original;delete image.dataset.seasonalLogo;return;}
 try {
  const [logo, art]=await Promise.all([
   loadImage(original),
   loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ornament(id))),
  ]);
  if(turn!==revision || !image.isConnected) return;
  const canvas=document.createElement('canvas');
  const width=logo.naturalWidth, height=logo.naturalHeight;
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.drawImage(logo,0,0);
  const size=Math.min(width*.16,height*.52);
  const x=Math.min(width*.095,height*.42),y=height*.04;
  ctx.shadowColor='#08110c99';ctx.shadowBlur=height*.03;
  ctx.drawImage(art,x,y,size,size*.75);
  image.src=canvas.toDataURL('image/png');
  image.dataset.seasonalLogo=id;
 } catch { /* Keep the real logo if the artwork is unavailable. */ }
}

function init(){
 try{selected=localStorage.getItem(key)||'auto'}catch{}
 if(!choices.some(([id])=>id===selected))selected='auto';
 const dialog=document.createElement('dialog');dialog.className='seasonal-dialog';dialog.setAttribute('aria-labelledby','seasonal-title');
 const title=document.createElement('h2');title.id='seasonal-title';title.textContent='Seasonal logo';
 const note=document.createElement('p');note.textContent='Automatic follows the UK calendar. You can preview an occasion or switch decorations off on this device.';
 const label=document.createElement('label');label.htmlFor='seasonal-choice';label.textContent='Choose an occasion';
 const select=document.createElement('select');select.id='seasonal-choice';
 for(const [id,name] of choices){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option)}
 select.value=selected;
 const close=document.createElement('button');close.type='button';close.textContent='Done';close.addEventListener('click',()=>dialog.close());
 dialog.append(title,note,label,select,close);document.body.append(dialog);
 function apply(){
  const id=selected==='auto'?seasonForDate():selected;
  document.documentElement.dataset.season=id;
  const turn=++revision;
  for(const image of document.querySelectorAll('img[src*="assets/branding/the-local-"], img[data-seasonal-logo]')) void decorate(image,id,turn);
 }
 select.addEventListener('change',()=>{selected=select.value;try{localStorage.setItem(key,selected)}catch{}apply()});
 window.addEventListener('local-open-seasonal-decorations',()=>{if(!dialog.open)dialog.showModal()});
 window.addEventListener('storage',event=>{
  if(event.key!==key)return;
  selected=choices.some(([id])=>id===event.newValue)?event.newValue:'auto';
  select.value=selected;apply();
 });
 apply();
}

if(typeof document!=='undefined')init();

export function seasonalAdminView(){return '<section class="panel"><h2>Seasonal logo</h2><p>Automatic follows the UK calendar. Preview Christmas, Remembrance Day, UK Armed Forces Day and other occasions inside the logo.</p><button type="button" data-seasonal-open>Choose seasonal logo</button></section>'}
export function bindSeasonalAdmin(root){root.querySelector('[data-seasonal-open]')?.addEventListener('click',()=>window.dispatchEvent(new Event('local-open-seasonal-decorations')))}
