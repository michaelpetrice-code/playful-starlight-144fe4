import {esc as E,themes,statusLabels,invitationURL,publicURL,qrSVG,mentionHTML,leagueStats,playerRounds,eligibleTeams,validateLogo,sponsorHTML,sponsorURL} from './model.mjs';
import {localGaffer} from './gaffer.mjs';
import {initialDemo,demoAction} from './demo.mjs';

export const footballView=()=>'<div id="football-hub" class="football-hub"><p role="status">Opening the football clubhouse…</p></div>';

export async function mountFootball(root,{sb=null,user=null,publicSlug=null}={}){
 let demo=!sb||!user,publicView=!!publicSlug,pane='Home',state=null,notice='',timer=null,busy=false,leagues=[],advice=null,tv=false,tvIndex=0,lastSync=0,dirty=false;
 let capability={scores_configured:false,ai_configured:false};
 const invite=new URLSearchParams(location.search).get('football-invite');
 const sessionKey='tl-football-league-'+(user?.id||'guest');
 let leagueId=sessionStorage.getItem(sessionKey)||'';
 const demoKey='tl-football-demo-v2';
 const uid=()=>demo?'demo-me':user?.id;
 const me=()=>state?.members.find(m=>m.user_id===uid());
 const owner=()=>!publicView&&me()?.role==='owner';
 const staff=()=>!publicView&&['owner','staff'].includes(me()?.role);
 const canPlay=()=>!publicView;
 const readKey=()=>`tl-football-read:${uid()}:${state?.id||publicSlug||'demo'}`;
 const unread=()=>state?.events?.filter(e=>e.at>(localStorage.getItem(readKey())||'')).length||0;
 const remember=()=>sessionStorage.setItem(sessionKey,leagueId);
 const date=s=>s?E(new Date(s).toLocaleString('en-GB')):'Not supplied';
 const currentLogo=()=>validateLogo(state?.logo)?state.logo:'assets/branding/the-local-transparent-v150.png';
 const future=()=>new Date(Date.now()+86400000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 async function rpc(action,payload={}){const {data,error}=await sb.rpc('tl_football',{action,payload});if(error)throw Error(error.message);return data;}
 async function service(action,extra={}){
  if(demo||publicView)throw Error('Sign in to a shared league to use this service.');
  const {data,error}=await sb.functions.invoke('football-service',{body:{action,id:leagueId,...extra}});
  if(error){let message=error.message;try{message=(await error.context.json()).message||message;}catch{}throw Error(message);}
  return data;
 }
 async function load(redraw=true){
  if(publicView){const {data,error}=await sb.rpc('tl_football_public',{p_slug:publicSlug});if(error)throw Error(error.message);if(!data)throw Error('This public league could not be found. It may be private.');state=data;demo=false;}
  else if(demo){try{state=JSON.parse(localStorage.getItem(demoKey));}catch{}state||=initialDemo();localStorage.setItem(demoKey,JSON.stringify(state));}
  else{
   leagues=(await rpc('list')).leagues;
   if(leagueId&&!leagues.some(l=>l.id===leagueId))leagueId='';
   const result=await rpc('get',{id:leagueId});state=result.league||null;
   if(result.pending)notice='Your request is awaiting organiser approval.';
   leagueId=state?.id||leagueId;remember();
  }
  if(redraw)draw();
 }
 async function act(action,payload={}){
  if(busy)return;busy=true;
  try{
   if(demo){state=demoAction(state,action,payload);localStorage.setItem(demoKey,JSON.stringify(state));}
   else{const result=await rpc(action,{id:leagueId,...payload});state=result.league||null;leagueId=state?.id||'';remember();leagues=(await rpc('list')).leagues;}
   dirty=false;notice=(!demo&&!state)?'Your request has been sent. The organiser must approve you.':'Saved';draw();
  }catch(e){notice=e.message;draw();}finally{busy=false;}
 }
 async function runService(action,extra={}){
  if(busy)return;busy=true;notice='Please wait…';draw();
  try{const result=await service(action,extra);if(result.advice){if(result.advice.round&&result.advice.round!==state.round)throw Error('This verdict belongs to the previous round. Refresh the league.');advice=result.advice;}else await load(false);notice=action==='advice'?'Your Gaffer verdict is ready.':'Provider fixtures and scores checked.';}
  catch(e){notice=e.message;}finally{busy=false;draw();}
 }
 const button=(label,action,secondary=false)=>`<button type="button" data-action="${action}"${secondary?' class="secondary"':''}>${label}</button>`;
 function lobby(){
  return `<div class="league-list">${leagues.map(l=>`<button type="button" class="secondary" data-league="${E(l.id)}">${E(l.name)}${l.pending?' · awaiting approval':''}</button>`).join('')}</div><p class="notice">${E(notice||'Create a league for your venue, or join with an invitation.')}</p><div class="grid"><form data-form="create" class="card"><h2>Start your league</h2><label>League name<input name="name" required maxlength="60"></label><label>Your display name<input name="name_player" required maxlength="40"></label><label>First pick deadline<input name="deadline" type="datetime-local" value="${future()}" required></label><button>Create league</button></form><form data-form="join" class="card"><h2>Join your friends</h2><label>Invitation code<input name="code" value="${E(invite||'')}" required></label><label>Your display name<input name="name" required maxlength="40"></label><p class="muted">Public leagues show approved players’ display names and picks after the deadline. Banter stays private.</p><button>Request to join</button></form></div>`;
 }
 function fixtureCards(){return state.fixtures.map(f=>`<article class="card"><div class="muted">${E(f.status)}${f.kickoff?' · '+date(f.kickoff):''}</div><div class="score"><span>${E(f.home)}</span><b>${f.home_score??'–'} : ${f.away_score??'–'}</b><span>${E(f.away)}</span></div></article>`).join('')||'<p>No fixtures yet. The organiser can import a matchday or add fixtures.</p>';}
 function standings(){
  return `<div class="scroll"><table><thead><tr><th>Player</th><th>Status</th><th>Pick</th><th>Rounds survived</th></tr></thead><tbody>${state.members.filter(m=>m.approved!==false).map(m=>`<tr><td>${E(m.name)}</td><td>${m.active?'Standing':'Out'}</td><td>${Date.now()>=Date.parse(state.deadline)||m.user_id===uid()?E(state.picks.find(p=>p.user_id===m.user_id)?.team||'No pick'):'Hidden until deadline'}</td><td>${playerRounds(state,m.user_id)}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function stats(){
  const s=leagueStats(state),reveal=Date.now()>=Date.parse(state.deadline);
  return `<div class="grid"><article class="card"><h3>${s.players}</h3><p>Players</p></article><article class="card"><h3>${s.standing}</h3><p>Still standing</p></article><article class="card"><h3>${s.rounds}</h3><p>Archived rounds</p></article></div><h3>Team popularity this round</h3>${reveal?Object.entries(s.counts).map(([team,n])=>`<p>${E(team)} <strong>${n}</strong></p>`).join('')||'<p>No picks recorded.</p>':'<p>Pick statistics unlock after the deadline.</p>'}`;
 }
 function history(){return state.history.map(h=>`<details class="card"><summary>Round ${h.round}${h.rolled_over?' · rolled over':''}</summary>${h.picks.map(p=>`<p>${E(state.members.find(m=>m.user_id===p.user_id)?.name||'Former player')} · ${E(p.team)}</p>`).join('')}${(h.fixtures||[]).map(f=>`<p>${E(f.home)} ${f.home_score??'–'} : ${f.away_score??'–'} ${E(f.away)}</p>`).join('')}</details>`).join('')||'<p>No archived rounds yet.</p>';}
 function poster(){
  const link=publicView?publicURL(state):invitationURL(state);
  return `<div class="card football-poster"><img class="brand" src="${E(currentLogo())}" alt="League logo"><div class="eyebrow">Matchday at your local</div><h2>${E(state.name)}</h2><p>Join our Last Man Standing league on The Local. Pick a team each round. Stay in when they win.</p><div class="football-qr">${qrSVG(link)}</div><p>Scan to ${publicView?'view the league':'request to join'}</p><p class="poster-url">${E(link)}</p><p>Free to enter · ${E(state.prize||'Matchday bragging rights')}</p>${sponsorHTML(state)}<small>Powered by The Local · thelocal.me.uk</small></div>`;
 }
 function manage(){return `<h2>League control</h2><p class="notice">${state.feed?'Provider fixtures are fixed for this round. Score refreshes can settle the round automatically once all picked matches have final results.':'This league uses organiser-entered results. Confirm every final score before settling.'}</p>${owner()?`<form data-form="settings" class="card"><h3>Your venue and league</h3><label>League name<input name="name" value="${E(state.name)}" maxlength="60" required></label><label>Theme<select name="theme">${themes.map(t=>`<option ${state.theme===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Venue logo (PNG, JPEG or WebP)<input type="file" name="logoFile" accept="image/png,image/jpeg,image/webp"></label><p class="muted">The image is resized and saved with this league.</p><label>League web address name<input name="slug" value="${E(state.slug||'my-league')}" pattern="[a-z0-9][a-z0-9-]{2,49}" minlength="3" maxlength="50" required></label><label>League visibility<select name="visibility"><option value="private" ${state.visibility!=='public'?'selected':''}>Private — members only</option><option value="public" ${state.visibility==='public'?'selected':''}>Public — viewable by link</option></select></label><p class="muted">Public pages show approved players’ display names, standings and picks after the deadline. Private messages, invitations and account identifiers stay private.</p><label>Prize or reward description<input name="prize" maxlength="160" value="${E(state.prize||'Matchday bragging rights')}"></label><p class="muted">Free entry. Any venue reward is arranged by the organiser; this page does not take payments.</p><fieldset><legend>League sponsorship</legend><p>Sell this placement to a local business by agreement. It appears on league pages, TV displays and printed posters. Players still enter free; sponsorship does not affect picks or results.</p><label>Sponsor name<input name="sponsor_name" maxlength="80" value="${E(state.sponsor_name||'')}"></label><label>Sponsor message<input name="sponsor_message" maxlength="160" value="${E(state.sponsor_message||'')}"></label><label>Sponsor website (https://)<input name="sponsor_url" type="url" maxlength="500" value="${E(state.sponsor_url||'')}"></label><p class="muted">Leave the sponsor name blank to remove the placement. Sponsorship agreements and payments are handled separately; no payment is collected here.</p></fieldset><label>If everyone goes out<select name="rollover"><option value="end" ${state.rollover!=='replay'?'selected':''}>End without a winner</option><option value="replay" ${state.rollover==='replay'?'selected':''}>Continue with those players next round</option></select></label><p class="muted">Rollover rules are fixed after the first pick. Used teams stay used.</p><button>Save league settings</button></form><div class="card"><h3>Members and staff</h3>${state.members.map(m=>`<p>${E(m.name)} · ${E(m.role)} ${m.approved===false?`<button type="button" data-approve="${E(m.user_id)}">Approve</button>`:''}${m.role!=='owner'&&m.approved!==false?`<button type="button" data-role="${E(m.user_id)}" data-value="${m.role==='staff'?'player':'staff'}">Make ${m.role==='staff'?'player':'staff'}</button>`:''}</p>`).join('')}</div><form data-service="import" class="card"><h3>Import provider fixtures</h3><p>${capability.scores_configured?'Provider connected. Coverage and score delays depend on your plan.':'A football data account key is needed before importing. You can add fixtures manually.'}</p><label>Competition<select name="competition"><option value="PL">Premier League</option><option value="ELC">Championship</option><option value="BL1">Bundesliga</option><option value="SA">Serie A</option><option value="PD">La Liga</option><option value="FL1">Ligue 1</option><option value="CL">Champions League</option></select></label><label>Season starting year<input name="season" type="number" min="2020" max="${new Date().getFullYear()+1}" value="${new Date().getFullYear()}"></label><label>Matchday<input name="matchday" type="number" min="1" max="46" value="1" required></label><p class="muted">Import into an empty round before kickoff. The deadline is brought forward to the first kickoff if needed.</p><button ${demo||!capability.scores_configured||busy?'disabled':''}>Import matchday</button></form>${!state.feed?`<form data-form="fixture" class="card"><h3>Add a fixture manually</h3><label>Home team<input name="home" maxlength="60" required></label><label>Away team<input name="away" maxlength="60" required></label><label>Kickoff<input name="kickoff" type="datetime-local" required></label><button>Add fixture</button></form>`:''}`:''}${!state.feed?state.fixtures.map(f=>`<form data-form="result" class="card"><h3>${E(f.home)} v ${E(f.away)}</h3><input type="hidden" name="fixture" value="${E(f.id)}"><label>Status<select name="status">${['NS','LIVE','HT','FT','POSTPONED'].map(t=>`<option ${f.status===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Home score<input name="home_score" type="number" min="0" max="99" value="${f.home_score??''}"></label><label>Away score<input name="away_score" type="number" min="0" max="99" value="${f.away_score??''}"></label><button>Save score</button></form>`).join(''):button('Check provider scores','sync')}${owner()?`${button('Settle round','settle')}<form data-form="next" class="card"><h3>Open the next round</h3><label>Next pick deadline<input name="deadline" type="datetime-local" value="${future()}" required></label><button>Open next round</button></form>`:''}${demo?`<div class="card"><h3>Demo controls</h3><p>These controls only change this browser’s sample league.</p>${button('Advance demo past the deadline','demo-deadline',true)} ${button('Reset demo','reset',true)}</div>`:''}`;}
 function draw(){
  if(!root.isConnected){clearInterval(timer);document.body.classList.remove('football-tv');return;}
  const header=`<div class="hero"><img class="brand" src="${E(currentLogo())}" alt="${E(state?.name||'The Local')}"><div class="eyebrow">The football clubhouse</div><h1>Your local.<br>Your league.<br>Last one standing.</h1><p>Pick your team. Follow the match. Keep the banter going.</p><span class="badge">${publicView?'Public league · read only':demo?'Interactive demo · saved on this device':state?.feed?'Provider scores · delays may apply':'Shared league · organiser-entered scores'}</span></div>`;
  if(!state){root.innerHTML=header+lobby();bind();return;}
  const tabs=publicView?['Home','Standings','Statistics','Invite']:['Leagues','Home','Pick','Standings','Statistics','Banter','Gaffer','Invite','Alerts',...(staff()?['Manage','Revenue']:[])];
  let body='';
  if(pane==='Leagues')body=demo?'<h2>Explore the football demo</h2><p>This sample league is saved only on this device.</p><a class="button" href="index.html?section=football">Sign in for shared leagues</a>':`<h2>Your leagues</h2>${lobby()}`;
  if(pane==='Home')body=`<div class="actions"><span class="badge">Round ${state.round}</span><span class="badge">${leagueStats(state).standing} standing</span><span class="badge">${E(statusLabels[state.status]||state.status)}</span></div><h2>${E(state.name)}</h2><p>Pick deadline: ${date(state.deadline)}</p><p>${E(state.source)}${state.synced_at?' · Last checked '+date(state.synced_at):''}</p><p>${E(state.prize||'Matchday bragging rights')}</p>${state.status==='complete'?`<p class="notice">Winner: ${E(state.winner_name||state.members.find(m=>m.user_id===state.winner)?.name||'Confirmed by the organiser')}</p>`:''}${state.status==='all-out'?'<p class="notice">Everyone is out. The competition ended without a winner.</p>':''}${state.rolled_over?'<p class="notice">Everyone went out together. The same remaining players continue next round; used teams stay used.</p>':''}${fixtureCards()}${button(tv?'Exit TV view':'Open TV view','tv')}${!demo&&!publicView&&state.feed?' '+button('Refresh provider scores','sync',true):''}`;
  if(pane==='Pick'){
   const used=state.history.flatMap(h=>h.picks.filter(p=>p.user_id===uid()).map(p=>p.team)),current=state.picks.find(p=>p.user_id===uid());
   const locked=Date.now()>=Date.parse(state.deadline)||!me()?.active||state.status!=='playing';
   body=`<h2>Make your pick</h2><p>Choose one winning team each round. Draw, loss or no pick means elimination. Each team can only be used once. Postponed, suspended or cancelled games wait for an organiser-reviewed final result.</p><p>${state.rollover==='replay'?'If everybody goes out, those remaining players continue into the next round. Used teams remain used.':'If everybody goes out, this competition ends without a winner.'}</p><p>Deadline: ${date(state.deadline)}</p><p>Your pick: <strong>${E(current?.team||'Not submitted')}</strong></p><p>Used teams: ${E(used.join(', ')||'None yet')}</p><form data-form="pick"><label>Choose a team<select name="team" ${locked?'disabled':''}>${eligibleTeams(state,uid()).map(t=>`<option ${current?.team===t?'selected':''}>${E(t)}</option>`).join('')}</select></label><button ${locked||!eligibleTeams(state,uid()).length||busy?'disabled':''}>${locked?'Picks locked':'Save my pick'}</button></form>`;
  }
  if(pane==='Standings')body=`<h2>Who’s still standing?</h2><p>Picks stay private until the server deadline.</p>${standings()}<h3>Previous rounds</h3>${history()}`;
  if(pane==='Statistics')body='<h2>Your league in numbers</h2>'+stats();
  if(pane==='Banter')body=`<h2>The banter wall</h2><p>Keep it friendly. Organisers can remove messages.</p>${state.messages.slice(-100).map(m=>`<article class="card"><b>${E(m.name)}</b><p>${mentionHTML(m.text,state.members)}</p><small>${date(m.at)}</small>${staff()?`<button type="button" class="secondary" data-remove="${E(m.id)}">Remove</button>`:''}</article>`).join('')}<form data-form="message"><label>Your message<textarea name="text" maxlength="450" required></textarea></label><label>Mention a player (optional)<select name="mention"><option value="">No mention</option>${state.members.filter(m=>m.approved!==false&&m.user_id!==uid()).map(m=>`<option value="${E(m.user_id)}">${E(m.name)}</option>`).join('')}</select></label><button ${busy?'disabled':''}>Post message</button></form>`;
  if(pane==='Gaffer')body=`<h2>Ask the Gaffer</h2><div class="card"><h3>Free league form guide</h3><p>Compare eligible teams using final results already archived in this league. No AI account or paid service is needed.</p>${button('Show free form guide','local-advice')}</div>${capability.ai_configured?`<div class="card"><h3>A little help with your pick</h3><p>Get up to three eligible teams with reasons based on provider fixtures and standings. One completed verdict per player per round. No guaranteed winners.</p><p>${demo?'AI requests are not run in the demo.':!capability.ai_configured?'The platform owner still needs to connect and enable the AI service.':!state.feed?'Ask your organiser to import provider fixtures first.':'Connected · advice uses provider statistics, which may be delayed.'}</p><button type="button" data-action="advice" ${demo||!capability.ai_configured||!state.feed||busy?'disabled':''}>${busy?'Preparing verdict…':'Ask the Gaffer'}</button></div>`:''}${advice?`${advice.data_at?`<p class="muted">Data checked ${date(advice.data_at)}</p>`:''}${advice.picks.map(p=>`<article class="card"><h3>${E(p.team)}</h3><p>${E(p.reason)}</p></article>`).join('')}${advice.unrated?.length?`<p>Insufficient recorded results for: ${E(advice.unrated.join(', '))}</p>`:''}<p>${E(advice.note)}</p>`:''}`;
  if(pane==='Invite')body=`<h2>Bring your local together</h2><p>${demo?'This sample invitation opens the sign-in page; the demo itself cannot be shared.':publicView?'This public page shows league activity. Ask the organiser for a private join invitation.':'Share the private invitation below. The owner approves every new player.'}</p>${!demo&&!publicView?`<label>Private invitation link<input readonly value="${E(invitationURL(state))}" id="football-link"></label>${button('Copy invitation','copy')}`:''}${state.visibility==='public'?`<p><a href="${E(publicURL(state))}" target="_blank" rel="noopener">Open public league page</a></p>`:''}${poster()}<div class="actions">${button('Print A4 poster','print-a4')}${button('Print A5 poster','print-a5')}${button('Print table tent','print-tent')}${button('Download QR code','download-qr',true)}</div>`;
  if(pane==='Alerts')body=`<h2>League updates</h2><p>Mentions, saved picks and round updates appear here.</p>${(state.events||[]).slice().reverse().map(e=>`<article class="card"><p>${E(e.text)}</p><small>${date(e.at)}</small></article>`).join('')||'<p>No updates yet.</p>'}${button('Mark updates read','read',true)} ${button('Enable alerts while this page is open','notifications',true)}<p class="muted">Browser alerts need your permission and work while this page is open. They are not background push notifications.</p>`;
  if(pane==='Manage')body=manage();
  if(pane==='Revenue'&&staff())body=`<h2>Earn from your football community</h2><div class="grid"><article class="card"><h3>League sponsorship</h3><p>Offer a local business a named placement on your league pages, posters and matchday TV display. Set the sponsor in League control after agreeing the price and duration directly.</p><p>Example only: one £25 monthly sponsorship for each of 20 leagues would be £500 per month gross, before costs and tax. This is not an income forecast.</p></article><article class="card"><h3>Bring members to your venue</h3><p>Use your invitation poster to promote matchday meetups. Publish events, room hire and food offers through your venue’s existing features.</p><p>Keep league entry free and any purchases optional.</p></article><article class="card"><h3>Run your venue on The Local</h3><p>Explore the existing venue subscription for your wider community, events and venue tools. Check current pricing and included features before subscribing.</p><a class="button" href="index.html?section=billing">View venue subscription</a></article></div><p class="notice">Sponsorship income goes to the party named in your agreement. The Local does not automatically collect or split sponsorship fees. There are no player entry payments or prize-pool deductions.</p>`;

  root.className='football-hub';
  root.innerHTML=`<div class="theme-${E(state.theme)}">${header}<div role="status" aria-live="polite">${E(notice)}</div><nav aria-label="Football sections">${tabs.map(t=>`<button type="button" data-pane="${t}" ${pane===t?'aria-current="page"':''}>${t}${t==='Alerts'&&unread()?' ('+unread()+')':''}</button>`).join('')}</nav>${sponsorHTML(state)}${tv?'<div class="tv-controls">'+button('Exit TV view','tv',true)+'<span>TV display rotates every 12 seconds</span></div>':''}${body}<p class="muted">${demo?'Sample teams and fixtures are illustrative. ':''}Free-to-enter community football · Unaffiliated with any league or club.</p></div>`;
  bind();
 }
 async function logoData(file){
  if(!file||!file.size)return state.logo||'';
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Choose a PNG, JPEG or WebP image under 5 MB.');
  const bitmap=await createImageBitmap(file);const ratio=Math.min(1,320/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const data=canvas.toDataURL('image/png');if(!validateLogo(data))throw Error('Try a simpler or smaller logo.');return data;
 }
 function bind(){
  root.querySelectorAll('[data-league]').forEach(b=>b.onclick=async()=>{leagueId=b.dataset.league;advice=null;pane='Home';remember();try{await load();}catch(e){notice=e.message;draw();}});
  root.querySelectorAll('[data-pane]').forEach(b=>b.onclick=()=>{pane=b.dataset.pane;dirty=false;notice='';draw();});
  root.querySelectorAll('form').forEach(f=>{f.addEventListener('input',()=>{dirty=true;});f.addEventListener('change',()=>{dirty=true;});f.querySelector('input[type=file]')?.addEventListener('click',()=>{dirty=true;});f.onsubmit=async e=>{
   e.preventDefault();try{
    const formData=new FormData(f),data=Object.fromEntries(formData);
    for(const key of ['deadline','kickoff'])if(data[key]){if(!Number.isFinite(Date.parse(data[key]))||Date.parse(data[key])<=Date.now())throw Error('Choose a future date and time.');data[key]=new Date(data[key]).toISOString();}
    if(f.dataset.form==='result'){for(const k of ['home_score','away_score'])data[k]=data[k]===''?null:Number(data[k]);if(data.status==='FT'&&(data.home_score===null||data.away_score===null))throw Error('Final scores are required.');}
    if(f.dataset.form==='settings'){if(data.sponsor_url&&!sponsorURL(data.sponsor_url))throw Error('Use an HTTPS sponsor website without login details.');data.logo=await logoData(formData.get('logoFile'));delete data.logoFile;}
    if(f.dataset.form==='join')data.code=data.code.trim();
    if(f.dataset.service){await runService(f.dataset.service,{feed:data});return;}
    await act(f.dataset.form,data);
   }catch(err){notice=err.message;const status=root.querySelector('[role=status]');if(status)status.textContent=notice;}
  };});
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>act('remove-message',{message:b.dataset.remove}));
  root.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>act('approve',{member:b.dataset.approve}));
  root.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>act('role',{member:b.dataset.role,role:b.dataset.value}));
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
   const action=b.dataset.action;
   if(action==='local-advice'){advice=localGaffer(state,uid());notice='Free form guide ready.';draw();return;}
   if(action==='tv'){tv=!tv;tvIndex=0;document.body.classList.toggle('football-tv',tv);pane='Home';draw();return;}
   if(action==='copy'){try{await navigator.clipboard.writeText(invitationURL(state));notice='Invitation copied.';}catch{notice='Select and copy the invitation link above.';}draw();return;}
   if(action.startsWith('print-')){document.body.classList.add('football-print');document.body.dataset.footballPaper=action.slice(6);window.addEventListener('afterprint',()=>{document.body.classList.remove('football-print');delete document.body.dataset.footballPaper;},{once:true});window.print();return;}
   if(action==='download-qr'){const link=publicView?publicURL(state):invitationURL(state);const url=URL.createObjectURL(new Blob([qrSVG(link)],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='The_Local_League_QR.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
   if(action==='read'){localStorage.setItem(readKey(),new Date().toISOString());draw();return;}
   if(action==='notifications'){if(!('Notification'in window)){notice='This browser does not support page alerts.';}else{const result=await Notification.requestPermission();notice=result==='granted'?'Alerts enabled while this page stays open.':'Alerts remain off; league updates still appear here.';}draw();return;}
   if(['advice','sync'].includes(action)){await runService(action);return;}
   if(action==='settle'&&!confirm('Settle this round using the recorded final scores? This cannot be undone here.'))return;
   await act(action);
  });
 }
 try{
  if(sb){const url=window.LADS_CONFIG?.supabaseUrl;if(url){try{const r=await fetch(url+'/functions/v1/football-service');if(r.ok)capability=await r.json();}catch{}}}
  await load();
 }catch(e){
  notice=e.message;
  root.innerHTML=`<h2>Football clubhouse</h2><p>${E(notice)}</p><button type="button" id="football-demo">Explore a separate demo</button><p><a href="index.html?section=football">Sign in to The Local</a></p>`;
  root.querySelector('button').onclick=()=>{publicView=false;demo=true;load();};
 }
 const refresh=async()=>{
  if(!root.isConnected){clearInterval(timer);document.body.classList.remove('football-tv');return;}
  if(busy||dirty||root.querySelector('form :focus'))return;
  try{
   const previous=new Set((state?.events||[]).map(e=>e.id));
   if(!demo&&!publicView&&state?.feed&&capability.scores_configured&&Date.now()-lastSync>60000){lastSync=Date.now();try{await service('sync');}catch{}}
   await load(false);
   const fresh=(state?.events||[]).filter(e=>!previous.has(e.id));
   if(fresh.length&&'Notification'in window&&Notification.permission==='granted'&&document.hidden)new Notification('The Local football',{body:fresh.at(-1).text});
   if(tv){tvIndex=(tvIndex+1)%3;pane=['Home','Standings','Statistics'][tvIndex];}
   if(!dirty&&!root.querySelector('form :focus'))draw();
  }catch(e){notice='Could not refresh the league. Saved picks are unchanged.';}
 };
 timer=setInterval(refresh,12000);
}
