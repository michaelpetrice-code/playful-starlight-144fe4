import { trackPage } from './analytics-track.js?v=174';
import { memberPageUrl, sharedPage } from './page-share.js?v=173';
import { venueDirectoryView, bindVenueDirectory } from './venue-directory.js?v=175';
import { renderClubContent } from './simple-admin-v82.js?v=175';
import { marketTeaserHTML } from './marketplace.js?v=175';

const content = document.getElementById('guest-content');
const signIn = document.getElementById('guest-sign-in');
const incoming = sharedPage();
const current = new URL(location.href);
const welcome = new URL('index.html', current);
welcome.search = current.search;
welcome.hash = current.hash;
signIn.href = welcome.href;

const legacyVenue = new URLSearchParams(current.hash.slice(1)).get('venue');
const section = current.searchParams.get('section');
const locationPage = legacyVenue ? 'venues' : section === 'Buy, Sell or Give Away' ? 'marketplace' : 'home';
const page = incoming?.page || locationPage;
const memberDestination = (section && locationPage === 'home') ||
  current.searchParams.has('game') || current.searchParams.has('venue-return') ||
  /^(?:#tables$|#join-(?:private|community)=)/.test(current.hash);
const guestPages = {
  home: ['Explore The Local as a guest', 'Find pubs and clubs, see public events and take a look at the marketplace.'],
  venues: ['Find a Local', 'Browse registered pubs, clubs and community venues.'],
  events: ['What’s on', 'See public events, dates and prizes.'],
  marketplace: ['Buy, Sell or Give Away', 'Log in to browse live listings, contact sellers or post an item.'],
  tables: ['Virtual Pub Tables', 'See how members meet and chat around virtual tables.'],
  games: ['Games Room', 'Explore games and challenges available to members.'],
  trades: ['Local Tradesmen', 'Discover local trades and services.'],
  challenges: ['Challenges & Competitions', 'See the activities members can take part in.'],
  rewards: ['Rewards & Membership', 'Learn about participating venue rewards.'],
  rounds: ['Buy a Round', 'See how members can organise rounds.'],
  friends: ['Friends & Groups', 'Connect with friends and local communities.'],
  photos: ['Photos & Videos', 'Discover community galleries and shared moments.'],
  tickets: ['Tickets & Bookings', 'Discover events, tickets and venue activities.']
};
const isPublicPage = !memberDestination && Object.hasOwn(guestPages, page) && !incoming?.group &&
  (!incoming?.published || incoming.source === 'club');
const [title, intro] = isPublicPage ? guestPages[page] : ['Log in to open this page', 'You can log in to follow the link or browse the public pages as a guest.'];

document.getElementById('guest-title').textContent = title;
document.getElementById('guest-intro').textContent = intro;
if (isPublicPage) {
  document.querySelectorAll('.guest-nav a').forEach(link => {
    const targetPage = new URL(link.href).searchParams.get('page') || 'home';
    if (targetPage === page) link.setAttribute('aria-current', 'page');
  });
}
trackPage(isPublicPage ? page : 'welcome');

function notify(text) {
  document.getElementById('guest-status').textContent = text;
}

function guestPageUrl(page, options) {
  const url = new URL(memberPageUrl(page, options));
  url.pathname = new URL('guest.html', current).pathname;
  return url.href;
}

async function publicClient() {
  const config = window.LADS_CONFIG;
  if (!config?.supabaseUrl || !config.supabaseAnonKey) return null;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  } catch {
    return null;
  }
}

async function browseVenues() {
  const api = {
    guest: true, browse: guestPageUrl, root: content, cloud: true, sb: null, notice: notify,
    render() {
      content.innerHTML = venueDirectoryView(api);
      bindVenueDirectory(api);
    }
  };
  api.render();
  api.sb = await publicClient();
  api.cloud = Boolean(api.sb);
  api.render();
  if (!api.sb) notify('The venue directory is temporarily unavailable. The featured Coombe profile is still available.');
}

async function browseEvents() {
  const events = document.createElement('div');
  events.className = 'guest-events';
  events.setAttribute('aria-busy', 'true');
  events.textContent = 'Loading public events…';
  const clubLink = document.createElement('a');
  clubLink.className = 'tl173-action';
  clubLink.href = 'https://www.coombesocialclub.co.uk/';
  clubLink.textContent = 'Visit the Coombe Social Club website';
  content.replaceChildren(events, clubLink);
  const count = await renderClubContent(await publicClient(), 'Events', notify, events);
  if (!count) events.textContent = count === 0 ? 'There are no public events to show.' : 'Public events are temporarily unavailable.';
  events.setAttribute('aria-busy', 'false');
}

if (!isPublicPage) {
  const login = signIn.cloneNode(true);
  login.removeAttribute('id');
  content.replaceChildren(login);
} else if (page === 'venues') {
  void browseVenues();
} else if (page === 'events') {
  void browseEvents();
} else if (page === 'marketplace') {
  content.innerHTML = marketTeaserHTML({ guest: true });
}

// v209: informative guest previews for features requiring membership.
const guestPreview = {
  tables: ['Virtual Pub Tables', 'Join conversations and invite friends once you have an account.'],
  games: ['Games Room', 'Games and multiplayer availability depend on the current release. Sign in to access member games.'],
  trades: ['Local Tradesmen', 'Browse local services when public listings are available. Sign in to contact providers.'],
  challenges: ['Challenges & Competitions', 'Sign in to join challenges and track your progress.'],
  rewards: ['Rewards & Membership', 'Participating venues can offer rewards to registered members.'],
  rounds: ['Buy a Round', 'Sign in to organise rounds with other members.'],
  friends: ['Friends & Groups', 'Sign in to connect with other members.'],
  photos: ['Photos & Videos', 'Member galleries may require sign-in to protect privacy.'],
  tickets: ['Tickets & Bookings', 'Check public events or sign in for member booking options.']
};
if (isPublicPage && guestPreview[page]) {
  const [heading, description] = guestPreview[page];
  const panel = document.createElement('section');
  panel.className = 'guest-preview-panel';
  const h = document.createElement('h2'); h.textContent = heading;
  const p = document.createElement('p'); p.textContent = description;
  const login = document.createElement('a'); login.className = 'guest-button';
  login.href = signIn.href; login.textContent = 'Log in or create an account';
  const back = document.createElement('a'); back.href = 'guest.html'; back.textContent = '← Explore all features';
  panel.append(h, p, login, back);
  content.replaceChildren(panel);
}
