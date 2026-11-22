const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('secure-tables.js','utf8');
const membershipSource = source.slice(source.indexOf('async function refreshMembership('),source.indexOf('\nfunction showTab('));

for (const status of ['approved','pending','banned',null]) {
  test(`table entry: ${status || 'non-member'} gets the correct chat access`,async()=>{
    const calls = [], nodes = new Map();
    let finishHistory;
    const history = new Promise(resolve=>{finishHistory=resolve});
    const context = {
      table:{id:'table'},user:{id:'user'},role:null,membership:null,
      video:null,chatScreen:{close(){}},signedLinks:new Map(),recording:null,
      messages:[],rendered:'',
      $(id){if(!nodes.has(id))nodes.set(id,{replaceChildren(){},append(){},reset(){},focus(){calls.push('focus')},scrollIntoView(){calls.push('scroll')}});return nodes.get(id)},
      sb:{from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:status?{status,role:'member'}:null}}}}},
      check:r=>r.data,admin:()=>false,button:()=>({}),stopRecorder(){},clearReply(){},disconnectLive(){},updateShortcutLink(){},
      showTab:tab=>calls.push(tab),connectLive:()=>calls.push('live'),connectPresence:()=>calls.push('presence'),
      loadPosts:()=>{calls.push('history');return history},loadEvents:()=>{throw Error('Plans must load only when opened')},
    };
    vm.createContext(context);
    const entry = vm.runInContext(membershipSource+';refreshMembership("table",true)',context);
    await new Promise(resolve=>setImmediate(resolve));
    if(status==='approved') {
      assert.equal(nodes.get('memberArea').hidden,false);
      assert.deepEqual(calls,['feed','focus','scroll','live','presence','history']);
    } else {
      assert.equal(nodes.get('memberArea').hidden,true);
      assert.deepEqual(calls,[]);
    }
    finishHistory();await entry;
  });
}
