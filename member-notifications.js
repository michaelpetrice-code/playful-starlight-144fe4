const readTimes = new Map();
const kinds = {
  event: { label: 'New community event', page: 'Events' },
  chat: { label: 'New community update', page: 'Local Updates' }
};

export function renderMemberNotifications({ member, groupId, records, messages, openPage }) {
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
  const messageKey = `local-notifications-messages-read:${member}`;
  let messagesReadThrough = readTimes.get(messageKey) || 0;
  try {
    messagesReadThrough = Math.max(messagesReadThrough, Number(localStorage.getItem(messageKey)) || 0);
  } catch {}
  const isUnread = record => Date.parse(record.created_at) >
    (record.notice ? messagesReadThrough : readThrough);
  const communityUpdates = records.filter(record =>
    groupId && record.group_id === groupId && record.user_id !== member &&
    Object.hasOwn(kinds, record.kind) &&
    (record.kind !== 'chat' || record.data?.roomId === 'local-feed')
  );
  const updates = [...communityUpdates, ...messages].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const unread = updates.filter(isUnread);
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
    const { label, page } = record.notice || kinds[record.kind];
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const title = record.kind === 'event' ? record.data?.title : '';
    button.textContent = [label, typeof title === 'string' && title.slice(0, 100),
      isUnread(record) && 'Unread'].filter(Boolean).join(' · ');
    button.onclick = () => openPage(page, record.notice);
    item.append(button);
    list.append(item);
  }

  const mark = document.getElementById('member-notification-read');
  mark.hidden = !unread.length;
  mark.onclick = () => {
    for (const [key, latest] of [
      [storageKey, unread.find(record => !record.notice)],
      [messageKey, unread.find(record => record.notice)]
    ]) {
      if (!latest) continue;
      const time = Date.parse(latest.created_at);
      readTimes.set(key, time);
      try { localStorage.setItem(key, String(time)); } catch {}
    }
    renderMemberNotifications({ member, groupId, records, messages, openPage });
    bell.querySelector('summary').focus();
  };
}


export async function loadMessageNotifications(client, member) {
  const sources = [
    [client.from('tl_table_posts').select('created_at,tl_tables!inner(id,venue_id)')
      .neq('user_id', member).eq('hidden', false), row => ({
        label: 'New table message', page: 'Virtual Pub Tables',
        table: { venue: row.tl_tables.venue_id, table: row.tl_tables.id }
      })],
    [client.from('private_chat_messages').select('created_at,room_id')
      .neq('sender_id', member), row => ({
        label: 'New private chat message', page: 'Private Chats', room: row.room_id
      })],
    [client.from('market_messages').select('created_at')
      .eq('recipient_id', member), () => ({
        label: 'New marketplace message or offer', page: 'Buy, Sell or Give Away'
      })]
  ];
  const results = await Promise.allSettled(sources.map(async ([query, notice]) => {
    const { data, error } = await query.order('created_at', { ascending: false }).limit(30);
    if (error) return [];
    return data.map(row => ({ created_at: row.created_at, notice: notice(row) }));
  }));
  return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}
