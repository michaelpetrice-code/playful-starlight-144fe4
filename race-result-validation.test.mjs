import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecordedResult } from './race-result-validation.mjs';
const runners = [{id:1},{id:2},{id:3}];
const fixture = {authorized:true,sourceUrl:'https://example.org/video',resultUrl:'https://example.org/results',finishingOrder:[3,1,2]};
test('preserves recorded order and freezes settlement input',()=>{
 const result=validateRecordedResult(runners,fixture);
 assert.deepEqual(result,['3','1','2']);
 assert.ok(Object.isFrozen(result));
});
test('rejects missing authorization and provenance',()=>{
 for(const patch of [{authorized:false},{sourceUrl:''},{resultUrl:''},{sourceUrl:'http://example.org'}]) assert.throws(()=>validateRecordedResult(runners,{...fixture,...patch}));
});
test('rejects incomplete, duplicate and foreign runner results',()=>{
 for(const finishingOrder of [[1,2],[1,1,2],[1,2,4],null]) assert.throws(()=>validateRecordedResult(runners,{...fixture,finishingOrder}));
});
test('rejects ambiguous runner identifiers',()=>{
 assert.throws(()=>validateRecordedResult([{id:1},{id:'1'},{id:3}],fixture));
});
