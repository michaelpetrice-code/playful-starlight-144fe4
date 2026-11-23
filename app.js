import {featureGallery,visitorIntroduction} from './social-features.js?v=260';
import {createSocialExperience,installVisitorShowcase} from './social-experience.js?v=267';
import {createAppNavigation,readPageRoute,tableFrameMatches,createDraftStore} from './app-navigation.js?v=242';
import {createPushClient} from './push-notifications.js?v=244';
import {watchMessageAlerts} from './message-alerts.js?v=240';
import { renderVenuePageFeed } from './venue-page-feed.js?v=232';
import { loadMessageNotifications, renderMemberNotifications } from './member-notifications.js?v=244';
import {footballView,mountFootball} from './football/hub.js';
import {trackPage} from './analytics-track.js?v=174';
import {readTableChatLink, tableChatLink} from './table-chat-link.js?v=169';
import {prepareProfilePhoto} from './profile-photo.js?v=166';
import {loadAdministration,mountAdministration} from './administration.js?v=268';
import {mountBilling} from './venue-billing.js?v=176';
import {mountVenueBuilder} from './venue-app-builder.js?v=147';
import {onlineCueView,bindOnlineCue} from './online-cue-v90.js';
import {onlineDartsView,bindOnlineDarts} from './online-darts-v89.js';
import {renderClubContent} from './simple-admin-v82.js?v=175';
import {gamesRoomHub,bindGamesRoomHub} from './games-room-v63.js?v=172';
import {memberGamesView,bindMemberGames} from './member-games.js';
import {renderPublicStudioContent} from './content-studio.js?v=172';
import {isOwner,loadPublicAnnouncements,accountStatus} from './owner-dashboard.js';
import {venueApprovalsView,bindVenueApprovals} from './venue-approvals.js';
import {venueDirectoryView,bindVenueDirectory,venueNames} from './venue-directory.js?v=175';
import {safetyView,bindSafety} from './safety-reporting.js';
import {initLounge,decorateLounge,uploadTablePhoto,uploadProfilePhoto,loadProfileAvatar,renderLiveGame,bindLiveGame} from './realtime-lounge.js?v=166';
import {virtualTablesView,meetupsView,venueView,bindCommunityHub,hubEntries} from './community-hub.js?v=173';
import {shareLocal} from './share.js?v=172';
import { memberPages, sharedPage, shareButton, shareMemberPage, pageLabel, shareItem, focusSharedItem } from './page-share.js?v=173';
import {privateChatView,bindPrivateChat,disposePrivateChat} from './private-chat.js?v=242';
import {appearancePanel,bindAppearance} from './theme-settings.js?v=242';
import {tradesView,bindTrades} from './trades.js?v=202';
import {marketplaceView,bindMarketplace} from './marketplace.js?v=202';
// Optional games module: a broken game must never prevent the entire app loading.
let extraGamesView=()=>'<section class="panel"><h2>More games</h2><p>Games are temporarily unavailable.</p></section>';
let bindExtraGames=()=>{};
try { ({extraGamesView,bindExtraGames}=await import('./extra-games-v21.js')); }
catch(err) { console.error('Optional games could not load:',err); }

import {arcadeView,bindArcade} from './arcade.js';
import {premiumGamesView,bindPremiumGames} from './premium-games.js';
import {liveMatchesView,bindLiveMatches,resolveJoins} from './live-matches.js';
const config=window.LADS_CONFIG||{};
let cloud=!!(config.supabaseUrl&&config.supabaseAnonKey),sb=null;
if(cloud){
  try {
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    sb=createClient(config.supabaseUrl,config.supabaseAnonKey);
  } catch(error){
    console.error('Supabase library unavailable; using local demo instead',error);
    cloud=false;
  }
}

const names=['Home','Local Updates','Virtual Pub Tables','Private Chats','Who’s Up for It?','Venue Hub','Venue Applications','Venue App Builder','Events','Community','Buy, Sell or Give Away','Trades & Services','Rounds','Photos','Football','Kitty','Quiz','Games','Arcade','More Games','Tournaments','Leaderboard','Alerts','Install','Account','Report Behaviour' ];let ownerAccess=false;let memberStatus='active';let tab=location.hash==='#tables'?'Virtual Pub Tables':location.hash.startsWith('#venue=')?'Venue Hub':(['Buy, Sell or Give Away','Trades & Services'].includes(new URLSearchParams(location.search).get('section'))?new URLSearchParams(location.search).get('section'):'Home'),user=null,group=null,groupId=null,records=[],activeChatRoom='general',local=(()=>{try{return JSON.parse(localStorage.getItem('lads-local-v1')||'null')}catch{return null}})()||{name:'You',items:[],group:'The Local'};
const builderLink = new URLSearchParams(location.search);
const incomingShare = sharedPage();
if(incomingShare && builderLink.has('section'))incomingShare.item=null;
const openedSharedDetails = new Set();
function takeSharedDetail() {
 const item = activeSharedItem();
 if(!item || openedSharedDetails.has(tab) || !user)return null;
 openedSharedDetails.add(tab);
 return item;
}
if (incomingShare && !builderLink.has('section') && !location.hash.startsWith('#venue=')) tab = incomingShare.tab;
let sharedGroupState = 'pending';
let sharedHighlight = false;
const groupItemPages = new Set(['updates', 'plans', 'events', 'photos']);
const tableDestination = builderLink.get('section') === 'tables' ? readTableChatLink(builderLink) : null;
if (builderLink.get('section') === 'tables') tab = 'Virtual Pub Tables';
let tableFrameUrl = tableDestination
  ? tableChatLink('secure-tables.html', location.href, tableDestination, {embedded:'1', v:'250', ...(builderLink.get('invite') ? {invite:builderLink.get('invite')} : {})}).href
  : 'secure-tables.html?embedded=1&v=250';
if (builderLink.get('section') === 'venue-app-builder') tab = 'Venue App Builder';
if (builderLink.get('section') === 'venue-applications') tab = 'Venue Applications';
if (builderLink.get('section') === 'football') tab = 'Football';
if (builderLink.get('section') === 'billing') tab = 'Venue subscription';
if (builderLink.get('section') === 'administration') tab = 'Administration';
const notificationPages={'alerts':'Alerts','private-chats':'Private Chats','marketplace':'Buy, Sell or Give Away'};
if(Object.hasOwn(notificationPages,builderLink.get('section')))tab=notificationPages[builderLink.get('section')];
let adminAccess = null, adminChecked = false, adminRoot = null;
let billingRoot = null, billingUser = null;
const legacyAdmin = {'Admin Dashboard':'market','Owner Dashboard':'overview','Committee Safety':'safety'};
let adminPane;
let lastIdentity;
let authCheckSequence = 0;
if(new URLSearchParams(location.search).has('game')) tab='Arcade';
const venueReturn = builderLink.get('venue-return');
function returnToVenue() {
  if (user && memberStatus === 'active' && venueReturn && venueReturn.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(venueReturn)) {
    location.replace('venue-app.html?venue=' + encodeURIComponent(venueReturn));
    return true;
  }
  return false;
}
let builderRoot;
let builderUser;
// Invitation links use URL fragments so invite secrets are not sent in HTTP requests.
const invitationHash=(()=>{const raw=location.hash.slice(1);const i=raw.indexOf('=');if(i<0)return null;const kind=raw.slice(0,i);if(!['join-private','join-community'].includes(kind))return null;try{return {kind,code:decodeURIComponent(raw.slice(i+1))}}catch{return null}})();
if(invitationHash){tab=invitationHash.kind==='join-private'?'Private Chats':'Account';sessionStorage.setItem('local-pending-'+invitationHash.kind,invitationHash.code);history.replaceState(null,'',location.pathname+location.search)}
const pendingInvite=kind=>sessionStorage.getItem('local-pending-'+kind)||'';
if(!invitationHash){const route=readPageRoute(location);if(route)tab=route.page;}
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notice(s){$('toast').textContent=s;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3200)}
function activeSharedItem() {
  return incomingShare?.tab === tab ? incomingShare.item : null;
}
function groupShareButton(page, record, label) {
  if (!cloud || !groupId || !user) return '';
  return `<button type="button" class="tl172-share" data-tl172-item="${esc(record.id)}" data-tl172-page="${page}">${label}</button>`;
}
function bindPageSharing(view) {
  const pageButton=view.querySelector('#tl172-page-share');
  if(pageButton)pageButton.onclick=()=>shareMemberPage(tab,notice);
  view.querySelectorAll('[data-tl172-item]').forEach(button => {
    button.onclick = () => {
      const page = button.dataset.tl172Page;
      if (!groupItemPages.has(page) || !groupId) return;
      const kind = { events: 'event', photos: 'photo', plans: 'chat', updates: 'chat' }[page];
      const item = entries(kind).find(record => String(record.id) === button.dataset.tl172Item);
      if (!item) return;
      const title = { events: 'An event on The Local', plans: 'An activity on The Local', photos: 'A photo on The Local', updates: 'An update on The Local' }[page];
      shareItem({ page, item: item.id, group: groupId, title, notify: notice });
    };
  });
  if (sharedHighlight || !activeSharedItem() || !groupItemPages.has(incomingShare.page)) return;
  const target = view.querySelector(`[data-tl172-record="${CSS.escape(incomingShare.item)}"]`);
  if (sharedGroupState === 'ready' && target && groupId === incomingShare.group) {
    requestAnimationFrame(() => {
      if(!sharedHighlight && target.isConnected){sharedHighlight=true;focusSharedItem(target);}
    });
  } else if (!['pending', 'loading'].includes(sharedGroupState) && !view.querySelector('.tl172-share-feedback')) {
    const feedback = document.createElement('p');
    feedback.className = 'tl172-share-feedback';
    feedback.setAttribute('role', 'status');
    feedback.textContent = 'This shared item is unavailable. Ask the sender whether it is still available and whether you have access to the community.';
    view.querySelector('.local50-page-body')?.prepend(feedback);
  }
}
function save(){localStorage.setItem('lads-local-v1',JSON.stringify(local))}function entries(kind){return (cloud?records:local.items).filter(x=>x.kind===kind).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))}
function field(label,id,type='text',placeholder=''){return `<label>${label}<input id="${id}" type="${type}" placeholder="${esc(placeholder)}"></label>`}function panel(title,html){return `<section class="panel"><h2>${title}</h2>${html}</section>`}
async function refresh(){
 const groupAtStart=groupId, userAtStart=user?.id;
 if(cloud&&userAtStart&&groupAtStart){
  const {data,error}=await sb.from('posts').select('*').eq('group_id',groupAtStart).order('created_at',{ascending:false}).limit(1000);
  const linkedId=incomingShare?.group===groupAtStart ? incomingShare.item : null;
  if(!error && linkedId && data && !data.some(row=>row.id===linkedId)){
    const target=await sb.from('posts').select('*').eq('group_id',groupAtStart).eq('id',linkedId).maybeSingle();
    if(!target.error && target.data && ['event','photo','chat'].includes(target.data.kind))data.push(target.data);
  }
  if(groupId!==groupAtStart||user?.id!==userAtStart)return;
  if(error)notice(error.message);else records=data||[];
 }
 render();
}
async function add(kind,data){if(cloud){if(!user||!groupId)return notice('Join a group in Account first');let {error}=await sb.from('posts').insert({group_id:groupId,user_id:user.id,kind,data});if(error)return notice(error.message);await refresh()}else{local.items.push({id:crypto.randomUUID(),kind,data,created_at:new Date().toISOString(),user_id:local.name});save();render()}}
function profileName(){return cloud?(user?.user_metadata?.display_name||user?.email?.split('@')[0]||'Member'):(local.profileName||local.name||'Member')}
function profileAvatar(){return cloud?(user?.user_metadata?.avatar_url||user?.user_metadata?.avatar_data||''):(local.profileAvatar||'')}
function avatarMarkup(src,name='',extra=''){return src&&(/^(data:image\/|https:\/\/)/i.test(src))?`<img class="local-avatar ${extra}" src="${esc(src)}" alt="${esc(name)} profile picture">`:`<span class="local-avatar local-avatar-fallback ${extra}">${esc((name||'?').trim().charAt(0).toUpperCase())}</span>`}
const openFeedReplies = new Set();
function feedReplies(post, replies) {
 const id = esc(post.id);
 const thread = replies.filter(reply => reply.data.postId === post.id).reverse();
 return `<details class="local-post-replies" data-feed-thread="${id}" ${openFeedReplies.has(post.id)?'open':''}>
 <summary>${thread.length ? `${thread.length} ${thread.length===1?'reply':'replies'}` : 'Reply'}</summary>
 <ul class="local-reply-list">${thread.map(reply=>`<li><strong>${esc(reply.data.by||'Member')}</strong><p>${esc(reply.data.text||'')}</p></li>`).join('')}</ul>
 <form data-feed-reply="${id}"><label>Write a reply<textarea name="reply" required maxlength="1000" rows="2"></textarea></label><button type="submit">Reply</button></form></details>`;
}
function localFeed(){const replies=entries('chat').filter(x=>x.data?.roomId==='local-feed-reply'),posts=entries('chat').filter(x=>x.data?.roomId==='local-feed'),reactions=entries('chat').filter(x=>x.data?.roomId==='local-feed-like');return `<section class="local-feed-intro"><h2>📍 What's going on at your local?</h2><p>Share local news, plans, photos and updates with your community.</p></section><section class="panel local-compose-card"><button class="local-compose-launch" id="openLocalComposer">${avatarMarkup(profileAvatar(),profileName())}<span>What's happening in your local area?</span></button><div class="local-compose-actions"><button data-compose-action="photo">📷 Photo</button><button data-compose-action="event">📅 Event</button><button data-compose-action="text">✏️ Post</button></div></section><section id="venue-page-feed" aria-labelledby="venue-page-feed-title" ${cloud?'':'hidden'}><h2 id="venue-page-feed-title">Venue pages</h2><p role="status"></p><div class="venue-page-feed-list"></div></section><section class="local-feed-list">${posts.length?posts.map(x=>{const likes=reactions.filter(r=>r.data?.postId===x.id),liked=likes.some(r=>r.data?.userId===(user?.id||local.name));return `<article class="panel local-feed-post" data-tl172-record="${esc(x.id)}"><div class="local-post-by">${avatarMarkup(x.data.avatar||'',x.data.by)}<div><strong>${esc(x.data.by||'Member')}</strong><small>${new Date(x.created_at).toLocaleString('en-GB')} · ${esc(x.data.audience||'Community')}</small></div></div>${x.data.text?`<p class="local-post-body">${esc(x.data.text)}</p>`:''}${x.data.image||x.data.path?`<div class="local-feed-image" data-feed-photo="${esc(x.id)}"></div>`:''}<div class="local-post-meta">${likes.length} like${likes.length===1?'':'s'}</div><div class="local-post-buttons"><button data-local-like="${esc(x.id)}" ${liked?'disabled':''}>${liked?'💚 Liked':'♡ Like'}</button>${groupShareButton("updates",x,"Share post")}</div>${feedReplies(x,replies)}</article>`}).join(''):'<section class="panel"><p class="muted">No local updates yet. Be the first to share something!</p></section>'}</section>`}
function composerView(){return `<section class="local-composer-page"><div class="local-compose-heading"><button id="closeLocalComposer" aria-label="Back">←</button><h2>Create post</h2><button id="publishLocalPost" disabled>Post</button></div><div class="local-composer-identity">${avatarMarkup(profileAvatar(),profileName())}<div><strong>${esc(profileName())}</strong><label class="local-audience-label">Visible to <select id="localAudience"><option value="Community">Your community</option></select></label></div></div><textarea id="localPostText" placeholder="What's happening in your local area?" maxlength="4000" rows="8"></textarea><div id="localPostPreview"></div><div class="local-composer-tools"><label>📷 Add photo <input id="localPostFile" type="file" accept="image/*" hidden></label><button id="localAddFeeling" type="button">🙂 Feeling/activity</button><button id="localAddEvent" type="button">📅 Mention an event</button><button id="localClearPost" type="button">✕ Clear</button></div><p class="muted">Posts are visible to members of your selected community. </p></section>`}
async function loadFeedPhotos(){for(const el of document.querySelectorAll('[data-feed-photo]')){const x=entries('chat').find(p=>String(p.id)===el.dataset.feedPhoto);if(!x)continue;let url=x.data.image;if(cloud&&x.data.path){const {data}=await sb.storage.from('pub-photos').createSignedUrl(x.data.path,3600);url=data?.signedUrl}if(url){const img=document.createElement('img');img.src=url;img.alt='Local community post photo';img.loading='lazy';el.replaceChildren(img)}}}
function bindLocalFeed(){void renderVenuePageFeed(sb,$('venue-page-feed'));const open=()=>{tab='Create Post';render()};document.getElementById('openLocalComposer')?.addEventListener('click',open);document.querySelectorAll('[data-compose-action]').forEach(b=>b.onclick=()=>{if(b.dataset.composeAction==='event'){tab='Events';render();return}open();if(b.dataset.composeAction==='photo')setTimeout(()=>document.getElementById('localPostFile')?.click(),20)});document.querySelectorAll('[data-local-like]').forEach(b=>b.onclick=async()=>{const postId=b.dataset.localLike;if(!cloud&&!local.items.some(x=>String(x.id)===postId))return;b.disabled=true;await add('chat',{roomId:'local-feed-like',postId,userId:user?.id||local.name,by:profileName()});if(b.isConnected)b.disabled=false});
 document.querySelectorAll('[data-feed-thread]').forEach(thread=>{
  thread.ontoggle=()=>{if(thread.open)openFeedReplies.add(thread.dataset.feedThread);else openFeedReplies.delete(thread.dataset.feedThread)};
 });
 document.querySelectorAll('[data-feed-reply]').forEach(form=>{
  form.onsubmit=async event=>{
   event.preventDefault();
   const postId=form.dataset.feedReply;
   const text=form.elements.reply.value.trim();
   const submit=form.querySelector('button');
   if(!text || submit.disabled || !entries('chat').some(post=>post.id===postId && post.data?.roomId==='local-feed'))return;
   submit.disabled=true;openFeedReplies.add(postId);
   try { await add('chat',{roomId:'local-feed-reply',postId,text,by:profileName()}); }
   finally { if(submit.isConnected)submit.disabled=false; }
  };
 });loadFeedPhotos()}
