import { shareItem, shareButton, focusSharedItem } from './page-share.js?v=173';

const marketIconPaths={
 bag:'<path d="M4 8h16l1 13H3L4 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
 back:'<path d="m12 19-7-7 7-7M5 12h14"/>',
 edit:'<path d="m14 5 5 5M4 20l1-5L16 4a2 2 0 0 1 3 3L8 19l-4 1Z"/>'
};
const marketIcon=name=>`<svg class="market-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${marketIconPaths[name]}</svg>`;
const E=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cats=['Clothing','Electronics','Furniture','Home & Garden','Sports','Children & Toys','Books','Tools','Other'];
let pendingListing=null, lookupSequence=0, linkedListing=null;
let client=null,member=null,notify=()=>{},listings=[],photos={},selected=null,query='',category='',onlyMine=false,view='list',sort='newest',editId=null,previewUrls=[];
const request=async q=>{const {data,error}=await q;if(error)throw error;return data};
export function marketplaceView(){return `<section class="panel market-page"><h2 class="market-heading">${marketIcon('bag')} Buy, Sell or Give Away</h2><p class="muted">Buy, sell, swap and give away with registered members across The Local. Payments and collection are arranged directly.</p><div id="marketRoot">Loading marketplace…</div></section>`}
export function bindMarketplace({sb,user,notice,sharedItem}){if(member?.id!==user?.id){pendingListing=null;linkedListing=null;photos={};}
if(!pendingListing && !(linkedListing && view==='detail' && selected===linkedListing)){selected=null;view='list';editId=null;}
client=sb;member=user;notify=notice;if(sharedItem)pendingListing=sharedItem;if(!client||!member){E('marketRoot').innerHTML='<p class="warn">Please sign in to your account to use the Buy, Sell or Give Away. A Supabase connection is required.</p>';return}load()}

const teaserItems=[
 {title:'Mountain bike',price:'£85',condition:'Good condition',category:'Sports',photo:'mountain-bike'},
 {title:'Wooden chest of drawers',price:'FREE',condition:'Collection only',category:'Furniture',photo:'chest-of-drawers'},
 {title:'Garden tools bundle',price:'£20',condition:'Used',category:'Home & Garden',photo:'garden-tools'},
 {title:'Board games collection',price:'£12',condition:'Great condition',category:'Children & Toys',photo:'board-games'},
 {title:'Coffee machine',price:'£35',condition:'Working',category:'Home & Garden',photo:'coffee-machine'},
 {title:'Children’s books bundle',price:'FREE',condition:'Pre-loved',category:'Books',photo:'childrens-books'}
];
export function marketTeaserHTML({guest=false}={}){
 return `<section class="market-teaser" aria-label="Example marketplace listings">
 <div class="market-teaser-header"><div><span class="market-demo-tag">EXAMPLE LISTINGS · NOT FOR SALE</span><h3>See what you could find on The Local</h3><p>Example items with illustrative images. They cannot be purchased or reserved.</p></div></div>
 <div class="market-teaser-grid">${teaserItems.map(x=>`<article class="market-teaser-card"><div class="market-teaser-art"><img src="assets/marketplace-samples/${x.photo}.webp" width="480" height="480" alt="" loading="lazy" decoding="async"></div><div class="market-teaser-info"><strong>${safe(x.title)}</strong><b>${safe(x.price)}</b><small>${safe(x.category)} · ${safe(x.condition)}</small><span class="market-sample-badge">Sample item</span></div></article>`).join('')}</div>
 <div class="market-teaser-cta"><p>Have something to sell, swap or give away? Post a real listing with your own photos.</p>${guest ? '<a class="tl173-action" href="index.html?page=marketplace">Log in to use the marketplace</a>' :
   `<button type="button" data-teaser="create">${marketIcon('plus')} Create your listing</button>`}</div>
 </section>`
}

