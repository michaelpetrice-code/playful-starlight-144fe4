import {createPushClient} from './push-notifications.js?v=241';
import {readTableChatLink, tableChatLink} from './table-chat-link.js?v=169';
import {bindChatScreen} from './table-chat-screen.js?v=168';
import {bindTableVideo} from './table-video.js?v=167';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.LADS_CONFIG || {};
const sb = cfg.supabaseUrl && cfg.supabaseAnonKey ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const phoneAlerts = createPushClient(window,document,cfg,sb);
const $ = id => document.getElementById(id);
const chatScreen = bindChatScreen($('feed'), $('toggleTableChatScreen'));
const video = sb && bindTableVideo($('tableVideo'), sb,
  cfg.tableVideoIceServers || [{urls:'stun:stun.l.google.com:19302'}]);
const msg = text => { $('notice').textContent = text; };
const check = result => { if (result.error) throw result.error; return result.data; };
const run = async action => { try { await action(); } catch (error) { msg(error.message || String(error)); } };
const admin = () => role === 'owner' || role === 'moderator';
let user, table, role, membership;
let venues = [], venue, listRequest = 0, opening = false;
let messages = [], seats = [], reactions = [], rendered = '', refreshTail = Promise.resolve();
let replyTo, recorder, recording, microphonePending = false;
let liveChannel = null;
let presenceChannel = null;
let presentUsers = new Set();
let liveRefreshQueued = false;
const signedLinks = new Map();
let memberPhotos = new Map();
// v163: device-local chat preferences; no server-side read receipts or calling claims.
const prefKey = id => 'tl163-prefs-' + (user?.id || 'guest') + '-' + id;
let chatPrefs = {mute:false, browser:false, hidePresence:false};
let lastSeenPost = null;
let unreadCount = 0;
let baseTitle = document.title;
function applyPreferences() {
  $('tl163Mute').checked = chatPrefs.mute;
  $('tl163Browser').checked = chatPrefs.browser;
  $('tl163HidePresence').checked = chatPrefs.hidePresence;
  $('tl163Status').textContent = 'Saved on this device. Browser notifications only work when permission is granted.';
}
function loadPreferences(id) {
  try { chatPrefs = {...{mute:false,browser:false,hidePresence:false},...JSON.parse(localStorage.getItem(prefKey(id)) || '{}')}; }
  catch { chatPrefs = {mute:false,browser:false,hidePresence:false}; }
  applyPreferences();
}
function savePreferences() {
  if (!table) return;
  localStorage.setItem(prefKey(table.id),JSON.stringify(chatPrefs));
  applyPreferences();
  if(cfg.webPushEnabled && phoneAlerts.muteTable)phoneAlerts.muteTable(user?.id,table.id,chatPrefs.mute).catch(()=>msg('Your on-device preference was saved. Phone mute settings could not sync; please try again.'));
}
function notifyNewPosts(posts) {
  if (!posts.length || !table || !role) return;
  const newest = posts[posts.length-1];
  if (!lastSeenPost) { lastSeenPost = newest.id; return; }
  const idx = posts.findIndex(p=>String(p.id)===String(lastSeenPost));
  const newPosts = idx >= 0 ? posts.slice(idx+1) : [];
  lastSeenPost = newest.id;
  const others = newPosts.filter(p=>p.user_id !== user?.id);
  if (!others.length || !document.hidden) return;
  unreadCount += others.length;
  document.title = '('+unreadCount+') '+baseTitle;
  if (cfg.webPushEnabled || chatPrefs.mute || !chatPrefs.browser || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification('New message · '+table.name, {body: others.length+' new message'+(others.length===1?'':'s')+' at your table',tag:'tl163-'+table.id});
    notification.onclick = () => {window.focus();notification.close();};
  } catch(error) {console.warn('Notification unavailable',error);}
}
document.addEventListener('visibilitychange',()=>{
  if (!document.hidden) { unreadCount=0;document.title=baseTitle; }
});
$('tl163Settings').onclick = () => {
  const panel=$('tl163Preferences');panel.hidden=!panel.hidden;
  $('tl163Settings').setAttribute('aria-expanded',String(!panel.hidden));
};
$('tl163Mute').onchange = e => {chatPrefs.mute=e.target.checked;savePreferences();};
$('tl163Browser').onchange = async e => {
  if (e.target.checked && 'Notification' in window) {
    try {chatPrefs.browser=(await Notification.requestPermission())==='granted';}
    catch {chatPrefs.browser=false;}
  } else chatPrefs.browser=false;
  savePreferences();
  if (e.target.checked && !chatPrefs.browser) $('tl163Status').textContent='Browser notifications are blocked or unsupported.';
};
$('tl163HidePresence').onchange = e => {
  chatPrefs.hidePresence=e.target.checked;savePreferences();
  if (presenceChannel && sb) sb.removeChannel(presenceChannel);
  presenceChannel=null;
  presentUsers = new Set();
  renderSeats();
  if (!chatPrefs.hidePresence && table?.id && role) connectPresence(table.id);
};

const files = {
  'image/jpeg':['jpg','image'], 'image/png':['png','image'], 'image/webp':['webp','image'],
  'video/mp4':['mp4','video'], 'video/webm':['webm','video'],
  'audio/webm':['webm','audio'], 'audio/ogg':['ogg','audio'], 'audio/mp4':['m4a','audio'],
  'audio/mpeg':['mp3','audio'], 'application/pdf':['pdf','document']
};

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(label, action) {
  const node = element('button', label);
  node.type = 'button';
  node.onclick = async () => {
    node.disabled = true;
    try { await run(action); } finally { node.disabled = false; }
  };
  return node;
}

