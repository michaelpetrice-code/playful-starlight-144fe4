const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function readTableChatLink(params) {
  const venue = params.get('venue');
  const table = params.get('table');
  return uuid.test(venue || '') && uuid.test(table || '') ? {venue, table} : null;
}

export function tableChatLink(page, base, {venue, table}, extra = {}) {
  const link = new URL(page, base);
  link.search = new URLSearchParams({...extra, venue, table}).toString();
  return link;
}
