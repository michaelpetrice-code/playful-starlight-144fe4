/* Optional host-operated WebTorrent importer. Never connects during page load. */
(function(root){
 'use strict';
 const MB=1024*1024;
 function playable(files){return files.map((f,index)=>({index,name:f.name,length:f.length})).filter(f=>/\.(mp3|wav|ogg|m4a)$/i.test(f.name)&&f.length>0&&f.length<=50*MB);}
 function selection(files,indices){
  if(!Array.isArray(indices)||!indices.length||indices.length>10||new Set(indices).size!==indices.length)throw Error('Select between 1 and 10 different audio files.');
  const allowed=playable(files);const chosen=indices.map(i=>allowed.find(f=>f.index===i));
  if(chosen.some(f=>!f)||chosen.reduce((n,f)=>n+f.length,0)>100*MB)throw Error('Choose audio files below 50 MB each and 100 MB in total.');
  return chosen;
 }
 function validInput(input){
  if(input instanceof Uint8Array){if(!input.length||input.length>2*MB)throw Error('Use a .torrent file below 2 MB.');return input;}
  if(typeof input!=='string'||input.length>4096||!/^magnet:\?/i.test(input))throw Error('Paste a magnet link or choose a .torrent file.');
  const url=new URL(input);if(!/^urn:btih:(?:[a-f0-9]{40}|[a-z2-7]{32})$/i.test(url.searchParams.get('xt')||''))throw Error('Use a valid BitTorrent magnet link.');return input;
 }
 function create({loadClient=async()=> (await import('./vendor/webtorrent.min.js')).default,onStatus=()=>{},timeout=90000}={}){
  let client=null,torrent=null,cancelPending=null,generation=0;
  function stop(){generation++;const cancel=cancelPending;cancelPending=null;cancel?.(Error('P2P transfer stopped.'));const old=client;client=null;torrent=null;old?.destroy();}
  async function inspect(input,{rights=false,vpn=false,direct=false}={}){
   if(!rights)throw Error('Confirm permission to use and share these recordings.');
   if(!vpn&&!direct)throw Error('Connect your device VPN, then confirm it is active. The app cannot verify VPN protection.');
   input=validInput(input);stop();const run=generation;const Client=await loadClient();if(run!==generation)throw Error('P2P transfer stopped.');
   client=new Client({dht:false,lsd:false,maxConns:10});onStatus(direct?'Connecting directly. No VPN protection is supplied by The Local.':'Connecting to compatible peers. VPN status is host-confirmed, not verified.');
   try{return await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{reject(Error('No torrent metadata received. Try a seeded torrent or import authorised audio files.'));stop();},Math.min(timeout,45000));
    const fail=error=>{clearTimeout(timer);cancelPending=null;reject(error);};cancelPending=fail;
    client.on('error',error=>{fail(error);stop();});
    client.add(input,{deselect:true,destroyStoreOnDestroy:true,storeCacheSlots:4},item=>{
     if(run!==generation)return;clearTimeout(timer);cancelPending=null;
     if(item.files.length>500||item.length>500*MB||item.pieceLength>4*MB){fail(Error('This torrent is too large for browser import. Use a smaller music release.'));stop();return;}
     torrent=item;const files=playable(item.files);if(!files.length){fail(Error('No supported audio files below 50 MB were found.'));stop();return;}
     onStatus('Choose the audio files to download. Other files will not be selected.');resolve(files);
    });
   });}catch(error){stop();throw error;}
  }
  async function download(indices){
   if(!torrent)throw Error('Connect to a torrent first.');const selected=selection(torrent.files,indices);const item=torrent;
   try{return await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{reject(Error('Transfer timed out. Peers or browser-compatible web seeds may be unavailable.'));stop();},timeout);
    cancelPending=error=>{clearTimeout(timer);reject(error);};
    item.on('download',()=>onStatus('Downloading selected audio: '+Math.round(selected.reduce((n,f)=>n+item.files[f.index].downloaded,0)/selected.reduce((n,f)=>n+f.length,0)*100)+'%.'));
    for(const f of selected)item.files[f.index].select();
    Promise.all(selected.map(async f=>{const blob=await item.files[f.index].blob();if(blob.size!==f.length)throw Error('Incomplete audio file.');return new File([blob],f.name,{type:blob.type,lastModified:0});})).then(files=>{clearTimeout(timer);cancelPending=null;resolve(files);},error=>{clearTimeout(timer);cancelPending=null;reject(error);});
   });}finally{stop();}
  }
  return {inspect,download,stop};
 }
 const checkSupport=async()=>{const Client=(await import('./vendor/webtorrent.min.js')).default;if(!Client.WEBRTC_SUPPORT)throw Error('This browser does not support WebRTC P2P. Use authorised audio file import instead.');return true;};
 const api={create,playable,selection,validInput,checkSupport};root.LocalDJP2P=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
