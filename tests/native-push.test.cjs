const {test}=require('node:test');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const {resolve}=require('node:path');
const from=path=>import(pathToFileURL(resolve(path)).href);
function setup(permission='granted'){
 let stored=null,accepted=permission,subscribes=0;const calls=[];
 const device={endpoint:'https://fcm.googleapis.com/fcm/send/device',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}}},async unsubscribe(){calls.push('unsubscribe');stored=null;return true}};
 const service={active:{},pushManager:{getSubscription:async()=>stored,subscribe:async()=>{subscribes++;stored=device;return device}}};
 const win={Notification:{get permission(){return accepted},requestPermission:async()=>{calls.push('permission');return permission}},PushManager:function(){},navigator:{serviceWorker:{register:async()=>service,getRegistration:async()=>service}},atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout,fetch:async(url,options)=>{
  const action=new URL(url).searchParams.get('action');calls.push(action);
  if(action==='public-key')return {ok:true,json:async()=>({publicKey:Buffer.alloc(65).toString('base64url')})};
  assert.equal(options.headers.Authorization,'Bearer token');const body=JSON.parse(options.body);
  if(action==='register')assert.equal(body.subscription.endpoint,device.endpoint);
  return {ok:true,json:async()=>action==='test'?{sent:1,failed:0}:{enabled:true}};
 }};
 const storage=new Map();win.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const client={auth:{getSession:async()=>({data:{session:{access_token:'token'}}})}};
 return {win,client,calls,service,get subscribes(){return subscribes}};
}
test('native push binds a real subscription before reporting enabled',async()=>{
 const {createNativePushClient}=await from('native-push.js');const s=setup();const c=createNativePushClient(s.win,{supabaseUrl:'https://example.supabase.co'},s.client);
 assert.match(await c.enable('me'),/enabled/);assert.equal(s.subscribes,1);assert(s.calls.indexOf('permission')<s.calls.indexOf('register'));assert((await c.init()).User.PushSubscription.optedIn);
 await c.sync('me');assert.equal(s.subscribes,1);assert.match(await c.test('me'),/Test notification sent/);
 await c.sync(null);assert(s.calls.includes('unregister'));assert(s.calls.includes('unsubscribe'));assert.equal((await c.init()).User.PushSubscription.optedIn,false);
});
test('denied native permission never creates a subscription',async()=>{
 const {createNativePushClient}=await from('native-push.js');const s=setup('denied');const c=createNativePushClient(s.win,{supabaseUrl:'https://example.supabase.co'},s.client);
 await assert.rejects(c.enable('me'),/blocked/);assert.equal(s.subscribes,0);assert(!s.calls.includes('register'));
});
test('a failed subscription save is never reported as enabled',async()=>{
 const {createNativePushClient}=await from('native-push.js');const s=setup();const original=s.win.fetch;
 s.win.fetch=async(url,options)=>new URL(url).searchParams.get('action')==='register'?{ok:false,status:500,json:async()=>({error:'Try again'})}:original(url,options);
 const c=createNativePushClient(s.win,{supabaseUrl:'https://example.supabase.co'},s.client);await assert.rejects(c.enable('me'),/Try again/);assert.equal((await c.init()).User.PushSubscription.optedIn,false);
});
test('server push accepts browser endpoints and refuses SSRF targets',async()=>{
 const {validSubscription}=await from('server/member-push/core.mjs');const make=endpoint=>({endpoint,keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}});
 assert(validSubscription(make('https://fcm.googleapis.com/fcm/send/key')));
 for(const url of ['http://fcm.googleapis.com/key','https://127.0.0.1/key','https://fcm.googleapis.com.evil.test/key','https://user@fcm.googleapis.com/key','https://fcm.googleapis.com:444/key'])assert(!validSubscription(make(url)));
 assert(!validSubscription({endpoint:'https://fcm.googleapis.com/key',keys:{p256dh:'short',auth:'short'}}));
});
test('only current recipients receive alerts; table mutes are enforced',async()=>{
 const {permittedRecipient,allowsNotification,messageNotification}=await from('server/member-push/core.mjs');const message={id:'m',table_id:'t',user_id:'sender'};
 assert(permittedRecipient('tl_table_posts',message,{user_id:'recipient',table_id:'t',status:'approved'}));
 for(const status of ['pending','banned'])assert(!permittedRecipient('tl_table_posts',message,{user_id:'recipient',table_id:'t',status}));
 assert(!permittedRecipient('tl_table_posts',message,{user_id:'sender',table_id:'t',status:'approved'}));
 assert(!allowsNotification({muted_tables:['t']},'tl_table_posts','t'));assert(!allowsNotification({enabled:false},'market_messages'));
 assert(permittedRecipient('market_messages',{sender_id:'s',recipient_id:'r'},{user_id:'r'}));assert(!permittedRecipient('market_messages',{sender_id:'s',recipient_id:'r'},{user_id:'other'}));
 const payload=messageNotification('tl_table_posts',{...message,body:'PRIVATE CONTENT'},{venue_id:'v'});assert(!JSON.stringify(payload).includes('PRIVATE CONTENT'));assert.match(payload.url,/table=t/);
});

test('disabling a device remains disabled when the app next syncs',async()=>{
 const {createNativePushClient}=await from('native-push.js');const s=setup();const c=createNativePushClient(s.win,{supabaseUrl:'https://example.supabase.co'},s.client);
 await c.enable('me');await c.disable();const before=s.subscribes;await c.sync('me');assert.equal(s.subscribes,before);assert.equal((await c.init()).User.PushSubscription.optedIn,false);
 await c.enable('me');assert.equal(s.subscribes,before+1);
});

test('opting out while registration is pending prevents a late subscription from re-enabling alerts',async()=>{
 const {createNativePushClient}=await from('native-push.js');const s=setup();let finish;
 const subscribe=s.service.pushManager.subscribe;s.service.pushManager.subscribe=async()=>{await new Promise(resolve=>finish=resolve);return subscribe()};
 const c=createNativePushClient(s.win,{supabaseUrl:'https://example.supabase.co'},s.client);const pending=c.sync('me');
 while(!finish)await new Promise(resolve=>setImmediate(resolve));
 await c.disable();finish();await pending;assert.equal((await c.init()).User.PushSubscription.optedIn,false);assert(!s.calls.includes('register'));assert(s.calls.includes('unsubscribe'));
});

 test('allowed browser permission reconnects automatically without prompting',async()=>{
 const {createNativePushClient}=await from('native-push.js');const s=setup();const c=createNativePushClient(s.win,{supabaseUrl:'https://example.supabase.co'},s.client);
 await c.sync('me');assert((await c.init()).User.PushSubscription.optedIn);assert(!s.calls.includes('permission'));
 });
 test('connection failure gives a useful recovery address rather than a raw fetch error',async()=>{
 const {createNativePushClient}=await from('native-push.js');const s=setup();s.win.fetch=async()=>{throw new TypeError('Failed to fetch')};const c=createNativePushClient(s.win,{supabaseUrl:'https://example.supabase.co'},s.client);
 await assert.rejects(c.enable('me'),/https:\/\/thelocal.me.uk/);assert(!(await c.init()).User.PushSubscription.optedIn);
 });
