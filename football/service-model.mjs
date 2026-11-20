import {verdict} from './rules.mjs';
export function normalizeFeed(body){
 if(!body||!Array.isArray(body.matches))throw Error('The provider returned invalid fixtures.');
 const ids=new Set();
 return body.matches.map(m=>{
  if(!Number.isInteger(m.id)||ids.has(m.id)||typeof m.homeTeam?.name!=='string'||typeof m.awayTeam?.name!=='string'||!Number.isFinite(Date.parse(m.utcDate)))throw Error('A fixture is incomplete.');
  ids.add(m.id);
  const statuses={FINISHED:'FT',IN_PLAY:'LIVE',PAUSED:'HT',TIMED:'NS',SCHEDULED:'NS',POSTPONED:'POSTPONED',SUSPENDED:'SUSPENDED',CANCELLED:'CANCELLED',AWARDED:'AWARDED'};
  const status=statuses[m.status];if(!status)throw Error('Unsupported provider match status.');
  const h=m.score?.fullTime?.home??null,a=m.score?.fullTime?.away??null;
  if((h!==null&&(!Number.isInteger(h)||h<0||h>99))||(a!==null&&(!Number.isInteger(a)||a<0||a>99))||(status==='FT'&&(h===null||a===null)))throw Error('The provider returned invalid scores.');
  return {id:String(m.id),home:m.homeTeam.name.slice(0,60),away:m.awayTeam.name.slice(0,60),home_id:m.homeTeam.id,away_id:m.awayTeam.id,kickoff:new Date(m.utcDate).toISOString(),status,home_score:h,away_score:a};
 });
}
export function canAutoSettle(state,now=Date.now()){
 if(state.status!=='playing'||now<Date.parse(state.deadline)||!state.fixtures.length)return false;
 const active=state.members.filter(m=>m.approved!==false&&m.active);
 return active.length>0&&active.every(m=>{const p=state.picks.find(p=>p.user_id===m.user_id);return !p||verdict(p.team,state.fixtures)!=='pending';});
}
export function validateAdvice(advice,candidates){
 if(!advice||!Array.isArray(advice.picks)||advice.picks.length<1||advice.picks.length>3)throw Error('The Gaffer returned an invalid verdict.');
 const names=new Set();
 for(const p of advice.picks){if(!candidates.includes(p.team)||names.has(p.team)||typeof p.reason!=='string'||p.reason.length<1||p.reason.length>500)throw Error('The Gaffer suggested an ineligible team.');names.add(p.team);}
 return {picks:advice.picks,note:String(advice.note||'').slice(0,500)};
}
