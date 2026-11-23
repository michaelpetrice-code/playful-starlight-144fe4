import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from './node_modules/happy-dom/lib/index.js';
import {createEntertainmentSurface,entertainmentPages} from '../entertainment.js';
import {features,featureGallery,featureHref} from '../social-features.js';
import {readPageRoute} from '../app-navigation.js';

test('DJ and horse/dog racing are discoverable to guests and members and have shareable member routes',()=>{
 for(const [page,item] of Object.entries(entertainmentPages)){
  const feature=features.find(f=>f.id===item.key);assert.ok(feature);assert.equal(feature.page,page);
  assert.equal(featureHref(feature),'guest.html?page='+item.key);
  assert.match(featureGallery({member:true}),new RegExp('data-go="'+page+'"'));
  assert.equal(readPageRoute(new URL('https://thelocal.me.uk/index.html?section='+item.key)).page,page);
  assert.ok(readFileSync(new URL('../'+item.href,import.meta.url),'utf8').length);
 }
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.match(app,/'Games, music & racing'/);assert.match(app,/entertainment\.show\(/);
});
test('switching sections retains the same connected frame and does not reload host sessions',async()=>{
 const win=new Window({url:'https://thelocal.me.uk/index.html',settings:{disableIframePageLoading:true}});const doc=win.document;doc.body.innerHTML='<div id="social-layout"><main id="view"></main></div>';
 try{const surface=createEntertainmentSurface({win,doc});surface.show('The Local DJ','member-1');const dj=doc.querySelector('iframe');assert.equal(new URL(dj.src).pathname,'/pub-dj/index.html');assert.equal(new URL(dj.src).searchParams.get('embedded'),'1');
  doc.getElementById('view').innerHTML='<h2>Messages</h2>';surface.show('Private Chats','member-1');assert.equal(dj.isConnected,true);assert.equal(doc.getElementById('local-entertainment-surface').hidden,true);
  surface.show('Race Night','member-1');const race=doc.querySelector('iframe[title="Horse & dog race nights"]');assert.ok(race);assert.equal(dj.hidden,true);surface.show('The Local DJ','member-1');assert.equal(doc.querySelector('iframe'),dj);assert.equal(dj.hidden,false);assert.equal(race.hidden,true);assert.equal(doc.querySelectorAll('iframe').length,2);
 }finally{await win.happyDOM.close();}
});
test('account changes and sign-out clear entertainment frames and reset DJ identity',async()=>{
 const win=new Window({url:'https://thelocal.me.uk/'});win.document.body.innerHTML='<main id="view"></main>';const identities=[];try{const surface=createEntertainmentSurface({win,doc:win.document,onIdentityChange:id=>identities.push(id)});surface.show('The Local DJ','first');const first=win.document.querySelector('iframe');surface.show('The Local DJ','second');assert.equal(first.isConnected,false);assert.notEqual(win.document.querySelector('iframe'),first);surface.show('The Local DJ','second',false);assert.equal(win.document.querySelectorAll('iframe').length,0);assert.deepEqual(identities,['first','second',null]);}finally{await win.happyDOM.close();}
});
