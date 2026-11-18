const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sb=null,user=null,notice=()=>{},authorized=false, reports=[],tradeReports=[],trades=[],hidden=[];
const request=async p=>{const {data,error}=await p;if(error)throw error;return data};
export function adminView(){return `<section class="panel"><h2>🛡️ Marketplace & Trades Admin</h2><p class="muted">Review reports, moderate listings and approve local tradespeople. Only accounts approved in Supabase can use these controls.</p><div id="adminRoot">Checking permissions…</div></section>`}
export async function bindAdmin(context){({sb,user,notice}=context);if(!sb||!user){$('adminRoot').innerHTML='<p>Sign in to access administration.</p>';return}try{const {data,error}=await sb.rpc('is_local_admin');if(error)throw error;authorized=data===true;if(!authorized){$('adminRoot').innerHTML='<p class="warn">This account is not an approved administrator.</p>';return}await load()}catch(e){$('adminRoot').innerHTML=`<p class="warn">Admin access unavailable: ${safe(e.message)}. Run ADMIN-TRADES-SETUP.sql and approve your account.</p>`}}
async function load(){try{[reports,tradeReports,trades,hidden]=await Promise.all([
request(sb.from('market_reports').select('id,listing_id,reason,reviewed,created_at').order('created_at',{ascending:false}).limit(100)),
request(sb.from('local_trade_reports').select('id,trade_id,reason,reviewed,created_at').order('created_at',{ascending:false}).limit(100)),
request(sb.from('local_trades').select('id,business_name,trade,area,status,created_at').order('created_at',{ascending:false}).limit(200)),
request(sb.from('market_listings').select('id,title,status').eq('status','hidden').limit(100))]);render()}catch(e){$('adminRoot').innerHTML=`<p class="warn">${safe(e.message)}</p>`}}
function render(){const root=$('adminRoot');if(!root)return;
root.innerHTML=`<div class="admin-stats"><div><b>${reports.filter(r=>!r.reviewed).length}</b><span>Marketplace reports</span></div><div><b>${tradeReports.filter(r=>!r.reviewed).length}</b><span>Trade reports</span></div><div><b>${trades.filter(t=>t.status==='pending').length}</b><span>Awaiting approval</span></div></div>
<h3>📦 Reported Marketplace listings</h3>${reports.map(r=>`<div class="item"><b>${safe(r.reason)}</b><p><small>Listing: ${safe(r.listing_id)} · ${r.reviewed?'Reviewed':'Awaiting review'}</small></p><button data-hide-market="${r.listing_id}">Hide listing</button> <button data-review-market="${r.id}">${r.reviewed?'Mark unreviewed':'Mark reviewed'}</button></div>`).join('')||'<p>No reports.</p>'}
<h3>🛠️ Trades awaiting approval</h3>${trades.filter(t=>t.status==='pending').map(t=>`<div class="item"><b>${safe(t.business_name)}</b><p>${safe(t.trade)} · ${safe(t.area)}</p><button data-trade-approve="${t.id}">Approve</button> <button data-trade-hide="${t.id}">Reject / hide</button></div>`).join('')||'<p>No pending adverts.</p>'}
<h3>🚩 Reported trades</h3>${tradeReports.map(r=>`<div class="item"><b>${safe(r.reason)}</b><p><small>Trade listing: ${safe(r.trade_id)} · ${r.reviewed?'Reviewed':'Awaiting review'}</small></p><button data-trade-hide="${r.trade_id}">Hide advert</button> <button data-review-trade="${r.id}">${r.reviewed?'Mark unreviewed':'Mark reviewed'}</button></div>`).join('')||'<p>No trade reports.</p>'}
<h3>🗃️ Hidden marketplace listings</h3>${hidden.map(x=>`<div class="item"><b>${safe(x.title)}</b><p><button data-restore-market="${x.id}">Restore listing</button></p></div>`).join('')||'<p>No hidden listings.</p>'}
<h3>🗃️ Hidden trades</h3>${trades.filter(t=>t.status==='hidden').map(t=>`<div class="item"><b>${safe(t.business_name)}</b><p><button data-trade-approve="${t.id}">Restore / approve</button></p></div>`).join('')||'<p>No hidden trades.</p>'}`;
const bind=(selector,fn)=>root.querySelectorAll(selector).forEach(b=>b.onclick=()=>run(()=>fn(b)));
bind('[data-hide-market]',b=>request(sb.from('market_listings').update({status:'hidden'}).eq('id',b.dataset.hideMarket)));
bind('[data-restore-market]',b=>request(sb.from('market_listings').update({status:'available'}).eq('id',b.dataset.restoreMarket)));
bind('[data-review-market]',b=>{const r=reports.find(r=>r.id===b.dataset.reviewMarket);return request(sb.from('market_reports').update({reviewed:!r.reviewed}).eq('id',r.id))});
bind('[data-trade-approve]',b=>request(sb.from('local_trades').update({status:'approved'}).eq('id',b.dataset.tradeApprove)));
bind('[data-trade-hide]',b=>request(sb.from('local_trades').update({status:'hidden'}).eq('id',b.dataset.tradeHide)));
bind('[data-review-trade]',b=>{const r=tradeReports.find(r=>r.id===b.dataset.reviewTrade);return request(sb.from('local_trade_reports').update({reviewed:!r.reviewed}).eq('id',r.id))});
}
async function run(fn){try{await fn();notice('Moderation action saved');await load()}catch(e){notice('Action failed: '+e.message)}}
