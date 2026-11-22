import { el } from './venue-app-content.js';

const pageLimit = 8;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function pageUrl(link) {
  const slug = link.published_app_slug;
  if (typeof slug === 'string' && slug.length <= 60 && slugPattern.test(slug)) {
    return 'venue-app.html?venue=' + encodeURIComponent(slug);
  }
  try {
    const url = new URL(link.app_url);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {}
  return '';
}

function upcomingCards(app, days) {
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/London'}).format(new Date());
  const end = new Date(today + 'T12:00:00Z');
  end.setUTCDate(end.getUTCDate() + days);
  const lastDay = end.toISOString().slice(0, 10);
  return ['events', 'tickets', 'bingo'].flatMap(key =>
    Array.isArray(app?.features?.[key]) ? app.features[key] : []
  ).filter(card => card && typeof card.title === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(card.date) && card.date >= today && card.date <= lastDay
  ).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
}

export async function renderVenuePageFeed(client, host, { discovery = false } = {}) {
  if (!client || !host) return;
  const status = host.querySelector('[role="status"]');
  status.textContent = 'Loading venue pages…';
  try {
    const links = await client.rpc('local_directory_app_links');
    if (links.error) throw links.error;
    const sources = new Map((links.data || []).filter(pageUrl).map(link => [link.venue_id, link]));
    if (!sources.size) {
      status.textContent = 'Venue pages will appear here when they’re available.';
      return;
    }
    const result = await client.from('local_venue_directory').select('id,name,town,description')
      .in('id', [...sources.keys()]).in('status', ['approved','featured']).order('name').limit(pageLimit);
    if (result.error) throw result.error;
    const pages = await Promise.all((result.data || []).map(async venue => {
      const link = sources.get(venue.id);
      let app;
      if (link.published_app_slug) {
        const published = await client.rpc('local_builder_public', {p_slug: link.published_app_slug})
          .catch(() => null);
        app = published?.data;
        if (!app || published.error) return null;
      }
      return { venue, link, app };
    }));
    if (!host.isConnected) return;
    const list = host.querySelector('.venue-page-feed-list');
    const town = el('input', {type:'search', placeholder:'e.g. Coventry'});
    const date = el('select', {}, el('option', {value:'0'}, 'Today'),
      el('option', {value:'7'}, 'Next 7 days'), el('option', {value:'30'}, 'Next 30 days'));
    date.value = '7';
    function draw() {
      const query = town.value.trim().toLowerCase();
      const visible = pages.filter(Boolean).flatMap(({venue, link, app}) => {
      if (discovery && query && !String(venue.town || '').toLowerCase().includes(query)) return [];
      const cards = upcomingCards(app, discovery ? Number(date.value) : 30);
      if (discovery && !cards.length) return [];
      const article = el('article', {className:'panel venue-page-feed-card'},
        el('h3', {}, venue.name), venue.town && el('p', {className:'muted'}, venue.town),
        el('p', {}, String(app?.welcome || venue.description || '').slice(0, 240)));
      if (cards.length) article.append(el('ul', {}, ...cards.map(card =>
        el('li', {}, card.title + ' · ' + new Date(card.date + 'T12:00:00Z')
          .toLocaleDateString('en-GB', {day:'numeric', month:'short', timeZone:'Europe/London'}))
      )));
      article.append(el('a', {href:pageUrl(link), className:'venue-page-feed-link'}, 'Open venue page'));
      return [article];
      });
      status.textContent = visible.length ? '' : discovery
        ? 'No events from venue pages match this search. Try another town or date range.'
        : 'Venue pages will appear here when they’re available.';
      list.replaceChildren(...visible);
    }
    if (discovery) {
      const filters = el('div', {className:'venue-discovery-filters'},
        el('label', {}, 'Town', town), el('label', {}, 'When', date));
      status.before(filters);
      town.addEventListener('input', draw);
      date.addEventListener('change', draw);
    }
    draw();
  } catch {
    if (host.isConnected) status.textContent = 'Venue pages are temporarily unavailable.';
  }
}
