import test from 'node:test';import assert from 'node:assert/strict';import {validatePick,verdict,settle} from './rules.mjs';
const fixtures=[{home:'A',away:'B',status:'FT',home_score:2,away_score:1},{home:'C',away:'D',status:'FT',home_score:0,away_score:0}];
const args={fixtures,deadline:'2030-01-01T00:00:00Z',now:0};
test('deadline is exclusive and eliminated players cannot pick',()=>{assert.equal(validatePick({...args,team:'A'}),'A');assert.throws(()=>validatePick({...args,team:'A',now:Date.parse(args.deadline)}));assert.throws(()=>validatePick({...args,team:'A',active:false}));});
test('used teams and teams outside the round rejected',()=>{assert.throws(()=>validatePick({...args,team:'A',used:['A']}));assert.throws(()=>validatePick({...args,team:'E'}));});
test('wins survive, draws and losses eliminate',()=>{assert.equal(verdict('A',fixtures),'through');for(const t of ['B','C','D'])assert.equal(verdict(t,fixtures),'out');});
test('postponements, live scores and incomplete final results cannot settle',()=>{for(const f of [{...fixtures[0],status:'POSTPONED'},{...fixtures[0],status:'LIVE'},{...fixtures[0],home_score:null}])assert.equal(verdict('A',[f]),'pending');assert.throws(()=>settle([{user_id:'x',active:true}],[{user_id:'x',team:'A'}],[{...fixtures[0],status:'POSTPONED'}]));});
test('missing picks eliminate and last survivor wins',()=>{const r=settle([{user_id:'x',active:true},{user_id:'y',active:true}],[{user_id:'x',team:'A'}],fixtures);assert.equal(r.winner,'x');assert.equal(r.results[1].result,'out');});
test('all-out has no invented winner',()=>{const r=settle([{user_id:'x',active:true}],[{user_id:'x',team:'B'}],fixtures);assert.equal(r.allOut,true);assert.equal(r.winner,null);});
