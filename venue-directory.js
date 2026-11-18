import { track } from './analytics-track.js?v=174';
import { shareLocal } from './share.js?v=172';
import { sharedPage, memberPageUrl, focusSharedItem } from './page-share.js?v=173';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const COOMBE = {
  id: 'coombe-social-club', name: 'Coombe Social Club', type: 'Social club', town: 'Coventry',
  description: 'A Coventry social club with live entertainment, bingo, a concert room, a lounge and room hire.',
  website: 'https://www.coombesocialclub.co.uk/', app_url: 'https://stellar-mandazi-6aa7db.netlify.app/',
  status: 'featured'
};
const visible = venue => ['approved', 'featured'].includes(venue.status);
const coombe = venue => /^(?:the +)?coombe +social +club$/i.test(venue.name.trim());
let venues = [COOMBE], directory = 'idle';
const selected = sharedPage()?.venue || new URLSearchParams(location.hash.slice(1)).get('venue');
let filter = '', type = '';
let focusProfile = true;
const baseColumns = 'id,name,type,town,description,website,status,verified';
document.addEventListener('local-analytics-allowed', () => {
  if (!document.getElementById('tl173-venue-profile') || document.documentElement.classList.contains('tl-auth-locked')) return;
  const venue = venues.find(row => visible(row) && (row.id===selected || row.directoryId===selected));
  if (venue) void track('venue_profile','venues',venue.id);
});

