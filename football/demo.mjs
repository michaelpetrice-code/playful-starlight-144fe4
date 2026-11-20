import {validatePick,settle} from './rules.mjs';
export function initialDemo(){return {id:'demo',name:'The Local Matchday Club',theme:'gold',slug:'the-local-demo',visibility:'private',rollover:'end',prize:'Matchday bragging rights',round:1,deadline:new Date(Date.now()+86400000).toISOString(),owner:'demo-me',source:'Demo fixtures — not live',members:[{user_id:'demo-me',name:'You',active:true,role:'owner',approved:true},{user_id:'demo-sam',name:'Sam',active:true,role:'player',approved:true},{user_id:'demo-jo',name:'Jo',active:true,role:'player',approved:true}],fixtures:[{id:'1',home:'Coventry City',away:'Birmingham City',status:'NS',home_score:null,away_score:null},{id:'2',home:'Arsenal',away:'Aston Villa',status:'NS',home_score:null,away_score:null},{id:'3',home:'Liverpool',away:'Chelsea',status:'NS',home_score:null,away_score:null}],picks:[],history:[],messages:[],events:[],status:'playing'};}
export function demoAction(state,action,payload){
 const uid='demo-me',me=()=>state.members.find(m=>m.user_id===uid);
 if(action==='reset')return initialDemo();
 if(action==='demo-deadline')state.deadline=new Date(Date.now()-1000).toISOString();
 if(action==='pick'){
  if(state.status!=='playing')throw Error('This round is settled.');
  const used=state.history.flatMap(h=>h.picks.filter(p=>p.user_id===uid).map(p=>p.team));
  validatePick({team:payload.team,fixtures:state.fixtures,used,deadline:state.deadline,active:me().active});
  state.picks=state.picks.filter(p=>p.user_id!==uid);state.picks.push({user_id:uid,team:payload.team});
 }
 if(action==='message'){
  if(!payload.text.trim()||payload.text.length>500)throw Error('Enter a message up to 500 characters.');
  const member=state.members.find(m=>m.user_id===payload.mention);
  const text=payload.text+(member?' @['+member.name+']':'');
  state.messages.push({id:crypto.randomUUID(),user_id:uid,name:me().name,text,at:new Date().toISOString()});
 }
 if(action==='remove-message')state.messages=state.messages.filter(m=>m.id!==payload.message);
 if(action==='fixture'){
  if(Date.now()>=Date.parse(state.deadline)||state.status!=='playing')throw Error('Fixtures are locked.');
  if(payload.home.toLowerCase()===payload.away.toLowerCase()||state.fixtures.some(f=>[f.home.toLowerCase(),f.away.toLowerCase()].some(t=>[payload.home.toLowerCase(),payload.away.toLowerCase()].includes(t))))throw Error('Each team can only play once per round.');
  if(payload.kickoff&&Date.parse(payload.kickoff)<Date.parse(state.deadline))throw Error('Kickoff must be after the pick deadline.');
  state.fixtures.push({id:crypto.randomUUID(),...payload,status:'NS',home_score:null,away_score:null});
 }
 if(action==='result'){
  if(state.status!=='playing')throw Error('This round is already settled.');
  if(payload.status==='FT'&&(!Number.isInteger(payload.home_score)||!Number.isInteger(payload.away_score)))throw Error('Final scores are required.');
  Object.assign(state.fixtures.find(f=>f.id===payload.fixture),payload);
 }
 if(action==='settle'){
  if(Date.now()<Date.parse(state.deadline)||state.status!=='playing')throw Error('Wait until the round is ready to settle.');
  const outcome=settle(state.members,state.picks,state.fixtures);
  const rollover=outcome.allOut&&state.rollover==='replay';
  if(!rollover)outcome.results.forEach(r=>{state.members.find(m=>m.user_id===r.id).active=r.result==='through'});
  state.rolled_over=rollover;state.status=rollover?'round-complete':outcome.allOut?'all-out':outcome.winner?'complete':'round-complete';state.winner=outcome.winner;
 }
 if(action==='next'){
  if(state.status!=='round-complete')throw Error('Settle the current round first.');
  if(!Number.isFinite(Date.parse(payload.deadline))||Date.parse(payload.deadline)<=Date.now())throw Error('Choose a future deadline.');
  state.history.push({round:state.round,picks:state.picks,fixtures:state.fixtures,members:state.members.map(m=>({...m})),rolled_over:state.rolled_over});
  state.round++;state.deadline=payload.deadline;state.fixtures=[];state.picks=[];state.status='playing';state.rolled_over=false;state.feed=null;state.synced_at=null;
 }
 if(action==='settings')Object.assign(state,payload);
 if(action==='role'){const m=state.members.find(m=>m.user_id===payload.member);if(m&&m.role!=='owner')m.role=payload.role;}
 state.events||=[];state.events.push({id:crypto.randomUUID(),at:new Date().toISOString(),text:action==='message'?'New banter message':action==='settle'?'Round settled':action==='next'?'Next round opened':'League updated'});
 return state;
}
