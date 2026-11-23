import {shareLocal} from './share.js';
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sb,user,notify,rooms=[],selected=null,messages=[],subscription=null,generation=0,roomRequest=0,messageRequest=0,pollTimer=null,onSelect=()=>{},onBack=null,draftScope=null;const drafts=new Map(),pendingSends=new Set();let viewport=null;
function resizePrivateChat(){const win=document.defaultView;if(!win?.visualViewport)return;const card=el('privateChatArea')?.closest('.member-messenger.is-chat-open');if(!card)return;const nav=el('bottomNav')?.getBoundingClientRect().height||0;const available=Math.max(180,win.visualViewport.height-nav-Math.max(0,card.getBoundingClientRect().top)-8);card.style.setProperty('--private-chat-height',available+'px');}
export function disposePrivateChat(clear=false){if(clear){drafts.clear();draftScope=null}else{const field=el('privateMessage');if(field&&selected&&user?.id)drafts.set(user.id+':'+selected,field.value)}++generation;viewport?.removeEventListener('resize',resizePrivateChat);viewport?.removeEventListener('scroll',resizePrivateChat);viewport=null;clearInterval(pollTimer);pollTimer=null;if(subscription&&sb)sb.removeChannel(subscription).catch(()=>{});subscription=null;}
const el=id=>document.getElementById(id);
const query=async request=>{const {data,error}=await request;if(error)throw error;return data};
export function privateChatView(){return `<section class="panel member-messenger"><h2 id="messages-heading" tabindex="-1">Messages</h2><p class="muted">Chat with people you invite.</p><div id="privateChatArea">Sign in to load your private chats.</div></section>`}
async function refreshRooms(){const version=generation,request=++roomRequest,member=user?.id;const next=await query(sb.from('private_chat_rooms').select('id,name,created_by,created_at').order('created_at',{ascending:false}));if(version!==generation||request!==roomRequest||member!==user?.id)return;rooms=next;if(selected&&!rooms.some(r=>r.id===selected)){selected=null;messages=[]}await draw();}
async function refreshMessages(forceLatest=false){
 const version=generation,request=++messageRequest;
 const roomId=selected, member=user?.id;
 if(!roomId || !member)return;
 const rows=await query(sb.from('private_chat_messages').select('id,room_id,sender_id,body,created_at')
  .eq('room_id',roomId).order('created_at',{ascending:false}).limit(250));
 if(version!==generation || request!==messageRequest || selected!==roomId || user?.id!==member)return;
 messages=rows.reverse();
 await draw(forceLatest);
}
async function draw(forceLatest=false){const host=el('privateChatArea');if(!host)return;if(!user||!sb){host.innerHTML='<p>Sign in to your account to create or join private chat groups. Private groups require Supabase.</p>';return}
const room=rooms.find(r=>r.id===selected);
const draft=host.querySelector('#privateMessage');
const sameMember=host.dataset.member===user.id;
const draftText=sameMember&&draft?.dataset.room===room?.id ? draft?.value : drafts.get(user.id+':'+room?.id)||'';
host.dataset.member=user.id;
const wasTyping=draft && document.activeElement===draft && draft.dataset.room===room?.id;
const selection=wasTyping ? [draft.selectionStart,draft.selectionEnd] : null;
const setupOpen=host.querySelector('.private-chat-directory details')?.open;
const oldHistory=host.querySelector('.private-chat-messages');const oldTop=oldHistory?.scrollTop||0;const nearBottom=!oldHistory || oldHistory.scrollHeight-oldHistory.clientHeight-oldTop<90;
host.closest('.member-messenger')?.classList.toggle('is-chat-open',Boolean(room));
host.innerHTML=`<div class="private-chat-directory" ${room?'hidden':''}><details ${setupOpen || !rooms.length || sessionStorage.getItem('local-pending-join-private') ? 'open' : ''}><summary>Start or join a chat</summary><div class="private-chat-actions"><form id="privateCreate"><label>New private group name<input id="privateName" maxlength="60" required placeholder="Family, close friends, organisers…"></label><button>Create private group</button></form><form id="privateJoin"><label>Private chat invitation code<input id="privateCode" maxlength="80" required placeholder="Paste your private chat code"></label><p class="muted">This is for private chats only. To join a community, use Account → Join Community.</p><button>Join Private Chat</button></form></div></details><h3>Conversations</h3><div class="chat-room-list">${rooms.map(r=>`<button data-private-room="${escapeHtml(r.id)}" aria-pressed="${r.id===selected}" class="${r.id===selected?'active':''}">🔒 ${escapeHtml(r.name)}</button>`).join('')||'<p>You have not joined any private groups yet.</p>'}</div></div>${room?`<div class="private-chat-conversation"><div class="private-conversation-head"><button type="button" id="privateBack" aria-label="Back to conversations">← Chats</button><h3>${escapeHtml(room.name)}</h3><details><summary aria-label="Conversation options">•••</summary><div>${room.created_by===user.id?'<button id="privateInvite">🔗 Copy invitation code</button><button id="privateInviteLink">📨 Share private chat</button>':''}<button id="privateLeave">Leave group</button></div></details></div><div class="private-chat-messages" tabindex="0" aria-label="Messages">${messages.map(m=>`<div class="item ${m.sender_id===user.id?'message-own':''}"><small>${m.sender_id===user.id?'You':'Group member'} · ${new Date(m.created_at).toLocaleString('en-GB')}</small><p>${escapeHtml(m.body)}</p></div>`).join('')||'<p>No messages yet.</p>'}</div><form id="privateSend"><textarea id="privateMessage" data-room="${escapeHtml(room.id)}" aria-label="Write a message" maxlength="2000" rows="2" required placeholder="Write a message…"></textarea><button>Send</button></form></div>`:''}`;
el('privateCreate').onsubmit=async ev=>{ev.preventDefault();const name=el('privateName').value.trim();if(!name)return;try{const id=await query(sb.rpc('create_private_chat_room',{room_name:name}));notify('Private group created');selected=id;onSelect(id);await refreshRooms();await refreshMessages()}catch(e){notify(e.message)}};
el('privateJoin').onsubmit=async ev=>{ev.preventDefault();const code=el('privateCode').value.trim();try{const id=await query(sb.rpc('join_private_chat_room',{invite_code_input:code}));selected=id;onSelect(id);sessionStorage.removeItem('local-pending-join-private');notify('You have joined the private group');await refreshRooms();await refreshMessages()}catch(e){notify(/invalid invitation code/i.test(e.message)?'Private chat code not recognised. Check you copied the private chat invitation, not a community code.':e.message)}};
if(el('privateCode'))el('privateCode').value=sessionStorage.getItem('local-pending-join-private')||'';
host.querySelectorAll('[data-private-room]').forEach(b=>b.onclick=async()=>{selected=b.dataset.privateRoom;onSelect(selected);messages=[];await refreshMessages()});
if(room){
const composer=el('privateMessage');
composer.value=draftText || '';
const draftKey=user.id+':'+room.id;composer.addEventListener('input',()=>drafts.set(draftKey,composer.value));
el('privateSend').querySelector('button').disabled=pendingSends.has(draftKey);
if(selection){composer.focus();composer.setSelectionRange(...selection);}
const history=host.querySelector('.private-chat-messages');
history.scrollTop=forceLatest||nearBottom?history.scrollHeight:oldTop;
if(!oldHistory)host.closest('.member-messenger')?.scrollIntoView({block:'start'});resizePrivateChat();
el('privateBack').onclick=()=>{if(onBack){onBack();return}selected=null;messages=[];onSelect(null);draw()};
if(el('privateInvite'))el('privateInvite').onclick=async()=>{try{const code=await query(sb.rpc('get_private_chat_invite',{room_id_input:room.id}));await navigator.clipboard.writeText(code);notify('Private invitation code copied. Share it only with people you trust.')}catch(e){notify(e.message)}};
if(el('privateInviteLink'))el('privateInviteLink').onclick=async()=>{try{const code=await query(sb.rpc('get_private_chat_invite',{room_id_input:room.id}));const url=location.origin+location.pathname+'#join-private='+encodeURIComponent(code);await navigator.clipboard.writeText(url);notify('Private chat join link copied. Share it only with people you trust.')}catch(e){notify(e.message)}};
el('privateLeave').onclick=async()=>{if(!confirm('Leave this private group? You will lose access to its messages.'))return;try{await query(sb.from('private_chat_members').delete().eq('room_id',room.id).eq('user_id',user.id));selected=null;messages=[];drafts.delete(draftKey);onSelect(null);await refreshRooms()}catch(e){notify(e.message)}};
let sending=false;
el('privateSend').onsubmit=async ev=>{
 ev.preventDefault();const body=composer.value.trim();if(!body||sending||pendingSends.has(draftKey))return;
 const version=generation,sender=user.id,roomId=room.id;const submit=el('privateSend').querySelector('button');sending=true;pendingSends.add(draftKey);submit.disabled=true;
 try{await query(sb.from('private_chat_messages').insert({room_id:roomId,sender_id:sender,body}));if(version!==generation||selected!==roomId||user?.id!==sender)return;const currentComposer=el('privateMessage');if(currentComposer?.dataset.room===roomId && currentComposer.value.trim()===body){currentComposer.value='';drafts.delete(draftKey)}await refreshMessages(true)}catch(e){if(version===generation)notify(e.message)}finally{sending=false;pendingSends.delete(draftKey);if(submit.isConnected)submit.disabled=false;if(version===generation&&selected===roomId&&user?.id===sender)el('privateSend')?.querySelector('button')?.removeAttribute('disabled')}
};
composer.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();el('privateSend').requestSubmit()}});
}}