function bindComposer(){document.getElementById('closeLocalComposer')?.addEventListener('click',()=>{tab='Local Updates';render()});const text=document.getElementById('localPostText'),file=document.getElementById('localPostFile'),post=document.getElementById('publishLocalPost'),preview=document.getElementById('localPostPreview');let previewUrl='';const update=()=>post.disabled=!text.value.trim()&&!file.files.length;text.addEventListener('input',update);file.addEventListener('change',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);preview.replaceChildren();if(file.files[0]){previewUrl=URL.createObjectURL(file.files[0]);const img=document.createElement('img');img.src=previewUrl;img.className='local-upload-preview';img.alt='Selected photo';preview.append(img)}update()});document.getElementById('localClearPost')?.addEventListener('click',()=>{text.value='';file.value='';preview.replaceChildren();update()});document.getElementById('localAddFeeling')?.addEventListener('click',()=>{text.value+=(text.value?' ':'')+'🙂 Feeling good';update();text.focus()});document.getElementById('localAddEvent')?.addEventListener('click',()=>{text.value+=(text.value?' ':'')+'📅 Upcoming event: ';update();text.focus()});post.addEventListener('click',async()=>{if(post.disabled)return;if(cloud&&(!user||!groupId))return notice('Sign in and join a community in Account before posting');post.disabled=true;try{const photo=file.files[0]?await uploadImage(file.files[0]):{};await add('chat',{roomId:'local-feed',text:text.value.trim(),...photo,by:profileName(),avatar:profileAvatar(),audience:'Community'});const sentDraft=document.getElementById('localPostText');if(sentDraft)sentDraft.value='';tab='Local Updates';render();notice('Your local update has been posted')}catch(e){notice(e.message);update()}})}
function bindProfile() {
 const form = $('profileForm');
 if (!form || form.dataset.bound) return;
 form.dataset.bound = 'true';
 const input = $('profilePhoto');
 const preview = $('profilePreview');
 const status = $('profileSaveStatus');
 const submit = form.querySelector('button[type="submit"]');
 const nameInput = $('profileDisplayName');
 let selection = 0;
 let pendingPhoto;
 let uploadedUrl;
 const setStatus = (message, kind = 'info') => {
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = !message;
 };

 input.addEventListener('change', async () => {
  const file = input.files?.[0];
  if (!file) return;
  const attempt = ++selection;
  pendingPhoto = uploadedUrl = undefined;
  submit.disabled = true;
  preview.innerHTML = avatarMarkup(profileAvatar(), profileName(), 'large');
  setStatus('Preparing picture…');
  try {
   const photo = await prepareProfilePhoto(file);
   if (attempt !== selection || !form.isConnected) return;
   pendingPhoto = photo;
   preview.innerHTML = avatarMarkup(photo.preview, profileName(), 'large');
   setStatus('Picture ready. Tap Save profile to upload it.');
  } catch (error) {
   if (attempt !== selection || !form.isConnected) return;
   input.value = '';
   setStatus(error instanceof Error ? error.message : 'This photo couldn’t be opened. Try a JPG, PNG or WebP.', 'error');
  } finally {
   if (attempt === selection) submit.disabled = false;
  }
 });

 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const name = nameInput.value.trim();
  if (!name || name.length > 70) {
   setStatus('Enter a display name up to 70 characters.', 'error');
   return;
  }
  submit.disabled = input.disabled = nameInput.disabled = true;
  submit.textContent = 'Saving…';
  setStatus(pendingPhoto ? 'Saving your picture…' : 'Saving your profile…');
  try {
   let avatar = profileAvatar();
   let syncWarning = false;
   if (cloud) {
    const account = user;
    if (!account) throw Error('Please sign in again.');
    if (pendingPhoto && !uploadedUrl) {
     try {
      uploadedUrl = await uploadProfilePhoto(sb, account, pendingPhoto.blob);
     } catch (error) {
      throw Error('Picture upload failed: ' + (error?.message || 'Try again.'));
     }
    }
    if (user?.id !== account.id) return;
    avatar = uploadedUrl || avatar;
    const { data, error } = await sb.auth.updateUser({ data: { display_name: name, avatar_url: avatar } });
    if (error) throw Error('Couldn’t save your profile: ' + error.message);
    if (user?.id !== account.id) return;
    if (data?.user?.user_metadata?.avatar_url !== avatar) throw Error('The profile update wasn’t confirmed. Please try again.');
    user = data.user;
    const { error: syncError } = await sb.from('local_member_profiles').upsert({
     user_id: account.id, avatar_url: avatar, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    syncWarning = Boolean(syncError);
   } else {
    avatar = pendingPhoto?.preview || avatar;
    local.profileName = local.name = name;
    local.profileAvatar = avatar;
    save();
   }
   pendingPhoto = uploadedUrl = undefined;
   input.value = '';
   preview.innerHTML = avatarMarkup(avatar, name, 'large');
   form.closest('.local-profile-panel').querySelector('.local-profile-summary strong').textContent = name;
   setStatus(syncWarning ? 'Profile saved. The table picture couldn’t sync. Tap Save profile to retry.' : 'Profile saved.', syncWarning ? 'error' : 'success');
  } catch (error) {
   setStatus(error instanceof Error ? error.message : 'Couldn’t save your profile. Please try again.', 'error');
  } finally {
   submit.disabled = input.disabled = nameInput.disabled = false;
   submit.textContent = 'Save profile';
  }
 });
}
function author(x){return esc(x.data?.by||'Mate')}function list(kind,fn){let a=entries(kind);return a.length?a.map(fn).join(''):'<p class="muted">Nothing here yet. Be the first!</p>'}
function bindChatMediaSettings(){const get=(k,d)=>localStorage.getItem('local-pref-'+k)||d;const expiry=$('localExpiry'),auto=$('localMediaAuto'),saveMedia=$('localMediaSave');expiry.value=get('expiry','off');auto.value=get('media-auto','none');saveMedia.value=get('media-save','manual');$('saveChatMediaSettings').onclick=()=>{localStorage.setItem('local-pref-expiry',expiry.value);localStorage.setItem('local-pref-media-auto',auto.value);localStorage.setItem('local-pref-media-save',saveMedia.value);notice('Chat and media preferences saved on this device')}}

