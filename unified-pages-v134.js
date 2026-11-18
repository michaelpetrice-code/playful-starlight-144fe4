/* v134 shared page presentation. Existing app routes and handlers remain unchanged. */
(() => {
const assets='assets/feature-slides/';
const catalog=[
  {words:['virtual pub tables','tables'],img:'virtual-pub-tables.webp',title:'Virtual Pub Tables',desc:'Pull up a chair, share moments and stay connected.'},
  {words:["who’s up for it","who's up for it",'events','plans','meetups'],img:'whos-up-for-it.webp',title:"Who's Up for It?",desc:'Find events, organise meet-ups and see who is joining.'},
  {words:['arcade','games room','more games','games','quiz','football','leaderboard'],img:'games-room.webp',title:'Games Room & Challenges',desc:'Play, challenge friends and enjoy club competitions.'},
  {words:['venue hub','venues','venue applications','venue directory','discover'],img:'discover-venues.webp',title:'Discover Venues',desc:'Find pubs and clubs and connect with your local community.'},
  {words:['buy, sell or give away','marketplace','buy sell','buy, sell'],img:'marketplace.webp',title:'Buy, Sell or Give Away',desc:'Discover useful finds from people in your community.'},
  {words:['trades & services','tradesmen','trades','services'],img:'local-tradesmen.webp',title:'Local Tradesmen',desc:'Discover local trades and services.'},
  {words:['tournaments','competitions','challenges'],img:'club-competitions.webp',title:'Club Competitions',desc:'Join leagues, tournaments and friendly challenges.'},
  {words:['rounds','buy a round','kitty'],img:'buy-a-round.webp',title:'Buy a Round',desc:'Bring your table together.'},
  {words:['rewards','membership'],img:'rewards-membership.webp',title:'Rewards & Membership',desc:'Stay connected to your venue and its benefits.'},
  {words:['local updates','community','photos','alerts'],img:'virtual-pub-tables.webp',title:'Your Local Community',desc:'News, photographs and updates from your community.'},
  {words:['admin dashboard','owner dashboard','report behaviour','committee safety','account','install'],img:'discover-venues.webp',title:'The Local',desc:'Your people. Your plans. Your local.'}
];
const view=document.getElementById('view');
if(!view)return;
let lastTab='',pending=false;
function activeTab(){const active=document.querySelector('#tabs button.active');return (active?.dataset.tab||active?.textContent||'').trim()}
function update(){
 pending=false;
 if(document.documentElement.classList.contains('tl-auth-locked'))return;
 const tab=activeTab();
 if(!tab || view.querySelector('.tl149-admin') || tab.toLowerCase()==='home' || view.querySelector('.ref-home')){view.querySelector('.tl134-page-banner')?.remove();lastTab=tab;return;}
 const normalized=tab.toLocaleLowerCase('en-GB');
 const entry=catalog.find(item=>item.words.some(w=>normalized===w)) || catalog.find(item=>item.words.some(w=>normalized.includes(w))) || catalog[catalog.length-1];
 const current=view.querySelector(':scope > .tl134-page-banner');
 if(current?.dataset.page===tab)return;
 current?.remove();
 const hero=document.createElement('section');
 hero.className='tl134-page-banner';
 hero.dataset.page=tab;
 hero.setAttribute('aria-label',tab+' feature banner');
 const img=document.createElement('img');img.src=assets+entry.img;img.alt=entry.title+' promotional photograph';img.loading='eager';img.decoding='async';
 const copy=document.createElement('div');copy.className='tl134-page-banner-copy';
 const kicker=document.createElement('span');kicker.textContent='THE LOCAL · THE COMPLETE VENUE PLATFORM';
 const heading=document.createElement('h2');heading.textContent=tab;
 const subtitle=document.createElement('p');subtitle.textContent=entry.desc;
 copy.append(kicker,heading,subtitle);hero.append(img,copy);view.prepend(hero);
 lastTab=tab;
}
const observer=new MutationObserver((records)=>{
 if(records.every(r=>r.addedNodes.length && [...r.addedNodes].every(n=>n.nodeType===1 && n.classList?.contains('tl134-page-banner'))))return;
 if(!pending){pending=true;requestAnimationFrame(update)}
});
observer.observe(view,{subtree:false,childList:true});
observer.observe(document.getElementById('tabs'),{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
document.addEventListener('click',e=>{if(e.target.closest('[data-tab]'))requestAnimationFrame(update)});
requestAnimationFrame(update);
})();