const pageParams = new URLSearchParams(location.search);
const linkedTable = readTableChatLink(pageParams);
const shortcutPage = pageParams.get('shortcut') === '1' && !pageParams.has('embedded');

function updateShortcutLink() {
  const link = tableChatLink('secure-tables.html', location.href, {venue:venue.id, table:table.id}, {shortcut:'1'});
  $('openTableShortcut').href = link.href;
  $('tableShortcutAddress').value = link.href;
  const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(navigator.userAgent);
  const open = shortcutPage ? '' : 'Open the shortcut page in your phone’s browser. If it opens inside The Local, copy the link and paste it into your browser. ';
  $('tableShortcutInstructions').textContent = open + (apple
    ? 'In Safari, tap Share, then Add to Home Screen.'
    : android
      ? 'In Chrome, tap ⋮, Add to Home screen, then Create shortcut if shown.'
      : 'On your phone, add the shortcut page to your Home Screen from Chrome or Safari.');
  $('openTableShortcut').hidden = shortcutPage;
}

$('copyTableShortcut').onclick = async () => {
  if (!role || !table) return;
  const address = $('tableShortcutAddress');
  try {
    await navigator.clipboard.writeText(address.value);
    $('tableShortcutStatus').textContent = 'Chat link copied.';
  } catch {
    address.hidden = false;
    address.select();
    $('tableShortcutStatus').textContent = 'Copy the selected link.';
  }
};

async function init() {
  if (linkedTable) {
    $('tableSignIn').href = tableChatLink('index.html', location.href, linkedTable, {section:'tables', ...(pageParams.get('invite') ? {invite:pageParams.get('invite')} : {})}).href;
  }
  if (!sb) { $('signin').hidden = false; msg('Supabase connection is not configured.'); return; }
  const {data, error} = await sb.auth.getUser();
  user = data?.user;
  if (!user && (!error || error.name === 'AuthSessionMissingError')) { $('signin').hidden = false; msg('Please sign in to The Local to create or join a table.'); return; }
  if (error) throw error;
  if (parent === window) phoneAlerts.sync(user.id).catch(()=>{});
  venues = check(await sb.from('local_venue_directory').select('id,name,town,type').in('status',['approved','featured']).order('name'));
  for (const item of venues) $('tableVenue').append(new Option([item.name,item.town].filter(Boolean).join(' · '),item.id));
  const saved = sessionStorage.getItem('local-table-venue');
  const coombe = venues.find(item => item.name.trim().toLowerCase() === 'coombe social club');
  $('tableVenue').value = venues.some(item=>item.id===saved) ? saved : coombe ? coombe.id : venues.length === 1 ? venues[0].id : '';
  await loadTables();
  // Opening a valid invitation admits the signed-in recipient immediately.
  // The server still checks expiry, single use, venue and restricted membership.
  const sharedVenue = linkedTable?.venue;
  const sharedTable = linkedTable?.table;
  if (sharedVenue && sharedTable && venues.some(v => v.id === sharedVenue)) {
    $('tableVenue').value = sharedVenue;
    await loadTables();
    const found = check(await sb.from('tl_tables').select('*').eq('id', sharedTable).eq('venue_id', sharedVenue).maybeSingle());
    if (found) {
      await openTable(found);
      if (shortcutPage) {
        baseTitle = document.title = found.name + ' · The Local';
        if (role) $('feed').scrollIntoView({block:'start'});
      }
      const token = pageParams.get('invite');
      if (token) {
        if (!role) {
          msg('Opening your invitation…');
          try {
            const id = check(await sb.rpc('tl_venue_invite_accept',{p_token:token,p_venue:sharedVenue}));
            if (id !== sharedTable) throw Error('This invitation is for another table.');
            await refreshMembership(sharedTable,true);
            msg('Welcome to the table!');
          } catch (error) {
            msg('Unable to open this invitation: '+(error.message || String(error))+'. Ask the table owner for a new invitation.');
          }
        }
        if (role) {
          const clean = new URL(location.href);
          clean.searchParams.delete('invite');
          history.replaceState(null,'',clean.href);
          if (parent !== window) parent.postMessage({type:'tl-table-invite-opened',venue:sharedVenue,table:sharedTable},location.origin);
          $('feed').scrollIntoView({block:'start'});
        }
      }
    } else if (shortcutPage) msg('This table is no longer available. Choose a table below.');
  } else if (shortcutPage && venues.length) msg('This shortcut is no longer available. Choose a table below.');
  if (!venues.length) msg('No approved venues are available. Run the included Virtual Pub Tables SQL setup in the matching Supabase project.');
  scheduleRefresh();
}

