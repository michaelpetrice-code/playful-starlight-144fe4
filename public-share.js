import { shareLocal } from './share.js?v=277';

document.querySelectorAll('[data-tl172-public-share]').forEach(button => {
  const status = document.createElement('span');
  status.className = 'tl172-share-status';
  status.setAttribute('role', 'status');
  button.after(status);
  button.addEventListener('click', () => {
    const url = new URL(button.dataset.shareLanding || location.pathname, location.origin + '/');
    // Preserve public browsing selections only. Invite codes and account state stay out.
    if (/\/guest(?:\.html)?\/?$/.test(url.pathname)) {
      const params = new URLSearchParams(location.search);
      const page = params.get('page');
      const venue = params.get('venue');
      if (/^(venues|events|marketplace|tables|games|trades|challenges|rewards|rounds|friends|photos|tickets)$/.test(page || '')) {
        url.searchParams.set('page', page);
        if (page === 'venues' && /^[a-z0-9_-]{1,90}$/i.test(venue || '')) url.searchParams.set('venue', venue);
      }
    }
    if (/\/for-venues(?:\.html)?\/?$/.test(location.pathname) && ['#plans', '#features', '#demo', '#contact'].includes(location.hash)) {
      url.hash = location.hash;
    }
    shareLocal({
      title: document.title, message: 'Take a look at ' + document.title + '.',
      url: url.href, notify: message => { status.textContent = message; }, copied: 'Link copied.'
    });
  });
});
