// Presentation only: move the existing controls without replacing their listeners or permissions.
const byId = id => document.getElementById(id);
const feed = byId('feed');
if (feed) {
  const menu = document.createElement('details');
  menu.className = 'messenger-menu';
  const summary = document.createElement('summary');
  summary.textContent = '•••';
  summary.setAttribute('aria-label', 'Table options');
  summary.title = 'Table options';
  const content = document.createElement('div');
  content.className = 'messenger-menu-content';
  menu.append(summary, content);
  document.querySelector('.table-profile').append(menu);
  for (const node of [document.querySelector('#memberArea > .switch'), document.querySelector('.table-people'), document.querySelector('.table-share'), byId('tableDescription'), byId('tableShortcutHelp'), byId('tableVideo'), byId('tl163Settings'), byId('tl163Preferences'), document.querySelector('.pub-search')]) {
    if (node) content.append(node);
  }
  const fullScreen = document.createElement('button');
  fullScreen.type = 'button';
  fullScreen.textContent = 'Full screen';
  fullScreen.addEventListener('click', () => { menu.open = false; byId('toggleTableChatScreen').click(); });
  content.append(fullScreen);
  const booth = document.querySelector('.table-people');
  if (booth) booth.open = false;
  const attachments = document.createElement('details');
  attachments.className = 'messenger-attachments';
  const attachSummary = document.createElement('summary');
  attachSummary.textContent = '+';
  attachSummary.setAttribute('aria-label', 'Attachments and message tools');
  attachSummary.title = 'Attachments and message tools';
  const tools = document.createElement('div');
  tools.className = 'messenger-attachment-tools';
  attachments.append(attachSummary, tools);
  for (const node of [document.querySelector('.chat-tools'), byId('chatGifPicker'), byId('emojiPanel'), document.querySelector('.pub-compose > label'), byId('voiceNote'), byId('voiceStatus')]) {
    if (node) tools.append(node);
  }
  const form = byId('postForm');
  form.prepend(attachments);

  const voiceNote = byId('voiceNote');
  let idleTimer;
  let filePickerOpen = false;
  function restartIdleTimer() {
    clearTimeout(idleTimer);
    if (!attachments.open || filePickerOpen || voiceNote.disabled ||
        voiceNote.textContent === 'Stop recording') return;
    idleTimer = setTimeout(() => {
      if (tools.contains(document.activeElement)) attachSummary.focus({preventScroll: true});
      attachments.open = false;
    }, 5000);
  }
  attachments.addEventListener('toggle', restartIdleTimer);
  for (const event of ['pointermove', 'pointerdown', 'keydown', 'focusin', 'scroll', 'wheel']) {
    tools.addEventListener(event, restartIdleTimer, {capture: true, passive: true});
  }
  form.addEventListener('click', event => {
    if (attachments.open && event.target.matches('input[type="file"]')) {
      filePickerOpen = true;
      restartIdleTimer();
    }
  }, true);
  for (const event of ['change', 'cancel']) {
    form.addEventListener(event, event => {
      if (!event.target.matches('input[type="file"]')) return;
      filePickerOpen = false;
      restartIdleTimer();
    });
  }
  new MutationObserver(restartIdleTimer).observe(voiceNote, {
    attributes: true, attributeFilter: ['disabled'], childList: true,
  });
  const send = document.querySelector('.pub-compose button[type="submit"]');
  send.textContent = '➤';
  send.setAttribute('aria-label', 'Send message');
  send.title = 'Send message';
  document.documentElement.classList.add('messenger-tables');
}

// Reopening Chat should reveal the composer even after scrolling through Plans.
document.querySelector('[data-tab="feed"]')?.addEventListener('click', () => {
  const composer = byId('postForm');
  if (composer && !composer.closest('[hidden]')) {
    byId('chatBody').focus({preventScroll:true});
    composer.scrollIntoView({block:'nearest'});
  }
});

// Give an open conversation a viewport of its own, including inside The Local.
function syncConversationViewport() {
  const active = !byId('tableDetail').hidden && !byId('memberArea').hidden && !feed.hidden;
  document.documentElement.classList.toggle('table-conversation-open', active);
  const viewport = window.visualViewport;
  if(parent===window)document.documentElement.classList.toggle('table-compact-chat',(viewport?.height || innerHeight)<600);
  document.documentElement.style.setProperty('--conversation-height', `${viewport?.height || innerHeight}px`);
  if (parent !== window) parent.postMessage({type:'tl-table-conversation',active},location.origin);
}
const conversationObserver = new MutationObserver(syncConversationViewport);
for (const id of ['tableDetail','memberArea','feed']) conversationObserver.observe(byId(id),{attributes:true,attributeFilter:['hidden']});
window.visualViewport?.addEventListener('resize',syncConversationViewport);
window.addEventListener('resize',syncConversationViewport);
syncConversationViewport();

window.addEventListener('message',event=>{
 if(parent===window || event.source!==parent || event.origin!==location.origin || event.data?.type!=='tl-table-viewport')return;
 const height=event.data.height;if(!Number.isFinite(height)||height<160||height>3000)return;
 document.documentElement.style.setProperty('--conversation-height',height+'px');
 document.documentElement.classList.toggle('table-compact-chat',event.data.compact===true);
});
if(parent===window)window.visualViewport?.addEventListener('resize',()=>document.documentElement.classList.toggle('table-compact-chat',window.visualViewport.height<600));