async function load(){const sequence=++lookupSequence;try{const rows=await request(client.from('market_listings').select('*').order('created_at',{ascending:false}).limit(250));
if(sequence!==lookupSequence)return;
listings=rows;
const id=pendingListing || (view==='detail' ? selected : null);
if(id){
 const linked=listings.find(row=>row.id===id&&(!pendingListing||row.status==='available')) ||
   await request(client.from('market_listings').select('*').eq('id',id).eq('status','available').maybeSingle());
 if(sequence!==lookupSequence)return;
 if(linked){
  if(!listings.some(row=>row.id===id))listings.push(linked);
  selected=id;view='detail';
  if(pendingListing)linkedListing=id;
 } else if(pendingListing){selected=null;view='list';}
}
if(sequence!==lookupSequence)return;
draw();
if(pendingListing) {
 pendingListing=null;
 if(view==='detail')requestAnimationFrame(()=>focusSharedItem(E('marketRoot')?.querySelector('h3')));
 else if(E('marketRoot'))E('marketRoot').insertAdjacentHTML('afterbegin','<p role="status" class="tl172-share-feedback">This listing is no longer available.</p>');
}
await Promise.all(listings.filter(x=>x.photo_paths?.length&&!photos[x.id]).map(async x=>{const {data}=await client.storage.from('marketplace-photos').createSignedUrl(x.photo_paths[0],3600);if(data)photos[x.id]=data.signedUrl}));if(sequence===lookupSequence&&view==='list'&&!linkedListing)draw()}catch(err){if(sequence===lookupSequence&&E('marketRoot'))E('marketRoot').innerHTML=`<p class="warn">Buy, Sell or Give Away unavailable: ${safe(err.message)}. Run MARKETPLACE-SETUP.sql in Supabase before using this feature.</p>`}}
function draw(){const root=E('marketRoot');if(!root)return;const matches=listings.filter(x=>(onlyMine?x.seller_id===member.id:x.status==='available')&&(!category||x.category===category)&&(!query||[x.title,x.description,x.area].join(' ').toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>sort==='low'?Number(a.price)-Number(b.price):sort==='high'?Number(b.price)-Number(a.price):sort==='oldest'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
let content='';if(view==='list')content=`<div class="market-toolbar"><button id="marketCreate">${marketIcon('plus')} Sell / Give away</button><button id="marketInbox">${marketIcon('mail')} Messages & offers</button></div><div class="market-filters"><input id="marketSearch" placeholder="Search listings" value="${safe(query)}"><select id="marketCat"><option value="">All categories</option>${cats.map(c=>`<option ${category===c?'selected':''}>${safe(c)}</option>`).join('')}</select><select id="marketSort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><label><input type="checkbox" id="marketMine" ${onlyMine?'checked':''}> My listings</label></div><p class="market-count">${matches.length} listings found</p><div class="market-grid">${matches.map(x=>`<article class="market-card"><div class="market-photo">${x.photo_paths?.length?`<span class="market-photo-count">📷 ${x.photo_paths.length}</span>`:""}${photos[x.id]?`<img src="${safe(photos[x.id])}" loading="lazy" alt="${safe(x.title)}">`:'📦'}</div><div class="market-card-body"><strong>${safe(x.title)}</strong><p class="market-price">${x.type==='Free'?'FREE':x.type==='Swap'?'SWAP':'£'+Number(x.price).toFixed(2)}</p><small>${safe(x.category)} · ${safe(x.area)}</small><p><button data-market-id="${x.id}">View item</button> ${x.status==='sold'?'SOLD':''}</p></div></article>`).join('')||'<p>No listings found. Be the first to post!</p>'}</div>${!onlyMine?marketTeaserHTML():''}`;
if(view==='create')content=`<button id="marketBack">${marketIcon('back')} Back</button><h3>${editId?"Edit your listing":"Create a listing"}</h3><div class="smart-compose"><h4>✨ Smart Listing Assistant</h4><p>Enter a short title, then tap Improve listing to prepare a clearer description. Check everything before publishing.</p><button type="button" id="marketSmart">✨ Improve my listing</button><p id="marketSmartStatus" role="status"></p></div><form id="marketForm"><label>Title<input id="marketTitle" maxlength="120" required></label><label>Description<textarea id="marketDescription" maxlength="3000" required></textarea></label><label>Category<select id="marketCategory">${cats.map(c=>`<option>${safe(c)}</option>`).join('')}</select></label><label>Type<select id="marketType"><option>Sale</option><option>Free</option><option>Swap</option></select></label><label>Price (£)<input id="marketPrice" type="number" min="0" step="0.01" value="0"></label><label>Condition<select id="marketCondition"><option>Good</option><option>New</option><option>Like new</option><option>Fair</option><option>For parts</option></select></label><label>Collection town / area (not your address)<input id="marketArea" maxlength="100"></label><label>Photos (up to 8, max 5MB each)<input id="marketFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple><div id="marketFilePreview" class="market-file-preview"></div><small>Upload clear photos from different angles. First photo is the cover. When editing, new photos replace the existing set.</small></label><button id="marketPublish">${editId?"Save listing":"Publish listing"}</button></form><p class="muted">No illegal goods, weapons, alcohol, nicotine, medicines or other restricted items. Keep personal details private.</p>`;
if(view==='detail'){const x=listings.find(v=>v.id===selected);if(!x){view='list';draw();return}content=`<button id="marketBack">${marketIcon('back')} Back</button> ${x.status==='available'?shareButton('Share listing','marketShare'):''}<h3>${safe(x.title)}</h3><h3>${x.type==='Free'?'FREE':x.type==='Swap'?'SWAP':'£'+Number(x.price).toFixed(2)}</h3><p>${safe(x.description)}</p><p>${safe(x.category)} · ${safe(x.condition)} · ${safe(x.area)} · ${safe(x.status)}</p><div id="marketPhotos"></div>${x.seller_id===member.id?`<button id="marketEdit">${marketIcon('edit')} Edit listing & photos</button> <button id="marketSold">${x.status==='sold'?'Mark available':'Mark sold'}</button> <button id="marketRemove">Remove listing</button>`:`<h4>Private enquiry</h4><textarea id="marketMessage" maxlength="1000" placeholder="Hi, is this still available?"></textarea><button id="marketEnquire">Send enquiry</button><h4>Make an offer</h4><input id="marketOffer" type="number" min="0" step="0.01" placeholder="Offer in £"><button id="marketSendOffer">Send offer</button><p><button id="marketReport">Report listing</button></p>`}`;}
if(view==='inbox')content=`<button id="marketBack">${marketIcon('back')} Back</button><h3>Private enquiries & offers</h3><div id="marketMessages">Loading…</div>`;
root.innerHTML=content;
root.querySelectorAll('[data-teaser]').forEach(b=>b.onclick=()=>{editId=null;view='create';draw()});
if(E('marketBack'))E('marketBack').onclick=()=>{selected=null;view='list';draw()};
if(E('marketCreate'))E('marketCreate').onclick=()=>{editId=null;view='create';draw()};if(E('marketInbox'))E('marketInbox').onclick=()=>{view='inbox';draw();inbox()};
if(E('marketSearch'))E('marketSearch').onchange=ev=>{query=ev.target.value.trim().toLowerCase();draw()};if(E('marketCat'))E('marketCat').onchange=ev=>{category=ev.target.value;draw()};if(E('marketMine'))E('marketMine').onchange=ev=>{onlyMine=ev.target.checked;draw()};if(E('marketSort')){E('marketSort').value=sort;E('marketSort').onchange=ev=>{sort=ev.target.value;draw()}}
root.querySelectorAll('[data-market-id]').forEach(b=>b.onclick=()=>{selected=b.dataset.marketId;view='detail';draw()});
if(E('marketForm')){E('marketForm').onsubmit=create;
E('marketSmart').onclick=()=>{
 const title=E('marketTitle').value.trim(),condition=E('marketCondition').value,area=E('marketArea').value.trim();
 if(!title){E('marketSmartStatus').textContent='Enter what you are listing first.';E('marketTitle').focus();return}
 const desc=E('marketDescription');
 if(desc.value.trim()&&!confirm('Replace your existing description with a suggested draft?'))return;
 const type=E('marketType').value;
 desc.value=`${title}. Condition: ${condition}. ${type==='Free'?'Free to collect.':type==='Swap'?'Open to swap offers.':'Available for sale.'}${area?' Collection area: '+area+'.':''} Please message me if you would like more details.`;
 const words=title.toLowerCase();
 const guesses=[['Electronics',/phone|laptop|tablet|tv|console|camera|speaker/],['Furniture',/sofa|chair|table|wardrobe|drawers|desk|bed/],['Sports',/bike|bicycle|golf|football|tennis|gym/],['Books',/book|novel|comic/],['Tools',/drill|saw|spanner|tool/],['Children & Toys',/toy|pram|pushchair|lego/],['Clothing',/coat|jacket|dress|shoe|shirt/]];
 const category=guesses.find(([_,rx])=>rx.test(words));if(category)E('marketCategory').value=category[0];
 E('marketSmartStatus').textContent='Draft prepared. Add honest details, check the category and upload your own photographs before publishing.';
};E('marketFiles').onchange=previewFiles;if(editId){const existing=listings.find(x=>x.id===editId);if(existing){for(const [key,value] of Object.entries({Title:existing.title,Description:existing.description,Category:existing.category,Type:existing.type,Price:existing.price,Condition:existing.condition,Area:existing.area})){const el=E('market'+key);if(el)el.value=value}}}}
if(view==='detail'){const x=listings.find(v=>v.id===selected);showPhotos(x);if(E('marketShare'))E('marketShare').onclick=()=>shareItem({page:'marketplace',item:x.id,title:x.title,notify});if(E('marketEdit'))E('marketEdit').onclick=()=>{editId=x.id;view='create';draw()};if(E('marketSold'))E('marketSold').onclick=()=>act(async()=>{await request(client.from('market_listings').update({status:x.status==='sold'?'available':'sold'}).eq('id',x.id));await load()});if(E('marketRemove'))E('marketRemove').onclick=()=>{if(confirm('Remove this listing?'))act(async()=>{await request(client.from('market_listings').delete().eq('id',x.id));view='list';await load()})};if(E('marketEnquire'))E('marketEnquire').onclick=()=>send(x,'enquiry');if(E('marketSendOffer'))E('marketSendOffer').onclick=()=>send(x,'offer');if(E('marketReport'))E('marketReport').onclick=()=>report(x)}
}
async function act(fn){try{await fn()}catch(err){notify(err.message)}}

function previewFiles(){
 const root=E('marketFilePreview');if(!root)return;
 previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];
 const files=[...E('marketFiles').files];
 if(files.length>8){root.textContent='Choose no more than eight photos.';return}
 root.replaceChildren();
 for(const file of files){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5e6){root.textContent='Only JPG, PNG or WebP photos under 5MB are allowed.';return}
  const url=URL.createObjectURL(file);previewUrls.push(url);
  const img=document.createElement('img');img.src=url;img.alt='Selected listing photo';root.append(img)
 }
}
async function create(ev){
 ev.preventDefault();
 const btn=E('marketPublish');btn.disabled=true;
 await act(async()=>{
  const files=[...E('marketFiles').files];
  if(files.length>8||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5e6))throw Error('Select up to eight JPG, PNG or WebP photos, each under 5MB.');
  const type=E('marketType').value,price=Number(E('marketPrice').value||0);
  if(!Number.isFinite(price)||price<0)throw Error('Invalid price');
  const existing=editId?listings.find(x=>x.id===editId):null;
  if(editId&&(!existing||existing.seller_id!==member.id))throw Error('Only the seller can edit this listing.');
  const paths=existing&&!files.length?existing.photo_paths||[]:[];
  for(const f of files){
   const ext=f.type==='image/png'?'png':f.type==='image/webp'?'webp':'jpg';
   const path=`${member.id}/${crypto.randomUUID()}.${ext}`;
   await request(client.storage.from('marketplace-photos').upload(path,f,{contentType:f.type}));
   paths.push(path)
  }
  const payload={title:E('marketTitle').value.trim(),description:E('marketDescription').value.trim(),category:E('marketCategory').value,type,price:type==='Sale'?price:0,condition:E('marketCondition').value,area:E('marketArea').value.trim(),photo_paths:paths};
  if(existing)await request(client.from('market_listings').update(payload).eq('id',existing.id).eq('seller_id',member.id));
  else await request(client.from('market_listings').insert({...payload,seller_id:member.id}));
  notify(existing?'Listing updated':'Listing published');
  editId=null;view='list';await load()
 });
 if(E('marketPublish'))E('marketPublish').disabled=false
}
async function showPhotos(x){
 const el=E('marketPhotos');if(!el)return;
 el.className='market-detail-gallery';el.textContent='Loading photos…';
 const urls=await Promise.all((x.photo_paths||[]).map(async path=>{
  const {data}=await client.storage.from('marketplace-photos').createSignedUrl(path,3600);
  return data?.signedUrl||null
 }));
 if(!E('marketPhotos'))return;
 el.replaceChildren();
 const available=urls.filter(Boolean);
 if(!available.length){el.textContent='No photos uploaded yet.';return}
 const hero=document.createElement('img');hero.src=available[0];hero.alt='Large photo of '+x.title;hero.className='market-gallery-hero';el.append(hero);
 const thumbs=document.createElement('div');thumbs.className='market-gallery-thumbs';
 available.forEach((url,i)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','View item photo '+(i+1));const img=document.createElement('img');img.src=url;img.alt='Item photo '+(i+1);button.append(img);button.onclick=()=>{hero.src=url;thumbs.querySelectorAll('button').forEach(b=>b.classList.remove('active'));button.classList.add('active')};if(i===0)button.classList.add('active');thumbs.append(button)});
 el.append(thumbs)
}
async function send(x,kind){const raw=kind==='offer'?E('marketOffer').value:E('marketMessage').value.trim();if(!raw)return notify('Enter a message or offer');const value=Number(raw);if(kind==='offer'&&(!Number.isFinite(value)||value<0))return notify('Enter a valid offer');const body=kind==='offer'?`Offer: £${value.toFixed(2)}`:raw;await act(async()=>{await request(client.from('market_messages').insert({listing_id:x.id,sender_id:member.id,recipient_id:x.seller_id,kind,body}));notify('Private message sent');if(kind==='offer')E('marketOffer').value='';else E('marketMessage').value=''})}
async function inbox(){await act(async()=>{const data=await request(client.from('market_messages').select('*').order('created_at',{ascending:false}).limit(100));if(!E('marketMessages'))return;E('marketMessages').innerHTML=data.map(m=>`<div class="item"><small>${new Date(m.created_at).toLocaleString('en-GB')} · ${m.sender_id===member.id?'Sent':'Received'} · ${safe(m.kind)}</small><p>${safe(m.body)}</p><button data-reply="${m.id}">Reply</button></div>`).join('')||'<p>No enquiries yet.</p>';E('marketMessages').querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>{const m=data.find(v=>v.id===b.dataset.reply),body=prompt('Your reply:');if(!body?.trim())return;act(async()=>{await request(client.from('market_messages').insert({listing_id:m.listing_id,sender_id:member.id,recipient_id:m.sender_id===member.id?m.recipient_id:m.sender_id,kind:'reply',body:body.trim().slice(0,1000)}));notify('Reply sent');inbox()})})})}
async function report(x){const reason=prompt('Why are you reporting this listing?');if(!reason?.trim())return;await act(async()=>{await request(client.from('market_reports').insert({listing_id:x.id,reporter_id:member.id,reason:reason.trim().slice(0,1000)}));notify('Report submitted for moderator review')})}
