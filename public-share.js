import { shareLocal } from './share.js?v=172';

document.querySelectorAll('[data-tl172-public-share]').forEach(button => {
  const status = document.createElement('span');
  status.className = 'tl172-share-status';
  status.setAttribute('role', 'status');
  button.after(status);
  button.addEventListener('click', () => {
    const url = new URL(location.pathname, location.origin);
    if (location.pathname.endsWith('/for-venues.html') && ['#plans', '#features', '#demo', '#contact'].includes(location.hash)) {
      url.hash = location.hash;
    }
    shareLocal({
      title: document.title, message: 'Take a look at ' + document.title + '.',
      url: url.href, notify: message => { status.textContent = message; }, copied: 'Link copied.'
    });
  });
});
