/* Shared catalogue rules: no streaming-provider or client-side entitlement assumptions. */
(function(root){
 'use strict';
 const normal=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function colour(id){let hash=0;for(const char of String(id))hash=(hash*31+char.charCodeAt(0))>>>0;return ['amber','jade','rose','ocean','violet','copper'][hash%6];}
 function initials(name){return String(name||'?').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();}
 function select(tracks,{query='',mood='All music',savedOnly=false,saved=[]}={}){
  const words=normal(query).trim().split(/\s+/).filter(Boolean);const favourites=new Set(saved);
  return tracks.filter(t=>(mood==='All music'||t.mood===mood)&&(!savedOnly||favourites.has(t.id))&&words.every(word=>normal(t.title+' '+t.artist+' '+t.mood).includes(word)));
 }
 function artists(tracks){const map=new Map();for(const t of tracks){if(!map.has(t.artist))map.set(t.artist,{name:t.artist,tracks:[]});map.get(t.artist).tracks.push(t);}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));}
 function moods(tracks){const map=new Map();for(const t of tracks){const mood=t.mood||'All music';map.set(mood,(map.get(mood)||0)+1);}return [...map].map(([name,count])=>({name,count}));}
 function popular(tracks,queue){const approved=queue.filter(r=>r.status==='approved').sort((a,b)=>b.votes-a.votes||a.id-b.id);return approved.map(r=>({track:tracks.find(t=>t.id===r.track),votes:r.votes})).filter(r=>r.track);}
 function suggestions(tracks,query,limit=6){const q=normal(query).trim();if(!q)return [];const words=q.split(/\s+/);return tracks.map((track,index)=>{const title=normal(track.title),artist=normal(track.artist),text=title+' '+artist+' '+normal(track.mood);const score=title.startsWith(q)?100:artist.startsWith(q)?90:text.includes(q)?80:words.filter(w=>text.includes(w)).length*10;return {track,index,score};}).filter(t=>t.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).map(t=>t.track);}
 function localHelp(tracks,question){const q=normal(question).replace(/\b(upbeat|dance|dancing|energetic)\b/g,'party').replace(/\b(chill|relax|relaxed|quiet)\b/g,'laid back');return suggestions(tracks,q,5);}
 const api={select,artists,moods,popular,colour,initials,suggestions,localHelp};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LocalDJDiscovery=api;
})(typeof window!=='undefined'?window:globalThis);
