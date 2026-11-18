import {studioView,bindStudio} from './content-studio.js';

const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
let session={sb:null,user:null,notice:null};
export async function isOwner(sb,user){
 if(!sb||!user)return false;
 const {data,error}=await sb.rpc('local_is_owner');
 if(error){console.warn('Owner access check:',error.message);return false}
 return data===true;
}
export function ownerView(){return `<div class="owner-console"><header class="owner-heading"><span>✦ PRIVATE CONTROL CENTRE</span><h2>The Local · Owner Dashboard</h2><p>Restricted to your approved account. Metrics are read directly from Supabase.</p></header><div id="ownerConsoleData" role="status">Loading secure dashboard…</div></div>`}
export async function bindOwner({sb,user,notice}){
 session={sb,user,notice};
 const root=document.getElementById('ownerConsoleData');if(!root)return;
 if(!await isOwner(sb,user)){root.innerHTML='<div class="owner-warning">Access denied. Only the registered owner can open this dashboard. See OWNER-SETUP-v52.sql.</div>';return}
 try{
 const {data,error}=await sb.rpc('local_owner_metrics');if(error)throw error;
 const d=data||{};const stats=[
 ['Registered members',d.members,'users'],['Published venues',d.venues,'map-pin'],['Pending venue applications',d.venue_applications,'building'],
 ['Community posts',d.posts,'message-circle'],['Marketplace listings',d.marketplace,'store'],['Pending trades',d.pending_trades,'wrench'],
 ['Marketplace reports',d.market_reports,'flag'],['Trade reports',d.trade_reports,'shield-alert']
 ];
 root.innerHTML=`<div class="owner-stat-grid">${stats.map(([label,val])=>`<div class="owner-stat"><span>${safe(label)}</span><strong>${val===null||val===undefined?'—':Number(val).toLocaleString('en-GB')}</strong></div>`).join('')}</div><section class="owner-actions"><h3>Management shortcuts</h3><p>Use your existing approval and moderation tools. Those tools retain their own permissions.</p><div class="owner-action-row"><button data-owner-pane="applications">Review venue applications →</button><button data-owner-pane="market">Marketplace & trades →</button><button data-owner-pane="safety">Safety reports →</button><button id="ownerRefresh">Refresh figures ↻</button></div></section><p class="owner-footnote">A dash means that module has not been installed. No demo figures are presented as live data.</p>`;
 root.insertAdjacentHTML('beforeend', `<section class="owner-actions"><h3>Quick publish</h3><p>Write an announcement, save as draft or publish to all signed-in members.</p><form id="ownerPublish"><label>Title<input name="title" maxlength="120" required placeholder="e.g. Friday night at The Local"></label><label>Message<textarea name="body" rows="5" maxlength="5000" required placeholder="Write your update here..."></textarea></label><label>Optional image URL<input name="image_url" type="url" placeholder="https://..."></label><div class="owner-action-row"><button type="submit" name="action" value="publish">Publish now</button><button type="submit" name="action" value="draft">Save draft</button></div></form><p id="ownerPublishStatus" role="status"></p><h3>Announcements</h3><div id="ownerAnnouncements">Loading…</div></section><section class="owner-actions"><h3>Member management</h3><p>Search registered members and set account status. Changes are recorded in the audit log.</p><input id="ownerMemberSearch" placeholder="Search by email or ID" aria-label="Search members"><button id="ownerMemberLoad">Search members</button><div id="ownerMembers" role="status"></div><h3>Moderation log</h3><div id="ownerAudit">Loading…</div></section>`);
 root.insertAdjacentHTML('afterbegin', assistantView(d)); bindAssistant(root,d); root.insertAdjacentHTML('afterbegin', healthView()); bindHealth(root);
 root.insertAdjacentHTML('beforeend',studioView());bindStudio({sb});
 root.insertAdjacentHTML('afterbegin',`<section class="owner-actions" aria-label="Multi-industry community oversight"><h3>✦ AI Platform Manager · Community Overview</h3><p>Cross-industry community health, recommended actions and subscriber activity. Recommendations are read-only and require your approval.</p><button type="button" id="ownerCommunityRefresh">Refresh communities</button><div id="ownerCommunityOverview" role="status">Loading…</div><div id="ownerCommunityAdvice"></div></section>`);
 const loadCommunities=async()=>{
  const box=root.querySelector('#ownerCommunityOverview'), advice=root.querySelector('#ownerCommunityAdvice');
  box.textContent='Checking community activity…';
  const {data,error}=await sb.rpc('local_owner_community_overview');
  if(error){box.textContent='Community overview unavailable: '+error.message+'. Run INSTALL-V201-COMMUNITIES.sql.';advice.textContent='';return}
  const list=Array.isArray(data)?data:[];
  box.innerHTML=list.length?`<div style="overflow-x:auto"><table><thead><tr><th>Organisation</th><th>Community</th><th>Tables</th><th>Members</th><th>Posts (7 days)</th></tr></thead><tbody>${list.map(v=>`<tr><td>${safe(v.name)}<small> · ${safe(v.type)}</small></td><td>${safe(v.community_title)}</td><td>${Number(v.table_count)||0}</td><td>${Number(v.members)||0}</td><td>${Number(v.posts_7d)||0}</td></tr>`).join('')}</tbody></table></div>`:'<p>No registered communities yet.</p>';
  const noTables=list.filter(v=>!Number(v.table_count));
  const inactive=list.filter(v=>Number(v.table_count)>0&&!Number(v.posts_7d));
  const alerts=[];
  if(noTables.length) alerts.push(`${noTables.length} organisations have no tables. Offer an industry starter and an onboarding message.`);
  if(inactive.length) alerts.push(`${inactive.length} communities have no posts in the last seven days. Suggest an event, welcome post or volunteer moderator.`);
  if(!alerts.length)alerts.push('No obvious setup or seven-day activity gaps found in the available data.');
  advice.replaceChildren();
  const h=document.createElement('h4');h.textContent='Suggested next actions';advice.append(h);
  const ul=document.createElement('ul');alerts.forEach(a=>{const li=document.createElement('li');li.textContent=a;ul.append(li)});advice.append(ul);
  const p=document.createElement('p');p.textContent='These are automated rule-based suggestions, not an autonomous AI agent. No actions are taken without your approval.';advice.append(p);
 };
 root.querySelector('#ownerCommunityRefresh').onclick=loadCommunities;
 await loadCommunities();

 setupManagement(root);
 root.querySelectorAll('[data-owner-pane]').forEach(button=>{
  if(!root.closest('.tl149-admin')?.querySelector(`[data-admin-pane="${button.dataset.ownerPane}"]`))button.remove();
 });
 root.querySelector('#ownerRefresh')?.addEventListener('click',()=>bindOwner(session));
 }catch(e){root.innerHTML=`<div class="owner-warning">Dashboard data unavailable: ${safe(e.message)}. Run OWNER-SETUP-v52.sql in Supabase.</div>`}
}