const interiorPages={
'Virtual Pub Tables':['PULL UP A CHAIR','The best conversations start here.','tables'],
'Venue Hub':['FIND YOUR LOCAL','Find registered pubs, clubs and venues. Open a profile to see what’s there and get its app.','venues'],
'Venue Applications':['VENUE PARTNERS','Bring your pub or club into The Local.','venues'],
'Who’s Up for It?':['MAKE SOME PLANS','Good nights start with good company.','plans'],
'Events':['WHAT’S ON','Your next great night starts here.','events'],
'Chat':['THE CONVERSATION','Stay close, wherever you are.','tables'],
'Community':['YOUR PEOPLE','Friends, groups and familiar faces.','tables'],
'Arcade':['GAMES ROOM','A little friendly competition.','games'],
'Games':['LET’S PLAY','A little friendly competition.','games'],
'More Games':['MORE TO PLAY','There’s always time for one more game.','games'],
'Tournaments':['BRING YOUR A-GAME','Play for bragging rights.','games'],
'Photos':['GOOD TIMES, CAPTURED','The moments worth sharing.','events'],
'Local Updates':['AROUND THE LOCAL','Catch up on what’s happening.','events'],
'Create Post':['SHARE YOUR STORY','What’s happening at your local?','plans'],
'Buy, Sell or Give Away':['LOCAL FINDS','Good things find new homes.','venues'],
'Trades & Services':['YOUR LOCAL EXPERTS','Discover the people who get things done.','venues'],
'Private Chats':['JUST BETWEEN YOU','Keep the conversation going.','tables'],
'Account':['MAKE IT YOURS','Your profile, your people, your local.','tables'],
'Report Behaviour':['EVERYONE BELONGS','A safer, more welcoming Local.','venues'],
'Committee Safety':['COMMUNITY FIRST','Review concerns with care.','venues'],
'Chat & Media Settings':['YOUR PRIVACY','Stay in control of your experience.','tables'],
'Admin Dashboard':['BEHIND THE BAR','Manage your community with confidence.','venues'],
'Install':['TAKE US WITH YOU','Your Local is always close by.','tables']
};
function premiumInterior(name,content){
const [,description,theme]=interiorPages[name]||['EXPLORE THE LOCAL','Everything under one roof.','venues'];
const safe=esc(pageLabel(name)),safeDescription=esc(description);
return `<div class="local50-interior local50-${theme}"><section class="local50-page-hero"><div class="local50-hero-inner"><span class="local50-eyebrow"><img class="local55-mini-brand" src="icons/the-local-pint-transparent-v150.png" alt=""> The Local</span><h1>${safe}</h1><p>${safeDescription}</p><div class="local50-hero-links">${Object.values(memberPages).includes(name) ? shareButton("Share page","tl172-page-share") : ""}</div></div></section><section class="local50-page-body">${content}</section></div>`;
}

