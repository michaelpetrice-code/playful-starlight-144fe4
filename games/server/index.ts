import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.119.2';
import {freshGame,turnGame,playerView} from '../turn-games.mjs';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method==='GET')return response({available:true,kinds:['noughts','connect','reversi','battleships','darts301','darts501','pool','snooker'],mode:'server-validated turns',refresh:'polling'});
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>4096)return response({error:'Request too large'},413);
  const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))return response({error:'Sign in first'},401);
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.getUser(auth.slice(7));if(error||!data.user)return response({error:'Sign in first'},401);
  const actor=data.user.id,raw=await req.text();if(raw.length>4096)return response({error:'Request too large'},413);const input=JSON.parse(raw);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const call=async(action:string,payload:unknown={})=>{const {data,error}=await db.rpc('tl_arcade_service',{action,p_actor:actor,payload});if(error)throw Error(error.message);return data;};
  if(input.action==='list')return response(await call('list'));
  let result;
  if(input.action==='create')result=await call('create',{kind:input.kind,state:freshGame(input.kind)});
  else if(input.action==='join')result=await call('join',{id:input.id});
  else if(input.action==='get')result=await call('get',{id:input.id});
  else if(input.action==='move'){
   const current=(await call('get',{id:input.id})).match;if(current.status!=='playing')throw Error('Match is not playing');
   if(!Number.isInteger(input.version)||input.version!==current.version)throw Error('Outdated match state');
   const slot=actor===current.host?0:1;const next=turnGame(current.state,slot,input.move||{});
   result=await call('commit',{id:input.id,version:input.version,state:next});
  }else throw Error('Unknown game action');
  const m=result.match,slot=actor===m.host?0:1;
  // Opponent fleets never reach a player, including after finish. No profile data is returned.
  return response({match:{id:m.id,kind:m.kind,status:m.status,version:m.version,slot,updated_at:m.updated_at,state:playerView(m.state,slot)}});
 }catch(error){return response({error:error instanceof Error?error.message:'Game request failed'},400);}
});
