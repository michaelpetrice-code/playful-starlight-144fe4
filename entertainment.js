export const entertainmentPages=Object.freeze({
 'The Local DJ':{key:'dj',href:'pub-dj/index.html',title:'The Local DJ',description:'Join your venue’s music room, find a song and make a request. Hosts have the full DJ decks, free music collection and optional P2P tools.'},
 'Race Night':{key:'race-night',href:'race-night/index.html',title:'Horse & dog race nights',description:'Choose a course, select a random race from your authorised footage, prepare printable race cards and open the TV or projector view.'}
});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function entertainmentIntro(page){const item=entertainmentPages[page];return item?`<section class="panel local-entertainment-intro"><p class="social-eyebrow">ENTERTAINMENT AT THE LOCAL</p><h2>${item.title}</h2><p>${item.description}</p><p>Your session stays open as you browse other sections of The Local.</p><a href="${item.href}" target="_blank" rel="noopener">Open in a separate tab ↗</a></section>`:'';}
export function createEntertainmentSurface({win=window,doc=document,onIdentityChange=()=>{}}={}){
 let scope=null;const frames=new Map();const surface=doc.createElement('section');surface.id='local-entertainment-surface';surface.hidden=true;surface.setAttribute('aria-label','The Local entertainment');
 const view=doc.getElementById('view');view?.after(surface);
 function clear(){doc.documentElement.classList.remove('local-entertainment-active');for(const frame of frames.values())frame.remove();frames.clear();surface.hidden=true;scope=null;}
 function show(page,nextScope,enabled=true){
  if(!enabled){if(scope!==null)onIdentityChange(null);clear();return;}if(scope!==nextScope){clear();onIdentityChange(nextScope);scope=nextScope;}
  const item=entertainmentPages[page];surface.hidden=!item;doc.documentElement.classList.toggle('local-entertainment-active',Boolean(item));
  for(const [name,frame] of frames)frame.hidden=name!==page;
  if(!item)return;
  if(!frames.has(page)){const frame=doc.createElement('iframe');frame.title=item.title;const url=new URL(item.href,win.location.href);url.searchParams.set('embedded','1');frame.src=url.href;frame.allow="autoplay 'self'; fullscreen 'self'";frame.setAttribute('allowfullscreen','');frame.className='local-entertainment-frame';surface.append(frame);frames.set(page,frame);}
  frames.get(page).hidden=false;
 }
 return {show,clear};
}