async function renderAnnouncements(){if(!sb)return;const view=document.getElementById('view');if(!view)return;const marker=document.createElement('section');marker.className='local-owner-news';marker.innerHTML='<h2>✦ News from The Local</h2><p>Loading announcements…</p>';const target=view.querySelector('.local50-page-body')||view;const content=view.querySelector('.tl149-home #tl82-public');if(content)content.after(marker);else target.prepend(marker);const news=await loadPublicAnnouncements(sb);if(!marker.isConnected)return;if(!news.length){marker.remove();return}marker.innerHTML='<h2>✦ News from The Local</h2>';for(const item of news){const article=document.createElement('article');const title=document.createElement('strong');title.textContent=item.title;const body=document.createElement('p');body.textContent=item.body;article.append(title,body);if(item.image_url&&/^https:\/\//.test(item.image_url)){const img=document.createElement('img');img.src=item.image_url;img.loading='lazy';img.alt='Announcement image';article.append(img)}marker.append(article)}}
let messageNotificationItems = [];
const linkedNotificationRoom=builderLink.get('section')==='private-chats' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(builderLink.get('room')||'') ? builderLink.get('room') : null;
let notificationRoom = linkedNotificationRoom;
let messageRequest = 0;

async function refreshMessageNotifications() {
 const request = ++messageRequest;
 const member = user?.id;
 if (!sb || !member || memberStatus !== 'active' && !ownerAccess) return;
 const items = await loadMessageNotifications(sb, member);
 if (request !== messageRequest || user?.id !== member) return;
 messageNotificationItems = items;
 updateNotificationBell();
}

function updateNotificationBell() {
 const messagesButton = $('member-messages');
 messagesButton.hidden = !user || memberStatus !== 'active' && !ownerAccess;
 messagesButton.onclick = () => {
  notificationRoom = null;
  tab = 'Private Chats';
  $('member-notifications').open = false;
  render();
  $('messages-heading')?.focus();
  window.scrollTo(0,0);
 };
 renderMemberNotifications({
  member: user && (memberStatus === 'active' || ownerAccess) ? user.id : null,
  groupId, records, messages: messageNotificationItems, enableNotifications:enablePush,
  openPage(page, message) {
   if (message?.table) {
    location.assign(tableChatLink('secure-tables.html', location.href, message.table, { shortcut: '1' }));
    return;
   }
   notificationRoom = message?.room || null;
   tab = page;
   $('member-notifications').open = false;
   render();
   if (message?.page === 'Buy, Sell or Give Away') $('marketInbox')?.click();
   $('view').setAttribute('tabindex', '-1');
   $('view').focus();
   window.scrollTo(0,0);
  }
 });
}

installVisitorShowcase(document,visitorIntroduction(),featureGallery());
const socialExperience=createSocialExperience({openPage:page=>{tab=page;render()},openTable:t=>{tab='Virtual Pub Tables';render();navigation.openDetail({table:t.id,venue:t.venue_id});render()}});
const tableDrafts=createDraftStore();
const navigation=createAppNavigation({win:window,doc:document,getScope:()=>`${user?.id||'guest'}:${groupId||''}`,getPage:()=>tab,setPage:page=>{tab=page},render:()=>render(),label:page=>pageLabel(page),setDetail:detail=>{
 notificationRoom=detail.room||null;
 if(detail.table&&detail.venue)tableFrameUrl=tableChatLink('secure-tables.html',location.href,{venue:detail.venue,table:detail.table},{embedded:'1',v:'250',...(new URLSearchParams(location.search).get('invite')?{invite:new URLSearchParams(location.search).get('invite')}:{})}).href;
 else tableFrameUrl='secure-tables.html?embedded=1&v=250';
}});
function render(){
 if(!user || (memberStatus!=='active'&&!ownerAccess))socialExperience.clear();
 if (Object.hasOwn(legacyAdmin,tab)) { adminPane=legacyAdmin[tab];tab='Administration'; }
 if(['Chat','Chat & Media Settings'].includes(tab))tab='Virtual Pub Tables';
 navigation.beforeRender(tab);
 if(tab!=='Private Chats')disposePrivateChat();
 updateNotificationBell();
 if (Object.hasOwn(legacyAdmin,tab)) { adminPane=legacyAdmin[tab]; tab='Administration'; }
 const analyticsPage = Object.keys(memberPages).find(key => memberPages[key]===tab)
   || (tab==='Venue subscription' ? 'subscription' : tab==='Venue App Builder' ? 'builder' : null);
 trackPage(user && (memberStatus==='active' || ownerAccess) ? analyticsPage : 'welcome');
 if (tab!=='Administration' || !adminAccess || memberStatus!=='active' && !ownerAccess) adminRoot=null;
 if (tab!=='Venue subscription' || billingUser!==user?.id) billingRoot=null;
 document.getElementById('tl-venue-admin-cog')?.remove();
 if(['Chat','Chat & Media Settings'].includes(tab))tab='Virtual Pub Tables'; if(memberStatus!=='active'&&!ownerAccess){$('tabs').innerHTML='';$('view').innerHTML=`<section class="panel" style="margin:40px auto;max-width:600px"><h2>Account ${memberStatus==='banned'?'banned':'suspended'}</h2><p>Your account is currently restricted. Contact the platform owner if you believe this is an error.</p><button id="restrictedSignOut">Sign out</button></section>`;document.getElementById('restrictedSignOut').onclick=()=>sb?.auth.signOut();return} const visibleNames=names;$('tabs').innerHTML=visibleNames.map(n=>`<button data-tab="${n}" class="${tab===n?'active':''}">${esc(pageLabel(n))}</button>`).join('');
const quick=['Home','Virtual Pub Tables','Who’s Up for It?','Private Chats'];
const labels={Home:`<svg class="local-brand-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7"/></svg>`,'Virtual Pub Tables':`<svg class="local-brand-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h11v13H5z M16 9h3a3 3 0 0 1 0 6h-3 M7 4h7 M8 2v2 M12 2v2 M8 11v5 M12 11v5"/></svg>`,'Who’s Up for It?':`<svg class="local-brand-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2 M17 5a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 5v1"/></svg>`,'Venue Hub':`<svg class="local-brand-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7"/></svg>`,Arcade:`<svg class="local-brand-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="5"/><path d="M7 11v4 M5 13h4 M15 12h.01 M18 14h.01"/></svg>`};
labels['Private Chats']='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H7l-5 3V11a9 9 0 0 1 19 0Z"/></svg>';
const inMore=!quick.includes(tab);
const bottom=document.getElementById('bottomNav');
if(bottom)bottom.innerHTML=quick.map(n=>`<button data-tab="${n}" class="${tab===n?'active':''}" aria-label="${n}"><span class="bottom-icon">${n==='Home'?'<img class="local55-nav-logo" src="icons/the-local-pint-transparent-v150.png" alt="">':labels[n]}</span><span>${({"Virtual Pub Tables":"Tables","Who’s Up for It?":"Plans","Venue Hub":"Venues","Arcade":"Games Room","Private Chats":"Messages"}[n]||n)}</span></button>`).join('')+`<button id="moreNav" aria-expanded="false" aria-controls="moreDrawer" class="${inMore?'active':''}" aria-label="More sections"><span class="bottom-icon"><svg class="tl124-icon" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16 M4 12h16 M4 18h16"/></svg></span><span>More</span></button>`;
const more=document.getElementById('moreMenu');
if(more){
 const groups=[['Explore',['Venue Hub','Events','Buy, Sell or Give Away','Trades & Services']],['Your community',['Local Updates','Community','Photos','Rounds','Kitty']],['Games & football',['Arcade','Football','Quiz','Games','More Games','Tournaments','Leaderboard']],['Your account',['Alerts','Account','Install','Report Behaviour']],['For venues',['Venue App Builder','Venue Applications','Venue subscription']]];
 if(adminAccess && (ownerAccess || adminAccess.local || adminAccess.staff?.length))groups.push(['Management',['Administration']]);
 more.innerHTML='<label for="moreSearch">Find a feature</label><input id="moreSearch" type="search" placeholder="Search features…">'+groups.map(([title,pages])=>`<section data-more-group><h3>${esc(title)}</h3><div class="more-feature-grid">${pages.filter(n=>!quick.includes(n)).map(n=>`<button data-tab="${n}" class="${tab===n?'active':''}">${esc(pageLabel(n))}</button>`).join('')}</div></section>`).join('')+'<p id="moreSearchEmpty" hidden>No matching features. Try another word.</p>';
}

if(bottom){bottom.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.getElementById('moreDrawer')?.setAttribute('hidden','');render()});bottom.querySelector('#moreNav').onclick=()=>{const drawer=document.getElementById('moreDrawer');drawer.hidden=!drawer.hidden;bottom.querySelector('#moreNav').setAttribute('aria-expanded',String(!drawer.hidden))}}
if(more)more.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.getElementById('moreDrawer').hidden=true;render()});
$('status').hidden=Boolean(cloud&&user);$('status').textContent=cloud?(user?(groupId?'Shared group • connected':'Signed in • choose group'):'Cloud mode • sign in to share'):'Demo mode • saved on this device only';let h='';
function homeForYou(){
 const now=Date.now(), current=profileName();
 const updates=entries('chat').filter(x=>x.data?.roomId==='local-feed' && (x.data?.text||x.data?.image)).slice(0,3);
 const events=entries('event').filter(x=>{const t=Date.parse(x.data?.date||'');return Number.isFinite(t)&&t>=now-3600000}).sort((a,b)=>Date.parse(a.data.date)-Date.parse(b.data.date)).slice(0,3);
 const tablePosts=entries('chat').filter(x=>x.data?.roomId && !['local-feed','local-feed-like','local-feed-reply','general'].includes(x.data.roomId)).slice(0,3);
 const item=(title,sub,destination)=>`<article class="tl195-item"><strong>${esc(title)}</strong><p>${esc(sub)}</p><button type="button" data-go="${esc(destination)}">View details →</button></article>`;
 const updatesHtml=updates.map(x=>item(x.data.by||'Community member',(x.data.text||'Shared a photo').slice(0,170),'Local Updates')).join('')||'<p class="tl195-empty">No community updates yet. Start the conversation.</p>';
 const eventsHtml=events.map(x=>item(x.data.title||'Community event',`${new Date(x.data.date).toLocaleString('en-GB')} · ${x.data.place||'Venue to be confirmed'}`,'Who’s Up for It?')).join('')||'<p class="tl195-empty">No upcoming community events yet.</p>';
 const tablesHtml=tablePosts.map(x=>item(x.data.by||'Table member',(x.data.text||'New table activity').slice(0,160),'Virtual Pub Tables')).join('')||'<p class="tl195-empty">Your community tables have no recent updates here.</p>';
 return `<section class="tl195-dashboard" aria-label="Your Local activity"><div class="tl195-heading"><div><span class="tl195-kicker">YOUR LOCAL · MEMBER HOME</span><h2>Good to see you, ${esc(current)}.</h2><p>Catch up on your community, discover something new and make plans.</p></div><button type="button" id="tl195-refresh">Refresh updates ↻</button></div><div class="tl195-quick"><button type="button" data-go="Virtual Pub Tables">🍻 My tables</button><button type="button" data-go="Who’s Up for It?">📅 Make plans</button><button type="button" data-go="Venue Hub">📍 Find venues</button><button type="button" data-go="Arcade">🎱 Play games</button></div><div class="tl195-grid"><section class="tl195-card"><header><h3>From your community</h3><button type="button" data-go="Local Updates">See all</button></header>${updatesHtml}</section><section class="tl195-card"><header><h3>Upcoming events</h3><button type="button" data-go="Who’s Up for It?">See all</button></header>${eventsHtml}</section><section class="tl195-card"><header><h3>Virtual Pub Tables</h3><button type="button" data-go="Virtual Pub Tables">Open tables</button></header>${tablesHtml}</section><section class="tl195-card"><header><h3>New in the marketplace</h3><button type="button" data-go="Buy, Sell or Give Away">Browse</button></header><div id="tl195-market"><p class="tl195-empty">Checking for recent listings…</p></div></section></div><p class="tl195-privacy">Activity is shown from your current community and listings accessible to your account. Friends-only updates and cross-venue activity require explicit membership permissions and are not included yet.</p></section>`;
}
async function loadHomeMarket(){
 const target=document.getElementById('tl195-market');if(!target)return;
 if(!cloud||!user||!sb){target.innerHTML='<p class="tl195-empty">Sign in to see the latest marketplace listings.</p>';return}
 try{const {data,error}=await sb.from('market_listings').select('id,title,price,created_at,status').eq('status','available').order('created_at',{ascending:false}).limit(4);
 if(!target.isConnected)return;
 if(error)throw error;
 target.innerHTML=data?.length?data.map(x=>`<article class="tl195-item"><strong>${esc(x.title||'Marketplace listing')}</strong><p>${x.price==null?'Price on listing':`£${Number(x.price).toFixed(2)}`}</p><button type="button" data-go="Buy, Sell or Give Away">Explore listing →</button></article>`).join(''):'<p class="tl195-empty">No available listings yet. Be the first to post one.</p>';
 target.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.go;render()}));
 }catch(e){if(target.isConnected)target.innerHTML='<p class="tl195-empty">Marketplace updates are temporarily unavailable. Browse the marketplace to try again.</p>'}
}
if(tab==='Home'){
 const cards=[
  ['Virtual Pub Tables','Virtual Pub Tables','Private tables for posts, photos, invites and plans.','virtual-pub-tables'],
  ['Who’s Up for It?','What’s on','Find events and make plans with friends.','whos-up-for-it'],
  ['Arcade','Games Room','Play pool, darts and pub favourites.','games-room'],
  ['Venue Hub','Find a Local','Explore pubs, clubs and community venues.','discover-venues'],
  ['Buy, Sell or Give Away','Buy, Sell or Give Away','Find a bargain or pass something on.','marketplace'],
  ['Trades & Services','Local Tradespeople','Find trades and services in your area.','local-tradesmen'],
  ['Tournaments','Club Competitions','Enter a tournament or follow the standings.','club-competitions'],
  ['Rounds','Rounds','Keep track of whose round it is.','buy-a-round']
 ];
 const feature=(item,index)=>`<article class="tl149-feature"><img src="assets/feature-slides/${item[3]}.webp" alt="" width="504" height="333" loading="${index<4?'eager':'lazy'}"><div><h3>${item[1]}</h3><p>${item[2]}</p><button type="button" data-go="${esc(item[0])}">Open ${item[1]} <span aria-hidden="true">→</span></button></div></article>`;
 const hour=new Date().getHours(), greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
 const communityReady = !cloud || Boolean(user && groupId);
 h=`<div class="tl149-home ref-home community-home">
 <section class="community-home-heading" aria-labelledby="community-home-title">
  <p id="local46-greeting">${greeting}</p>
  <h1 id="community-home-title">Your community</h1>
  <nav class="community-home-shortcuts" aria-label="Community shortcuts">
   <button type="button" data-go="Venue Hub">Find a Local</button>
   <a class="tl149-action" href="guest.html?page=events">Find something to do</a>
   <button type="button" data-go="Virtual Pub Tables">My tables</button>
   <button type="button" class="community-build-app" data-go="Venue App Builder">Build your own app</button>
  </nav>
 </section>
 <section id="tl82-public"></section>
 ${communityReady ? localFeed() : `<section class="panel">
  <h2>Join a community to see its updates</h2>
  <p>If you have an invitation code, enter it in your account.</p>
  <button type="button" data-go="Account">Join a community</button>
 </section>`}
 <details class="tl149-tour"><summary>More options</summary>${shareButton("Share page","tl172-page-share")} <a href="for-venues.html#plans">For venue owners</a></details>
 <details class="tl149-tour"><summary>More activity</summary>${homeForYou()}</details>
 <details class="tl149-tour"><summary>Take the feature tour</summary><section class="tl126-showcase" aria-label="Explore The Local features"><div class="tl126-slides" aria-live="off"><article class="tl126-slide" role="group" aria-label="Feature 1 of 8" data-slide="0"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/virtual-pub-tables.webp" alt="" loading="eager" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Virtual Pub Tables</span><h2>Pull up a chair</h2><p>Private groups, posts, photos, videos and member controls.</p><button type="button" class="tl126-visit" data-go="Virtual Pub Tables">Explore feature <span aria-hidden="true">→</span></button></div></article><article class="tl126-slide" role="group" aria-label="Feature 2 of 8" data-slide="1"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/whos-up-for-it.webp" alt="" loading="lazy" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Who’s Up for It?</span><h2>Make plans together</h2><p>Create events, invite members and see who is going.</p><button type="button" class="tl126-visit" data-go="Who’s Up for It?">Explore feature <span aria-hidden="true">→</span></button></div></article><article class="tl126-slide" role="group" aria-label="Feature 3 of 8" data-slide="2"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/games-room.webp" alt="" loading="lazy" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Games Room</span><h2>Play, compete, connect</h2><p>Explore the latest arcade and club competitions.</p><button type="button" class="tl126-visit" data-go="Arcade">Explore feature <span aria-hidden="true">→</span></button></div></article><article class="tl126-slide" role="group" aria-label="Feature 4 of 8" data-slide="3"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/discover-venues.webp" alt="" loading="lazy" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Discover Venues</span><h2>Your local community</h2><p>Find participating pubs, clubs and social venues.</p><button type="button" class="tl126-visit" data-go="Venue Hub">Explore feature <span aria-hidden="true">→</span></button></div></article><article class="tl126-slide" role="group" aria-label="Feature 5 of 8" data-slide="4"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/marketplace.webp" alt="" loading="lazy" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Buy, Sell or Give Away</span><h2>Your local marketplace</h2><p>Discover items from people in your community.</p><button type="button" class="tl126-visit" data-go="Buy, Sell or Give Away">Explore feature <span aria-hidden="true">→</span></button></div></article><article class="tl126-slide" role="group" aria-label="Feature 6 of 8" data-slide="5"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/local-tradesmen.webp" alt="" loading="lazy" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Local Tradesmen</span><h2>Find trusted local services</h2><p>Explore the trades and services directory.</p><button type="button" class="tl126-visit" data-go="Trades &amp; Services">Explore feature <span aria-hidden="true">→</span></button></div></article><article class="tl126-slide" role="group" aria-label="Feature 7 of 8" data-slide="6"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/club-competitions.webp" alt="" loading="lazy" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Club Competitions</span><h2>Challenge your friends</h2><p>Join tournaments and follow club leaderboards.</p><button type="button" class="tl126-visit" data-go="Tournaments">Explore feature <span aria-hidden="true">→</span></button></div></article><article class="tl126-slide" role="group" aria-label="Feature 8 of 8" data-slide="7"><img class="tl127-slide-image" width="504" height="333" src="assets/feature-slides/buy-a-round.webp" alt="" loading="lazy" decoding="async"><div class="tl126-slide-copy"><span class="tl126-overline">THE LOCAL · Buy a Round</span><h2>Make it your round</h2><p>Explore venue drinks and rounds features.</p><button type="button" class="tl126-visit" data-go="Rounds">Explore feature <span aria-hidden="true">→</span></button></div></article></div><div class="tl126-controls"><button type="button" class="tl126-prev" aria-label="Previous feature">‹</button><span class="tl126-count" aria-live="polite">1 / 8</span><button type="button" class="tl126-next" aria-label="Next feature">›</button><button type="button" class="tl126-toggle" aria-label="Pause slideshow">Pause</button></div></section></details>${featureGallery({member:true})}<section class="tl149-home-owner"><div><h2>Run a pub or club?</h2><p>See how to launch a branded app for your venue.</p></div><div class="tl149-actions"><a class="tl149-action" href="for-venues.html">Explore The Local for venues</a><a class="tl149-action" href="for-venues.html#contact">Contact Us</a></div></section></div>`;
}
if(tab==='Venue App Builder')h='<section class="vb-builder" id="venue-builder"></section>';
if(tab==='Local Updates')h=localFeed();
if(tab==='Report Behaviour')h=safetyView(false);
if(tab==='Administration') h='<section class="tl149-admin" id="administration"><h1 tabindex="-1">Administration</h1><nav data-admin-menu aria-label="Administration sections"></nav><div data-admin-content></div></section>';
if(tab==='Venue subscription') h='<section class="tl149-admin" id="venue-billing"></section>';
const hubApi={openVenueTables(id){
  sessionStorage.setItem('local-table-venue',id);
  sessionStorage.removeItem('local-active-table');
  tab='Virtual Pub Tables';render();
},entries:hubEntries(entries),sharePlan: record => record.data.scope === "table" ? "" : groupShareButton("plans",record,"Share activity"),add,who,userId:()=>user?.id||'',sb,user,groupId,cloud,uploadImage,renderLiveGame:()=>renderLiveGame(),isGroupOwner:()=>!cloud||!!(user&&group&&group.owner_id===user.id),notice,render};
if(tab==='Virtual Pub Tables')h=`<section class="tl122-tables-shell"><div class="tl122-table-heading"><h2>🍻 Virtual Pub Tables</h2><p>Pull up a chair · Choose a venue, then pull up a chair to join your table.</p></div><iframe id="tl122-secure-tables" title="Virtual Pub Tables — secure member groups" src="${esc(tableFrameUrl)}" loading="eager" allowfullscreen allow="fullscreen 'self'; camera 'self'; microphone 'self'; autoplay 'self'"></iframe></section>`;
if(tab==='Who’s Up for It?')h=meetupsView(hubApi);
if(tab==='Venue Hub')h=venueDirectoryView(hubApi);if(tab==='Venue Applications')h=venueApprovalsView();

