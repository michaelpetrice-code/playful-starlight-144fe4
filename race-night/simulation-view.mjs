import {createSimulation,raceFrame} from './simulation.mjs';
export function mountSimulation(container,kind){
 const race=createSimulation(kind), heading=document.createElement('h2'), status=document.createElement('p'), track=document.createElement('div'), controls=document.createElement('div');
 heading.textContent=(kind==='horse'?'Horse':'Greyhound')+' racing — original simulation';
 status.textContent='Fictional entertainment only. No real-money wagering.';
 const lanes=race.runners.map(r=>{const lane=document.createElement('div'), runner=document.createElement('span');lane.style.cssText='position:relative;height:42px;background:#234b35;border-bottom:1px solid #ddd;overflow:hidden';runner.style.cssText='position:absolute;left:0;top:5px;font-size:24px;white-space:nowrap';runner.textContent=r.number+' '+(kind==='horse'?'🐎':'🐕');lane.append(runner);track.append(lane);return runner;});
 let elapsed=0,last=null,raf=0,running=false,disposed=false;
 const result=document.createElement('p');result.setAttribute('role','status');
 const play=document.createElement('button'),reset=document.createElement('button');play.textContent='Start race';reset.textContent='Restart';
 function draw(){const frame=raceFrame(race,elapsed);frame.runners.forEach((r,i)=>{const lane=lanes[i].parentElement;lanes[i].style.left=Math.max(0,lane.clientWidth-lanes[i].offsetWidth)*r.progress+'px';});if(frame.finished){running=false;play.disabled=true;result.textContent='Finishing order: '+frame.results.join(' · ');}return frame.finished;}
 function tick(now){if(disposed||!running)return;if(last!==null)elapsed+=(now-last)/1000;last=now;if(!draw())raf=requestAnimationFrame(tick);}
 play.onclick=()=>{if(running){running=false;cancelAnimationFrame(raf);play.textContent='Resume';}else{running=true;last=null;play.textContent='Pause';raf=requestAnimationFrame(tick);}};
 reset.onclick=()=>{running=false;cancelAnimationFrame(raf);elapsed=0;last=null;play.disabled=false;play.textContent='Start race';result.textContent='';draw();};
 controls.append(play,reset);container.replaceChildren(heading,status,track,controls,result);draw();
 return ()=>{disposed=true;running=false;cancelAnimationFrame(raf);container.replaceChildren();};
}
