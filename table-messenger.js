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
  for (const node of [document.querySelector('#memberArea > .switch'), document.querySelector('.table-people'), document.querySelector('.table-share'), byId('tableDescription'), byId('memberState'), byId('tableShortcutHelp'), byId('tl163Settings'), byId('tl163Preferences'), document.querySelector('.pub-search')]) {
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
  for (const node of [document.querySelector('.chat-tools'), byId('emojiPanel'), document.querySelector('.pub-compose > label'), byId('voiceNote'), byId('voiceStatus')]) {
    if (node) tools.append(node);
  }
  byId('postForm').prepend(attachments);
  const send = document.querySelector('.pub-compose button[type="submit"]');
  send.textContent = '➤';
  send.setAttribute('aria-label', 'Send message');
  send.title = 'Send message';
  document.documentElement.classList.add('messenger-tables');
}