if(tab==='Create Post')h=composerView();
if(tab==='Chat'){
 const rooms=entries('chat_room');
 if(activeChatRoom!=='general'&&!rooms.some(r=>String(r.id)===activeChatRoom))activeChatRoom='general';
 const roomName=activeChatRoom==='general'?'General Chat':rooms.find(r=>String(r.id)===activeChatRoom)?.data?.name||'Chat group';
 const messages=entries('chat').filter(x=>(x.data.roomId||'general')===activeChatRoom);
 h=panel('💬 Chat groups',`<p class="muted">Create topic-based chat groups within ${esc(group?.name||local.group||'your community')}. Members of this community can join any chat group.</p><div class="chat-room-list"><button class="${activeChatRoom==='general'?'active':''}" data-chat-room="general">💬 General Chat</button>${rooms.map(r=>`<button class="${activeChatRoom===String(r.id)?'active':''}" data-chat-room="${esc(r.id)}"># ${esc(r.data.name)}</button>`).join('')}</div><form id="createChatRoom">${field('New chat group name','newChatRoom','text','e.g. Dog Walkers, Friday Nights, Football')}<button>Create chat group</button></form>`)
 +panel('🗨️ '+esc(roomName),`<form id="chatForm"><textarea id="message" maxlength="2000" placeholder="Write a message to this group…"></textarea><label>Attach photo (optional)<input id="chatPhoto" type="file" accept="image/*"></label><button>Send to ${esc(roomName)}</button></form>`+(messages.length?messages.map(x=>`<div class="item"><b>${author(x)}</b> <small>${new Date(x.created_at).toLocaleString('en-GB')}</small><p>${esc(x.data.text||'')}</p>${x.data.path||x.data.image?`<div class="photo" data-photo="${esc(x.id)}" data-kind="chat"></div>`:''}</div>`).join(''):'<p class="muted">No messages in this group yet. Start the conversation!</p>'));
}

if(tab==='Private Chats')h=privateChatView();
if(tab==='Events')h='<section id="tl82-public" class="panel"></section>'+panel('Arrange a night out',`<form id="eventForm">${field('What’s the plan?','eventTitle','text','Friday pub night')}${field('Date','eventDay','date')}${field('Time','eventTime','time')}${field('Where?','eventPlace','text','The local')}<button>Create event</button></form>`)+panel('Upcoming plans',list('event',x=>`<div class="item" data-tl172-record="${esc(x.id)}"><b>${esc(x.data.title)}</b><p>📍 ${esc(x.data.place)} · ${esc(x.data.date?new Date(x.data.date).toLocaleString('en-GB'):'TBC')}</p><small>Arranged by ${author(x)}</small><div><button data-rsvp="${x.id}" data-title="${esc(x.data.title)}">I'm going</button> ${groupShareButton('events',x,'Share event')}</div></div>`))+panel('RSVPs',list('rsvp',x=>`<div class="item">${author(x)} is going to ${esc(x.data.title)}</div>`));
if(tab==='Community'){
const polls=entries('poll'),votes=entries('poll_vote');
h=panel('📊 Community polls',`<p class="muted">Vote on where to meet or what to do next.</p><form id="pollForm">${field('Your question','pollQuestion','text','Where shall we meet?')}${field('Option 1','pollOption1')}${field('Option 2','pollOption2')}${field('Option 3 (optional)','pollOption3')}<button>Create poll</button></form>`)
+panel('Have your say',polls.length?polls.map(x=>{const options=Array.isArray(x.data.options)?x.data.options:[];const related=votes.filter(v=>v.data.pollId===x.id);const counts=options.map((_,i)=>related.filter(v=>Number(v.data.option)===i).length);const total=counts.reduce((a,b)=>a+b,0);return `<div class="item"><b>${esc(x.data.question)}</b><p class="muted">By ${author(x)} · ${total} votes</p>${options.map((o,i)=>`<div class="poll-choice"><button data-vote="${esc(x.id)}" data-option="${i}">${esc(o)}</button><span>${counts[i]} votes${total?` · ${Math.round(counts[i]*100/total)}%`:''}</span></div>`).join('')}</div>`}).join(''):'<p class="muted">No polls yet. Start one!</p>')
+panel('💛 Shout-outs',`<p class="muted">Celebrate a birthday or thank someone for helping out.</p><form id="shoutForm">${field('Who is it for?','shoutTo')}${field('Message','shoutMessage')}<button>Post shout-out</button></form>`+list('shout',x=>`<div class="item">💛 <b>${esc(x.data.to)}</b><p>${esc(x.data.message)}</p><small>From ${author(x)}</small></div>`));
}
if(tab==='Buy, Sell or Give Away')h=marketplaceView();
if(tab==='Trades & Services')h=tradesView();

if(tab==='Rounds')h=panel('Whose round?',`<form id="roundForm">${field('Who bought it?','roundBuyer','text','Mick')}${field('What was the round?','roundDesc','text','4 pints')}${field('Cost (£)','roundCost','number','20')}<button>Log a round</button></form>`)+panel('Round history',list('round',x=>`<div class="item">🍺 <b>${esc(x.data.buyer)}</b> — ${esc(x.data.desc)} <b>£${Number(x.data.cost||0).toFixed(2)}</b></div>`));
if(tab==='Photos')h=panel('Photo wall',`<form id="photoForm">${field('Caption','photoCaption','text','What a night!')}<label>Photo<input type="file" id="photoFile" accept="image/*" required></label><button>Share photo</button></form><small>Demo images are compressed and stored locally; cloud images use private Supabase storage.</small>`)+list('photo',x=>`<div class="item" data-tl172-record="${esc(x.id)}"><b>${author(x)}</b> — ${esc(x.data.caption)}<div class="photo" data-photo="${x.id}"></div>${groupShareButton('photos',x,'Share photo')}</div>`);
if(tab==='Football')h=footballView()+panel('Previous predictions',list('football',x=>`<div class="item">⚽ <b>${esc(x.data.fixture)}</b> — ${esc(x.data.prediction)} <small>by ${author(x)}</small></div>`));
if(tab==='Kitty'){let sum=entries('kitty').reduce((a,x)=>a+Number(x.data.amount||0),0);h=panel('Group kitty',`<h2>£${sum.toFixed(2)}</h2><p class="muted">Recorded contributions minus spending. This is a ledger, not a payment or bank account.</p><form id="kittyForm">${field('Description','kittyDesc','text','Mick paid in')}${field('Amount in £ (negative for spending)','kittyAmount','number','10')}<button>Record transaction</button></form>`)+panel('Ledger',list('kitty',x=>`<div class="item">${esc(x.data.desc)} <b>£${Number(x.data.amount).toFixed(2)}</b> <small>by ${author(x)}</small></div>`))}
if(tab==='Quiz')h=panel('Pub quiz',`<p>Five questions. Pick your answers and see your score.</p><div id="quizArea"></div>`);
if(tab==='Games')h=panel('🎮 Games room',`<p>Challenge everyone at noughts & crosses, or compete for the best score in Quick Fire Trivia and Rock Paper Scissors.</p><div class="row"><button id="newTtt">Start noughts & crosses</button><button id="newRps">Play rock paper scissors</button></div><p class="muted">In shared mode, another group member can join your noughts & crosses match. Refresh to see new moves.</p>`)+panel('Noughts & crosses',gameMatches())+panel('🎯 Darts & 🎱 Pool Challenges',`<p>Challenge a mate to a friendly darts or pool match. Enter the winner after playing in person. Both players can see the result in the group.</p><form id=challengeForm><label>Game<select id=challengeGame><option>Darts</option><option>Pool</option></select></label>${field('Opponent name','challengeOpponent','text','Dave')}<button>Create challenge</button></form>`+list('challenge',x=>`<div class=item><b>${esc(x.data.game)}</b>: ${author(x)} vs ${esc(x.data.opponent)} <button data-win="${x.id}">Record my win</button></div>`))+panel('Weekly Pub Quiz Tournament',`<p>Take the five-question trivia round below. Scores count towards the weekly leaderboard.</p>`)+panel('Quick Fire Trivia',`<p>Five random questions. Every correct answer earns 10 leaderboard points.</p><button id="startTrivia">Start a round</button><div id="triviaArea"></div>`)+panel('Rock Paper Scissors',`<p>Play against the house. Win = 3 points, draw = 1 point.</p><div class="row">${['rock','paper','scissors'].map(v=>`<button data-rps="${v}">${v}</button>`).join('')}</div><p id="rpsResult"></p>`);
if(tab==='Arcade'){resolveJoins(entries);h=gamesRoomHub()+memberGamesView()+onlineDartsView()+onlineCueView()+liveMatchesView(entries,who)+premiumGamesView()+`<div class="premium-legacy">${arcadeView()}${extraGamesView()}</div>`;}
if(tab==='More Games')h=extraGamesView();
if(tab==='Tournaments')h=panel('🎱 Weekly pub tournaments',tournamentsView());
if(tab==='Leaderboard')h=panel('🎱 Pool — this week',rankSport('Pool',weekKey(new Date())))+panel('🎱 Snooker — this week',rankSport('Snooker',weekKey(new Date())))+panel('🎯 Darts — this week',rankSport('Darts',weekKey(new Date())))+panel('🏆 Community leaderboard',leaderboard())+panel('📅 Weekly champions & Hall of Fame',hallOfFame())+panel('How points work',`<p>Trivia: 10 points per correct answer. Rock Paper Scissors: 3 for a win, 1 for a draw. Noughts & crosses: 15 for a win, 5 for a draw.</p><small>Scores are friendly bragging rights, not prizes or money. Results are recorded by the app; this casual leaderboard is not tamper-proof.</small>`);
if(tab==='Install')h=panel('📲 Get the app on your phone',`<p>Install The Local to your home screen.</p><p><b>Android:</b> Open in Chrome → ⋮ → Install app or Add to Home screen.</p><p><b>iPhone:</b> Open in Safari → Share → Add to Home Screen → Add.</p><div class="tl-install-control"><button type="button" data-tl-install aria-expanded="false" aria-controls="member-install-help">Install The Local</button><p id="member-install-help" role="status" hidden></p></div><p class=muted>Push notifications on iPhone require iOS 16.4+ and installation to the Home Screen. You must also enable notifications in Alerts.</p>`);if(tab==='Alerts')h=panel('🔔 Group activity',`<p>Receive alerts for table chats, private messages and marketplace replies. Enable notifications on each device.</p><button id=enableAlerts>Enable message notifications</button><button id=testMessageAlerts>Send a test notification</button><button id=disableMessageAlerts>Disable alerts on this device</button><p class=muted id=pushStatus>Checking notification setup…</p>`)+panel('Recent activity',entries('chat').concat(entries('event'),entries('challenge')).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,30).map(x=>`<div class=item><b>${esc(x.data.by||'Mate')}</b> · ${esc(x.kind)} · ${esc(x.data.text||x.data.title||x.data.game||'New activity')}</div>`).join('')||'<p>No activity yet</p>');
if(tab==='Account')h=`<section class="panel local-profile-panel"><h2>👤 My profile</h2><div class="local-profile-summary"><div id="profilePreview">${avatarMarkup(profileAvatar(),profileName(),'large')}</div><div><strong>${esc(profileName())}</strong><p class="muted">Your public display name and profile picture</p></div></div><form id="profileForm"><label>Display name<input id="profileDisplayName" maxlength="70" value="${esc(profileName())}" required></label><label>Choose a profile picture<input id="profilePhoto" type="file" accept="image/*,.jpg,.jpeg,.png,.webp"></label><button type="submit">Save profile</button><p id="profileSaveStatus" class="profile-save-status" role="status" aria-live="polite" hidden></p></form><p class="muted">Your name is shown on new community posts. Older posts retain the name used when published.</p></section>`+panel('Your account',cloud?`<p>${user?'Signed in: '+esc(user.email):'Sign in or register using your email.'}</p>${user?`<button id="logout">Sign out</button><form id="groupForm">${field('Create a group','groupName','text','The Local')}<button>Create group</button></form><form id="joinForm">${field('Community invitation code','inviteCode','text','Paste a community code (not a private chat code)')}<p class="muted">For a private chat invitation, open <a href="#" id="goPrivateJoin">Join Private Chat</a> instead.</p><button>Join Community</button></form>${group?`<p><button id=shareInvite>📨 Share invite link</button></p><p>Current group: <b>${esc(group.name)}</b></p><p>Invite code (share privately): <b>${esc(group.invite_code)}</b></p>`:''}`:`<form id="authForm">${field('Email','email','email')}${field('Password (at least 6 characters)','password','password')}<div class="row"><button type="submit" data-mode="login">Sign in</button><button type="button" id="signup">Register</button></div></form>`}`:`<p>Demo nickname</p><form id="nameForm">${field('Your name','nickname','text',local.name)}<button>Save name</button></form><p>To invite everyone and share data, follow README setup steps, then deploy with Supabase configured.</p>`);
if(tab==='Chat & Media Settings')h=`<section class="local-hub-hero"><span>⚙️ PRIVACY & STORAGE</span><h2>Chat & Media Settings</h2><p>Choose how your chats and media should be handled.</p></section><section class="panel"><h3>⏳ Disappearing messages</h3><p class="muted">Your preference is saved on this device. In demo mode it hides expired table messages locally. Shared cloud messages require a server-side deletion policy before automatic expiry works for everyone.</p><label>Default message duration<select id="localExpiry"><option value="off">Off — keep messages</option><option value="1">24 hours</option><option value="7">7 days</option><option value="30">30 days</option></select></label></section><section class="panel"><h3>📷 Media storage</h3><label>Automatic media downloads<select id="localMediaAuto"><option value="none">Never automatically download</option><option value="wifi">Wi-Fi only (preference)</option><option value="all">Wi-Fi and mobile data (preference)</option></select></label><label>Save photos to device<select id="localMediaSave"><option value="manual">Manually only</option><option value="ask">Ask before saving</option></select></label><p class="muted">Browsers cannot reliably detect Wi-Fi versus mobile data or save files to your gallery without your action. These are stored preferences; automatic downloading is not enabled yet.</p><button id="saveChatMediaSettings">Save settings</button></section>`;
if(tab==='Account')h+=panel('🏠 Venue applications',`<p>Review applications from pubs, clubs and other venues.</p><button data-go="Venue Applications">Apply for a venue listing</button><button data-go="Venue subscription">Venue subscription</button>${adminAccess?'<button data-go="Administration">Administration</button>':''}`);if(tab==='Account')h+=panel('🛡️ Safety & inclusion',`<p>Report bullying, harassment, discrimination or other unsafe behaviour privately to the committee.</p><button data-go="Report Behaviour">Report a concern</button>`);if(tab==='Account')h+=panel('📨 Invite friends to The Local',`<p>Share The Local through WhatsApp, Messenger, text or email. Friends can register and then join your community or a private chat using the correct invitation link.</p><button id=shareFriends>Share The Local</button>`);if(tab==='Account')h+=appearancePanel();if (tab !== 'Venue App Builder' || builderUser !== (user?.id || null)) builderRoot = null;
const view = $('view');
const tablesSession = cloud ? user?.id || 'signed-out' : 'local';
const keepAdmin = tab==='Administration' && adminRoot?.isConnected;
const keepBilling = tab==='Venue subscription' && billingRoot?.isConnected;
const keepTables = tab === 'Virtual Pub Tables'
  && view.dataset.tablesSession === tablesSession
  && tableFrameMatches(view.querySelector('#tl122-secure-tables'),navigation.detail());
