import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { venueSectors, sectorForType, featureLabel, sectorBrief } from './venue-sectors.js';
import { features, themes } from './venue-app-content.js';
assert.equal(new Set(venueSectors.map(p => p.id)).size, venueSectors.length);
for (const profile of venueSectors) {
  assert.equal(sectorForType(profile.type.toUpperCase()), profile);
  for (const alias of profile.aliases || []) assert.equal(sectorForType(alias), profile);
  assert(profile.type.length <= 60, 'Type must fit existing database validation');
  assert(themes.includes(profile.theme));
  assert(existsSync(profile.image));
  for (const key of [...profile.keys, ...Object.keys(profile.labels)]) assert(Object.hasOwn(features, key), `${profile.id}: unsupported persisted feature ${key}`);
  const brief = sectorBrief(profile, 'Example venue', 'Coventry', 'More enquiries');
  assert(brief.includes(profile.type) && brief.includes('More enquiries'));
  assert(brief.length <= 1200, 'AI brief must fit builder input');
  assert(brief.includes('Do not invent'));
}
assert.equal(sectorForType('A custom organisation'), undefined);
assert.equal(featureLabel('A custom organisation', 'events', 'What’s On'), 'What’s On');
assert.equal(featureLabel('Sports club', 'events', 'What’s On'), 'Fixtures & Events');
assert.equal(featureLabel('Cafe', 'rewards', 'Member Rewards'), 'Customer Rewards');
// Render with a small DOM stand-in to verify actual headings, asset selection and safe text.
class Element {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; }
  setAttribute(k, v) { this.attrs[k] = v; }
  append(...children) { this.children.push(...children); }
  addEventListener() {}
}
globalThis.document = { createElement: tag => new Element(tag) };
const { renderVenue, blankApp } = await import('./venue-app-content.js');
const walk = node => node instanceof Element ? [node, ...node.children.flatMap(walk)] : [];
for (const profile of venueSectors) {
  const app = { ...blankApp, type: profile.type, name: '<script>Example</script>', features: Object.fromEntries(profile.keys.map(k => [k, [{ title: 'Example', detail: 'Details', url: '' }]])) };
  const nodes = walk(renderVenue(app, { preview: true }));
  for (const key of profile.keys) assert(nodes.some(n => n.tag === 'h3' && n.children.includes(featureLabel(profile.type, key, features[key].label))));
  assert(nodes.some(n => n.tag === 'img' && n.attrs.src === profile.image));
  assert(!nodes.some(n => n.tag === 'script'));
}
console.log(`PASS: ${venueSectors.length} venue profiles, existing schema compatibility, aliases, AI briefs and rendered headings/assets`);
