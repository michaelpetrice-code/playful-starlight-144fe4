export const teams=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham','West Ham','Wolves'];
export function validatePick({team,fixtures,used=[],deadline,now=Date.now(),active=true}) {
 if(!active)throw Error('You are out of this competition.');
 if(!Number.isFinite(Date.parse(deadline))||now>=Date.parse(deadline))throw Error('The deadline has passed.');
 if(used.includes(team))throw Error('You have already used this team.');
 if(!fixtures.some(f=>f.home===team||f.away===team))throw Error('Choose a team playing this round.');
 return team;
}
export function verdict(team,fixtures){
 if(!team)return 'out';
 const f=fixtures.find(f=>f.home===team||f.away===team);
 if(!f||f.status!=='FT')return 'pending';
 if(!Number.isInteger(f.home_score)||!Number.isInteger(f.away_score)||f.home_score<0||f.away_score<0)return 'pending';
 const own=f.home===team?f.home_score:f.away_score,other=f.home===team?f.away_score:f.home_score;
 return own>other?'through':'out';
}
export function settle(players,picks,fixtures){
 const results=players.filter(p=>p.active).map(p=>({id:p.user_id,result:verdict(picks.find(x=>x.user_id===p.user_id)?.team,fixtures)}));
 if(results.some(r=>r.result==='pending'))throw Error('All picked fixtures need verified final scores.');
 const survivors=results.filter(r=>r.result==='through');
 return {results,winner:survivors.length===1?survivors[0].id:null,allOut:survivors.length===0};
}
export function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