if (!keepTables && !keepAdmin && !keepBilling) {
  const ownProfile = tab === 'Account' ? view.querySelector('.local-profile-panel') : null;
  const profileIdentity = cloud ? user?.id || 'signed-out' : 'demo';
  const retainProfile = ownProfile && view.dataset.profileIdentity === profileIdentity;
  view.innerHTML = ['Home','Venue App Builder','Administration','Venue subscription'].includes(tab) ? h : premiumInterior(tab,h);
  if (tab === 'Account') {
    view.dataset.profileIdentity = profileIdentity;
    if (retainProfile) view.querySelector('.local-profile-panel')?.replaceWith(ownProfile);
  } else delete view.dataset.profileIdentity;
  if (tab === 'Virtual Pub Tables') view.dataset.tablesSession = tablesSession;
  else delete view.dataset.tablesSession;
}
if (tab === 'Venue App Builder') {
  const placeholder = $('venue-builder');
  if (builderRoot) placeholder.replaceWith(builderRoot);
  else {
    builderRoot = placeholder;
    builderUser = user?.id || null;
    mountVenueBuilder(placeholder, sb, user).catch(() => {
      placeholder.textContent = 'The builder is temporarily unavailable. Try again later.';
    });
  }
}
if (tab==='Administration' && !keepAdmin) {
 const root=$('administration');
 if (adminAccess) {
  adminRoot=root;
  mountAdministration(root,{sb,user,notice,cloud},adminAccess,adminPane);
  adminPane=undefined;
 } else root.querySelector('[data-admin-content]').textContent=adminChecked || !cloud ? 'This account has no administration access.' : 'Checking account permissions…';
}
if (tab==='Venue subscription' && !keepBilling) {
 billingRoot=$('venue-billing');
 billingUser=user?.id;
 mountBilling(billingRoot,sb,user,builderLink);
}
bind();if(tab==='Football')mountFootball(document.getElementById('football-hub'),{sb,user});bindPageSharing(view);if(tab==='Who’s Up for It?')bindCommunityHub(hubApi);if(tab==='Venue Hub')bindVenueDirectory(hubApi);if(tab==='Venue Applications')bindVenueApprovals(hubApi);if(tab==='Home'||tab==='Local Updates')bindLocalFeed();if(tab==='Create Post')bindComposer();if(tab==='Account')bindProfile();if(tab==='Report Behaviour')bindSafety({sb,user,cloud,notice,render,committee:false});if(tab==='Account')bindAppearance();if(tab==='Chat & Media Settings')bindChatMediaSettings();if(tab==='Alerts')updatePushStatus();if(tab==='Quiz')quiz();if(tab==='Games')bindGames();if(tab==='Arcade'){bindGamesRoomHub({notify:notice, sharedGame:builderLink.get('share-game')});bindMemberGames(sb,()=>({user,cloud}));bindOnlineDarts(sb,user);bindOnlineCue(sb,user);bindLiveMatches({entries,add,who,notice,render,cloud,user,groupId,refresh});bindPremiumGames({add,who,notice});bindArcade({add,who,notice,render});bindExtraGames({add,who,notice})}if(tab==='More Games')bindExtraGames({add,who,notice});if(tab==='Private Chats')bindPrivateChat({sb,user,notice,roomId:notificationRoom,onBack:()=>navigation.closeDetail(),onSelect:room=>{notificationRoom=room;navigation.openDetail(room?{room}:{})}});if(tab==='Tournaments')bindTournaments();if(tab==='Buy, Sell or Give Away')bindMarketplace({sb,user,notice,sharedItem: (!cloud || adminChecked) ? takeSharedDetail() : null});if(tab==='Trades & Services')bindTrades({sb,user,notice,sharedItem: (!cloud || adminChecked) ? takeSharedDetail() : null});if(tab==='Home'){loadHomeMarket();document.getElementById('tl195-refresh')?.addEventListener('click',()=>refresh())}if(tab==='Home'||tab==='Local Updates')renderAnnouncements();if(['Home','Local Updates','Events'].includes(tab))renderPublicStudioContent(sb,notice);if(tab==='Events')renderClubContent(sb,tab,notice);if(tab==='Photos'||tab==='Chat')loadPhotos();socialExperience.update({user:memberStatus==='active'||ownerAccess?user:null,groupId,profileName:profileName(),profileImage:profileAvatar(),tab,admin:Boolean(adminAccess && (ownerAccess||adminAccess.local||adminAccess.staff?.length)),records:cloud?records:local.items,sb});navigation.afterRender();}
const val=id=>$(id)?.value.trim()||'',who=()=>profileName();
async function uploadImage(file){const img=await resize(file);if(!cloud){if(img.length>800000)throw Error('Photo too large for local demo');return {image:img}}if(!groupId)throw Error('Join a group first');const path=`${groupId}/${crypto.randomUUID()}.jpg`;const blob=await(await fetch(img)).blob();const {error}=await sb.storage.from('pub-photos').upload(path,blob,{contentType:'image/jpeg'});if(error)throw error;return {path}}
function bind(){document.querySelectorAll('#shareFriends,#headerShare').forEach(b=>b.onclick=()=>shareLocal({notify:notice}));if($('enableAlerts'))$('enableAlerts').onclick=enablePush;if($('testMessageAlerts'))$('testMessageAlerts').onclick=async()=>{try{notice(await phoneAlerts.test(user?.id))}catch(error){notice(error.message)}};if($('disableMessageAlerts'))$('disableMessageAlerts').onclick=async()=>{try{notice(await phoneAlerts.disable());updatePushStatus()}catch(error){notice(error.message)}}; if($('inviteCode'))$('inviteCode').value=pendingInvite('join-community')||localStorage.getItem('lads-pending-invite')||'';if($('goPrivateJoin'))$('goPrivateJoin').onclick=e=>{e.preventDefault();tab='Private Chats';render()};if($('shareInvite'))$('shareInvite').onclick=()=>shareLocal({title:'Join my community on The Local',message:'Join my community on The Local! Sign in or register, then follow this invitation link.',url:location.origin+location.pathname+'#join-community='+encodeURIComponent(group.invite_code),notify:notice});document.querySelectorAll('#view [data-go],#tabs [data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab||b.dataset.go;if(cloud&&groupId)refresh();else render()});function form(id,fn){if($(id))$(id).onsubmit=async e=>{e.preventDefault();try{await fn();}catch(err){notice(err.message)}}}
form('pollForm',()=>{const question=val('pollQuestion').trim(),options=[val('pollOption1').trim(),val('pollOption2').trim(),val('pollOption3').trim()].filter(Boolean);if(!question||options.length<2)return notice('Enter a question and two options');return add('poll',{question,options,by:who()})});
form('shoutForm',()=>{const to=val('shoutTo').trim(),message=val('shoutMessage').trim();if(!to||!message)return notice('Add a name and message');return add('shout',{to,message,by:who()})});
document.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>{const pollId=b.dataset.vote,option=Number(b.dataset.option);if(entries('poll_vote').some(v=>v.data.pollId===pollId&&v.data.by===who()))return notice('You have already voted');return add('poll_vote',{pollId,option,by:who()})});
document.querySelectorAll('[data-chat-room]').forEach(b=>b.onclick=()=>{activeChatRoom=b.dataset.chatRoom;render()});
form('createChatRoom',async()=>{const name=val('newChatRoom');if(!name||name.length>60)return notice('Enter a group name up to 60 characters');if(entries('chat_room').some(r=>r.data.name?.toLowerCase()===name.toLowerCase()))return notice('A group with this name already exists');await add('chat_room',{name,by:who()});const created=entries('chat_room').find(r=>r.data.name===name);if(created){activeChatRoom=String(created.id);render()}});
form('chatForm',async()=>{const file=$('chatPhoto')?.files?.[0],message=val('message');if(!message&&!file)return notice('Write a message or choose a photo');const photo=file?await uploadImage(file):{};await add('chat',{text:message,...photo,roomId:activeChatRoom,by:who()})});form('eventForm',()=>{const day=val('eventDay'),time=val('eventTime');if(!day)return notice('Please choose an event date');return add('event',{title:val('eventTitle'),date:`${day}T${time||'19:00'}`,place:val('eventPlace'),by:who()})});form('roundForm',()=>add('round',{buyer:val('roundBuyer'),desc:val('roundDesc'),cost:val('roundCost'),by:who()}));form('footballForm',()=>add('football',{fixture:val('fixture'),prediction:val('prediction'),by:who()}));form('kittyForm',()=>add('kitty',{desc:val('kittyDesc'),amount:val('kittyAmount'),by:who()}));form('nameForm',()=>{local.name=val('nickname')||'You';save();notice('Name saved');render()});document.querySelectorAll('[data-rsvp]').forEach(b=>b.onclick=()=>add('rsvp',{title:b.dataset.title,by:who()}));
form('photoForm',async()=>{const f=$('photoFile').files[0];if(!f)return;await add('photo',{caption:val('photoCaption'),...await uploadImage(f),by:who()})});
if($('signup'))$('signup').onclick=()=>auth('signup');form('authForm',()=>auth('login'));if($('logout'))$('logout').onclick=async()=>{navigation.clear();socialExperience.clear();disposePrivateChat(true);tableDrafts.clear();stopMessageAlerts();await phoneAlerts.sync(null).catch(()=>{});await sb.auth.signOut();user=null;group=null;groupId=null;records=[];await syncPushIdentity();render()};form('groupForm',async()=>{let {data,error}=await sb.from('groups').insert({name:val('groupName'),owner_id:user.id}).select().single();if(error)throw error;await chooseGroup(data)});form('joinForm',async()=>{let {data,error}=await sb.rpc('join_group_by_code',{code:val('inviteCode')});if(error){if(/invalid|not found|code/i.test(error.message))throw new Error('Community code not recognised. Private chat codes must be entered under Private Chats → Join Private Chat.');throw error}let {data:g,error:ge}=await sb.from('groups').select('*').eq('id',data).single();if(ge)throw ge;await chooseGroup(g);sessionStorage.removeItem('local-pending-join-community');localStorage.removeItem('lads-pending-invite')})}
async function auth(mode){let email=val('email'),password=val('password');let {data,error}=mode==='signup'?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});if(error)return notice(error.message);if(mode==='signup'&&!data.session)return notice('Check your email to confirm registration');user=data.user;await restoreGroup();notice('Signed in');render()}
async function chooseGroup(g){let {error}=await sb.from('group_members').upsert({group_id:g.id,user_id:user.id},{onConflict:'group_id,user_id'});if(error)return notice(error.message);group=g;groupId=g.id;activeChatRoom='general';localStorage.setItem('lads-group-id',groupId);await refresh()}
async function restoreGroup(){
 const userAtStart=user?.id, id=localStorage.getItem('lads-group-id');
 if(!userAtStart)return;
 if (incomingShare?.item && groupItemPages.has(incomingShare.page) && sharedGroupState === 'loading') return;
 if (incomingShare?.item && groupItemPages.has(incomingShare.page) && sharedGroupState === 'pending') {
  // Read through the recipient's session. Existing membership policies decide access.
  sharedGroupState = 'loading';
  const target = incomingShare.group;
  if (target) {
   const {data: membership} = await sb.from('group_members').select('group_id')
     .eq('group_id',target).eq('user_id',userAtStart).maybeSingle();
   if(user?.id!==userAtStart)return;
   if(membership){
    const {data: sharedGroup} = await sb.from('groups').select('*').eq('id',target).maybeSingle();
    if(user?.id!==userAtStart)return;
    if(sharedGroup){
     group=sharedGroup; groupId=sharedGroup.id; activeChatRoom='general';
     sharedGroupState='ready';
     await refresh();
     return;
    }
   }
  }
  sharedGroupState='unavailable'; render();
 }
 if(!id)return;
 const {data}=await sb.from('groups').select('*').eq('id',id).maybeSingle();
 if(data&&user?.id===userAtStart){group=data;groupId=data.id;activeChatRoom='general';await refresh()}
}
async function loadPhotos(){for(let el of document.querySelectorAll('.photo')){let x=entries(el.dataset.kind==='chat'?'chat':'photo').find(p=>String(p.id)===el.dataset.photo);if(!x)continue;let url=x.data.image;if(cloud&&x.data.path){let {data}=await sb.storage.from('pub-photos').createSignedUrl(x.data.path,3600);url=data?.signedUrl}if(url){let im=document.createElement('img');im.className='upload';im.src=url;im.alt=x.data.caption||'Pub photo';el.append(im)}}}
function gameMatches(){let starts=entries('ttt_start');if(!starts.length)return '<p class="muted">No matches yet. Start one!</p>';return starts.slice(0,20).map(g=>{let moves=entries('ttt_move').filter(x=>x.data.match===g.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));let board=Array(9).fill('');let players=[g.data.by,g.data.opponent||null];for(let m of moves){if(m.data.cell>=0&&m.data.cell<9&&!board[m.data.cell]){if(!players[1]&&m.data.by!==players[0])players[1]=m.data.by;board[m.data.cell]=m.data.by===players[0]?'X':'O'}}let lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]],winner=lines.find(a=>board[a[0]]&&a.every(i=>board[i]===board[a[0]]));let finished=!!winner||board.every(Boolean),turn=board.filter(Boolean).length%2===0?players[0]:players[1],mine=who();return `<div class="item"><b>${esc(players[0])} vs ${esc(players[1]||'Waiting for challenger')}</b><p>${winner?'Winner: '+esc(winner&&board[winner[0]]==='X'?players[0]:players[1]):finished?'Draw':!players[1]?'Open challenge':esc(turn)+' to play'}</p><div class="board">${board.map((v,i)=>`<button class="cell" data-match="${g.id}" data-cell="${i}" ${v||finished?'disabled':''}>${v||'·'}</button>`).join('')}</div></div>`}).join('')}
function weekKey(date){const d=new Date(date);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
// Weekly competitions are grouped by Monday-to-Sunday local week. Previous weeks remain in history.
const sports=['Pool','Snooker','Darts'];
function sportScores(sport,week){const scores={};for(const x of entries('game_score')){if(x.data?.tournamentSport!==sport||x.data?.tournamentWeek!==week)continue;const name=x.data.winner;if(name)scores[name]=(scores[name]||0)+1;}return scores}
function rankSport(sport,week){const a=Object.entries(sportScores(sport,week)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));return a.length?a.map(([n,w],i)=>`<div class="item">${['🥇','🥈','🥉'][i]||'🍺'} <b>${i+1}. ${esc(n)}</b> <span style="float:right">${w} win${w===1?'':'s'}</span></div>`).join(''):'<p class="muted">No results recorded this week.</p>'}
function tournamentsView(){const week=weekKey(new Date());let out=`<p class="muted">Week starting ${esc(week)} (Monday–Sunday). Rankings start fresh each Monday; previous results stay in the Hall of Fame. Matches are played in person and results recorded here.</p>`;
for(const sport of sports){const active=entries('challenge').filter(x=>x.data?.tournamentType==='tournament'&&x.data.sport===sport&&x.data.week===week);out+=`<section class="panel"><h2>${sport==='Darts'?'🎯':'🎱'} ${sport}</h2>`;
if(!active.length){out+=`<p>No ${sport.toLowerCase()} tournament yet this week.</p><button data-create-tournament="${sport}">Create this week's ${sport} tournament</button>`;}else{const t=active[active.length-1];const signups=entries('challenge').filter(x=>x.data?.tournamentType==='entry'&&x.data.tournament===t.id);const entrants=[...new Set(signups.map(x=>x.data.player).filter(Boolean))];const already=entrants.includes(who());out+=`<p><b>${esc(t.data.title||sport+' Weekly Tournament')}</b> · Organised by ${author(t)}</p><p><b>Players:</b> ${entrants.length?entrants.map(esc).join(', '):'Nobody has entered yet'}</p>${already?'<p class="muted">You have joined this tournament.</p>':`<button data-join-tournament="${esc(t.id)}">Join tournament</button>`}`;
if(entrants.length>=2){out+='<h3>Fixtures & results</h3>';for(let i=0;i<entrants.length;i++)for(let j=i+1;j<entrants.length;j++){const a=entrants[i],b=entrants[j],match=[a,b].sort().join('|'),result=entries('game_score').find(x=>x.data?.tournament===t.id&&x.data?.match===match);out+=`<div class="item"><b>${esc(a)} vs ${esc(b)}</b> ${result?`<p>🏆 Winner: ${esc(result.data.winner)}</p>`:`<p>Awaiting result</p>${[a,b].includes(who())?`<div class="row"><button data-tournament-result="${esc(t.id)}" data-match="${esc(match)}" data-winner="${esc(a)}">${esc(a)} won</button><button data-tournament-result="${esc(t.id)}" data-match="${esc(match)}" data-winner="${esc(b)}">${esc(b)} won</button></div>`:'<small>Only players in the match can report the winner.</small>'}`}</div>`}}else out+='<p class="muted">At least two players must join to generate fixtures.</p>';
out+='<h3>Weekly standings</h3>'+rankSport(sport,week);}
out+='</section>'}
const history={};for(const x of entries('game_score')){if(!sports.includes(x.data?.tournamentSport)||!x.data?.tournamentWeek)continue;(history[x.data.tournamentWeek]??=new Set()).add(x.data.tournamentSport)}
out+='<section class="panel"><h2>🏆 Previous weeks — Hall of Fame</h2>'+Object.keys(history).filter(w=>w!==week).sort().reverse().map(w=>`<div class="item"><b>Week of ${esc(w)}</b>${sports.filter(s=>history[w].has(s)).map(s=>{const a=Object.entries(sportScores(s,w)).sort((a,b)=>b[1]-a[1]);return `<p>${esc(s)}: ${a.length?'🏆 '+esc(a[0][0])+' ('+a[0][1]+' wins)':'No winner'}</p>`}).join('')}</div>`).join('')+'</section>';
return out+'<p class="muted">Friendly self-reported results. The first submitted result counts; disputes should be resolved by the group. A tournament is round-robin: each pair plays once. Ties on wins remain tied.</p>'}
function bindTournaments(){document.querySelectorAll('[data-create-tournament]').forEach(b=>b.onclick=async()=>{const sport=b.dataset.createTournament,week=weekKey(new Date());if(entries('challenge').some(x=>x.data?.tournamentType==='tournament'&&x.data.sport===sport&&x.data.week===week))return notice('Tournament already exists');await add('challenge',{tournamentType:'tournament',sport,week,title:sport+' Weekly Tournament',by:who()});notice('Tournament created — invite everyone to join')});document.querySelectorAll('[data-join-tournament]').forEach(b=>b.onclick=async()=>{const tournament=b.dataset.joinTournament;if(entries('challenge').some(x=>x.data?.tournamentType==='entry'&&x.data.tournament===tournament&&x.data.player===who()))return notice('Already joined');await add('challenge',{tournamentType:'entry',tournament,player:who(),by:who()});notice('You have joined')});document.querySelectorAll('[data-tournament-result]').forEach(b=>b.onclick=async()=>{const tournament=b.dataset.tournamentResult,match=b.dataset.match,winner=b.dataset.winner,t=entries('challenge').find(x=>String(x.id)===tournament);if(!t)return notice('Tournament not found');if(t.data.week!==weekKey(new Date()))return notice('This tournament week has ended');if(!match.split('|').includes(who())||!match.split('|').includes(winner))return notice('Only a player in the match may report its result');if(entries('game_score').some(x=>x.data?.tournament===tournament&&x.data?.match===match))return notice('Result already recorded');await add('game_score',{game:'tournament',tournament,tournamentSport:t.data.sport,tournamentWeek:t.data.week,match,winner,by:who(),points:0});notice('Result recorded');});}
function scoredEntries(){return [...entries('game_score').map(x=>({...x,points:Math.max(0,Math.min(100,Number(x.data.points)||0))})),...entries('quiz').map(x=>({...x,points:Math.max(0,Math.min(5,Number(x.data.score)||0))*10}))]}
function weeklyTotals(){const weeks={};for(const x of scoredEntries()){const w=weekKey(x.created_at),n=x.data.by||'Mate';(weeks[w]??={})[n]=((weeks[w]||{})[n]||0)+x.points}return weeks}
function hallOfFame(){return Object.entries(weeklyTotals()).sort((a,b)=>b[0].localeCompare(a[0])).map(([w,s])=>{const top=Object.entries(s).sort((a,b)=>b[1]-a[1]);if(!top.length)return '';return `<div class="item">🏆 Week of ${esc(w)}: <b>${esc(top[0][0])}</b> (${top[0][1]} pts)</div>`}).join('')||'<p>No champions yet.</p>'}
function leaderboard(){const all=weeklyTotals(),current=weekKey(new Date()),scores=all[current]||{},a=Object.entries(scores).sort((a,b)=>b[1]-a[1]);return `<p class="muted">Week starting ${esc(current)} · scores refresh when you return to this page</p>`+(a.length?a.map(([name,points],i)=>`<div class="item"><b>${['🥇','🥈','🥉'][i]||'🍺'} ${i+1}. ${esc(name)}</b><span style="float:right">${points} pts</span></div>`).join(''):'<p class="muted">No scores yet — get playing!</p>')}
const questions=[['How many players start for one team in association football?',['9','10','11','12'],2],['What is the capital of Wales?',['Cardiff','Swansea','Newport','Bangor'],0],['How many points is a rugby union try worth?',['3','4','5','6'],2],['Which planet is known as the Red Planet?',['Venus','Mars','Jupiter','Mercury'],1],['What is the largest ocean?',['Atlantic','Indian','Arctic','Pacific'],3]];
const triviaBank=[...questions,['Which city is home to Anfield?',['Manchester','Liverpool','Leeds','Bristol'],1],['How many darts make a standard three-dart turn?',['2','3','4','5'],1],['What colour is the centre of a traditional dartboard?',['Blue','Yellow','Red','White'],2],['How many sides does a hexagon have?',['5','6','7','8'],1],['What is 9 × 7?',['56','63','72','81'],1]];
function bindGames(){let f=$('challengeForm');if(f)f.onsubmit=async e=>{e.preventDefault();await add('challenge',{game:val('challengeGame'),opponent:val('challengeOpponent'),by:who()})};document.querySelectorAll('[data-win]').forEach(b=>b.onclick=async()=>{let id=b.dataset.win;if(entries('game_score').some(x=>x.data.challenge===id))return notice('Already recorded');await add('game_score',{by:who(),game:'challenge',challenge:id,points:20});notice('Win recorded — 20 points')});if($('newTtt'))$('newTtt').onclick=()=>add('ttt_start',{by:who()});if($('newRps'))$('newRps').onclick=()=>notice('Choose rock, paper or scissors below');document.querySelectorAll('[data-rps]').forEach(b=>b.onclick=async()=>{let me=b.dataset.rps,them=['rock','paper','scissors'][Math.floor(Math.random()*3)],win=(me==='rock'&&them==='scissors')||(me==='paper'&&them==='rock')||(me==='scissors'&&them==='paper'),pts=me===them?1:win?3:0;$('rpsResult').textContent=`You: ${me} • House: ${them} — ${me===them?'Draw':win?'You win!':'House wins'} (+${pts} points)`;await add('game_score',{by:who(),game:'rps',points:pts})});document.querySelectorAll('[data-match]').forEach(b=>b.onclick=async()=>{let match=b.dataset.match,cell=Number(b.dataset.cell),start=entries('ttt_start').find(x=>String(x.id)===match);if(!start)return;let moves=entries('ttt_move').filter(x=>x.data.match===match).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));let p1=start.data.by,p2=moves.find(x=>x.data.by!==p1)?.data.by;let me=who(),next=moves.length%2===0?p1:(p2||me);if(me!==next||me===p1&&moves.length%2===1||me!==p1&&moves.length%2===0)return notice('Not your turn');if(moves.some(x=>Number(x.data.cell)===cell))return notice('Square already taken');let board=Array(9).fill('');for(let m of moves)board[m.data.cell]=m.data.by===p1?'X':'O';let lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];if(lines.some(a=>board[a[0]]&&a.every(i=>board[i]===board[a[0]])))return notice('Match finished');board[cell]=me===p1?'X':'O';await add('ttt_move',{match,cell,by:me});let won=lines.some(a=>a.every(i=>board[i]===(me===p1?'X':'O')));if(won)await add('game_score',{by:me,game:'ttt',points:15});else if(board.every(Boolean))await add('game_score',{by:me,game:'ttt',points:5});});if($('startTrivia'))$('startTrivia').onclick=()=>{let qs=[...triviaBank].sort(()=>Math.random()-.5).slice(0,5);$('triviaArea').innerHTML=qs.map((q,i)=>`<div class="item"><b>${i+1}. ${q[0]}</b>${q[1].map((v,j)=>`<label style="display:block"><input type="radio" style="width:auto" name="tr${i}" value="${j}"> ${esc(v)}</label>`).join('')}</div>`).join('')+'<button id="finishTrivia">Submit answers</button>';$('finishTrivia').onclick=async()=>{let correct=0;for(let i=0;i<5;i++){let a=document.querySelector(`input[name="tr${i}"]:checked`);if(!a)return notice('Answer all five');if(Number(a.value)===qs[i][2])correct++}await add('game_score',{by:who(),game:'trivia',points:correct*10});notice(`You scored ${correct}/5 — ${correct*10} points!`);}}}
function resize(file){return new Promise((resolve,reject)=>{let image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{let scale=Math.min(1,1000/Math.max(image.width,image.height)),c=document.createElement('canvas');c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);c.getContext('2d').drawImage(image,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.7))};image.onerror=reject;image.src=url})}
let answers={};function quiz(){$('quizArea').innerHTML=questions.map((q,i)=>`<div class="item"><b>${i+1}. ${q[0]}</b>${q[1].map((a,j)=>`<label style="display:block"><input style="width:auto" type="radio" name="q${i}" value="${j}" ${answers[i]===j?'checked':''}> ${a}</label>`).join('')}</div>`).join('')+'<button id="score">Check my score</button><p id="result"></p>';document.querySelectorAll('input[type=radio]').forEach(el=>el.onchange=()=>answers[Number(el.name.slice(1))]=Number(el.value));$('score').onclick=()=>{if(Object.keys(answers).length<5)return notice('Answer all five questions');$('result').textContent=`You scored ${questions.filter((q,i)=>answers[i]===q[2]).length} out of 5. 🍻`;add('quiz',{score:questions.filter((q,i)=>answers[i]===q[2]).length,by:who()})}}
const phoneAlerts=createPushClient(window,document,config,sb);
async function syncPushIdentity(){try{await phoneAlerts.sync(user?.id);updatePushStatus()}catch(error){console.warn('Phone alerts unavailable:',error.message)}}
async function updatePushStatus(){
 const el=$('pushStatus');if(!el)return;
 if(!config.webPushEnabled && !config.oneSignalAppId){el.textContent='Allow notifications now. Phone delivery is being connected; the message bell works in the app.';return;}
 if(!user){el.textContent='Sign in to enable message alerts.';return;}
 try{const sdk=await phoneAlerts.init();if(el.isConnected)el.textContent=sdk.User.PushSubscription.optedIn?'Message alerts are enabled on this device.':'Enable message alerts on this device.'}catch{if(el.isConnected)el.textContent='Phone alerts could not connect. Please try again.'}
}
async function enablePush(){try{notice(await phoneAlerts.enable(user?.id));updatePushStatus()}catch(error){notice(error.message)}}
let stopMessageAlerts=()=>{};
function connectMessageAlerts(){
 stopMessageAlerts();
 stopMessageAlerts=watchMessageAlerts(sb,user && (memberStatus==='active'||ownerAccess)?user.id:null,()=>{
  refreshMessageNotifications();
  if(!document.hidden && !['Virtual Pub Tables','Private Chats','Buy, Sell or Give Away'].includes(tab))notice('New message — open the notification bell');
 });
}

