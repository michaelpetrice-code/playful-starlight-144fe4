/**
 * Live two-account integration test.
 * Requires SUPABASE_URL, SUPABASE_ANON_KEY, PLAYER1_EMAIL, PLAYER1_PASSWORD,
 * PLAYER2_EMAIL, PLAYER2_PASSWORD. Test project only.
 * node test-two-player-v95.mjs
 */
import assert from 'node:assert/strict';
const env=process.env;
for(const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','PLAYER1_EMAIL','PLAYER1_PASSWORD','PLAYER2_EMAIL','PLAYER2_PASSWORD']){
 if(!env[key]){console.error('SKIPPED: missing '+key);process.exit(2)}
}
const base=env.SUPABASE_URL.replace(/\/$/,''),key=env.SUPABASE_ANON_KEY;
async function call(path,token,body,method='POST'){
 const r=await fetch(base+path,{method,headers:{apikey:key,Authorization:'Bearer '+(token||key),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}
 return {status:r.status,data};
}
async function login(email,password){
 const r=await call('/auth/v1/token?grant_type=password',null,{email,password});
 assert.equal(r.status,200,'login: '+JSON.stringify(r.data));return {token:r.data.access_token,id:r.data.user.id};
}
const a=await login(env.PLAYER1_EMAIL,env.PLAYER1_PASSWORD),b=await login(env.PLAYER2_EMAIL,env.PLAYER2_PASSWORD);
assert.notEqual(a.id,b.id,'Use two different users');
const create=await call('/rest/v1/rpc/local_cue_create',a.token,{p_kind:'pool'});
assert.equal(create.status,200,JSON.stringify(create.data));
const id=create.data;
const join=await call('/rest/v1/rpc/local_cue_join',b.token,{p_game:id});
assert.equal(join.status,200,JSON.stringify(join.data));
async function read(player){
 const r=await call('/rest/v1/local_cue_matches?id=eq.'+id+'&select=*',player.token,undefined,'GET');
 assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.length,1);return r.data[0];
}
const m=await read(a);assert.equal(m.status,'playing');assert.equal(m.turn_user,a.id);
const forbidden=await call('/functions/v1/cue-shot',b.token,{game:id,version:m.version,angle:0,power:7});
assert.equal(forbidden.status,409,'out-of-turn shot rejected');
const before=await read(b);assert.equal(before.version,m.version);
const shot=await call('/functions/v1/cue-shot',a.token,{game:id,version:m.version,angle:0,power:7});
assert.equal(shot.status,200,JSON.stringify(shot.data));
assert.equal(shot.data.ok,true);
const updated=await read(b);assert.equal(updated.version,m.version+1,'second user sees committed shot');
const replay=await call('/functions/v1/cue-shot',a.token,{game:id,version:m.version,angle:0,power:7});
assert.equal(replay.status,409,'stale duplicate rejected');
console.log('PASS: two authenticated users, join, RLS read, turn enforcement, authoritative shot, cross-user state, stale version rejection');
console.log('NOTE: This checks persisted synchronization, not WebSocket reconnect/latency or full rules. Match:',id);
