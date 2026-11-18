import { shareLocal } from './share.js?v=172';

export const memberPages = Object.freeze({
  home: 'Home',
  updates: 'Local Updates',
  tables: 'Virtual Pub Tables',
  plans: 'Who’s Up for It?',
  venues: 'Venue Hub',
  events: 'Events',
  community: 'Community',
  marketplace: 'Buy, Sell or Give Away',
  trades: 'Trades & Services',
  rounds: 'Rounds',
  photos: 'Photos',
  football: 'Football',
  kitty: 'Kitty',
  quiz: 'Quiz',
  games: 'Games',
  arcade: 'Arcade',
  'more-games': 'More Games',
  tournaments: 'Tournaments',
  leaderboard: 'Leaderboard',
  install: 'Install'
});

const labels = { 'Venue Hub': 'Find a Local', 'Arcade': 'Games Room' };
const itemPages = new Set(['updates', 'plans', 'events', 'photos', 'marketplace', 'trades']);
const groupPages = new Set(['updates', 'plans', 'events', 'photos']);
export const validShareId = value => typeof value === 'string' &&
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

export function sharedPage(href = location.href) {
  const params = new URL(href).searchParams;
  const page = params.get('page');
  if (!Object.hasOwn(memberPages, page)) return null;
  const item = params.get('item');
  const group = params.get('community');
  const venue = params.get('venue');
  const published = params.get('published');
  return {
    page, tab: memberPages[page],
    published: (page === 'events' || page === 'updates') && validShareId(published) ? published : null,
    source: params.get('source') === 'club' ? 'club' : 'studio',
    venue: page === 'venues' && /^[a-z0-9_-]{1,90}$/i.test(venue || '') ? venue : null,
    item: itemPages.has(page) && validShareId(item) ? item : null,
    group: groupPages.has(page) && validShareId(item) && validShareId(group) ? group : null
  };
}

export function memberPageUrl(page, { item, group, venue, published, source } = {}, href = location.href) {
  const url = new URL('index.html', href);
  if (!Object.hasOwn(memberPages, page)) return url.href;
  if (page !== 'home') url.searchParams.set('page', page);
  if(page === 'venues' && /^[a-z0-9_-]{1,90}$/i.test(venue || ''))url.searchParams.set('venue',venue);
  if((page === 'events' || page === 'updates') && validShareId(published)){
    url.searchParams.set('published',published);
    if(source === 'club')url.searchParams.set('source',source);
  }
  if (itemPages.has(page) && validShareId(item)) {
    url.searchParams.set('item', item);
    if (groupPages.has(page) && validShareId(group)) url.searchParams.set('community', group);
  }
  return url.href;
}

export function pageLabel(name) { return labels[name] || name; }

export function shareButton(label = 'Share page', id = '') {
  return `<button type="button" class="tl172-share"${id ? ` id="${id}"` : ''}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M6 11H4v10h16V11h-2"/></svg><span>${label}</span></button>`;
}

export function shareMemberPage(name, notify) {
  const page = Object.keys(memberPages).find(key => memberPages[key] === name);
  if (!page) return;
  const title = page === 'home' ? 'The Local' : `${pageLabel(name)} · The Local`;
  return shareLocal({ title, message: `Take a look at ${page === 'home' ? 'The Local' : `${pageLabel(name)} on The Local`}.`,
    url: memberPageUrl(page), notify, copied: 'Link copied. Paste it into a message.' });
}

export function shareItem({ page, item, group, title, notify }) {
  return shareLocal({ title, message: title.endsWith('on The Local') ? title : `${title} · The Local`, url: memberPageUrl(page, { item, group }),
    notify, copied: 'Link copied. Paste it into a message.' });
}

export function focusSharedItem(element) {
  if (!element?.isConnected) return;
  element.classList.add('tl172-shared-item');
  element.tabIndex = -1;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'start' });
}

export function publishedShareButton({ page, item, source, title, notify }) {
  if(!validShareId(item))return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tl172-share';
  button.textContent = page === 'events' ? 'Share event' : 'Share update';
  const url = memberPageUrl(page,{published:item,source});
  button.onclick = () => shareLocal({title, message:title+' · The Local', url, notify, copied:'Link copied.'});
  return button;
}