if(cloud){
 initLounge(sb,()=>({user,groupId,tab,render,notice}));
 async function applyIdentity(identity){
  const identityChanged=lastIdentity!==identity?.id;
  if(identityChanged){
   socialExperience.clear();disposePrivateChat(true);tableDrafts.clear();stopMessageAlerts();
   messageNotificationItems = []; notificationRoom = linkedNotificationRoom; ++messageRequest;
   sharedGroupState='pending'; sharedHighlight=false; openedSharedDetails.clear();
   if(lastIdentity){group=null;groupId=null;records=[];}
   lastIdentity=identity?.id;
   adminAccess=null; adminRoot=null; adminChecked=false;
   ownerAccess=false; memberStatus='active';
  }
  user=identity;
  if(identityChanged)render();
  const sequence=++authCheckSequence;
  const [canOwn,status]=await Promise.all([isOwner(sb,identity),accountStatus(sb,identity)]);
  const controls=await loadAdministration(sb,identity,canOwn).catch(()=>null);
  if(sequence!==authCheckSequence)return;
  ownerAccess=canOwn; memberStatus=status; adminAccess=controls; adminChecked=true;
  if(!returnToVenue())render();
  if (identityChanged) { refreshMessageNotifications(); connectMessageAlerts(); syncPushIdentity(); }
 }
 let observedAuth=false;
 const authFailure=()=>notice('Unable to load account permissions.');
 sb.auth.getUser().then(async({data})=>{
  if(!observedAuth)await applyIdentity(data.user);
  if(user&&!groupId)await restoreGroup();
 }).catch(authFailure);
 sb.auth.onAuthStateChange((event,session)=>{
  if(event==='TOKEN_REFRESHED')return;
  observedAuth=true;
  setTimeout(()=>{
   const identity=session?.user||null;
   applyIdentity(identity).then(()=>{if(user&&!groupId)restoreGroup()}).catch(authFailure);
  },0);
 });
}
render();if(cloud&&sb){let channel=sb.channel('lads-activity').on('postgres_changes',{event:'INSERT',schema:'public',table:'posts'},payload=>{if(payload.new?.group_id!==groupId)return;if(payload.new.user_id!==user?.id&&['chat','event','challenge'].includes(payload.new.kind)){notice('New '+payload.new.kind+' from everyone');if('Notification'in window&&Notification.permission==='granted'&&document.hidden)new Notification('The Local',{body:'New group '+payload.new.kind})}refresh()}).subscribe();let invite=new URLSearchParams(location.search).get('invite');if(invite){localStorage.setItem('lads-pending-invite',invite);notice('Community invitation received — open Account to join')}}

