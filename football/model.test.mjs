import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeFeed,canAutoSettle,validateAdvice} from './service-model.mjs';
import {esc,invitationURL,publicURL,qrSVG,mentionHTML,eligibleTeams,validateLogo,playerRounds} from './model.mjs';
import {initialDemo,demoAction} from './demo.mjs';
const match={id:12,homeTeam:{id:1,name:'A'},awayTeam:{id:2,name:'B'},utcDate:'2030-01-01T12:00:00Z',status:'FINISHED',score:{fullTime:{home:2,away:1}}};
test('provider normalization preserves unknown scores and validates final scores',()=>{const [f]=normalizeFeed({matches:[match]});assert.equal(f.status,'FT');assert.equal(f.home_score,2);assert.equal(normalizeFeed({matches:[{...match,status:'POSTPONED',score:{fullTime:{home:null,away:null}}}]})[0].home_score,null);assert.throws(()=>normalizeFeed({matches:[{...match,score:{fullTime:{home:null,away:0}}}]}));assert.throws(()=>normalizeFeed({matches:[match,match]}));});
test('automatic settlement waits for final results and deadline',()=>{const state={status:'playing',deadline:'2030-01-01',members:[{user_id:'a',active:true}],picks:[{user_id:'a',team:'A'}],fixtures:normalizeFeed({matches:[match]})};assert.equal(canAutoSettle(state,0),false);assert.equal(canAutoSettle(state,Date.parse('2030-01-02')),true);state.fixtures[0].status='POSTPONED';assert.equal(canAutoSettle(state,Date.parse('2030-01-02')),false);state.picks=[];assert.equal(canAutoSettle(state,Date.parse('2030-01-02')),true);});
test('AI verdicts reject used or invented teams, duplicates and invalid explanations',()=>{assert.deepEqual(validateAdvice({picks:[{team:'A',reason:'Higher in the supplied standings.'}],note:'Uncertain'},['A']).picks[0].team,'A');for(const picks of [[{team:'B',reason:'No'}],[{team:'A',reason:'One'},{team:'A',reason:'Two'}],[]])assert.throws(()=>validateAdvice({picks},['A']));});
test('public URLs and private invitation URLs keep their different scopes',()=>{const s={slug:'crown-club',invite:'123'};assert.equal(publicURL(s,'https://example.com/index.html'),'https://example.com/football.html?league=crown-club');assert.match(invitationURL(s,'https://example.com/football.html'),/football-invite=123/);assert.doesNotMatch(publicURL(s,'https://example.com/index.html'),/123/);});
test('QR output has vector modules and escaping does not accept user markup',()=>{assert.match(qrSVG('https://example.com/football.html?league=crown'),/^<svg/);assert.match(qrSVG('https://example.com/football.html?league=crown'),/<path/);assert.equal(esc('<script>'),'&lt;script&gt;');assert.equal(mentionHTML('Hi @[A&B] <img>',[{name:'A&B'}]),'Hi <strong class="mention">@A&amp;B</strong> &lt;img&gt;');assert.equal(validateLogo('javascript:alert(1)'),false);assert.equal(validateLogo('data:image/svg+xml;base64,PHN2Zz4='),false);});
test('rollover restores the same remaining players and team history stays used',()=>{let s=initialDemo();s.rollover='replay';s.deadline=new Date(Date.now()-1000).toISOString();s.fixtures.forEach(f=>{f.status='FT';f.home_score=0;f.away_score=0;});s.picks=[{user_id:'demo-me',team:'Arsenal'}];s=demoAction(s,'settle',{});assert.equal(s.status,'round-complete');assert.equal(s.rolled_over,true);assert.equal(s.members.filter(m=>m.active).length,3);s=demoAction(s,'next',{deadline:'2030-01-01T12:00:00Z'});s.fixtures=[{home:'Arsenal',away:'Chelsea'}];assert.ok(!eligibleTeams(s,'demo-me').includes('Arsenal'));assert.equal(s.history[0].rolled_over,true);});
test('demo manual scores cannot change after settlement',()=>{let s=initialDemo();s.status='complete';assert.throws(()=>demoAction(s,'result',{fixture:'1',status:'FT',home_score:9,away_score:0}));});

test('survival statistics include the just-settled round',()=>{const s=initialDemo();s.status='complete';s.members[1].active=false;assert.equal(playerRounds(s,'demo-me'),1);assert.equal(playerRounds(s,'demo-sam'),0);});

import {sponsorHTML,sponsorURL} from './model.mjs';
test('sponsorship is disclosed and safely escaped on public pages and posters',()=>{
 assert.equal(sponsorHTML({}), '');
 assert.equal(sponsorURL('javascript:alert(1)'), '');
 assert.equal(sponsorURL('https://user:pass@example.com'), '');
 const html=sponsorHTML({sponsor_name:'<Local & Co>',sponsor_message:'<img src=x>',sponsor_url:'https://example.com'});
 assert.match(html,/Advertisement/);assert.match(html,/&lt;Local &amp; Co&gt;/);assert.match(html,/&lt;img src=x&gt;/);assert.match(html,/sponsored noopener noreferrer/);
 assert.doesNotMatch(sponsorHTML({sponsor_name:'Test',sponsor_url:'javascript:alert(1)'}),/href=/);
});

import {localGaffer} from './gaffer.mjs';
test('free form guide excludes used teams and never invents missing form',()=>{
 const s=initialDemo();assert.equal(localGaffer(s,'demo-me').picks.length,0);
 s.history=[{picks:[{user_id:'demo-me',team:'Arsenal'}],fixtures:[{home:'Arsenal',away:'Chelsea',status:'FT',home_score:0,away_score:2},{home:'Liverpool',away:'Aston Villa',status:'LIVE',home_score:9,away_score:0}]}];
 const r=localGaffer(s,'demo-me');assert.equal(r.picks[0].team,'Chelsea');assert.ok(!r.picks.some(p=>p.team==='Arsenal'));assert.ok(r.unrated.includes('Liverpool'));assert.match(r.note,/not AI/);
});
