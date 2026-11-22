const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('secure-tables.js','utf8');
const init = source.slice(source.indexOf('async function init()'),source.indexOf('\nasync function loadTables()'));
async function scenario({signedIn=true,approved=false,invalid=false}={}) {
  const nodes = new Map();
  const calls = [];
  const destination = {venue:'venue-id',table:'table-id'};
  const context = {
    phoneAlerts:{sync:async()=>null},
    linkedTable:destination, pageParams:new URLSearchParams('invite=secret'),
    location:{href:'https://example.com/secure-tables.html?venue=venue-id&table=table-id&invite=secret'},
    URL, Option:function(){}, shortcutPage:false, user:null, venues:[], role:null,
    sessionStorage:{getItem(){}}, document:{}, window:{}, parent:null,
    tableChatLink(page,base,link,extra){const url=new URL(page,base);url.search=new URLSearchParams({...link,...extra});return url},
    $(id){if(!nodes.has(id))nodes.set(id,{append(){},scrollIntoView(){calls.push('scroll')}});return nodes.get(id)},
    msg(text){calls.push(text)}, check(r){if(r.error)throw r.error;return r.data},
    sb:{auth:{async getUser(){return {data:{user:signedIn?{id:'user'}:null}}}},
      from(name){return {select(){return this},in(){return this},order(){return {data:[{id:'venue-id',name:'Venue'}]}},eq(){return this},maybeSingle(){return {data:{id:'table-id'}}}}},
      async rpc(name,args){calls.push([name,args]);return invalid?{error:{message:'Invite expired or already used'}}:{data:'table-id'}}},
    async loadTables(){},async openTable(){context.role=approved?'member':null},
    async refreshMembership(){context.role='member';calls.push('membership')},
    history:{replaceState(a,b,url){calls.push(['clean',url])}},scheduleRefresh(){},
  };
  context.parent=context.window;
  vm.createContext(context);
  await vm.runInContext(init+';init()',context);
  return {nodes,calls};
}
test('signed-out invitation retains its token and table through sign-in',async()=>{
 const {nodes,calls}=await scenario({signedIn:false});
 const url=new URL(nodes.get('tableSignIn').href);
 assert.equal(url.searchParams.get('invite'),'secret');
 assert.equal(url.searchParams.get('table'),'table-id');
 assert.equal(calls.some(Array.isArray),false);
});
test('valid invitation automatically redeems, opens chat and removes token',async()=>{
 const {calls}=await scenario();
 assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==='tl_venue_invite_accept').length,1);
 assert.ok(calls.includes('membership'));assert.ok(calls.includes('scroll'));
 assert.equal(new URL(calls.find(x=>x[0]==='clean')[1]).searchParams.has('invite'),false);
});
test('existing approved member enters without consuming another invitation',async()=>{
 const {calls}=await scenario({approved:true});
 assert.equal(calls.some(x=>Array.isArray(x)&&x[0]==='tl_venue_invite_accept'),false);
 assert.ok(calls.includes('scroll'));
});
test('rejected invitation never grants membership and shows a useful error',async()=>{
 const {calls}=await scenario({invalid:true});
 assert.equal(calls.includes('membership'),false);assert.equal(calls.includes('scroll'),false);
 assert.ok(calls.some(x=>typeof x==='string'&&x.includes('Invite expired or already used')));
});
