import test from 'node:test';
import assert from 'node:assert/strict';
import {mountFootball} from './hub.js';
import {initialDemo} from './demo.mjs';

function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}
function rootFixture(){
 const root={isConnected:true,className:'',nodes:[],html:'',querySelector:()=>null};
 Object.defineProperty(root,'innerHTML',{get:()=>root.html,set:html=>{
  root.html=html;root.nodes=[];
  for(const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){
   const attrs=m[1],dataset={};for(const a of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g))dataset[a[1]]=a[2];
   root.nodes.push({kind:'button',dataset,disabled:/\bdisabled\b/.test(attrs),label:m[2]});
  }
  for(const m of html.matchAll(/<form\b[^>]*data-form="([^"]*)"[\s\S]*?<\/form>/g))root.nodes.push({kind:'form',dataset:{form:m[1]},fields:[],addEventListener(){},querySelector:()=>null});
 }});
 root.querySelectorAll=selector=>selector==='form'?root.nodes.filter(n=>n.kind==='form'):root.nodes.filter(n=>Object.keys(n.dataset).some(k=>selector===`[data-${k}]`));
 return root;
}
async function environment(run){
 const saved={};for(const key of ['location','localStorage','sessionStorage','document','window','setInterval','FormData'])saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);
 Object.assign(globalThis,{window:{},location:new URL('https://example.com/football.html'),localStorage:storage(),sessionStorage:storage(),document:{body:{classList:{remove(){},toggle(){}}}},setInterval:()=>0,FormData:class{constructor(form){this.form=form;}*[Symbol.iterator](){yield* this.form.fields;}}});
 try{await run();}finally{for(const [key,desc] of Object.entries(saved))desc?Object.defineProperty(globalThis,key,desc):delete globalThis[key];}
}
test('guest entry shows free registration, sign in and working rules navigation',()=>environment(async()=>{
 const root=rootFixture();await mountFootball(root);
 assert.match(root.html,/Create your free account/);assert.match(root.html,/section=football&amp;register=1/);
 root.nodes.find(n=>n.dataset.pane==='Rules').onclick();
 assert.match(root.html,/How Last Man Standing works/);assert.match(root.html,/missing pick/);assert.match(root.html,/sample league/);
}));
test('saving and changing a pick remains possible without waiting for refresh',()=>environment(async()=>{
 const root=rootFixture();await mountFootball(root);root.nodes.find(n=>n.dataset.pane==='Pick').onclick();
 const form=root.nodes.find(n=>n.dataset.form==='pick');form.fields=[['team','Arsenal']];
 await form.onsubmit({preventDefault(){}});
 assert.match(root.html,/Your pick: <strong>Arsenal<\/strong>/);
 assert.equal(root.nodes.find(n=>n.label==='Save my pick').disabled,false);
 const changed=root.nodes.find(n=>n.dataset.form==='pick');changed.fields=[['team','Chelsea']];
 await changed.onsubmit({preventDefault(){}});
 assert.match(root.html,/Your pick: <strong>Chelsea<\/strong>/);
}));
test('new organisers see setup guidance and only supported manual score statuses',()=>environment(async()=>{
 const league={...initialDemo(),id:'league',owner:'owner',fixtures:[],members:[{user_id:'owner',name:'Owner',role:'owner',approved:true,active:true}]};
 const sb={rpc:async (_name,{action})=>({data:action==='list'?{leagues:[{id:'league',name:league.name}]}:{league}})};
 const root=rootFixture();await mountFootball(root,{sb,user:{id:'owner'}});
 assert.match(root.html,/Get your league ready/);root.nodes.find(n=>n.dataset.action==='setup').onclick();
 assert.match(root.html,/League control/);
 league.fixtures=[{id:'1',home:'A',away:'B',status:'NS'}];
 root.nodes.find(n=>n.dataset.pane==='Manage').onclick();
 assert.doesNotMatch(root.html,/<option[^>]*>HT<\/option>/);
}));

test('an invitation opens the join form even when a member already has a league',()=>environment(async()=>{
 location.search='?football-invite=12345678-1234-1234-1234-123456789012';
 const league={...initialDemo(),id:'existing',members:[{user_id:'member',name:'Member',role:'player',approved:true,active:true}]};
 const sb={rpc:async (_name,{action})=>({data:action==='list'?{leagues:[{id:'existing',name:'Existing league'}]}:{league}})};
 const root=rootFixture();await mountFootball(root,{sb,user:{id:'member'}});
 assert.match(root.html,/Request to join/);assert.match(root.html,/12345678-1234-1234-1234-123456789012/);
}));
