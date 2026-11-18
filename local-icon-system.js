
// The Local visual icon system: converts decorative interface emojis to one gold-line family.
// Member-generated chat content and emoji pickers are deliberately excluded.
const shapes={
 beer:'<path d="M5 7h11v13H5z M16 9h3a3 3 0 0 1 0 6h-3 M7 4h7 M8 2v2 M12 2v2 M8 11v5 M12 11v5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4 M17 3v4 M3 10h18 M8 14h3 M13 14h3"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2 M17 5a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 5v1"/>',
 game:'<rect x="3" y="7" width="18" height="11" rx="5"/><path d="M7 11v4 M5 13h4 M15 12h.01 M18 14h.01"/>',
 home:'<path d="m3 11 9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7"/>',
 music:'<path d="M9 18V5l12-2v13 M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 camera:'<rect x="2" y="6" width="20" height="15" rx="2"/><path d="M7 6l2-3h6l2 3"/><circle cx="12" cy="13" r="4"/>',
 ticket:'<path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M12 7v12" stroke-dasharray="3 2"/>',
 shield:'<path d="M12 2 20 5v6c0 5-3 8-8 11-5-3-8-6-8-11V5z M9 12l2 2 4-4"/>',
 star:'<path d="m12 2 3 7 7 .5-5.5 5 1.7 7.5-6.2-4-6.2 4 1.7-7.5-5.5-5L9 9z"/>',
 message:'<path d="M4 4h16v13H8l-4 4z M8 9h8 M8 13h6"/>',
 search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 6h20v4H2z M12 6v15 M12 6c-6 0-7-7-2-5 2 1 2 5 2 5z M12 6c6 0 7-7 2-5-2 1-2 5-2 5z"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6 M12 7h.01"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 3"/>',
 trophy:'<path d="M7 3h10v8a5 5 0 0 1-10 0z M7 5H3v4a4 4 0 0 0 4 4 M17 5h4v4a4 4 0 0 1-4 4 M12 16v4 M8 21h8"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2"/>'
};
const mapping=[
[/^[🍻🍺🍷🥂☕]/u,'beer'],[/^[📅🗓]/u,'calendar'],[/^[👥👨👩🙋🧑🤝]/u,'people'],
[/^[🎮🎲♟🎯🃏]/u,'game'],[/^[🏠🏡🏢🏛]/u,'home'],[/^[🎤🎵🎶🎸]/u,'music'],
[/^[📷📸🖼]/u,'camera'],[/^[🎟🎫]/u,'ticket'],[/^[🛡🚨🚩]/u,'shield'],
[/^[⭐🌟✨🎉🎊]/u,'star'],[/^[💬📩📨💌]/u,'message'],[/^[🔎🔍]/u,'search'],
[/^[📍🗺]/u,'pin'],[/^[🎁]/u,'gift'],[/^[ℹ❓]/u,'info'],[/^[⏰🕒]/u,'clock'],
[/^[🏆🥇]/u,'trophy'],[/^[⚙🔧]/u,'settings']
];
const emoji=/^(?:[\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\uFE0E)?(?:\u200D[\p{Extended_Pictographic}](?:\uFE0F)?)*)/u;
const forbidden='[contenteditable],textarea,input,select,option,.chat-message,.message-text,.chat-bubble,.table-message,.emoji-picker,[data-user-content],[data-message-id]';
function convert(node){
 if(!node || node.nodeType!==3 || !node.parentElement)return;
 const el=node.parentElement;
 if(el.closest(forbidden) || el.closest('svg,script,style,.local-brand-icon,.local-ui-icon') || !el.closest('button,.v33-tile-grid,.local46-spotlight-art,.bottom-nav,nav,.panel h2,.panel h3,.card h2,.card h3,[class*="feature"],[class*="tile"],[class*="menu"],[class*="heading"]'))return;
 const m=node.nodeValue.match(/^\s*(?:[\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\uFE0E)?(?:\u200D[\p{Extended_Pictographic}](?:\uFE0F)?)*)/u);
 if(!m)return;
 const original=m[0].trim();
 const kind=mapping.find(([re])=>re.test(original))?.[1]||'star';
 const wrapper=document.createElement('span');wrapper.className='local-ui-icon';wrapper.setAttribute('aria-hidden','true');
 wrapper.innerHTML=`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes[kind]}</svg>`;
 node.nodeValue=node.nodeValue.slice(m[0].length);
 el.insertBefore(wrapper,node);
}
let busy=false;
function normalize(){
 if(busy)return;busy=true;
 try{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const texts=[];while(walker.nextNode())texts.push(walker.currentNode);texts.forEach(convert);}
 finally{busy=false;}
}
let scheduled=false;const observer=new MutationObserver((records)=>{if(busy||scheduled)return;if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1 && !n.classList?.contains('local-ui-icon'))))return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;observer.disconnect();normalize();observer.observe(document.getElementById('view')||document.body,{childList:true,subtree:true})})});
function start(){normalize();observer.observe(document.getElementById('view')||document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
