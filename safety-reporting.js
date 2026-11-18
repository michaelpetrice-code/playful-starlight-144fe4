
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
export function safetyView(committee=false){
if(committee)return `<section class="panel"><h2>🛡️ Committee Safety Inbox</h2><p>Restricted to authorised committee reviewers. Reports contain sensitive information; do not share outside the review team.</p><div id="safetyInbox">Checking committee permissions…</div></section>`;
return `<section class="panel"><h2>🛡️ Report Behaviour</h2><p>Help us keep The Local welcoming and inclusive. Report harassment, bullying, hate speech, discrimination, threats or other poor behaviour. Your report goes to approved committee reviewers, not the public chat.</p><p><strong>In immediate danger?</strong> Contact emergency services. This form is not monitored continuously.</p>
<form id="safetyReportForm">
<label>Type of concern<select id="safetyCategory" required><option value="">Select a category</option><option>Bullying or harassment</option><option>Discrimination or hate speech</option><option>Threatening behaviour</option><option>Sexual harassment</option><option>Inappropriate images or messages</option><option>Other safety concern</option></select></label>
<label>Where did it happen?<input id="safetyLocation" maxlength="180" required placeholder="Venue, table, chat or event"></label>
<label>Person or account involved (if known)<input id="safetySubject" maxlength="160" placeholder="Display name or account"></label>
<label>Describe what happened<textarea id="safetyDetails" required minlength="15" maxlength="4000" placeholder="What happened? When? Any witnesses?"></textarea></label>
<label>Optional evidence (JPEG, PNG, WebP or PDF, max 10 MB each)<input id="safetyEvidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple></label><label><input id="safetyUrgent" type="checkbox" style="width:auto"> This may require urgent committee attention</label>
<p class="muted">Only approved committee reviewers can read your report. Your account ID is recorded to allow follow-up. Reports are not anonymous. Avoid sharing unnecessary personal or sensitive information.</p>
<button type="submit">🔒 Send confidential report</button>
</form><div id="safetyResult" role="status"></div></section>`;
}
export async function bindSafety({sb,user,cloud,notice,committee}){
if(committee){
 const target=document.getElementById('safetyInbox');if(!target)return;
 if(!cloud||!user){target.textContent='Sign in with a committee-approved account to review reports.';return;}
 const {data,error}=await sb.from('local_safety_reports').select('id,created_at,category,location,subject,details,urgent,status,committee_notes,reporter_id').order('created_at',{ascending:false}).limit(100);
 if(error){target.textContent='Access unavailable. Committee permissions or database setup may be missing: '+error.message;return;}
 target.innerHTML=data?.length?data.map(r=>`<article class="safety-case"><p><b>${escapeHtml(r.category)}</b> · ${new Date(r.created_at).toLocaleString('en-GB')} ${r.urgent?'· ⚠️ URGENT':''}</p><p><b>Location:</b> ${escapeHtml(r.location)}</p><p><b>Involved:</b> ${escapeHtml(r.subject||'Not specified')}</p><p>${escapeHtml(r.details)}</p><div data-evidence-for="${r.id}">Loading evidence…</div><label>Status<select data-report-status="${r.id}">${['New','Under review','Action taken','Closed'].map(x=>`<option ${r.status===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Private committee notes<textarea data-report-notes="${r.id}" maxlength="2000">${escapeHtml(r.committee_notes||'')}</textarea></label><button data-report-save="${r.id}">Save review</button></article>`).join(''):'No reports submitted.';
 for(const r of data||[]){const el=target.querySelector(`[data-evidence-for="${r.id}"]`);const {data:items,error:err}=await sb.storage.from('local-safety-evidence').list(`${r.reporter_id}/${r.id}`);if(err){el.textContent='Evidence unavailable';continue;}el.textContent='';for(const f of items||[]){const path=`${r.reporter_id}/${r.id}/${f.name}`;const {data:link}=await sb.storage.from('local-safety-evidence').createSignedUrl(path,120);if(link?.signedUrl){const a=document.createElement('a');a.href=link.signedUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='📎 '+f.name;el.append(a,document.createElement('br'));}}}
target.querySelectorAll('[data-report-save]').forEach(b=>b.onclick=async()=>{const id=b.dataset.reportSave;const status=target.querySelector(`[data-report-status="${id}"]`).value,committee_notes=target.querySelector(`[data-report-notes="${id}"]`).value;const {error}=await sb.rpc("review_local_safety_report",{p_report_id:id,p_status:status,p_notes:committee_notes});notice(error?'Unable to save: '+error.message:'Committee review saved');});
 return;
}
const form=document.getElementById('safetyReportForm');if(!form)return;
form.onsubmit=async e=>{e.preventDefault();if(!cloud||!user)return notice('Sign in to submit a confidential report.');const button=form.querySelector('button[type=submit]');button.disabled=true;
try{const reportId=crypto.randomUUID();const payload={id:reportId,category:document.getElementById('safetyCategory').value,location:document.getElementById('safetyLocation').value.trim(),subject:document.getElementById('safetySubject').value.trim(),details:document.getElementById('safetyDetails').value.trim(),urgent:document.getElementById('safetyUrgent').checked,reporter_id:user.id};const {error}=await sb.from('local_safety_reports').insert(payload);if(error)throw error;const files=[...document.getElementById('safetyEvidence').files];let uploadFailures=0;
for(const file of files.slice(0,5)){if(file.size>10485760||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)){uploadFailures++;continue;}
const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90);
const path=`${user.id}/${reportId}/${crypto.randomUUID()}-${safeName}`;
const {error:uploadError}=await sb.storage.from('local-safety-evidence').upload(path,file,{upsert:false,contentType:file.type});
if(uploadError)uploadFailures++;}
form.reset();document.getElementById('safetyResult').textContent=uploadFailures?`Report submitted, but ${uploadFailures} attachment(s) could not be uploaded. Contact the committee if evidence is important.`:'Your report has been submitted confidentially to the committee. Thank you for raising your concern.';notice('Report submitted securely');}
catch(err){notice('Report not sent: '+err.message)}finally{button.disabled=false}};
}
