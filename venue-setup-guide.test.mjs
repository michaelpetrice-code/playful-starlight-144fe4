import test from 'node:test';import assert from 'node:assert/strict';import {venueSetupGuide} from './venue-setup-guide.mjs';
test('free setup guide tailors sections without inventing operational facts',()=>{
 const r=venueSetupGuide({name:'Example Club',type:'Sports club',town:'Coventry',prompt:'Promote our function room and photos'});
 assert.equal(r.theme,'navy');assert.ok(r.features.includes('room'));assert.ok(r.features.includes('gallery'));assert.match(r.welcome,/Example Club in Coventry/);assert.doesNotMatch(r.welcome,/£|Monday|19:00/);assert.match(r.note,/No AI service is contacted/);
});
test('guide defaults to a supported venue and bounds user-entered names',()=>{
 const r=venueSetupGuide({name:'a'.repeat(300),type:'unknown',prompt:'events and contact'});assert.ok(r.welcome.length<700);assert.ok(r.features.includes('contact'));assert.ok(new Set(r.features).size===r.features.length);
});
