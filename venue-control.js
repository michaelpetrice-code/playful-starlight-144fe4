if (typeof document !== 'undefined' && !document.querySelector('link[data-tl198-launch]')) { const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = './venue-control-v198.css'; css.dataset.tl198Launch = ''; document.head.append(css); }

export function mountVenueControls({sb,user,staff}, target) {
const selector=document.createElement('select');
selector.setAttribute('aria-label','Managed venue');
for(const entry of staff) selector.add(new Option(entry.platform_venues.name,entry.venue_id));
target.prepend(selector);
const content=document.createElement('div');
target.append(content);
const activate=()=>{
 const entry=staff.find(row=>row.venue_id===selector.value);
 if(entry) renderVenue(entry,content);
};
selector.onchange=activate;
activate();
function renderVenue(entry,parent) {
const venue=entry.platform_venues, role=entry.role;
const target=document.createElement('div');
parent.replaceChildren(target);
target.innerHTML=venueMarkup;
// A prominent launch action routes into the existing authenticated builder.
// Publishing itself is only performed by local_builder_save after its server-side checks.
const launchCard = document.createElement('section');
launchCard.className = 'tl198-launch-card';
launchCard.innerHTML = `<div class="tl198-launch-copy"><span class="tl198-eyebrow">YOUR VENUE APP</span><h2>Ready to go live?</h2><p>Build, preview and publish your app for members. You can update or unpublish it later.</p><p class="tl198-launch-state" role="status">Checking publishing access…</p></div><div class="tl198-launch-actions"><a class="tl198-publish-button" href="index.html?section=venue-app-builder">🚀 Publish My App</a><span>Opens the secure app builder and publishing checklist</span></div>`;
target.prepend(launchCard);
const quizLink = document.createElement('a');
quizLink.className = 'tl198-publish-button';
quizLink.href = 'pub-quiz.html';
quizLink.textContent = 'Open Pub Quiz';
launchCard.querySelector('.tl198-launch-actions').append(quizLink);

const launchState = launchCard.querySelector('.tl198-launch-state');
Promise.resolve().then(async () => {
 const {data,error} = await sb.rpc('local_builder_get');
 if (!launchCard.isConnected) return;
 if (error) { launchState.textContent = 'Open the builder to check your publishing eligibility.'; return; }
 if (!data?.eligible) { launchState.textContent = 'An active app-builder subscription is required before publishing.'; return; }
 const isLive = Boolean(data.app?.published);
 launchState.textContent = isLive ? '● Your app is live — open the builder to manage or update it.' : '● Your app is not yet live — finish the checklist to publish.';
 launchCard.querySelector('.tl198-publish-button').textContent = isLive ? '🚀 Manage My Live App' : '🚀 Publish My App';
}).catch(() => { if (launchCard.isConnected) launchState.textContent = 'Open the builder to check your publishing eligibility.'; });
const $=id=>target.querySelector('#vc-'+id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=(message,error=false)=>{
 const status=$('actionStatus');
 status.textContent=message;
 status.dataset.error=String(error);
};

$('announcementForm').onsubmit=saveAnnouncement;
$('staffForm').onsubmit=saveStaff;
refresh().catch(e=>notice(e.message,true));
async function refresh(){await Promise.all([loadFeatures(),loadAnnouncements(),loadStaff(),loadAudit()])}
async function loadFeatures(){const {data,error}=await sb.from('platform_venue_features').select('feature_key,visible').eq('venue_id',venue.id).order('feature_key');if(error){$('featureList').textContent=error.message;return}$('featureList').innerHTML=(data||[]).map(f=>`<div class="item"><div><strong>${esc(f.feature_key.replaceAll('_',' '))}</strong><p>${f.visible?'Visible to members when the app honours this setting':'Hidden when the app honours this setting'}</p></div><label class="switch"><input type="checkbox" data-feature="${esc(f.feature_key)}" ${f.visible?'checked':''} aria-label="Show ${esc(f.feature_key)}"><span>${f.visible?'On':'Off'}</span></label></div>`).join('')||'No features configured';$('featureList').querySelectorAll('[data-feature]').forEach(input=>input.onchange=async()=>{input.disabled=true;const {error}=await sb.from('platform_venue_features').update({visible:input.checked,updated_by:user.id,updated_at:new Date().toISOString()}).eq('venue_id',venue.id).eq('feature_key',input.dataset.feature);notice(error?error.message:'Feature setting saved.',!!error);await loadFeatures();await loadAudit()})}
async function loadAnnouncements(){const {data,error}=await sb.from('platform_venue_announcements').select('id,title,body,published,created_at').eq('venue_id',venue.id).order('created_at',{ascending:false}).limit(30);if(error){$('announcementList').textContent=error.message;return}$('announcementList').innerHTML=(data||[]).map(a=>`<div class="item"><div><strong>${esc(a.title)}</strong><p>${esc(a.body)} · ${a.published?'Published':'Draft'}</p></div><button data-ann="${a.id}" data-published="${a.published}">${a.published?'Unpublish':'Publish'}</button></div>`).join('')||'<p>No announcements yet.</p>';$('announcementList').querySelectorAll('[data-ann]').forEach(b=>b.onclick=async()=>{const {error}=await sb.from('platform_venue_announcements').update({published:b.dataset.published!=='true'}).eq('id',b.dataset.ann).eq('venue_id',venue.id);notice(error?error.message:'Announcement updated.',!!error);await loadAnnouncements();await loadAudit()})}
async function saveAnnouncement(e){e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from('platform_venue_announcements').insert({venue_id:venue.id,title:String(f.get('title')).trim(),body:String(f.get('body')).trim(),published:f.has('published'),created_by:user.id});notice(error?error.message:'Announcement saved.',!!error);if(!error)e.target.reset();await loadAnnouncements();await loadAudit()};
async function loadStaff(){const {data,error}=await sb.from('platform_venue_staff').select('user_id,role,created_at').eq('venue_id',venue.id);if(error){$('staffList').textContent=error.message;return}
const adminCount=(data||[]).filter(s=>['owner','admin'].includes(s.role)).length;
$('adminCapacity').textContent=`${adminCount} of 5 administrator places used (including the owner). ${Math.max(0,5-adminCount)} available.`;
const option=$('staffForm').querySelector('option[value="admin"]');option.disabled=adminCount>=5;
$('staffList').innerHTML=(data||[]).map(s=>`<div class="item"><div><strong>${esc(s.role)}</strong><p>${esc(s.user_id)}${s.user_id===user.id?' · You':''}</p></div>${role==='owner'&&s.user_id!==user.id?`<button class="danger" data-remove="${esc(s.user_id)}">Remove</button>`:''}</div>`).join('');$('staffForm').hidden=role!=='owner';$('staffList').querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this staff member from the venue?'))return;const {error}=await sb.from('platform_venue_staff').delete().eq('venue_id',venue.id).eq('user_id',b.dataset.remove);notice(error?error.message:'Staff member removed.',!!error);await loadStaff();await loadAudit()})}
async function saveStaff(e){e.preventDefault();if(role!=='owner')return;const f=new FormData(e.target);
if(f.get('role')==='admin'&&$('staffForm').querySelector('option[value="admin"]').disabled){notice('All five administrator places are in use.',true);return}
const {error}=await sb.from('platform_venue_staff').insert({venue_id:venue.id,user_id:String(f.get('user_id')).trim(),role:f.get('role')});notice(error?error.message:'Staff member added.',!!error);if(!error)e.target.reset();await loadStaff();await loadAudit()};
async function loadAudit(){const {data,error}=await sb.from('platform_venue_audit').select('action,target_table,target_id,actor_id,happened_at').eq('venue_id',venue.id).order('happened_at',{ascending:false}).limit(40);$('auditList').innerHTML=error?`<p>${esc(error.message)}</p>`:(data||[]).map(a=>`<div class="item"><div><strong>${esc(a.action)} · ${esc(a.target_table)}</strong><p>${esc(a.target_id||'')} · ${esc(a.actor_id||'SQL administrator')} · ${new Date(a.happened_at).toLocaleString('en-GB')}</p></div></div>`).join('')||'<p>No changes recorded.</p>'}

}
}
const venueMarkup = `<section class="panel" id="vc-features"><h3>Show or hide features</h3><p>Hidden features remain in the database. Connected venue apps must read these flags to apply visibility changes.</p><div id="vc-featureList"></div></section><section class="panel" id="vc-announcements"><h3>Announcements</h3><form id="vc-announcementForm"><label>Title<input name="title" maxlength="120" required></label><label>Message<textarea name="body" maxlength="5000" rows="4" required></textarea></label><label><input type="checkbox" name="published"> Publish immediately</label><button>Save announcement</button></form><div id="vc-announcementList"></div></section><section class="panel" id="vc-staff"><h3>Venue administrators & staff</h3><p id="vc-adminCapacity" role="status">Checking administrator places…</p><p>Up to five owners and administrators in total, including the original owner. Only the owner can add or remove administrators. Staff must have an account in The Local.</p><div id="vc-staffList"></div><form id="vc-staffForm"><label>Existing user UUID<input name="user_id" required placeholder="User ID from Authentication → Users"></label><label>Role<select name="role"><option>staff</option><option>manager</option><option>admin</option></select></label><button>Add staff member</button></form></section><section class="panel" id="vc-audit"><h3>Recent administrator changes</h3><div id="vc-auditList"></div></section><p id="vc-actionStatus" role="status"></p>`;
