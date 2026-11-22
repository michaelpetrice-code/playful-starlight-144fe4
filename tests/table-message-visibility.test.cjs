const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('secure-tables.js','utf8');
const render=source.slice(source.indexOf('async function renderChat('),source.indexOf('\nfunction messageExcerpt'));
function setup(){
 const list={scrollHeight:900,clientHeight:200,scrollTop:0,replaceChildren(fragment){this.fragment=fragment}};
 const node=()=>({append(){},dataset:{},querySelector(){return null}});
 const context={table:{id:'t'},role:'member',user:{id:'u'},messages:[{id:'m',user_id:'u',body:'Hello',created_at:'2026-11-22',hidden:false}],seats:[],reactions:[],memberPhotos:new Map([['u','photo.jpg']]),signedLinks:new Map(),rendered:'',
 $:id=>id==='postList'?list:{value:''},element:node,memberAvatar:node,seatName:()=> 'You',button:node,admin:()=>false,
 document:{createDocumentFragment:()=>({children:[],append(n){this.children.push(n)}})}};
 vm.createContext(context);vm.runInContext(render,context);return {context,list};
}
test('sent bubbles render when member photos are present',async()=>{const {context,list}=setup();await context.renderChat('t',true);assert.equal(list.fragment.children.length,1);assert.equal(list.scrollTop,900)});
test('sending still jumps to latest when realtime already rendered it',async()=>{const {context,list}=setup();await context.renderChat('t');list.scrollTop=0;await context.renderChat('t',true);assert.equal(list.scrollTop,900)});
test('background updates preserve position while reading older messages',async()=>{const {context,list}=setup();list.scrollTop=40;await context.renderChat('t');assert.equal(list.scrollTop,40)});