async function setupManagement(root){
 const status=root.querySelector('#ownerPublishStatus');
 const reloadAnnouncements=async()=>{
  const box=root.querySelector('#ownerAnnouncements');const {data,error}=await session.sb.rpc('local_owner_announcements');
  if(error){box.textContent=error.message;return}
  box.innerHTML=(data||[]).map(a=>`<article class="owner-list-item"><div><strong>${safe(a.title)}</strong><small>${a.published?'Published':'Draft'} · ${safe(new Date(a.created_at).toLocaleDateString('en-GB'))}</small><p>${safe(a.body).slice(0,300)}</p></div><div class="owner-action-row"><button data-ann-id="${a.id}" data-ann-action="${a.published?'unpublish':'publish'}">${a.published?'Unpublish':'Publish'}</button><button data-ann-id="${a.id}" data-ann-action="delete">Delete</button></div></article>`).join('')||'<p>No announcements yet.</p>';
  box.querySelectorAll('[data-ann-action]').forEach(b=>b.onclick=async()=>{const action=b.dataset.annAction;if(action==='delete'&&!confirm('Delete this announcement permanently?'))return;const {error}=await session.sb.rpc('local_owner_announcement_action',{p_id:b.dataset.annId,p_action:action});if(error)alert(error.message);else{await reloadAnnouncements();await loadAudit()}});
 };
 const form=root.querySelector('#ownerPublish');form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);const action=e.submitter?.value||'draft';status.textContent='Saving…';const {error}=await session.sb.rpc('local_owner_save_announcement',{p_title:fd.get('title'),p_body:fd.get('body'),p_image_url:fd.get('image_url')||null,p_publish:action==='publish'});status.textContent=error?error.message:(action==='publish'?'Published successfully.':'Draft saved.');if(!error){form.reset();await reloadAnnouncements();await loadAudit()}};
 const loadMembers=async()=>{const box=root.querySelector('#ownerMembers');box.textContent='Loading members…';const {data,error}=await session.sb.rpc('local_owner_members',{p_search:root.querySelector('#ownerMemberSearch').value.trim()});if(error){box.textContent=error.message;return}box.innerHTML=(data||[]).map(m=>`<article class="owner-list-item"><div><strong>${safe(m.email||'No email')}</strong><small>${safe(m.id)} · ${safe(m.status)}</small></div><div class="owner-action-row">${['active','suspended','banned'].map(st=>`<button data-member="${safe(m.id)}" data-status="${st}" ${m.status===st?'disabled':''}>${st==='active'?'Restore':st==='suspended'?'Suspend':'Ban'}</button>`).join('')}</div></article>`).join('')||'<p>No matching members.</p>';box.querySelectorAll('[data-member]').forEach(b=>b.onclick=async()=>{const reason=prompt(`Reason for ${b.dataset.status} (required for audit):`);if(!reason?.trim())return; if(!confirm(`Change this member to ${b.dataset.status}?`))return;const {error}=await session.sb.rpc('local_owner_set_member_status',{p_user_id:b.dataset.member,p_status:b.dataset.status,p_reason:reason.trim()});if(error)alert(error.message);else{await loadMembers();await loadAudit()}})};
 const loadAudit=async()=>{const box=root.querySelector('#ownerAudit');const {data,error}=await session.sb.rpc('local_owner_audit');box.innerHTML=error?`<p>${safe(error.message)}</p>`:(data||[]).map(x=>`<p class="owner-audit-row"><b>${safe(x.action)}</b> · ${safe(x.details)}<br><small>${safe(new Date(x.created_at).toLocaleString('en-GB'))}</small></p>`).join('')||'<p>No actions recorded.</p>'};
 root.querySelector('#ownerMemberLoad').onclick=loadMembers;
 root.querySelector('#ownerMemberSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();loadMembers()}};
 await Promise.all([reloadAnnouncements(),loadMembers(),loadAudit()]);
}
export async function loadPublicAnnouncements(sb){if(!sb)return [];const {data,error}=await sb.from('local_announcements').select('id,title,body,image_url,created_at').eq('published',true).order('created_at',{ascending:false}).limit(5);return error?[]:data||[]}
export async function accountStatus(sb,user){if(!sb||!user)return 'active';const {data,error}=await sb.rpc('local_my_account_status');return error?'active':data||'active'}

