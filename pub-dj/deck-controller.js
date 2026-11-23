(function(root){
 'use strict';
 function clock(seconds){if(!Number.isFinite(seconds)||seconds<0)return '0:00';const n=Math.floor(seconds);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
 function create({audio,canControl,hasTrack,next}){
  let previousVolume=audio.volume||.75;
  function allow(){if(!canControl())throw Error('Only staff on the playback device can control the music.');}
  function current(){allow();if(!hasTrack())throw Error('Start a song first.');}
  return {
   async toggle(){allow();if(!hasTrack())return next();if(audio.paused)await audio.play();else audio.pause();},
   async next(){allow();return next();},
   restart(){current();audio.currentTime=0;},
   seek(value){current();if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Math.max(0,Math.min(audio.duration,Number(value)||0));},
   forward(){current();if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+15);},
   volume(value){allow();audio.volume=Math.max(0,Math.min(1,Number(value)||0));if(audio.volume>0)previousVolume=audio.volume;audio.muted=false;},
   mute(){allow();if(audio.muted||audio.volume===0){if(audio.volume===0)audio.volume=previousVolume;audio.muted=false;}else{previousVolume=audio.volume;audio.muted=true;}}
  };
 }
 const api={clock,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LocalDJDeck=api;
})(typeof window!=='undefined'?window:globalThis);
