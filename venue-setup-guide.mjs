import {sectorForType} from './venue-sectors.js';
const allowed=new Set(['events','tickets','room','bingo','draw','rewards','gallery','games','contact']);
export function venueSetupGuide({name='',type='Social club',town='',prompt=''}={}){
 const sector=sectorForType(type)||sectorForType('Social club'),features=[...sector.keys].filter(k=>allowed.has(k));
 const request=String(prompt).toLowerCase();
 for(const [key,pattern] of [['room',/room|hire|function|party/],['events',/event|music|quiz|fixture/],['gallery',/photo|gallery/],['contact',/contact|enquir/]])if(pattern.test(request)&&!features.includes(key))features.push(key);
 const venue=String(name).trim().slice(0,90)||'our venue',location=String(town).trim().slice(0,90);
 return {theme:sector.theme,features,welcome:`Welcome to ${venue}${location?' in '+location:''}. ${sector.intro} Explore the sections below and contact us for confirmed details.`,note:'Free setup guide, prepared on your device from your venue type and keywords. No AI service is contacted. Review the wording, opening times, events and prices before publishing.'};
}
