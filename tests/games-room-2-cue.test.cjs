'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','realistic-engines-v192.js'),'utf8');
const context={window:{}};vm.runInNewContext(source,context);
const rules=context.window.TL192.rules;
const ball=(x,y,vx=0,vy=0,alive=true)=>({x,y,vx,vy,alive});
test('cue collision: approaching balls transfer momentum and separate',()=>{
 const a=ball(100,100,5,0),b=ball(123,100);
 assert.equal(rules.collide(a,b,12),true);
 assert.ok(a.vx<5&&b.vx>0,'momentum transferred');
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=23.999);
});
test('cue collision: distant or potted balls are ignored',()=>{
 const a=ball(100,100,2,0),b=ball(150,100);
 assert.equal(rules.collide(a,b,12),false);
 b.x=110;b.alive=false;assert.equal(rules.collide(a,b,12),false);
});
test('pocket detection covers corners and middle pockets',()=>{
 assert.equal(rules.pocket({x:37,y:37},840,450),true);
 assert.equal(rules.pocket({x:420,y:27},840,450),true);
 assert.equal(rules.pocket({x:420,y:225},840,450),false);
});
test('shot outcome identifies scratch and object balls',()=>{
 const outcome=rules.outcome([0,1,3],false);
 assert.equal(outcome.foul,true);assert.equal(outcome.objectBalls,2);
 assert.equal(Array.from(outcome.respots).join(','),'0');
});
test('snooker shot outcome identifies colour respots',()=>{
 const outcome=rules.outcome([1,2,7],true);
 assert.equal(outcome.foul,false);assert.equal(outcome.objectBalls,3);
 assert.equal(Array.from(outcome.respots).join(','),'2,7');
});

test('first contact: legal target, wrong target, and miss',()=>{
 assert.equal(rules.firstContactFoul(1,[1]),false);
 assert.equal(rules.firstContactFoul(2,[1]),true);
 assert.equal(rules.firstContactFoul(null,[1]),true);
});
test('shot outcome distinguishes scratch from no-contact foul',()=>{
 const scratch=rules.outcome([0],false,1),miss=rules.outcome([],false,null);
 assert.equal(scratch.foul,true);assert.equal(scratch.miss,false);
 assert.equal(miss.foul,false);assert.equal(miss.miss,true);
});
