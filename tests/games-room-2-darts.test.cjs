/* Focused rules checks; no browser or third-party packages required. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','realistic-engines-v192.js'),'utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'Expected darts rules function not found: '+start);return source.slice(a,b)}
const apply=new Function(extract('function apply(current,h){','function botVisit()')+';return apply')();
const order=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const hit=new Function('order',extract('function hit(x,y){','function apply(current,h)')+';return hit')(order);
test('Darts: bust on overshoot, one remaining, or non-double finish',()=>{
 assert.deepEqual(apply(20,{points:25,double:false}),{score:20,bust:true,win:false});
 assert.deepEqual(apply(20,{points:19,double:false}),{score:20,bust:true,win:false});
 assert.deepEqual(apply(20,{points:20,double:false}),{score:20,bust:true,win:false});
});
test('Darts: double and inner bull finish legally',()=>{
 assert.deepEqual(apply(40,{points:40,double:true}),{score:0,bust:false,win:true});
 assert.deepEqual(apply(50,{points:50,double:true}),{score:0,bust:false,win:true});
 assert.deepEqual(apply(501,{points:60,double:false}),{score:441,bust:false,win:false});
});
test('Darts: rings score single, treble, double and bull correctly',()=>{
 assert.equal(hit(280,280).points,50);
 assert.equal(hit(280,280-28).points,25);
 assert.equal(hit(280,280-110).points,60);
 assert.equal(hit(280,280-190).points,40);
 assert.equal(hit(280,280-145).points,20);
 assert.equal(hit(280,280-240).points,0);
});