async function loadTables() {
  chatScreen.close();
  video?.setTable(null);
  const request = ++listRequest;
  disconnectLive();
  table = null;
  signedLinks.clear();
  role = null;
  $('tableDetail').hidden = true;
  $('tables').hidden = false;
  const chosen = venues.find(item => item.id === $('tableVenue').value);
  venue = chosen;
  $('venueTables').hidden = !chosen;
  $('tableList').replaceChildren();
  $('unplacedList').replaceChildren();
  $('unplaced').hidden = true;
  if (!chosen) { sessionStorage.removeItem('local-table-venue'); return; }
  sessionStorage.setItem('local-table-venue', chosen.id);
  $('venueHeading').textContent = chosen.name;
  const industry = String(chosen.type||'').toLowerCase();
  const communityTitle = /sport|football|rugby|cricket|golf|bowls/.test(industry)?'Team Clubhouse':
    /veteran|regiment|association|fusilier/.test(industry)?'Comrades’ Mess':
    /charit|nonprofit|volunteer/.test(industry)?'Supporter Circles':
    /community|village|hall/.test(industry)?'Community Circles':
    /music|theatre|entertainment/.test(industry)?'Backstage Lounge':
    /cafe|café|restaurant|coffee/.test(industry)?'Coffee & Conversation':
    /shop|retail|business/.test(industry)?'Local Connections':'Virtual Pub Tables';
  document.querySelector('header h1').textContent = communityTitle;
  document.title = communityTitle + ' | The Local';
  const artTitle = document.querySelector('.tl135-art-caption');
  if(artTitle) artTitle.firstChild.textContent = communityTitle + ' ';
  const sceneTitle = document.querySelector('.tl162-scene-heading span');
  if(sceneTitle) sceneTitle.textContent = '✦ ' + communityTitle;
  const heading = document.querySelector('#tables h2');
  if(heading) heading.textContent = 'Choose your organisation';
  const quick = document.querySelector('.table-quick-actions span');
  if(quick) quick.textContent = 'Create a conversation for your community';

  $('tableList').append(element('p','Loading tables…'));
  const [found, legacy] = await Promise.all([
    sb.from('tl_tables').select('*').eq('venue_id',chosen.id).order('created_at',{ascending:false}),
    sb.from('tl_tables').select('id,name').eq('owner_id',user.id).is('venue_id',null).order('name')
  ]);
  if (request !== listRequest) return;
  const rows = check(found);
  $('tableList').replaceChildren();
  if (!rows.length) $('tableList').append(element('p','No tables here yet. Set one up to get started.'));
  for (const row of rows) {
    const card = element('article', '', 'tableCard');
    const icon = element('span','', 'table-card-icon');
    icon.setAttribute('aria-hidden','true');
    const title = row.name.toLowerCase();
    icon.textContent = /football|sport|match/.test(title) ? '⚽' : /dart/.test(title) ? '🎯' : /quiz/.test(title) ? '🏆' : '🍻';
    const copy = element('div','','table-card-copy');
    copy.append(element('h4',row.name),element('p',row.description || 'A place for your people and conversations.'));
    card.append(icon,copy,button('Open table →',()=>openTable(row)));
    $('tableList').append(card);
  }
  for (const row of check(legacy)) {
    const card = element('div','','tableCard');
    card.append(element('strong',row.name),button('Place at '+chosen.name,async()=>{
      if (!confirm('Place '+row.name+' at '+chosen.name+'?')) return;
      check(await sb.rpc('tl_set_table_venue',{p_table:row.id,p_venue:chosen.id}));
      msg('Table placed at '+chosen.name+'.');
      await loadTables();
    }));
    $('unplacedList').append(card);
  }
  $('unplaced').hidden = !$('unplacedList').childElementCount;
}

async function lookupTable(id) {
  return check(await sb.from('tl_tables').select('*').eq('id',id).eq('venue_id',venue.id).single());
}

async function openTable(next) {
  if (opening || !venue || next.venue_id !== venue.id) return;
  disconnectLive();
  video?.setTable(null);
  opening = true;
  ++listRequest;
  try {
    table = next;
    lastSeenPost = null; unreadCount = 0; document.title = baseTitle; loadPreferences(next.id);
    role = membership = null;
    messages = []; seats = []; reactions = []; rendered = '';
    signedLinks.clear();
    $('postList').replaceChildren();
    $('postForm').reset();
    $('tableShortcutHelp').open = false;
    $('tableShortcutAddress').hidden = true;
    $('tableShortcutStatus').textContent = '';
    $('searchChat').value = '';
    $('voiceStatus').textContent = '';
    recording = null;
    clearReply();
    $('memberArea').hidden = true;
    $('pubSeats').replaceChildren();
    $('tables').hidden = true;
    $('tableDetail').hidden = false;
    $('tableName').textContent = next.name;
    $('tl162TableLabel').textContent = next.name;
    $('tableVenueName').textContent = venue.name;
    $('tableDescription').textContent = next.description;
    $('memberState').textContent = 'Checking your seat…';
    $('joinArea').replaceChildren();
    $('editTable').elements.name.value = next.name;
    $('editTable').elements.description.value = next.description;
    await refreshMembership(next.id, true);
  } finally { opening = false; }
}

async function refreshMembership(id, first = false) {
  const current = check(await sb.from('tl_table_members').select('role,status')
    .eq('table_id',id).eq('user_id',user.id).maybeSingle());
  if (table?.id !== id) return;
  const before = role;
  const unchanged = !first && current?.status === membership?.status && current?.role === membership?.role;
  membership = current;
  role = current?.status === 'approved' ? current.role : null;
  video?.setTable(role ? id : null,admin());
  if (!unchanged) {
    $('memberState').textContent = role ? 'You have a seat at this table.' :
      current?.status === 'pending' ? 'Waiting for a table moderator to approve your request.' :
      current?.status === 'banned' ? 'Your access to this table is restricted.' : 'A table moderator needs to approve your request.';
    $('memberArea').hidden = !role;
    $('joinArea').replaceChildren();
    if (!current) $('joinArea').append(button('Request to join',async()=>{
      check(await sb.from('tl_table_members').insert({table_id:id,user_id:user.id}));
      await refreshMembership(id);
    }));
    $('manageTab').hidden = $('eventForm').hidden = !admin();
    $('editTable').hidden = role !== 'owner';
    if (!role) {
      chatScreen.close();
      disconnectLive();
      stopRecorder();
      $('postForm').reset();
      signedLinks.clear();
      recording = null;
      clearReply();
      $('postList').replaceChildren();
      $('pubSeats').replaceChildren();
      messages = []; rendered = '';
      return;
    }
    updateShortcutLink();
    if (first || !before || (!admin() && ['owner','moderator'].includes(before))) showTab('feed');
  }
  if (role && (first || !before)) {
    // Make the composer usable before history, profiles or plans finish loading.
    $('chatBody').focus({preventScroll:true});
    $('postForm').scrollIntoView({block:'nearest'});
    connectLive(id);
    connectPresence(id);
    await loadPosts();
  }
}