window.addEventListener('focus',()=>{if(cloud&&groupId)refresh()});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cloud&&groupId)refresh()});

$('member-notifications')?.addEventListener('toggle', event => {
 if (event.currentTarget.open) refreshMessageNotifications();
});
window.setInterval(() => {
 if (!document.hidden) refreshMessageNotifications();
}, 30000);

window.addEventListener('message',event=>{
 const frame=$('tl122-secure-tables');
 if(event.origin!==location.origin || event.source!==frame?.contentWindow || event.data?.type!=='tl-enable-message-alerts')return;
 tab='Alerts';render();
});

const bottomNavigation=document.getElementById('bottomNav');
if(bottomNavigation && 'ResizeObserver' in window)new ResizeObserver(()=>document.documentElement.style.setProperty('--local-bottom-height',bottomNavigation.getBoundingClientRect().height+'px')).observe(bottomNavigation);
document.addEventListener('input',event=>{
 if(event.target.id!=='moreSearch')return;
 const term=event.target.value.trim().toLocaleLowerCase();let visible=0;
 document.querySelectorAll('[data-more-group]').forEach(group=>{let count=0;group.querySelectorAll('button[data-tab]').forEach(button=>{button.hidden=!button.textContent.toLocaleLowerCase().includes(term);if(!button.hidden)count++});group.hidden=!count;visible+=count});
 document.getElementById('moreSearchEmpty').hidden=Boolean(visible);
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!document.getElementById('moreDrawer').hidden){document.getElementById('moreDrawer').hidden=true;document.getElementById('moreNav')?.focus();event.preventDefault()}
});
window.addEventListener('message',event=>{
 const frame=document.getElementById('tl122-secure-tables');
 if(event.origin!==location.origin || event.source!==frame?.contentWindow)return;
 if(['tl-table-draft','tl-table-draft-request'].includes(event.data?.type)){
  const detail=navigation.detail();const data=event.data;if(!user||data.table!==detail.table||data.venue!==detail.venue)return;
  const key=detail.venue+':'+detail.table;
  if(data.type==='tl-table-draft'&&typeof data.body==='string')tableDrafts.set(user.id,key,data.body);
  if(data.type==='tl-table-draft-request')frame.contentWindow.postMessage({type:'tl-table-restore-draft',table:detail.table,venue:detail.venue,body:tableDrafts.get(user.id,key)},location.origin);
  return;
 }
 if(event.data?.type==='tl-table-route-clear'){navigation.closeDetail();return;}
 if(event.data?.type!=='tl-table-route')return;
 const detail=event.data;const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 if(uuid.test(detail.table||'')&&uuid.test(detail.venue||'')){
  frame.dataset.openTable=detail.table;frame.dataset.openVenue=detail.venue;
  const old=navigation.detail();if(old.table===detail.table&&old.venue===detail.venue)return;
  navigation.openDetail({table:detail.table,venue:detail.venue});tableFrameUrl=tableChatLink('secure-tables.html',location.href,{table:detail.table,venue:detail.venue},{embedded:'1',v:'250'}).href;
 }
});

const moreDrawerElement=document.getElementById('moreDrawer');
moreDrawerElement?.setAttribute('role','dialog');moreDrawerElement?.setAttribute('aria-label','More features');
moreDrawerElement?.querySelector('.more-drawer-header button')?.setAttribute('aria-label','Close More menu');
if(moreDrawerElement)new MutationObserver(()=>document.getElementById('moreNav')?.setAttribute('aria-expanded',String(!moreDrawerElement.hidden))).observe(moreDrawerElement,{attributes:true,attributeFilter:['hidden']});
