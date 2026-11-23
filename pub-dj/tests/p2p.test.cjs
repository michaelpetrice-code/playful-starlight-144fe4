const {test}=require('node:test');const assert=require('node:assert/strict');const p2p=require('../p2p.js');
const magnet='magnet:?xt=urn:btih:'+('a'.repeat(40));
test('P2P is opt-in and requires recording permission and an explicit device VPN confirmation before loading a client',async()=>{
 let loads=0;const session=p2p.create({loadClient:async()=>{loads++;throw Error('should not load');}});
 await assert.rejects(session.inspect(magnet),/permission/);await assert.rejects(session.inspect(magnet,{rights:true}),/VPN/);assert.equal(loads,0);
 assert.throws(()=>p2p.validInput('https://example.com/file.exe'),/magnet/);assert.throws(()=>p2p.validInput('magnet:?xt=invalid'),/valid/);
});
test('P2P selects audio only, caps transfers and rejects duplicate, missing or oversized selections',()=>{
 const files=[{name:'song.mp3',length:100},{name:'installer.exe',length:100},{name:'large.wav',length:51*1024*1024}];assert.deepEqual(p2p.playable(files).map(f=>f.index),[0]);
 for(const selection of [[],[1],[0,0],[2]])assert.throws(()=>p2p.selection(files,selection));assert.equal(p2p.selection(files,[0])[0].name,'song.mp3');
 assert.throws(()=>p2p.selection(Array.from({length:3},()=>({name:'song.mp3',length:40*1024*1024})),[0,1,2]),/100 MB/);
});
test('selected torrent audio is imported as files and the peer client is destroyed after completion',async()=>{
 let destroyed=0,selected=0,options;const files=[{name:'Artist - Song.mp3',length:3,downloaded:3,select(){selected++;},async blob(){return new Blob(['abc'],{type:'audio/mpeg'});}},{name:'do-not-run.exe',length:2}];
 class Client{on(){}add(input,opts,cb){options=opts;queueMicrotask(()=>cb({files,length:5,pieceLength:1024,on(){}}));}destroy(){destroyed++;}}
 const session=p2p.create({loadClient:async()=>Client});const entries=await session.inspect(magnet,{rights:true,vpn:true});assert.equal(entries.length,1);assert.equal(options.deselect,true);assert.equal(options.destroyStoreOnDestroy,true);assert.equal(selected,0);
 const downloaded=await session.download([0]);assert.equal(selected,1);assert.equal(downloaded[0].name,'Artist - Song.mp3');assert.equal(await downloaded[0].text(),'abc');assert.equal(destroyed,1);await assert.rejects(session.download([0]),/Connect/);
});
test('disconnect cancels a pending metadata request and destroys the client',async()=>{
 let destroyed=0;class Client{on(){}add(){}destroy(){destroyed++;}}const session=p2p.create({loadClient:async()=>Client});const pending=session.inspect(magnet,{rights:true,vpn:true});await new Promise(resolve=>setImmediate(resolve));session.stop();await assert.rejects(pending,/stopped/);assert.equal(destroyed,1);
});

test('hosts may explicitly choose direct P2P without a VPN assertion',async()=>{let options;class Client{on(){}add(input,opts,cb){queueMicrotask(()=>cb({files:[{name:'music.mp3',length:5}],length:5,pieceLength:1024}));}destroy(){}}const session=p2p.create({loadClient:async()=>Client,onStatus:message=>{options=message;}});assert.equal((await session.inspect(magnet,{rights:true,direct:true})).length,1);session.stop();});