function showTab(name) {
  if (name !== 'feed') chatScreen.close();
  for (const section of ['feed','events','manage']) $(section).hidden = section !== name;
  document.querySelectorAll('[data-tab]').forEach(button => {
    const selected = button.dataset.tab === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function seatName(id) {
  return id === user.id ? 'You' : seats.find(seat => seat.user_id === id)?.display_name || 'Member';
}

function memberAvatar(id, name) {
  const avatar = element('span','','member-avatar');
  avatar.classList.toggle('is-active', presentUsers.has(id));
  avatar.setAttribute('aria-label', name + (presentUsers.has(id) ? ' · Active now' : ''));
  avatar.title = name + (presentUsers.has(id) ? ' · Active now' : '');
  avatar.append(element('span',name.slice(0,1).toUpperCase(),'member-avatar-initial'));
  const raw = id === user?.id ? (user.user_metadata?.avatar_url || user.user_metadata?.avatar_data || memberPhotos.get(id)) : memberPhotos.get(id);
  if (raw && (/^https:\/\//i.test(raw) || /^data:image\/(jpeg|png|webp);base64,/i.test(raw))) {
    const photo = document.createElement('img');
    photo.alt = ''; photo.src = raw; photo.referrerPolicy = 'no-referrer';
    photo.addEventListener('error',()=>photo.remove(),{once:true});
    avatar.append(photo);
  }
  return avatar;
}

function renderSeats() {
  const approved = seats.slice(0,12);
  const items = approved.map((seat,index) => {
    const name = seatName(seat.user_id);
    const marker = element('div','','pub-seat tl162-seat');
    const active = presentUsers.has(seat.user_id);
    marker.classList.toggle('tl162-active',active);
    marker.style.setProperty('--seat-index',index);
    marker.title = name + (active ? ' · at the table now' : ' · member');
    marker.append(memberAvatar(seat.user_id,name),element('span',name));
    const status = element('small',active?'● Here now':'○ Away','tl162-seat-status');
    marker.append(status);
    return marker;
  });
  if (seats.length > 12) items.push(element('span','+'+(seats.length-12)+' more','pub-seat pub-seat-count'));
  $('pubSeats').replaceChildren(...items);
  const strip = $('tableActiveMembers');
  if (strip) strip.replaceChildren(...approved.map(seat=>memberAvatar(seat.user_id,seatName(seat.user_id))));
  document.querySelectorAll('[data-member-avatar]').forEach(node=>{
    const active = presentUsers.has(node.dataset.memberAvatar);
    node.classList.toggle('is-active',active);
    node.setAttribute('aria-label',seatName(node.dataset.memberAvatar)+(active?' · Active now':''));
  });
  $('tl162Members').textContent = seats.length + (seats.length===1?' member':' members') + ' · ' + [...presentUsers].filter(id=>seats.some(seat=>seat.user_id===id)).length + ' here now';
  $('tl162Online').textContent = presentUsers.size ? '● ' + presentUsers.size + ' online' : '○ No live presence';
}

let paintedSeats = '';
function loadPosts(scrollToEnd = false) {
  const id = table?.id;
  const next = refreshTail.catch(()=>{}).then(async()=>{
    if (!id || table?.id !== id || !role) return;
    const [postsResult,seatsResult] = await Promise.all([
      sb.from('tl_table_posts').select('*').eq('table_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(80),
      sb.rpc('tl_table_seats',{p_table:id})
    ]);
    const posts = check(postsResult).reverse();
    const badges = posts.length ? check(await sb.from('tl_table_reactions').select('post_id,user_id').in('post_id',posts.map(post=>post.id))) : [];
    if (table?.id !== id || !role) return;
    const memberRows = check(seatsResult);
    // Optional public profile lookup uses the existing signed-in profile policy.
    // Missing profile setup or an unavailable photo never blocks the chat.
    let photos = [];
    if (memberRows.length) {
      try {
        const result = await sb.from('local_member_profiles').select('user_id,avatar_url').in('user_id',memberRows.map(row=>row.user_id));
        if (!result.error) photos = result.data || [];
      } catch { /* Initials remain available. */ }
    }
    if (table?.id !== id || !role) return;
    memberPhotos = new Map(photos.map(row=>[row.user_id,row.avatar_url]));
    const seatState = JSON.stringify([id,memberRows,photos]);
    seats = memberRows;
    if (paintedSeats !== seatState || !$('pubSeats').children.length) {
      paintedSeats = seatState;
      renderSeats();
    }
    notifyNewPosts(posts);
    messages = posts;
    $('chatCount').textContent = posts.length ? `(${posts.length} recent)` : '';
    reactions = badges;
    await renderChat(id, scrollToEnd);
  });
  refreshTail = next;
  return next;
}

async function renderChat(id, scrollToEnd = false) {
  const list = $('postList');
  if (table?.id !== id || !role) return;
  const search = $('searchChat').value.trim().toLowerCase();
  const state = JSON.stringify([id,search,messages,seats,reactions,role,[...memberPhotos]]);
  if (state === rendered && !shownLinksNeedRefresh()) {
    if (scrollToEnd) list.scrollTop = list.scrollHeight;
    return;
  }
  function shownLinksNeedRefresh() {
    return messages.some(post => {
      const link = signedLinks.get(post.media_path);
      return link && link.expires < Date.now();
    });
  }
  const fragment = document.createDocumentFragment();
  const shown = messages.filter(post=>!search || (post.body+' '+seatName(post.user_id)).toLowerCase().includes(search));
  if (!shown.length) fragment.append(element('p',search?'No matching messages.':'Say hello to your table.'));
  for (const post of shown) {
    const own = post.user_id === user.id;
    const bubble = element('article','',own?'pub-message own':'pub-message');
    const photo = memberAvatar(post.user_id,seatName(post.user_id));
    photo.dataset.memberAvatar = post.user_id;
    bubble.append(photo);
    const caption = new Date(post.created_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'});
    bubble.append(element('small',seatName(post.user_id)+' · '+caption+(post.edited_at?' · Edited':'')+(post.hidden?' · Hidden':'')));
    if (post.reply_to) {
      const quoted = messages.find(row=>row.id===post.reply_to && !row.hidden);
      bubble.append(element('blockquote',quoted ? seatName(quoted.user_id)+': '+messageExcerpt(quoted) : 'Earlier message'));
    }
    if (post.body) bubble.append(element('p',post.body));
    if (post.media_path) {
      let link = signedLinks.get(post.media_path);
      if (!link || link.expires < Date.now()) {
        const result = await sb.storage.from('tl-table-media').createSignedUrl(post.media_path,900);
        link = result.data?.signedUrl ? {url:result.data.signedUrl,expires:Date.now()+840000} : null;
        if (link) signedLinks.set(post.media_path,link);
      }
      if (link) {
        const tags = {image:'img',video:'video',audio:'audio',document:'a'};
        const media = element(tags[post.media_type] || 'a','','media');
        if (media.tagName === 'A') { media.href=link.url; media.target='_blank'; media.rel='noopener'; media.textContent='Open attachment'; }
        else if (post.media_type === 'image') {
          media.src=link.url; media.loading='lazy'; media.alt='Photo shared at this table';
        } else {
          media.src=link.url; media.controls=true; media.preload='metadata';
        }
        bubble.append(media);
      } else bubble.append(element('p','Attachment unavailable.'));
    }
    const menu = element('details','','pub-message-actions');
    menu.append(element('summary','Message actions'));
    if (post.body && !post.hidden) menu.append(button('Copy message',async()=>{
      await navigator.clipboard.writeText(post.body);
      msg('Message copied.');
    }));
    if (!post.hidden) menu.append(button('Reply',()=>{
      replyTo = post.id;
      $('replyText').textContent = 'Replying to '+seatName(post.user_id)+': '+messageExcerpt(post);
      $('replyPreview').hidden = false;
      $('chatBody').focus();
    }));
    const likes = reactions.filter(row=>row.post_id===post.id);
    if (!post.hidden) menu.append(button('♥ '+likes.length,async()=>{
      check(likes.some(row=>row.user_id===user.id)
        ? await sb.from('tl_table_reactions').delete().eq('post_id',post.id).eq('user_id',user.id)
        : await sb.from('tl_table_reactions').insert({post_id:post.id,user_id:user.id}));
      await loadPosts();
    }));
    if (own && !post.hidden) menu.append(button('Edit',async()=>{
      const body = prompt('Edit your message',post.body);
      if (body === null || body === post.body) return;
      check(await sb.rpc('tl_edit_table_message',{p_message:post.id,p_body:body}));
      await loadPosts();
    }));
    if (own || admin()) menu.append(button('Delete',async()=>{
      if (!confirm('Delete this message for everyone at the table?')) return;
      check(await sb.from('tl_table_posts').delete().eq('id',post.id).eq('table_id',id));
      if (own && post.media_path) await sb.storage.from('tl-table-media').remove([post.media_path]);
      await loadPosts();
    }));
    menu.append(button('Post comments',async()=>{
      let history = bubble.querySelector('.pub-comment-history');
      if (history) { history.remove(); return; }
      const rows = check(await sb.from('tl_table_comments').select('user_id,body').eq('post_id',post.id).order('created_at'));
      history = element('div','','pub-comment-history');
      if (!rows.length) history.append(element('p','No comments. Use Reply to join the conversation.'));
      for (const row of rows) history.append(element('p',seatName(row.user_id)+': '+row.body));
      bubble.append(history);
    }));
    if (admin()) menu.append(button(post.hidden?'Unhide':'Hide',async()=>{
      check(await sb.rpc('tl_hide_post',{p_post:post.id,p_hidden:!post.hidden}));
      await loadPosts();
    }));
    if (!own) menu.append(button('Report',async()=>{
      const reason = prompt('Why are you reporting this message?');
      if (reason === null) return;
      if (reason.trim().length < 5 || reason.trim().length > 1000) throw Error('Enter a reason between 5 and 1,000 characters.');
      check(await sb.from('tl_table_reports').insert({table_id:id,post_id:post.id,reporter_id:user.id,reason:reason.trim()}));
      msg('Report sent to the table moderators.');
    }));
    bubble.append(menu);
    fragment.append(bubble);
  }
  const current = JSON.stringify([id,$('searchChat').value.trim().toLowerCase(),messages,seats,reactions,role,[...memberPhotos]]);
  if (table?.id !== id || current !== state || !role) return;
  const nearBottom = list.scrollHeight-list.clientHeight-list.scrollTop < 80;
  const previousScroll = list.scrollTop;
  rendered = state;
  list.replaceChildren(fragment);
  list.scrollTop = scrollToEnd || nearBottom ? list.scrollHeight : previousScroll;
}

function messageExcerpt(post) { return post.body.slice(0,110) || 'Attachment'; }
function clearReply() { replyTo = null; $('replyPreview').hidden = true; }

async function sendMessage(event) {
  event.preventDefault();
  if (!role || !table) return;
  if (recorder || microphonePending) throw Error('Stop recording before sending your message.');
  const id = table.id;
  const form = event.currentTarget;
  const data = new FormData(form);
  const body = data.get('body').trim();
  const file = data.get('media').size ? data.get('media') : recording;
  const reply = replyTo;
  if (!body && !file) throw Error('Write a message or attach a file.');
  if (file?.size > 50 * 1024 * 1024) throw Error('Choose a file under 50 MB.');
  const contentType = file?.type.split(';')[0];
  const type = contentType ? files[contentType] : null;
  if (file && !type) throw Error('Choose a supported photo, video, audio file or PDF.');
  const submit = form.querySelector('button[type=submit]');
  if (submit.disabled) return;
  submit.disabled = true;
  const path = file ? `${id}/${user.id}/${crypto.randomUUID()}.${type[0]}` : null;
  try {
    if (path) check(await sb.storage.from('tl-table-media').upload(path,file,{contentType,upsert:false}));
    try {
      check(await sb.from('tl_table_posts').insert({table_id:id,user_id:user.id,body,reply_to:reply,media_path:path,media_type:type?.[1] || null}));
    } catch (error) {
      if (path) await sb.storage.from('tl-table-media').remove([path]);
      throw error;
    }
    if (table?.id !== id) return;
    form.reset();
    recording = null;
    $('voiceStatus').textContent = '';
    clearReply();
    $('searchChat').value = '';
    await loadPosts(true);
    if (table?.id === id && role) {
      $('postList').lastElementChild?.scrollIntoView({block:'nearest'});
    }
  } finally { submit.disabled = false; }
}

function stopRecorder() {
  if (recorder?.state === 'recording') recorder.stop();
}
$('voiceNote').hidden = !(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
$('voiceNote').onclick = () => run(async()=>{
  if (recorder || microphonePending) { stopRecorder(); return; }
  const id = table?.id;
  if (!id || !role) return;
  microphonePending = true;
  $('voiceNote').disabled = true;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio:true});
    if (table?.id !== id || !role) { stream.getTracks().forEach(track=>track.stop()); return; }
    recorder = new MediaRecorder(stream);
    const chunks = [];
    const captured = recorder;
    const limit = setTimeout(stopRecorder,120000);
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      clearTimeout(limit);
      stream.getTracks().forEach(track=>track.stop());
      recorder = null;
      $('voiceNote').textContent = 'Record voice note';
      if (table?.id !== id || !role) return;
      const clip = new Blob(chunks,{type:captured.mimeType});
      recording = clip.size ? clip : null;
      $('postForm').elements.media.value = '';
      $('voiceStatus').textContent = recording ? 'Voice note ready to send.' : 'No audio was recorded.';
    };
    recorder.start();
    recording = null;
    $('voiceNote').textContent = 'Stop recording';
    $('voiceStatus').textContent = 'Recording. Tap Stop when finished.';
  } catch (error) {
    stream?.getTracks().forEach(track=>track.stop());
    recorder = null;
    throw error;
  } finally {
    microphonePending = false;
    $('voiceNote').disabled = false;
  }
});
$('postForm').elements.media.onchange = () => {
  recording = null;
  $('voiceStatus').textContent = '';
};
$('clearReply').onclick = clearReply;
$('postForm').onsubmit = event => run(()=>sendMessage(event));
$('searchChat').oninput = () => run(()=>renderChat(table?.id));

function scheduleRefresh() {
  setTimeout(async()=>{
    const id = table?.id;
    if (id && !opening && !document.hidden) await run(async()=>{
      await refreshMembership(id);
      if (table?.id === id && role && !$('feed').hidden) await loadPosts();
    });
    scheduleRefresh();
  },4500);
}

// v161: event-driven updates supplement the existing polling fallback.
function disconnectLive() {
  if (presenceChannel && sb) sb.removeChannel(presenceChannel);
  presenceChannel = null;
  presentUsers = new Set();
  renderSeats();
  if (liveChannel && sb) sb.removeChannel(liveChannel);
  liveChannel = null;
  if ($('chatLive')) $('chatLive').textContent = '● Checking updates';
}
function connectLive(id) {
  if (!sb || !role || table?.id !== id) return;
  disconnectLive();
  liveChannel = sb.channel('tl-chat-'+id)
    .on('postgres_changes', {event:'*',schema:'public',table:'tl_table_posts',filter:'table_id=eq.'+id}, queueLiveRefresh)
    .on('postgres_changes', {event:'*',schema:'public',table:'tl_table_reactions'}, queueLiveRefresh)
    .subscribe(status=>{
      if (table?.id === id) $('chatLive').textContent = status === 'SUBSCRIBED' ? '● Live updates' : '● Auto-refresh on';
    });
}
// Presence is ephemeral: it is not written to the database or shown to non-members.
function connectPresence(id) {
  if (chatPrefs.hidePresence) return;
  if (!sb || !role || table?.id !== id) return;
  const channel = sb.channel('tl-presence-'+id, {config:{presence:{key:user.id}}});
  presenceChannel = channel;
  channel.on('presence',{event:'sync'},()=>{
    if (presenceChannel!==channel || table?.id!==id) return;
    presentUsers = new Set(Object.keys(channel.presenceState()));
    renderSeats();
  }).subscribe(async status=>{
    if (status==='SUBSCRIBED' && presenceChannel===channel && table?.id===id && role) {
      try { await channel.track({joined_at:new Date().toISOString()}); }
      catch(error) { console.warn('Presence tracking unavailable:',error); }
    } else if (['CLOSED','CHANNEL_ERROR','TIMED_OUT'].includes(status) && presenceChannel===channel) {
      presentUsers = new Set();
      renderSeats();
    }
  });
}
$('tl162Invite').onclick = () => $('shareTable').click();
function queueLiveRefresh() {
  if (liveRefreshQueued || !role || !table || document.hidden) return;
  liveRefreshQueued = true;
  // Coalesce bursts of insert/update/delete events.
  setTimeout(()=>{
    liveRefreshQueued = false;
    if (table && role && !document.hidden) run(loadPosts);
  },250);
}
const emojiChoices = ['😀','😂','🤣','😊','😍','👍','👏','❤️','🍻','🍺','🎱','🎯','⚽','🎉','👋','🔥','🙌','🤝','😎','🥳','☕','🍷','💬','🙏'];
for (const emoji of emojiChoices) {
  const choice = button(emoji,()=>{
    const input = $('chatBody');
    const start = input.selectionStart, end = input.selectionEnd;
    input.setRangeText(emoji,start,end,'end');
    input.focus();
    $('emojiPanel').hidden = true;
    $('emojiToggle').setAttribute('aria-expanded','false');
  });
  choice.setAttribute('aria-label','Insert '+emoji);
  $('emojiPanel').append(choice);
}
$('emojiToggle').onclick = () => {
  $('emojiPanel').hidden = !$('emojiPanel').hidden;
  $('emojiToggle').setAttribute('aria-expanded',String(!$('emojiPanel').hidden));
};
$('jumpLatest').onclick = () => { $('postList').scrollTop = $('postList').scrollHeight; };
$('chatBody').addEventListener('keydown',event=>{
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !event.repeat) {
    event.preventDefault();
    if ($('postForm').requestSubmit) $('postForm').requestSubmit();
  }
});
window.addEventListener('pagehide',()=>{stopRecorder();disconnectLive();video?.setTable(null);});
$('showCreateTable').onclick = () => {
  if (!venue) return msg('Select Coombe Social Club or another venue first.');
  const panel = $('createTablePanel');
  panel.open = true;
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  panel.querySelector('input[name=name]').focus({preventScroll:true});
};
$('tableVenue').onchange = () => {
  msg('');
  run(loadTables);
};
$('back').onclick = () => { stopRecorder(); run(loadTables); };
$('newTable').onsubmit = event => {
  event.preventDefault();
  run(async()=>{
    if (!venue) throw Error('Choose a venue first.');
    const form = event.target;
    const submit = form.querySelector('button');
    if (submit.disabled) return;
    submit.disabled = $('tableVenue').disabled = true;
    try {
      const fields = new FormData(form);
      msg('Creating your table…');
      const id = check(await sb.rpc('tl_create_venue_table',{
        p_venue:venue.id,p_name:fields.get('name'),p_description:fields.get('description')
      }));
      form.reset();
      await openTable(await lookupTable(id));
      msg('Your table is ready.');
    } finally { submit.disabled = $('tableVenue').disabled = false; }
  });
};
$('redeemInvite').onsubmit = event => {
  event.preventDefault();
  run(async()=>{
    if (!venue) throw Error('Choose the venue on your invitation first.');
    const form = event.target;
    const submit = form.querySelector('button');
    if (submit.disabled) return;
    submit.disabled = $('tableVenue').disabled = true;
    try {
      const id = check(await sb.rpc('tl_venue_invite_accept',{
        p_token:new FormData(form).get('token').trim(),p_venue:venue.id
      }));
      form.reset();
      await openTable(await lookupTable(id));
      msg('Invitation accepted.');
    } finally { submit.disabled = $('tableVenue').disabled = false; }
  });
};
document.querySelectorAll('[data-tab]').forEach(control=>control.onclick=()=>{
  const tab = control.dataset.tab;
  showTab(tab);
  if (tab==='manage') run(async()=>{ await loadMembers(); await loadReports(); await loadAudit(); });
  if (tab==='events') run(loadEvents);
  if (tab==='feed') run(loadPosts);
});
init().catch(error => {
  const setupMissing = ['PGRST205','PGRST202','42703','42P01','42883'].includes(error.code);
  if (setupMissing) {
    $('tables').hidden = true;
    msg('Virtual Pub Tables are awaiting setup. Ask your site administrator to install the Virtual Pub Tables database update.');
  } else {
    msg('Virtual Pub Tables couldn’t load: '+(error.message || 'Unknown error')+'. Check your connection and Supabase setup.');
  }
  console.error('Virtual Pub Tables:',error);
});

async function loadMembers(){const rows=check(await sb.from('tl_table_members').select('*').eq('table_id',table.id).order('joined_at',{ascending:false}));$('memberList').replaceChildren();for(const m of rows){const el=document.createElement('div');el.className='member';const t=document.createElement('span');t.textContent=`${m.user_id.slice(0,8)} · ${m.status} · ${m.role}`;el.append(t);if(m.role!=='owner'&&!(role==='moderator'&&m.role==='moderator')){for(const action of ['approve','remove','ban',...(role==='owner'&&m.status==='approved'?[m.role==='moderator'?'demote':'promote']:[])]){const b=document.createElement('button');b.textContent=action;b.onclick=()=>run(async()=>{if(['ban','remove'].includes(action)&&!confirm(`${action} this member?`))return;check(await sb.rpc('tl_manage_member',{p_table:table.id,p_user:m.user_id,p_action:action}));await loadMembers()});el.append(b)}}$('memberList').append(el)}}
async function loadEvents(){const rows=check(await sb.from('tl_table_events').select('*').eq('table_id',table.id).order('starts_at'));$('eventList').replaceChildren();for(const e of rows){const el=document.createElement('article');el.className='event';const h=document.createElement('h4');h.textContent=e.title;const p=document.createElement('p');p.textContent=`${new Date(e.starts_at).toLocaleString()} · ${e.details}`;el.append(h,p);const r=check(await sb.from('tl_table_rsvps').select('*').eq('event_id',e.id));const mine=r.find(x=>x.user_id===user.id);for(const answer of ['going','interested','not_going']){const b=document.createElement('button');b.textContent=`${answer.replace('_',' ')} (${r.filter(x=>x.response===answer).length})${mine?.response===answer?' ✓':''}`;b.onclick=()=>run(async()=>{check(await sb.from('tl_table_rsvps').upsert({event_id:e.id,user_id:user.id,response:answer}));await loadEvents()});el.append(b)}if(admin()){const b=document.createElement('button');b.textContent='Delete event';b.onclick=()=>run(async()=>{if(!confirm('Delete event?'))return;check(await sb.from('tl_table_events').delete().eq('id',e.id));await loadEvents()});el.append(b)}$('eventList').append(el)}}
$('eventForm').onsubmit=e=>{e.preventDefault();run(async()=>{const f=new FormData(e.target);check(await sb.from('tl_table_events').insert({table_id:table.id,creator_id:user.id,title:f.get('title'),details:f.get('details')||'',starts_at:new Date(f.get('starts')).toISOString()}));e.target.reset();await loadEvents();msg('Event created.')})};
$('editTable').onsubmit=e=>{e.preventDefault();run(async()=>{const f=new FormData(e.target);check(await sb.from('tl_tables').update({name:f.get('name'),description:f.get('description')}).eq('id',table.id));table.name=f.get('name');table.description=f.get('description');$('tableName').textContent=table.name;$('tableDescription').textContent=table.description;msg('Table updated.')})};
async function loadReports(){if(!admin())return;const rows=check(await sb.from('tl_table_reports').select('*').eq('table_id',table.id).order('created_at',{ascending:false}).limit(80));$('reportList').replaceChildren();for(const r of rows){const el=document.createElement('div');el.className='member';const label=document.createElement('span');label.textContent=`${r.status.toUpperCase()} · ${r.reason} · ${new Date(r.created_at).toLocaleString()}`;el.append(label);for(const status of ['resolved','dismissed']){if(status===r.status)continue;const b=document.createElement('button');b.textContent=status;b.onclick=()=>run(async()=>{check(await sb.rpc('tl_report_review',{p_id:r.id,p_status:status}));await loadReports();await loadAudit()});el.append(b)}$('reportList').append(el)}}
async function loadAudit(){if(!admin())return;const rows=check(await sb.from('tl_table_audit').select('*').eq('table_id',table.id).order('created_at',{ascending:false}).limit(100));$('auditList').replaceChildren();for(const a of rows){const el=document.createElement('div');el.className='comment';el.textContent=`${new Date(a.created_at).toLocaleString()} · ${a.action} · ${a.actor_id?.slice(0,8)||'system'}`;$('auditList').append(el)}}
$('makeInvite').onclick=()=>run(async()=>{const token=check(await sb.rpc('tl_invite_create',{p_table:table.id}));const input=document.createElement('input');input.readOnly=true;input.value=token;input.setAttribute('aria-label','One-use invitation code');$('inviteLink').replaceChildren(input);input.select();msg('Share this code privately with the venue name, '+venue.name+'. It works once and expires after 7 days.');await loadAudit()});

// v160: native mobile sharing, with fallback links for desktop browsers.
function shareTarget(link) {
  const title = `Pull up a chair at ${table.name} · ${venue.name}`;
  const body = `You're invited to join ${table.name} at ${venue.name} on The Local. Pull up a chair and join the conversation!`;
  return {title, text:body, url:link};
}
function renderShareChoices(link) {
  const area = $('shareFeedback'); area.replaceChildren();
  const data = shareTarget(link);
  const line = element('p','Choose where to send your invitation:');
  const actions = element('div','','share-actions');
  const fullText = `${data.text} ${data.url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  const mail = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(fullText)}`;
  for (const [name,url] of [['WhatsApp',wa],['Facebook',fb],['Email',mail]]) {
    const a = element('a',name,'share-action'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; actions.append(a);
  }
  actions.append(button('Copy invitation link',async()=>{
    try { await navigator.clipboard.writeText(link); msg('Invitation link copied.'); }
    catch { const input=element('input'); input.readOnly=true; input.value=link; area.append(input); input.select(); msg('Select and copy the invitation link.'); }
  }));
  area.append(line,actions);
  if (admin()) area.append(element('small','Private invitation links are single-use and expire after 7 days. Create a new link for each person.'));
  else area.append(element('small','This is a table link, not an automatic admission. The table owner or moderator may need to approve requests.'));
}
$('shareTable').onclick=()=>run(async()=>{
  if (!table || !venue) throw Error('Open a table first.');
  const url = new URL('secure-tables.html',location.href);
  url.searchParams.set('venue',venue.id);
  url.searchParams.set('table',table.id);
  if (admin()) {
    const token=check(await sb.rpc('tl_invite_create',{p_table:table.id}));
    url.searchParams.set('invite',token);
    await loadAudit();
  }
  const link=url.href;
  renderShareChoices(link);
  if (navigator.share) {
    try { await navigator.share(shareTarget(link)); }
    catch(e) { if(e.name!=='AbortError') msg('Choose a sharing option below.'); }
  }
});

$('enableTableAlerts').onclick = async () => {
 if(parent !== window){parent.postMessage({type:'tl-enable-message-alerts'},location.origin);return;}
 try{msg(await phoneAlerts.enable(user?.id));}catch(error){msg(error.message);}
};