// Owner-only maintenance copilot: read-only analysis and explicit, reversible suggestions.
function assistantView(d){
 const checks=[
  ['venue_applications','Venue applications','Review pending venue applications','applications',3],
  ['market_reports','Marketplace safety','Review reported marketplace listings','market',5],
  ['trade_reports','Trades safety','Review reported trades','market',5],
  ['pending_trades','Trades approvals','Review pending trades','market',2]
 ];
 const tasks=checks.filter(([key])=>Number(d[key])>0).sort((a,b)=>b[4]-a[4]);
 const notices=tasks.length?tasks.map(([key,label,action,pane])=>`<li><strong>${safe(label)} (${Number(d[key])})</strong> — ${safe(action)} <button type="button" data-copilot-pane="${pane}">Open</button></li>`).join(''):'<li>No pending items detected in the available owner metrics.</li>';
 return `<section class="owner-actions tl-copilot" aria-label="Platform maintenance assistant"><div class="tl-copilot-heading"><div><span class="tl-copilot-kicker">✦ THE LOCAL · OWNER ASSISTANT</span><h3>Maintenance & Growth Copilot</h3><p>Prioritise the work that matters, prepare updates and reduce repetitive admin. Suggestions only — you approve all changes.</p></div><span class="tl-copilot-status">Read-only review</span></div><div class="tl-copilot-grid"><div><h4>Today's priorities</h4><ol id="tlCopilotTasks">${notices}</ol><button id="tlCopilotRefresh" type="button">↻ Recheck live figures</button></div><div><h4>Ask the assistant</h4><label for="tlCopilotQuestion">What would you like help with?</label><textarea id="tlCopilotQuestion" maxlength="800" rows="3" placeholder="e.g. How can I attract more venues? Or what should I work on first?"></textarea><div class="owner-action-row"><button id="tlCopilotAsk" type="button">Get recommendations</button><button id="tlCopilotReport" type="button">Prepare weekly report</button></div><p id="tlCopilotStatus" role="status"></p></div></div><div id="tlCopilotAnswer" class="tl-copilot-answer" aria-live="polite"></div><p class="owner-footnote">The assistant sees aggregate owner dashboard figures, not member details. It never publishes, edits, suspends, deploys or charges anyone. AI suggestions require the optional Supabase function; practical rule-based guidance works without it.</p></section>`;
}
function bindAssistant(root,d){
 const area=root.querySelector('#tlCopilotAnswer'), status=root.querySelector('#tlCopilotStatus');
 const tasks=[['venue_applications','venue applications'],['market_reports','marketplace reports'],['trade_reports','trade reports'],['pending_trades','pending trades']].filter(([k])=>Number(d[k])>0);
 const report=()=>`THE LOCAL — OWNER REVIEW\n${new Date().toLocaleDateString('en-GB')}\n\n`+[['members','Members'],['venues','Published venues'],['venue_applications','Pending venue applications'],['posts','Community posts'],['marketplace','Marketplace listings'],['market_reports','Marketplace reports'],['trade_reports','Trade reports'],['pending_trades','Pending trades']].map(([k,label])=>`${label}: ${d[k]??'Not available'}`).join('\n')+'\n\nSuggested priorities: '+(tasks.length?tasks.map(([k,label])=>`${d[k]} ${label}`).join(', '):'Review engagement, venue growth and member feedback.')+'\n\nFigures are a snapshot, not a trend. Verify before sharing.';
 root.querySelector('#tlCopilotReport').onclick=()=>{const r=report();area.replaceChildren();const pre=document.createElement('pre');pre.textContent=r;area.append(pre);const b=document.createElement('button');b.type='button';b.textContent='Copy report';b.onclick=()=>navigator.clipboard?.writeText(r).then(()=>status.textContent='Report copied.').catch(()=>status.textContent='Select the report to copy.');area.append(b)};
 root.querySelector('#tlCopilotRefresh').onclick=()=>bindOwner(session);
 root.querySelectorAll('[data-copilot-pane]').forEach(b=>b.onclick=()=>{const target=root.closest('.tl149-admin')?.querySelector(`[data-admin-pane="${b.dataset.copilotPane}"]`);if(target)target.click();else status.textContent='Open this section from the Administration menu.'});
 root.querySelector('#tlCopilotAsk').onclick=async()=>{
  const q=root.querySelector('#tlCopilotQuestion').value.trim();if(q.length<5){status.textContent='Please enter at least five characters.';return}
  status.textContent='Preparing suggestions…';area.textContent='';
  const fallback=()=>{const advice=[`Start with ${tasks.length?tasks.map(([k,label])=>`${d[k]} ${label}`).join(', '):'checking venue growth, member engagement and content quality'}.`, 'Review member reports and venue applications before publishing new promotions.', 'For growth, contact prospective pubs and clubs with a short demonstration of the venue app builder.', 'For maintenance, test sign-in, publishing, sharing, payments and the games room after each deployment.', 'Always back up and test changes on staging before approving a live release.'];area.replaceChildren();const h=document.createElement('h4');h.textContent='Suggested action plan';area.append(h);const ol=document.createElement('ol');advice.forEach(t=>{const li=document.createElement('li');li.textContent=t;ol.append(li)});area.append(ol);status.textContent='Practical recommendations (AI service unavailable or not configured).'};
  try{const {data,error}=await session.sb.functions.invoke('local-owner-copilot',{body:{question:q,metrics:Object.fromEntries(['members','venues','venue_applications','posts','marketplace','market_reports','trade_reports','pending_trades'].map(k=>[k,typeof d[k]==='number'?d[k]:null]))}});if(error||!data?.recommendations?.length)throw Error('Unavailable');const h=document.createElement('h4');h.textContent='AI recommendations — review before acting';area.append(h);const ol=document.createElement('ol');data.recommendations.forEach(item=>{const li=document.createElement('li');const strong=document.createElement('strong');strong.textContent=String(item.title||'Suggestion').slice(0,120);li.append(strong,document.createTextNode(' — '+String(item.detail||'').slice(0,500)));ol.append(li)});area.append(ol);status.textContent='Suggestions prepared. No changes were made.'}catch{fallback()}
 };
}

