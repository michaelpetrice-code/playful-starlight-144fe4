// Shared provider discovery for DJ and both race-night modes.
// External links are discovery fallbacks, not verified playable streams.
export const providers = Object.freeze({
 music: [
  ['YouTube', 'https://www.youtube.com/results', 'search_query'],
  ['Audius', 'https://audius.co/search', 'query'],
  ['SoundCloud', 'https://soundcloud.com/search/sounds', 'q'],
  ['Internet Archive', 'https://archive.org/search', 'query']
 ],
 horse: [
  ['At The Races', 'https://www.attheraces.com/replays'],
  ['Racing TV', 'https://www.racingtv.com/watch/replays'],
  ['YouTube', 'https://www.youtube.com/results', 'search_query']
 ],
 dog: [
  ['At The Races Greyhounds', 'https://greyhounds.attheraces.com/'],
  ['GBGB', 'https://www.gbgb.org.uk/racing/'],
  ['YouTube', 'https://www.youtube.com/results', 'search_query']
 ]
});
export function sourceLinks(kind, query='') {
 if (!Object.hasOwn(providers,kind)) throw new Error('Unknown entertainment type');
 const term = [String(query).trim(), kind==='horse'?'horse race replay':kind==='dog'?'greyhound race replay':''].filter(Boolean).join(' ');
 return providers[kind].map(([name,base,key])=>{
  const url=new URL(base); if(key && term)url.searchParams.set(key,term);
  return {name,url:url.href,mode:'external',verified:false};
 });
}
export async function firstAvailable(candidates, probe, {signal,timeout=5000}={}) {
 for(const candidate of candidates){
  if(signal?.aborted)throw signal.reason;
  const controller=new AbortController();
  const abort=()=>controller.abort(signal.reason);
  signal?.addEventListener('abort',abort,{once:true});
  let timer;
  try{
   const result=await Promise.race([
    Promise.resolve().then(()=>probe(candidate,controller.signal)),
    new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Provider timeout'));},timeout);controller.signal.addEventListener('abort',()=>reject(new Error('Provider cancelled')),{once:true});})
   ]);
   if(signal?.aborted)throw signal.reason;
   if(result===true)return candidate;
  }catch(error){if(signal?.aborted)throw signal.reason;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 return null;
}
