import {entertainmentPages} from './entertainment.js?v=280';
import {featureGallery,visitorIntroduction} from './social-features.js?v=292';
import { renderVenuePageFeed } from './venue-page-feed.js?v=232';
import { trackPage } from './analytics-track.js?v=174';
import { memberPageUrl, sharedPage } from './page-share.js?v=280';
import { venueDirectoryView, bindVenueDirectory } from './venue-directory.js?v=213';
import { renderClubContent } from './simple-admin-v82.js?v=175';
import { marketTeaserHTML } from './marketplace.js?v=175';

const content = document.getElementById('guest-content');
const signIn = document.getElementById('guest-sign-in');
const incoming = sharedPage();
const current = new URL(location.href);
const welcome = new URL('index.html', current);
welcome.search = current.search;
welcome.hash = current.hash;

const legacyVenue = new URLSearchParams(current.hash.slice(1)).get('venue');
const section = current.searchParams.get('section');
const locationPage = legacyVenue ? 'venues' : section === 'Buy, Sell or Give Away' ? 'marketplace' : 'home';
const memberDestination = (section && locationPage === 'home') ||
  current.searchParams.has('game') || current.searchParams.has('venue-return') ||
  /^(?:#tables$|#join-(?:private|community)=)/.test(current.hash);
const guestPages = {
  home: ['Explore The Local as a guest', 'Find pubs and clubs, see public events and take a look at the marketplace.'],
  venues: ['Find a Local', 'Browse registered pubs, clubs and community venues.'],
  events: ['Find something to do', 'Explore upcoming events from local venue pages.'],
  marketplace: ['Buy, Sell or Give Away', 'Log in to browse live listings, contact sellers or post an item.'],
  tables: ['Virtual Pub Tables', 'See how members meet and chat around virtual tables.'],
  dj: ['The Local DJ', 'Join the venue music room or open Staff controls to host. Guest song requests are free.'],
  'race-night': ['Horse & dog race nights', 'Host with your authorised race recordings, printable cards and a TV or projector.'],
  games: ['Games Room', 'Play 14 browser games, including pool, darts and solitaire.'],
  trades: ['Local Tradesmen', 'Discover local trades and services.'],
  challenges: ['Challenges & Competitions', 'See the activities members can take part in.'],
  rewards: ['Rewards & Membership', 'Learn about participating venue rewards.'],
  rounds: ['Buy a Round', 'See how members can organise rounds.'],
  friends: ['Friends & Groups', 'Connect with friends and local communities.'],
  photos: ['Photos & Videos', 'Discover community galleries and shared moments.'],
  tickets: ['Tickets & Bookings', 'Discover events, tickets and venue activities.']
};
const page = incoming?.page || current.searchParams.get('page') || locationPage;
const isPublicPage = !memberDestination && Object.hasOwn(guestPages, page) && !incoming?.group &&
  (!incoming?.published || incoming.source === 'club');
if (isPublicPage) {
  // Guest previews can have different names from their signed-in destinations.
  const memberDestinations = { challenges: 'tournaments', rewards: 'venues', friends: 'community', tickets: 'events' };
  const destination = Object.hasOwn(memberDestinations, page) ? memberDestinations[page] : null;
  if (destination) welcome.searchParams.set('page', destination);
}
signIn.href = welcome.href;

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
  const discovery = document.createElement('section');
  discovery.id = 'venue-page-feed';
  discovery.innerHTML = '<h2>What’s on at local venues</h2><p role="status"></p><div class="venue-page-feed-list"></div>';
  content.replaceChildren(discovery, events, clubLink);
  const client = await publicClient();
  if (client) void renderVenuePageFeed(client, discovery, { discovery: true });
  else discovery.querySelector('[role="status"]').textContent = 'Venue events are temporarily unavailable.';
  const count = await renderClubContent(client, 'Events', notify, events);
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
  tables: 'Join conversations and invite friends once you have an account.',
  games: 'Try the public arcade. Play against the computer or practise on your own.',
  trades: 'Browse local services when public listings are available. Sign in to contact providers.',
  challenges: 'Sign in to join challenges and track your progress.',
  rewards: 'Participating venues can offer rewards to registered members.',
  rounds: 'Sign in to organise rounds with other members.',
  friends: 'Sign in to connect with other members.',
  photos: 'Member galleries may require sign-in to protect privacy.',
  tickets: 'Check public events or sign in for member booking options.'
};
if (isPublicPage && guestPreview[page]) {
  const description = guestPreview[page];
  const panel = document.createElement('section');
  panel.className = 'guest-preview-panel';
  const p = document.createElement('p'); p.textContent = description;
  const login = document.createElement('a'); login.className = 'guest-button';
  if (page === 'games') {
    login.href = 'games-room-next.html';
    login.textContent = 'Play in the Games Room';
  } else {
    login.href = signIn.href;
    login.textContent = 'Log in or create an account';
  }
  const back = document.createElement('a'); back.href = 'guest.html'; back.textContent = '← Explore all features';
  panel.append(p, login, back);
  content.replaceChildren(panel);
}

if(isPublicPage && page==='home'){document.documentElement.classList.add('social-guest-home');content.innerHTML=visitorIntroduction()+featureGallery()+'<section class="social-owner-offer"><span class="social-eyebrow">FOR VENUES & COMMUNITIES</span><h2>Your venue deserves its own Local.</h2><p>Bring your news, events and members together in a branded app. Explore what is included before choosing a venue subscription.</p><a href="for-venues.html">Explore venue apps →</a></section>';document.getElementById('guest-title').textContent='Welcome to your Local';}

if(isPublicPage && ['dj','race-night'].includes(page)){const item=Object.values(entertainmentPages).find(item=>item.key===page);const frame=document.createElement('iframe');frame.title=item.title;frame.src=item.href+'?embedded=1';frame.className='guest-entertainment-frame';frame.allow="autoplay 'self'; fullscreen 'self'";frame.setAttribute('allowfullscreen','');const link=document.createElement('a');link.href=item.href;link.target='_blank';link.rel='noopener';link.textContent='Open in a separate tab ↗';content.replaceChildren(link,frame);}
