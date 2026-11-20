import {esc} from './rules.mjs';
import qrcode from './vendor/qrcode.mjs';
export {esc};
export const themes=['gold','blue','green','red','purple','silver'];
export const statusLabels={playing:'Picks open / matches in progress','round-complete':'Round complete',complete:'Winner confirmed','all-out':'Competition ended'};
export function invitationURL(state,href=location.href){
 const url=new URL('index.html',href);url.searchParams.set('section','football');url.searchParams.set('football-invite',state.invite||'');return url.href;
}
export function publicURL(state,href=location.href){const url=new URL('football.html',href);url.searchParams.set('league',state.slug);return url.href;}
export function qrSVG(text){const code=qrcode(0,'M');code.addData(text,'Byte');code.make();return code.createSvgTag({cellSize:4,margin:16,scalable:true,alt:'Scan to open this league',title:'The Local football invitation'});}
export function mentionHTML(text,members){
 const names=new Set(members.map(m=>m.name));let result='',offset=0;
 for(const match of String(text).matchAll(/@\[([^\]]{1,40})\]/g)){result+=esc(text.slice(offset,match.index));result+=names.has(match[1])?`<strong class="mention">@${esc(match[1])}</strong>`:esc(match[0]);offset=match.index+match[0].length;}
 return result+esc(text.slice(offset));
}
export function leagueStats(state){
 const members=state.members.filter(m=>m.approved!==false),picks=state.picks||[];
 const counts={};for(const p of picks)counts[p.team]=(counts[p.team]||0)+1;
 return {players:members.length,standing:members.filter(m=>m.active).length,rounds:state.history.length,counts};
}
export function playerRounds(state,id){return state.history.filter(h=>(h.members||[]).some(m=>m.user_id===id&&m.active)).length+(['complete','round-complete'].includes(state.status)&&state.members.some(m=>m.user_id===id&&m.active)?1:0);}
export function eligibleTeams(state,userId){
 const used=new Set(state.history.flatMap(h=>h.picks.filter(p=>p.user_id===userId).map(p=>p.team)));
 return [...new Set(state.fixtures.flatMap(f=>[f.home,f.away]))].filter(t=>!used.has(t));
}
export function validateLogo(value){return typeof value==='string'&&value.length<=180000&&/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(value);}
export {normalizeFeed,canAutoSettle,validateAdvice} from './service-model.mjs';

export function sponsorURL(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function sponsorHTML(state){
 if(!state.sponsor_name)return '';
 const url=sponsorURL(state.sponsor_url);
 return `<aside class="card football-sponsor" aria-label="League sponsor"><small>Advertisement · League sponsor</small><h3>${esc(state.sponsor_name)}</h3><p>${esc(state.sponsor_message||'')}</p>${url?`<a href="${esc(url)}" target="_blank" rel="sponsored noopener noreferrer">Visit sponsor website</a>`:''}</aside>`;
}
