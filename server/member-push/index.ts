import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import webPush from 'npm:web-push@3.6.7';
import {validSubscription,permittedRecipient,allowsNotification,messageNotification} from './core.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://thelocal.me.uk','https://www.thelocal.me.uk','https://playful-starlight-144fe4.netlify.app','https://tourmaline-chebakia-f1e2ac.netlify.app']);
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
async function result(query:any){const r=await query;if(r.error)throw new Error('Database operation failed');return r.data;}
async function hash(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
async function equal(a:string,b:string){return a.length>0 && (await hash(a))===(await hash(b));}
async function rows(factory:()=>any){const all:any[]=[];for(let offset=0;;offset+=1000){const batch=await result(factory().range(offset,offset+999));all.push(...batch);if(batch.length<1000)return all;}}
async function audience(job:any){
 const fields:any={tl_table_posts:'id,table_id,user_id,hidden',private_chat_messages:'id,room_id,sender_id',market_messages:'id,recipient_id,sender_id',local_member_notices:'id,user_id'};
 if(!fields[job.source])return null;
 const message=await result(db.from(job.source).select(fields[job.source]).eq('id',job.message_id).maybeSingle());
 if(!message || message.hidden)return null;
 let members:any[]=[],table=null;
 if(job.source==='tl_table_posts'){
  table=await result(db.from('tl_tables').select('id,venue_id').eq('id',message.table_id).maybeSingle());
  if(!table)return null;
  members=await rows(()=>db.from('tl_table_members').select('user_id,table_id,status').eq('table_id',message.table_id).eq('status','approved').order('user_id'));
 }else if(job.source==='private_chat_messages')members=await rows(()=>db.from('private_chat_members').select('user_id,room_id').eq('room_id',message.room_id).order('user_id'));
 else members=[{user_id:job.source==='market_messages'?message.recipient_id:message.user_id}];
 return {message,table,users:[...new Set(members.filter(m=>permittedRecipient(job.source,message,m)).map(m=>m.user_id))]};
}
async function send(subscription:any,payload:any,cfg:any){
 if(!validSubscription(subscription))throw new Error('Invalid subscription');
 const details=webPush.generateRequestDetails(subscription,JSON.stringify(payload),{TTL:86400,urgency:'normal',vapidDetails:{subject:'https://thelocal.me.uk',publicKey:cfg.local_push_vapid_public,privateKey:cfg.local_push_vapid_private}});
 const response=await fetch(details.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok){const error:any=new Error('Push provider returned '+response.status);error.status=response.status;throw error;}
}
async function sendToUser(userId:string,payload:any,cfg:any,job?:any,tableId?:string){
 const pref=await result(db.from('local_push_preferences').select('enabled,muted_tables').eq('user_id',userId).maybeSingle());
 if(!allowsNotification(pref,job?.source,tableId))return {sent:0,failed:0};
 const devices=await rows(()=>db.from('local_push_subscriptions').select('endpoint,subscription').eq('user_id',userId).order('endpoint'));
 let sent=0,failed=0;
 for(const device of devices){
  const fingerprint=await hash(device.endpoint);
  if(job){const previous=await result(db.from('local_push_deliveries').select('job_id').eq('job_id',job.id).eq('endpoint_hash',fingerprint).maybeSingle());if(previous)continue;}
  try{
   // Check that this device has not changed accounts since the audience was resolved.
   const bound=await result(db.from('local_push_subscriptions').select('user_id').eq('endpoint',device.endpoint).maybeSingle());
   if(bound?.user_id!==userId)continue;
   await send(device.subscription,payload,cfg);sent++;
   if(job)await result(db.from('local_push_deliveries').upsert({job_id:job.id,endpoint_hash:fingerprint}));
  }catch(error:any){
   if(error.status===404 || error.status===410 || !validSubscription(device.subscription))await result(db.from('local_push_subscriptions').delete().eq('endpoint',device.endpoint).eq('user_id',userId));
   else failed++;
  }
 }
 return {sent,failed};
}
async function dispatch(cfg:any){
 const jobs=await result(db.rpc('local_push_claim_jobs'));let sent=0,failed=0;
 for(const job of jobs){
  try{
   const target=await audience(job);let errors=0;
   if(target){const payload=messageNotification(job.source,target.message,target.table);
    for(const member of target.users){const delivered=await sendToUser(String(member),payload,cfg,job,target.message.table_id);sent+=delivered.sent;errors+=delivered.failed;}
   }
   if(errors)throw new Error('Push delivery will be retried');
   await result(db.from('local_push_jobs').update({status:'done',lease_until:null,last_error:null}).eq('id',job.id));
  }catch{
   failed++;
   await result(db.from('local_push_jobs').update({status:job.attempts>=5?'failed':'pending',lease_until:null,available_at:new Date(Date.now()+Math.min(300,15*2**job.attempts)*1000).toISOString(),last_error:'Message delivery failed; inspect provider configuration or retry.'}).eq('id',job.id));
  }
 }
 return {processed:jobs.length,sent,failed};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');const headers:any={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin && !origins.has(origin)){console.warn('Push request rejected for origin:',origin);return new Response('Open The Local at https://thelocal.me.uk to enable alerts.',{status:403,headers});}
 if(origin)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
 const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  const action=new URL(req.url).searchParams.get('action');
  const cfg=await result(db.rpc('local_push_server_config'));
  if(!cfg.local_push_vapid_public || !cfg.local_push_vapid_private || !cfg.local_push_webhook_secret)return json({error:'Message alerts are not configured.'},503);
  if(req.method==='GET' && action==='public-key')return json({publicKey:cfg.local_push_vapid_public});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(action==='dispatch'){
   if(!await equal(req.headers.get('x-local-push-secret')||'',cfg.local_push_webhook_secret))return json({error:'Unauthorized'},401);
   return json(await dispatch(cfg));
  }
  const bearer=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!bearer)return json({error:'Sign in to manage notifications.'},401);
  const {data,error}=await db.auth.getUser(bearer);
  if(error || !data.user)return json({error:'Sign in again to manage notifications.'},401);
  const member=data.user.id;
  const raw=await req.text();if(raw.length>10000)return json({error:'Request too large'},413);
  const body=raw?JSON.parse(raw):{};
  if(action==='register'){
   if(!validSubscription(body.subscription))return json({error:'Unsupported notification subscription.'},400);
   await result(db.from('local_push_subscriptions').upsert({endpoint:body.subscription.endpoint,user_id:member,subscription:body.subscription,updated_at:new Date().toISOString()}));
   const pref=await result(db.from('local_push_preferences').select('user_id').eq('user_id',member).maybeSingle());
   if(pref)await result(db.from('local_push_preferences').update({enabled:true}).eq('user_id',member));
   else await result(db.from('local_push_preferences').insert({user_id:member}));
   return json({enabled:true});
  }
  if(action==='unregister'){
   if(typeof body.endpoint!=='string')return json({error:'A device subscription is required.'},400);
   await result(db.from('local_push_subscriptions').delete().eq('endpoint',body.endpoint).eq('user_id',member));return json({enabled:false});
  }
  if(action==='mute-table'){
   if(!uuid.test(body.table||'') || typeof body.muted!=='boolean')return json({error:'Invalid table preference'},400);
   const seat=await result(db.from('tl_table_members').select('user_id').eq('table_id',body.table).eq('user_id',member).eq('status','approved').maybeSingle());
   if(!seat)return json({error:'Table membership required'},403);
   const pref=await result(db.from('local_push_preferences').select('enabled,muted_tables').eq('user_id',member).maybeSingle());
   const muted=new Set(pref?.muted_tables||[]);if(body.muted)muted.add(body.table);else muted.delete(body.table);
   await result(db.from('local_push_preferences').upsert({user_id:member,enabled:pref?.enabled??true,muted_tables:[...muted]}));return json({muted:body.muted});
  }
  if(action==='test'){
   const response=await sendToUser(member,{title:'The Local',body:'Your message notifications are working.',url:'/index.html?section=alerts',tag:'local-notification-test'},cfg);
   return json(response,response.failed?502:response.sent?200:409);
  }
  return json({error:'Unknown notification action'},400);
 }catch{return json({error:'Message alerts could not complete the request. Please try again.'},500);}
});