export const venueNames = () => venues.filter(visible).map(venue => venue.name);

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function appLink(venue) {
  if (venue.published_app_slug?.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(venue.published_app_slug)) {
    return { href: 'venue-app.html?venue='+encodeURIComponent(venue.published_app_slug), standalone: false };
  }
  const href = httpsUrl(venue.app_url);
  return href ? { href, standalone: true } : null;
}
function venueCard(venue, browse) {
  const image = coombe(venue) ? 'assets/coombe/concert-room.webp' : 'assets/feature-slides/discover-venues.webp';
  return `<article class="tl173-venue-card">
    <img src="${image}" alt="${coombe(venue) ? 'Coombe Social Club concert room' : ''}" width="504" height="333" loading="lazy">
    <div><p class="tl173-meta">${esc(venue.type)} · ${esc(venue.town)}</p>
    <h2>${esc(venue.name)}</h2><p>${esc(venue.description || 'Find out about this venue.')}</p>
    <a class="tl173-action" href="${esc(browse('venues',{venue:venue.id}))}">View profile<span class="tl173-sr"> for ${esc(venue.name)}</span></a></div>
  </article>`;
}
function venueProfile(venue, browse, guest) {
  const featured = coombe(venue);
  const app = appLink(venue);
  const website = httpsUrl(venue.website);
  return `<article class="tl173-venue-profile" id="tl173-venue-profile" aria-labelledby="tl173-venue-name">
    <a href="${esc(browse('venues'))}">← All venues</a>
    <p class="tl173-meta">${esc(venue.type)} · ${esc(venue.town)}</p>
    <h2 id="tl173-venue-name">${esc(venue.name)}</h2>
    <p>${esc(venue.description || 'Explore this registered venue on The Local.')}</p>
    <div class="tl173-actions">
      ${app ? `<a data-analytics-open-app class="tl173-action" href="${esc(app.href)}">Open ${featured ? 'Coombe app' : 'venue app'}</a>
      <button type="button" class="tl172-share" id="tl173-install" aria-expanded="false" aria-controls="tl173-install-help">${app.standalone ? 'Install venue app' : 'Add venue to home screen'}</button>` : ''}
      ${website ? `<a class="tl172-share" href="${esc(website)}" target="_blank" rel="noopener noreferrer">Venue website</a>` : ''}
      <button type="button" class="tl172-share" id="tl173-share">Share profile</button>
      ${guest ? `<a class="tl172-share" href="${esc(memberPageUrl('tables'))}">Sign in to join pub tables</a>` :
        '<button type="button" class="tl172-share" id="tl173-tables">Find pub tables</button>'}
    </div>
    ${app ? `<div id="tl173-install-help" class="tl173-install-help" hidden>
      <h3>${app.standalone ? 'Install ' + esc(venue.name) : 'Add a shortcut to ' + esc(venue.name)}</h3>
      ${featured ? '<p>Open the Coombe app and tap <strong>Install App</strong> when it appears.</p>' : ''}
      <p>Open the venue app in your browser, then follow the steps for your device.</p>
      <ul><li><strong>Android:</strong> In Chrome, tap ⋮, then ${app.standalone ? '<strong>Install app</strong> or <strong>Add to Home screen</strong>' : '<strong>Add to Home screen</strong> and choose <strong>Create shortcut</strong> if shown'}.</li>
      <li><strong>iPhone:</strong> In Safari, tap <strong>Share → Add to Home Screen</strong>, then tap <strong>Add</strong>.</li></ul>
      <a data-analytics-open-app class="tl173-action" href="${esc(app.href)}">Open app to continue</a>
    </div>` : '<p class="tl173-meta">This venue has no app listed yet.</p>'}
    ${featured ? `<div class="tl173-gallery">
      <figure><img src="assets/coombe/concert-room.webp" alt="Coombe Social Club concert room set for an event" loading="lazy"><figcaption>Concert room</figcaption></figure>
      <figure><img src="assets/coombe/lounge.webp" alt="Coombe Social Club lounge arranged for a celebration" loading="lazy"><figcaption>Club lounge</figcaption></figure>
    </div>` : ''}
  </article>`;
}
function matchingVenues() {
  return venues.filter(venue => visible(venue) &&
    (!type || venue.type === type) &&
    `${venue.name} ${venue.town} ${venue.type}`.toLowerCase().includes(filter.trim().toLowerCase()));
}
function resultCount() {
  const count = matchingVenues().length;
  return `${count} ${count === 1 ? 'venue' : 'venues'}`;
}
function resultsMarkup(browse) {
  const matches = matchingVenues();
  return matches.length ? matches.map(venue => venueCard(venue,browse)).join('') :
    '<p class="tl173-empty">No venues match. Try another name, town or venue type.</p>';
}
export function venueDirectoryView(api) {
  const browse = api.browse || memberPageUrl;
  const venue = venues.find(row => visible(row) && (row.id === selected || (coombe(row) && row.directoryId === selected)));
  if (venue) return venueProfile(venue,browse,api.guest);
  if (selected && api.cloud && ['idle', 'loading'].includes(directory)) return '<p class="tl173-empty" role="status">Loading venue profile…</p>';
  const types = [...new Set(venues.filter(visible).map(venue => venue.type))].sort();
  return `<section class="tl173-directory" aria-label="Registered venues">
    ${selected ? '<p class="tl173-empty" role="status">This venue profile is unavailable.</p>' : ''}
    <div class="tl173-filters">
      <label for="tl173-venue-filter">Name or town<input id="tl173-venue-filter" type="search" placeholder="Search registered venues" value="${esc(filter)}"></label>
      <label for="tl173-type">Venue type<select id="tl173-type"><option value="">All venue types</option>${types.map(value => `<option ${type===value?'selected':''}>${esc(value)}</option>`).join('')}</select></label>
    </div>
    ${api.cloud && ['idle','loading'].includes(directory) ? '<p role="status">Loading registered venues…</p>' : ''}
    ${directory==='unavailable' ? '<p role="status">The venue list is temporarily unavailable. <button type="button" id="tl173-retry">Try again</button></p>' : ''}
    <p id="tl173-count" class="tl173-meta" role="status">${resultCount()}</p>
    <div id="tl173-results" class="tl173-venue-grid">${resultsMarkup(browse)}</div>
  </section>
  ${api.guest ? '<a class="tl173-action" href="for-venues.html">List your venue</a>' :
    `<details class="tl173-owner"><summary>List your venue</summary>${applicationForms()}</details>`}`;
}
async function fetchVenues(api) {
  if (directory !== 'idle' || !api.sb) return;
  directory = 'loading';
  try {
    const registered = await api.sb.from('local_venue_directory').select(baseColumns)
      .in('status',['approved','featured']).order('name');
    if (registered.error) throw registered.error;
    const rows = registered.data || [];
    const appLinks = await api.sb.rpc('local_directory_app_links').catch(() => null);
    const links = new Map((appLinks?.data || []).map(link => [link.venue_id,link]));
    const featured = rows.find(coombe);
    venues = [{...COOMBE,directoryId:featured?.id}, ...rows.filter(row => !coombe(row)).map(row => ({...row,...links.get(row.id)}))];
    directory = 'ready';
  } catch { directory = 'unavailable'; }
  if (document.querySelector('.tl173-directory, #tl173-venue-profile, .tl173-empty')) api.render();
}
export function bindVenueDirectory(api) {
  fetchVenues(api);
  const root = api.root || document.getElementById('view');
  const results = document.getElementById('tl173-results');
  if (results) {
    const update = () => {
      results.innerHTML = resultsMarkup(api.browse || memberPageUrl);
      document.getElementById('tl173-count').textContent = resultCount();
    };
    root.querySelector('#tl173-venue-filter').oninput = event => { filter=event.target.value; update(); if(filter.trim().length>=2) void track('directory_search','venues'); };
    root.querySelector('#tl173-type').onchange = event => { type=event.target.value; update(); if(type) void track('directory_search','venues'); };
    const retry = root.querySelector('#tl173-retry');
    if(retry)retry.onclick=()=>{directory='idle';api.render();};
  }
  const profile = root?.querySelector('#tl173-venue-profile');
  if (profile) {
    const venue = venues.find(row => row.id===selected || row.directoryId===selected);
    if (!venue) return;
    if(api.user) void track('venue_profile','venues',venue.id);
    profile.querySelectorAll('[data-analytics-open-app]').forEach(link => {
      link.onclick = () => { void track('venue_app','venues',venue.id); };
    });
    profile.querySelector('#tl173-share').onclick = () => shareLocal({
      title: venue.name+' · The Local', message: 'Take a look at '+venue.name+' on The Local.',
      url: memberPageUrl('venues',{venue:venue.id}), notify:api.notice, copied:'Venue profile link copied.'
    });
    const tables = profile.querySelector('#tl173-tables');
    if (tables) tables.onclick = () => api.openVenueTables(venue.directoryId || venue.id);
    const install = profile.querySelector('#tl173-install');
    if (install) install.onclick = () => {
      const help = profile.querySelector('#tl173-install-help');
      help.hidden = !help.hidden;
      if(!help.hidden) void track('install_interest','venues',venue.id); install.setAttribute('aria-expanded',String(!help.hidden));
    };
    if (focusProfile) requestAnimationFrame(() => {
      if (profile.isConnected && !document.documentElement.classList.contains('tl-auth-locked')) {
        focusProfile=false;focusSharedItem(profile);
      }
    });
  }
  if (!api.guest) bindApplicationForms(api);
}
function applicationForms() { return `<section class="venue-join-panel" id="venueApply"><span>FOR PUBS, CLUBS & VENUE OWNERS</span><h2>Turn regulars into a community.</h2><p>Give your venue a premium page, a direct link to virtual tables and a place for patrons to connect, play and return.</p><div class="venue-benefits"><span>✨ Branded venue page</span><span>🍻 Dedicated tables</span><span>📣 Promote events</span><span>📲 Invite patrons</span></div><form id="venueApplication"><label>Venue name<input id="venueApplyName" required maxlength="90" placeholder="Your pub or club"></label><label>Venue type<select id="venueApplyType"><option>Pub</option><option>Social club</option><option>Bar</option><option>Community centre</option><option>Sports club</option><option>Other local venue</option></select></label><label>Town or area<input id="venueApplyTown" required maxlength="90"></label><label>Contact email<input id="venueApplyEmail" required type="email" maxlength="200"></label><label>Tell us about your venue<textarea id="venueApplyDescription" maxlength="700" rows="3"></textarea></label><button type="submit">Apply for a venue page →</button></form><p class="muted">Submitting an application does not activate a paid listing. The Local must verify the venue and agree pricing before publishing.</p><div id="venueApplyStatus" role="status"></div></section><section class="venue-app-panel" id="venueAppRequest"><span class="venue-app-eyebrow">YOUR VENUE. YOUR BRAND. PART OF THE LOCAL.</span><h2>Get your own pub or club app</h2><p>Like Coombe Social Club, your venue can have its own branded home, What's On, event listings, tickets, photo gallery, competitions and room hire enquiries. Approved public updates can also appear in The Local.</p><div class="venue-app-benefits"><span>Dedicated branded web app</span><span>Venue-managed news and events</span><span>Separate venue sign-in</span><span>Shared public updates on The Local</span></div><form id="venueAppRequestForm"><label>Pub or club name<input id="venueAppName" required maxlength="90" autocomplete="organization"></label><label>Town or area<input id="venueAppTown" required maxlength="90"></label><label>Venue type<select id="venueAppType"><option>Pub</option><option>Social club</option><option>Sports club</option><option>Bar</option><option>Community venue</option></select></label><label>Contact name<input id="venueAppContact" required maxlength="100" autocomplete="name"></label><label>Contact email<input id="venueAppEmail" type="email" required maxlength="200" autocomplete="email"></label><label>Preferred app name<input id="venueAppBrand" required maxlength="90" placeholder="e.g. The Red Lion"></label><label>Features you'd like<select id="venueAppPackage"><option value="club">Club app: news, events, tickets and competitions</option><option value="pub">Pub app: what's on, offers, community and events</option><option value="full">Full venue app: all features plus room hire</option></select></label><label>Anything else you'd like included?<textarea id="venueAppNotes" maxlength="1000" rows="3" placeholder="Your logo, club colours, features or questions"></textarea></label><label class="venue-app-consent"><input type="checkbox" id="venueAppConsent" required> I confirm I am authorised to enquire on behalf of this venue and agree to be contacted about the application.</label><button type="submit">Request my venue app</button><p class="muted">Requests are reviewed before approval. No app, payment or subscription is created automatically.</p><div id="venueAppStatus" role="status" aria-live="polite"></div></form></section>`; }
function bindApplicationForms(api) {
document.getElementById('venueAppRequestForm')?.addEventListener('submit',async e=>{e.preventDefault();const status=document.getElementById('venueAppStatus');if(!api.cloud||!api.user){status.textContent='Please sign in to The Local to submit your request.';return}const get=id=>document.getElementById(id)?.value.trim()||'';const button=e.target.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Submitting your request…';const payload={applicant_id:api.user.id,venue_name:get('venueAppName'),town:get('venueAppTown'),venue_type:get('venueAppType'),contact_name:get('venueAppContact'),contact_email:get('venueAppEmail'),app_name:get('venueAppBrand'),package_key:get('venueAppPackage'),notes:get('venueAppNotes')};try{const {error}=await api.sb.from('local_venue_app_requests').insert(payload);if(error)throw error;e.target.reset();status.textContent='Your request has been received. The Local team will review it and contact you by email.';api.notice('Venue app request submitted')}catch(err){status.textContent='Unable to submit: '+(err.message||'Please try again. Ensure the venue app SQL has been installed.')}finally{button.disabled=false}});document.getElementById('venueApplication')?.addEventListener('submit',async e=>{e.preventDefault();if(!api.cloud||!api.user)return api.notice('Please sign in to apply for a venue page');const f=id=>document.getElementById(id).value.trim();const payload={name:f('venueApplyName'),type:f('venueApplyType'),town:f('venueApplyTown'),contact_email:f('venueApplyEmail'),description:f('venueApplyDescription'),applicant_id:api.user.id};const {error}=await api.sb.from('local_venue_applications').insert(payload);if(error)return api.notice('Application not submitted: '+error.message);e.target.reset();document.getElementById('venueApplyStatus').textContent='Application received. The Local team will review it before any page goes live.';api.notice('Venue application submitted')})}
