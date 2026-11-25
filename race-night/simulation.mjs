// Original fictional race engine. No external footage, odds or wagering.
export function createSimulation(kind, random = Math.random) {
 if (!['horse','dog'].includes(kind)) throw new TypeError('Unknown race type');
 const count=kind==='horse'?8:6;
 const runners=Array.from({length:count},(_,i)=>{
   const n=random(); if(!Number.isFinite(n)||n<0||n>=1) throw new RangeError('Invalid random sample');
   return {number:i+1,finish:24+n*8};
 });
 return {kind, label:'Original simulated race — not live', runners, duration:Math.max(...runners.map(r=>r.finish))};
}
export function raceFrame(race, seconds) {
 const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
 return {finished:t>=race.duration, runners:race.runners.map(r=>({number:r.number,progress:Math.min(1,t/r.finish),finished:t>=r.finish})), results:race.runners.filter(r=>t>=r.finish).sort((a,b)=>a.finish-b.finish||a.number-b.number).map(r=>r.number)};
}
