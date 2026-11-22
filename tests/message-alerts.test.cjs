const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const moduleFrom=path=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path)).toString('base64'));
test('message alerts exclude own, hidden and other recipient messages, and stop after logout',async()=>{
 const {watchMessageAlerts}=await moduleFrom('message-alerts.js');const handlers={},received=[];let removed=false;
 const channel={on(event,filter,fn){handlers[filter.table]=fn;return this},subscribe(){}};
 const stop=watchMessageAlerts({channel:()=>channel,removeChannel:()=>{removed=true}},'me',x=>received.push(x));
 handlers.tl_table_posts({new:{id:'1',user_id:'other'}});
 handlers.tl_table_posts({new:{id:'2',user_id:'me'}});
 handlers.tl_table_posts({new:{id:'3',user_id:'other',hidden:true}});
 handlers.market_messages({new:{id:'4',sender_id:'other',recipient_id:'someone'}});
 handlers.market_messages({new:{id:'5',sender_id:'other',recipient_id:'me'}});
 handlers.local_member_notices({new:{id:'6',user_id:'me'}});
 handlers.local_member_notices({new:{id:'7',user_id:'someone'}});
 assert.deepEqual(received.map(x=>x.id),['1','5','6']);stop();assert(removed);
 handlers.private_chat_messages({new:{id:'8',sender_id:'other'}});assert.equal(received.length,3);
});
test('notification permission can be requested before provider setup without claiming delivery is live',async()=>{
 const {createPushClient}=await moduleFrom('push-notifications.js');let asked=0;
 const win={Notification:{requestPermission:async()=>{asked++;return 'granted'}},navigator:{serviceWorker:{}}};
 const client=createPushClient(win,{},{});assert.equal(await client.init(),null);assert.equal(asked,0);
 const text=await client.enable('me');assert.equal(asked,1);assert.match(text,/delivery is being connected/);
 await assert.rejects(client.enable(null),/Sign in/);
});
test('denied permission remains denied and never reports enabled',async()=>{
 const {createPushClient}=await moduleFrom('push-notifications.js');const client=createPushClient({Notification:{requestPermission:async()=>'denied'},navigator:{serviceWorker:{}}},{},{});
 await assert.rejects(client.enable('me'),/blocked/);
});
test('SDK initializes once, associates the signed-in member and opts out on logout',async()=>{
 const {createPushClient}=await moduleFrom('push-notifications.js');let init=0,requested=0;const calls=[];
 const sdk={init:async()=>{init++},login:async id=>calls.push('login:'+id),logout:async()=>calls.push('logout'),Notifications:{isPushSupported:()=>true,permissionNative:'granted'},User:{PushSubscription:{optedIn:true,optIn:async()=>{requested++},optOut:async()=>calls.push('optOut')}}};
 const win={setTimeout,clearTimeout,OneSignalDeferred:{push:fn=>fn(sdk)}};const doc={querySelector:()=>({})};const client=createPushClient(win,doc,{oneSignalAppId:'app'});
 await Promise.all([client.init(),client.init()]);assert.equal(init,1);assert.equal(requested,0);
 assert.match(await client.enable('me'),/enabled/);assert.equal(requested,1);await client.sync(null);assert.deepEqual(calls,['login:me','optOut','logout']);
});
