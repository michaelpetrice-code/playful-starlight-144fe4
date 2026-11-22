const readTimes = new Map();
const kinds = {
  event: { label: 'New community event', page: 'Events' },
  chat: { label: 'New community update', page: 'Local Updates' }
};

export function renderMemberNotifications({ member, groupId, records, openPage }) {
  const bell = document.getElementById('member-notifications');
  if (!bell) return;
  bell.hidden = !member;
  if (!member) {
    bell.open = false;
    return;
  }

  const storageKey = `local-notifications-read:${member}:${groupId}`;
  let readThrough = readTimes.get(storageKey) || 0;
  try {
    readThrough = Math.max(readThrough, Number(localStorage.getItem(storageKey)) || 0);
  } catch {}
  const updates = records.filter(record =>
    groupId && record.group_id === groupId && record.user_id !== member &&
    Object.hasOwn(kinds, record.kind) &&
    (record.kind !== 'chat' || record.data?.roomId === 'local-feed')
  ).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const unread = updates.filter(record => Date.parse(record.created_at) > readThrough);
  const count = document.getElementById('member-notification-count');
  count.textContent = unread.length ? (unread.length > 99 ? '99+' : String(unread.length)) : '';
  count.hidden = !unread.length;
  count.setAttribute('aria-label', `${unread.length} unread`);

  const list = document.getElementById('member-notification-list');
  const empty = document.getElementById('member-notification-empty');
  empty.hidden = updates.length > 0;
  empty.textContent = groupId ? 'You’re all caught up.' : 'Join a community to see its updates here.';
  list.replaceChildren();
  for (const record of updates.slice(0, 20)) {
    const { label, page } = kinds[record.kind];
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const title = record.kind === 'event' ? record.data?.title : '';
    button.textContent = [label, typeof title === 'string' && title.slice(0, 100),
      Date.parse(record.created_at) > readThrough && 'Unread'].filter(Boolean).join(' · ');
    button.onclick = () => openPage(page);
    item.append(button);
    list.append(item);
  }

  const mark = document.getElementById('member-notification-read');
  mark.hidden = !unread.length;
  mark.onclick = () => {
    const latest = Date.parse(unread[0].created_at);
    readTimes.set(storageKey, latest);
    try { localStorage.setItem(storageKey, String(latest)); } catch {}
    renderMemberNotifications({ member, groupId, records, openPage });
    bell.querySelector('summary').focus();
  };
}