function healthView(){return `<section class="owner-actions" aria-label="Platform health"><h3>🩺 Platform health checks</h3><p>Run read-only checks on this device. For scheduled checks, install the included GitHub Actions workflow. Authentication, publishing and payments require separate test configuration.</p><div class="owner-action-row"><button type="button" id="tlHealthRun">Check public pages now</button><button type="button" id="tlHealthCopy" disabled>Copy report</button></div><div id="tlHealthResults" role="status" aria-live="polite">Not checked yet.</div></section>`}
function bindHealth(root){let report='';const out=root.querySelector('#tlHealthResults'),copy=root.querySelector('#tlHealthCopy');root.querySelector('#tlHealthRun').onclick=async()=>{out.textContent='Checking public pages…';const paths=[['Home','/'],['Games Room','/games-room-next.html'],['Venue App','/venue-app.html'],['Builder code','/venue-app-builder.js']];const data=await Promise.all(paths.map(async ([name,path])=>{try{const c=new AbortController();const timer=setTimeout(()=>c.abort(),12000);try{const res=await fetch(path,{signal:c.signal,cache:'no-store'});const body=await res.text();return {name,ok:res.ok&&body.length>50,detail:'HTTP '+res.status}}finally{clearTimeout(timer)}}catch(e){return{name,ok:false,detail:String(e.message)}}}));report='The Local health review — '+new Date().toLocaleString('en-GB')+'\n'+data.map(x=>(x.ok?'PASS ':'FAIL ')+x.name+' — '+x.detail).join('\n')+'\nNOT VERIFIED: login, venue publishing, Stripe checkout, interactive gameplay.\nProposed fixes require owner approval.';out.replaceChildren();const list=document.createElement('ul');data.forEach(x=>{const li=document.createElement('li');li.textContent=(x.ok?'✓ ':'⚠ ')+x.name+' — '+x.detail;list.append(li)});out.append(list);const p=document.createElement('p');p.textContent='Not tested: authenticated login, publishing, Stripe checkout, interactive gameplay.';out.append(p);copy.disabled=false};copy.onclick=()=>navigator.clipboard?.writeText(report).then(()=>{copy.textContent='Copied';}).catch(()=>{out.textContent=report})}
