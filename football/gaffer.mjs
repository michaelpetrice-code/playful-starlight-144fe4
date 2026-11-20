import {eligibleTeams} from './model.mjs';
// Local analysis only; never requests an AI service or fabricates provider statistics.
export function localGaffer(state,userId){
 const fixtures=(state.history||[]).flatMap(h=>h.fixtures||[]);
 const teams=eligibleTeams(state,userId).map(team=>{
  const games=fixtures.filter(f=>f.status==='FT'&&Number.isInteger(f.home_score)&&Number.isInteger(f.away_score)&&(f.home===team||f.away===team));
  let points=0,difference=0;
  for(const f of games){const home=f.home===team,scored=home?f.home_score:f.away_score,conceded=home?f.away_score:f.home_score;points+=scored>conceded?3:scored===conceded?1:0;difference+=scored-conceded;}
  return {team,games:games.length,average:games.length?points/games.length:0,difference};
 });
 const covered=teams.filter(t=>t.games>0).sort((a,b)=>b.average-a.average||b.difference-a.difference||a.team.localeCompare(b.team));
 return {picks:covered.slice(0,3).map(t=>({team:t.team,reason:`${t.average.toFixed(1)} points per match across ${t.games} recorded final result${t.games===1?'':'s'}; goal difference ${t.difference}.`})),unrated:teams.filter(t=>!t.games).map(t=>t.team),note:'Based only on final results archived in this league. Small samples and missing teams limit comparisons. This is not AI or a prediction of a win.'};
}
