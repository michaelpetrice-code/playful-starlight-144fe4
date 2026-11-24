(function(root){
'use strict';
const local=new Map();
const photos={'kevin macleod':'artwork/kevin-macleod.jpg','chris zabriskie':'artwork/chris-zabriskie.jpg'};
const clean=value=>typeof value==='string'?value.replace(/[\x00-\x1f]/g,'').trim().slice(0,140):'';
function image(track){return local.get(track?.id)||photos[(track?.artist||'').trim().toLowerCase()]||null;}
function readFile(file,id){return new Promise(resolve=>{
 if(!root.jsmediatags){resolve({});return;}let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>finish({}),3000);
 try{new root.jsmediatags.Reader(file).setTagsToRead(['title','artist','picture']).read({onSuccess(result){if(done)return;const tags=result.tags||{};const picture=tags.picture;const bytes=picture?.data;let mime='';if(bytes?.length>0&&bytes.length<=1024*1024){if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';else if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)mime='image/png';if(mime){if(local.has(id))URL.revokeObjectURL(local.get(id));local.set(id,URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:mime})));}}finish({title:clean(tags.title),artist:clean(tags.artist)});},onError(){finish({});}});}catch{finish({});}
});}
root.addEventListener('pagehide',()=>{for(const url of local.values())URL.revokeObjectURL(url);local.clear();});
root.LocalDJArtwork={image,readFile};
})(window);
