import { blankApp, el, features, renderVenue } from './venue-app-content.js';
import { venueSectors } from './venue-sectors.js';
const form = document.getElementById('venue-preview-form');
const preview = document.getElementById('venue-preview');
const type = form.elements.type;
// Keep options available without JavaScript; share the full catalogue when loaded.
type.replaceChildren(...venueSectors.map(profile => el('option', { value: profile.type }, profile.name)));
const sectorGrid = document.getElementById('venue-sector-grid');
for (const profile of venueSectors) {
  const choose = el('button', { type: 'button', className: 'tl149-action' }, 'Preview this venue type');
  choose.addEventListener('click', () => {
    type.value = profile.type;
    form.elements.theme.value = profile.theme;
    update();
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
    type.focus({ preventScroll: true });
  });
  sectorGrid?.append(el('article', { className: 'tl-sector-card' },
    el('h3', {}, profile.name), el('p', {}, profile.intro), choose));
}
function update() {
  const details = Object.fromEntries(new FormData(form));
  const profile = venueSectors.find(item => item.type === details.type) || venueSectors[0];
  const [eventTitle, eventDetail, roomTitle, roomDetail] = profile.example;
  const content = Object.fromEntries(profile.keys.map(key => [key, []]));
  content.events = [{ title: eventTitle, detail: eventDetail, url: '' }];
  if (profile.keys.includes('room')) content.room = [{ title: roomTitle, detail: roomDetail, url: '' }];
  preview.replaceChildren(renderVenue({ ...blankApp, ...details, welcome: profile.intro, features: content }, { preview: true }));
  document.getElementById('venue-preview-status').textContent = `${profile.name} example. Sample content only; bookings and payments are not processed in this demo.`;
}
form.addEventListener('submit', event => { event.preventDefault(); update(); });
form.addEventListener('change', event => {
  if (event.target === type) form.elements.theme.value = venueSectors.find(p => p.type === type.value).theme;
  update();
});
update();
