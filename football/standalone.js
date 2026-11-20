import {mountFootball} from './hub.js';
const root=document.getElementById('football-hub');
const config=window.LADS_CONFIG||{};
let sb=null,user=null;
try{
 if(config.supabaseUrl&&config.supabaseAnonKey){
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.119.2');
  sb=createClient(config.supabaseUrl,config.supabaseAnonKey);
  const result=await sb.auth.getUser();user=result.data?.user||null;
 }
 const slug=new URLSearchParams(location.search).get('league');
 await mountFootball(root,{sb,user,publicSlug:slug});
}catch{root.textContent='The football page could not load. Please return to The Local and try again.';}
