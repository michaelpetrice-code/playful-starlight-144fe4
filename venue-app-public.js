import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { shareLocal } from './share.js?v=172';
import { el, renderVenue } from './venue-app-content.js';

const root = document.getElementById('venue-app');
const slug = new URLSearchParams(location.search).get('venue') || '';
const loginUrl = `index.html?venue-return=${encodeURIComponent(slug)}`;

function unavailable(message) {
  root.replaceChildren(el('div', { className: 'vb-loading' }, el('h1', {}, message),
    el('a', { href: 'for-venues.html' }, 'Visit The Local')));
}

async function start() {
  const config = window.LADS_CONFIG;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 60) {
    unavailable('Venue app not found'); return;
  }
  const sb = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data, error } = await sb.rpc('local_builder_public', { p_slug: slug });
  if (error) { unavailable('The venue app is temporarily unavailable'); return; }
  if (!data) { unavailable('This venue app is unavailable'); return; }
  const { data: auth } = await sb.auth.getSession();
  document.title = `${data.name} · The Local`;
  document.documentElement.style.colorScheme = 'dark';
  const venue = renderVenue(data, {
    enquire(key) {
      const heading = key === 'room' ? 'Enquire about room hire' : 'Send a venue enquiry';
      if (!auth.session) return el('a', { href: loginUrl }, `Sign in to ${heading.toLowerCase()}`);
      const form = el('form', { className: 'vb-enquiry' });
      const message = el('textarea', { minlength: 10, maxlength: 1000, required: '' });
      const submit = el('button', { type: 'submit' }, 'Send enquiry');
      const status = el('p', { role: 'status' });
      form.append(el('label', {}, heading, message), submit, status);
      form.addEventListener('submit', async event => {
        event.preventDefault();
        submit.disabled = true;
        status.textContent = 'Sending…';
        const result = await sb.rpc('local_builder_enquire', { p_slug: slug, p_feature: key, p_message: message.value })
          .catch(() => ({ error: { message: 'Unable to reach the venue. Try again.' } }));
        if (!result.error) form.reset();
        status.textContent = result.error?.message || 'Enquiry sent to the venue.';
        submit.disabled = false;
      });
      return form;
    }
  });
  const share = el('button', {type:'button', className:'tl172-share'}, 'Share venue');
  const feedback = el('p', {role:'status', className:'tl172-share-status'});
  share.onclick = () => {
    const url = new URL('venue-app.html', location.href);
    url.searchParams.set('venue',slug);
    shareLocal({title:document.title,message:'Take a look at '+data.name+' on The Local.',
      url:url.href,notify:message => {feedback.textContent=message;},copied:'Venue link copied.'});
  };
  venue.querySelector('.vb-cover').append(share, feedback);
  root.replaceChildren(venue);
}

start().catch(() => unavailable('The venue app is temporarily unavailable'));
