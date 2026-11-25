import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,raceFrame} from '../simulation.mjs';
for(const [kind,count] of [['horse',8],['dog',6]]) test(kind+' simulation',()=>{
 let i=0;const race=createSimulation(kind,()=>i++/count);
 assert.equal(race.runners.length,count);
 assert.equal(raceFrame(race,0).results.length,0);
 assert.equal(raceFrame(race,0).finished,false);
 const end=raceFrame(race,race.duration);
 assert.equal(end.finished,true);
 assert.deepEqual(end.results,Array.from({length:count},(_,i)=>i+1));
 assert.ok(end.runners.every(r=>r.progress===1));
});
test('reject invalid input',()=>{assert.throws(()=>createSimulation('other'));assert.throws(()=>createSimulation('dog',()=>1));});
