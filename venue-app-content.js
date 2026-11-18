export const features = {
  events: { label: 'What’s On', image: 'assets/feature-slides/whos-up-for-it.webp', action: 'Event details' },
  tickets: { label: 'Events & Tickets', image: 'assets/feature-slides/whos-up-for-it.webp', action: 'Open ticket provider' },
  room: { label: 'Room Hire', image: 'assets/feature-slides/discover-venues.webp', action: 'Room details' },
  bingo: { label: 'Kids’ Bingo', image: 'assets/feature-slides/virtual-pub-tables.webp', action: 'Bingo details' },
  draw: { label: 'Chase the Lady', image: 'assets/feature-slides/buy-a-round.webp', action: 'Club draw details' },
  rewards: { label: 'Member Rewards', image: 'assets/feature-slides/rewards-membership.webp', action: 'Reward details' },
  gallery: { label: 'Gallery', image: 'assets/feature-slides/virtual-pub-tables.webp', action: 'View album' },
  games: { label: 'Games Room', image: 'assets/feature-slides/games-room.webp', action: 'Game details' },
  contact: { label: 'Contact the Venue', image: 'assets/feature-slides/discover-venues.webp', action: 'Venue website' }
};

export const themes = ['emerald', 'burgundy', 'navy', 'charcoal'];
export const blankApp = { name: '', type: 'Social club', town: '', welcome: '', logo: '', theme: 'emerald', features: {} };
const officialLogo = 'assets/branding/the-local-transparent-v150.png';

export function el(tag, options = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(options)) {
    if (name === 'className' || name === 'textContent') node[name] = value;
    else node.setAttribute(name, value);
  }
  node.append(...children.filter(child => child != null));
  return node;
}

export function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function slugify(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/^-|-$/g, '');
}

function bingoTicket() {
  const board = el('div', { className: 'vb-bingo-grid', 'aria-label': 'Bingo ticket' });
  const status = el('p', { role: 'status' }, 'Tap each number as it is called.');
  const card = el('div', { className: 'vb-bingo' });
  const reset = el('button', { type: 'button' }, 'New bingo ticket');
  function draw() {
    const marks = new Set();
    const numbers = Array.from({ length: 90 }, (_, index) => index + 1);
    const ticket = Array.from({ length: 15 }, () => numbers.splice(Math.floor(Math.random() * numbers.length), 1)[0]);
    board.replaceChildren(...ticket.map((number, index) => {
      const button = el('button', { type: 'button', 'aria-pressed': 'false' }, String(number));
      button.addEventListener('click', () => {
        if (marks.has(index)) marks.delete(index); else marks.add(index);
        button.setAttribute('aria-pressed', String(marks.has(index)));
        const line = [0, 5, 10].some(start => [0, 1, 2, 3, 4].every(i => marks.has(start + i)));
        status.textContent = marks.size === 15 ? 'Full house! Show your ticket to the caller.' :
          line ? 'You have a line! Show your ticket to the caller.' : 'Tap each number as it is called.';
      });
      return button;
    }));
    status.textContent = 'Tap each number as it is called.';
  }
  reset.addEventListener('click', () => {
    if (window.confirm('Start a new bingo ticket and clear your marks?')) draw();
  });
  draw();
  card.append(board, status, reset);
  return card;
}

export function renderVenue(app, { preview = false, enquire } = {}) {
  const shell = el('div', { className: 'vb-venue', 'data-theme': themes.includes(app.theme) ? app.theme : 'emerald' });
  const logoUrl = httpsUrl(app.logo) || officialLogo;
  const logo = el('img', { className: 'vb-mark', src: logoUrl, alt: app.logo && logoUrl !== officialLogo ? app.name : 'The Local', referrerpolicy: 'no-referrer' });
  logo.addEventListener('error', () => { logo.src = officialLogo; }, { once: true });
  const title = el(preview ? 'h3' : 'h1', {}, app.name || 'Your venue');
  const meta = [app.type, app.town].filter(Boolean).join(' · ');
  shell.append(el('header', { className: 'vb-cover' }, logo, title, meta && el('p', {}, meta), app.welcome && el('p', { className: 'vb-welcome' }, app.welcome)));
  const list = el('div', { className: 'vb-sections' });
  for (const [key, info] of Object.entries(features)) {
    if (!Object.hasOwn(app.features, key)) continue;
    const cards = app.features[key];
    if (!preview && !cards.length && !['room', 'contact', 'games', 'bingo'].includes(key)) continue;
    const section = el('section', { className: 'vb-feature' },
      el('img', { src: info.image, alt: '', loading: 'lazy' }), el('h3', {}, info.label));
    for (const card of cards) {
      const url = httpsUrl(card.url);
      const article = el('article', {}, el('h4', {}, card.title), card.detail && el('p', {}, card.detail));
      const photo = httpsUrl(card.image);
      if (photo) {
        const picture = el('img', { className: 'vb-card-photo', src: photo, alt: card.title, loading: 'lazy', referrerpolicy: 'no-referrer' });
        picture.addEventListener('error', () => picture.remove(), { once: true });
        article.prepend(picture);
      }
      const schedule = [card.date, card.time && `From ${card.time}`, card.endTime && `Until ${card.endTime}`].filter(Boolean).join(' · ');
      if (schedule) article.append(el('p', { className: 'vb-card-meta' }, schedule));
      if (card.location) article.append(el('p', { className: 'vb-card-meta' }, `Location: ${card.location}`));
      if (card.price !== undefined && card.price !== '') article.append(el('p', { className: 'vb-card-price' }, `£${Number(card.price).toFixed(2)}`));
      if (card.paymentDetails) article.append(el('p', { className: 'vb-card-meta' }, card.paymentDetails));
      const paymentUrl = httpsUrl(card.paymentUrl);
      if (paymentUrl) article.append(preview ? el('span', { className: 'vb-preview-link' }, 'Pay / Book securely') :
        el('a', { href: paymentUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Pay / Book securely'));
      if (url) article.append(preview ? el('span', { className: 'vb-preview-link' }, info.action) :
        el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, info.action));
      section.append(article);
    }
    if (key === 'bingo') section.append(preview ? el('span', { className: 'vb-preview-link' }, 'Interactive bingo ticket') : bingoTicket());
    if (key === 'games') section.append(preview ? el('span', { className: 'vb-preview-link' }, 'Open The Local Games Room') :
      el('a', { href: 'index.html?game=lobby' }, 'Open The Local Games Room'));
    if (enquire && ['room', 'contact'].includes(key)) section.append(enquire(key));
    list.append(section);
  }
  shell.append(list);
  if (!preview) shell.append(el('footer', { className: 'vb-credit' }, el('a', { href: 'for-venues.html' }, 'Powered by The Local')));
  return shell;
}
