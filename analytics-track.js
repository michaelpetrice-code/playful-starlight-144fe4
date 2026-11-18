const preferenceKey = 'the-local-analytics-choice';
const visitKey = 'the-local-analytics-visit';
const sources = {
  facebook:'Facebook', instagram:'Instagram', whatsapp:'WhatsApp', tiktok:'TikTok',
  google:'Google', bing:'Bing', email:'Email', qr:'QR code', share:'Shared link'
};
const referralHosts = {
  'facebook.com':'Facebook', 'fb.com':'Facebook', 'instagram.com':'Instagram',
  'whatsapp.com':'WhatsApp', 'tiktok.com':'TikTok', 'google.com':'Google',
  'google.co.uk':'Google', 'bing.com':'Bing'
};
const sent = new Set();
let inMemoryVisit, currentPage;
const config = window.LADS_CONFIG || {};

function stored(key, storage = 'localStorage') {
  try { return window[storage].getItem(key); } catch { return null; }
}
function put(key, value, storage = 'localStorage') {
  try {
    if (value === null) window[storage].removeItem(key);
    else window[storage].setItem(key, value);
  } catch { /* Browser storage is optional. */ }
}
let choice = stored(preferenceKey);

function attribution() {
  const params = new URLSearchParams(location.search);
  const tag = (params.get('utm_source') || '').toLowerCase();
  const value = (params.get('utm_campaign') || '').toLowerCase();
  const campaign = /^[a-z0-9][a-z0-9_-]{0,39}$/.test(value) ? value : '';
  if (tag) return { source: Object.hasOwn(sources, tag) ? sources[tag] : 'Other campaign', campaign };
  let source = 'Direct / unknown';
  try {
    const referrer = new URL(document.referrer);
    if(referrer.origin !== location.origin) {
      const match = Object.keys(referralHosts).find(host => referrer.hostname === host || referrer.hostname.endsWith('.' + host));
      source = match ? referralHosts[match] : 'Other referral';
    }
  } catch { /* Referrer is often blank. */ }
  return { source,campaign };
}
function visit() {
  if (inMemoryVisit) return inMemoryVisit;
  const incoming = attribution();
  try {
    const existing = JSON.parse(stored(visitKey,'sessionStorage'));
    if (existing?.id && Date.now()-existing.at < 30*60*1000 &&
      (!new URLSearchParams(location.search).has('utm_source') ||
       existing.source===incoming.source && existing.campaign===incoming.campaign)) {
      return inMemoryVisit = existing;
    }
  } catch { /* Recover from invalid or expired browser storage. */ }
  return inMemoryVisit = { id: crypto.randomUUID(), at: Date.now(), ...incoming };
}
export async function track(event, page, venue = '') {
  if (choice !== 'yes' || !config.supabaseUrl || !config.supabaseAnonKey || !crypto.randomUUID) return;
  if (!inMemoryVisit || Date.now()-inMemoryVisit.at >= 30*60*1000) inMemoryVisit = null;
  const session = visit();
  const key = [session.id,new Date().toLocaleDateString('en-GB',{timeZone:'Europe/London'}),event,page,venue].join('/');
  session.at = Date.now();
  put(visitKey,JSON.stringify(session),'sessionStorage');
  if (sent.has(key)) return;
  if (sent.size >= 300) sent.clear();
  sent.add(key);
  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) || /Android/i.test(ua) && !/Mobile/i.test(ua) ||
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 ? 'Tablet' :
    /Mobi|iPhone/i.test(ua) ? 'Mobile' : 'Desktop / other';
  try {
    const response = await fetch(new URL('/rest/v1/rpc/local_analytics_record',config.supabaseUrl),{
      method:'POST',keepalive:true,
      headers:{'Content-Type':'application/json',apikey:config.supabaseAnonKey,
        ...(config.supabaseAnonKey.startsWith('eyJ') ? {Authorization:'Bearer ' + config.supabaseAnonKey} : {})},
      body:JSON.stringify({p_visit:session.id,p_event:event,p_page:page,p_source:session.source,
        p_campaign:session.campaign,p_device:device,p_venue:venue})
    });
    if (!response.ok) sent.delete(key);
  } catch { sent.delete(key); }
}
export function trackPage(page) {
  currentPage = page;
  if (page) void track('view',page);
}

function mountPreferences() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  const root = document.createElement('section');
  root.className = 'tl-an-preferences';
  root.setAttribute('aria-label','Analytics preferences');
  root.innerHTML = '<button type="button" class="tl-an-settings">Analytics settings</button><div class="tl-an-choice"><strong>Help improve The Local</strong><p>Allow optional analytics for visits, features, device type and referral campaigns. We use temporary visit IDs to count activity.</p><div><button type="button" data-choice="no">Reject analytics</button><button type="button" data-choice="yes">Allow analytics</button></div></div>';
  const panel = root.querySelector('.tl-an-choice');
  const settings = root.querySelector('.tl-an-settings');
  panel.hidden = Boolean(choice);
  settings.setAttribute('aria-expanded',String(!panel.hidden));
  settings.onclick = () => {
    panel.hidden = !panel.hidden;
    settings.setAttribute('aria-expanded',String(!panel.hidden));
  };
  root.querySelectorAll('[data-choice]').forEach(button => {
    button.onclick = () => {
      const previous = choice;
      choice = button.dataset.choice;
      put(preferenceKey,choice);
      if(choice === 'no') {
        put(visitKey,null,'sessionStorage');
        inMemoryVisit = null;
      } else if (currentPage && previous !== 'yes') {
        trackPage(currentPage);
        document.dispatchEvent(new Event('local-analytics-allowed'));
      }
      panel.hidden = true;
      settings.setAttribute('aria-expanded','false');
      settings.focus();
    };
  });
  window.addEventListener('storage', event => {
    if(event.key !== preferenceKey) return;
    choice = event.newValue;
    if(choice !== 'yes') {
      inMemoryVisit = null;
      put(visitKey,null,'sessionStorage');
    }
  });
  document.body.append(root);
}

mountPreferences();
if(location.pathname.endsWith('/for-venues.html')){
  trackPage('for-venues');
  document.querySelector('.tl-plan-picker')?.addEventListener('submit',() => { void track('plan_selected','for-venues'); });
} else if(location.pathname.endsWith('/venue-app.html')){
  trackPage('venue-app');
} else {
  trackPage('welcome');
}