export async function bindPrivateChat(context){
 disposePrivateChat();const version=generation;
 if(draftScope!==context.user?.id){drafts.clear();draftScope=context.user?.id||null;}
 sb=context.sb;user=context.user;notify=context.notice;onSelect=context.onSelect||(()=>{});onBack=context.onBack||null;selected=context.roomId||null;messages=[];rooms=[];
 if(!sb||!user){draw();return}
 try{
  await refreshRooms();if(version!==generation)return;
  if(selected)await refreshMessages();if(version!==generation)return;
  subscription=sb.channel('private-chat-updates-'+user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'private_chat_messages'},payload=>{if(version!==generation)return;if(payload.new?.room_id===selected)refreshMessages().catch(()=>{});else if(rooms.some(r=>r.id===payload.new?.room_id)&&payload.new?.sender_id!==user?.id)notify('New private chat message')}).subscribe();
  viewport=document.defaultView?.visualViewport;viewport?.addEventListener('resize',resizePrivateChat);viewport?.addEventListener('scroll',resizePrivateChat);resizePrivateChat();
  pollTimer=setInterval(()=>{if(version===generation&&!document.hidden&&selected)refreshMessages().catch(()=>{})},5000);
 }catch(e){if(version!==generation)return;if(el('privateChatArea'))el('privateChatArea').innerHTML='<p class="warn">Chats could not load. Please try again.</p><button id="retryPrivateChat" type="button">Try again</button>';el('retryPrivateChat')?.addEventListener('click',()=>bindPrivateChat(context));notify('Private chats are temporarily unavailable. Please try again.')}
}
