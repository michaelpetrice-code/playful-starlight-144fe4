export const PRICE_ID='price_1Uf36sRlvtejByKsOgLIQm2U';
export const themes={emerald:['#09271f','#d6b66f'],burgundy:['#351526','#e4c58b'],navy:['#14263f','#d9bd80'],charcoal:['#171c20','#e4cb8f']};
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function validateBrief(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Add your event details.');
 const brief={title:clean(input.title,100),date:clean(input.date,10),time:clean(input.time,5),location:clean(input.location,160),price:clean(input.price,80),booking:clean(input.booking,500),details:clean(input.details,1200),tone:['friendly','lively','professional'].includes(input.tone)?input.tone:'friendly',theme:Object.hasOwn(themes,input.theme)?input.theme:'emerald'};
 if(!brief.title)throw Error('Add an event or announcement title.');
 if(brief.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(brief.date)||!Number.isFinite(Date.parse(brief.date+'T12:00:00Z'))||new Date(brief.date+'T12:00:00Z').toISOString().slice(0,10)!==brief.date))throw Error('Use a valid event date.');
 if(brief.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(brief.time))throw Error('Use a valid event time.');
 if(brief.booking){let url;try{url=new URL(brief.booking);}catch{throw Error('Use a full HTTPS booking link.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Use a full HTTPS booking link.');brief.booking=url.href;}
 return brief;
}
export function validateCopy(copy){
 for(const [key,max] of [['intro',220],['cta',120],['tagline',80]])if(typeof copy?.[key]!=='string'||!copy[key].trim()||copy[key].length>max||/[\d£$€]|https?:|<|>|\b(free|sold out|selling fast|last chance|limited tickets|guaranteed|award.winning)\b/i.test(copy[key]))throw Error('AI copy needs a fresh attempt.');
 return {intro:copy.intro.trim(),cta:copy.cta.trim(),tagline:copy.tagline.trim()};
}
export function dateLabel(date){return date?new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}):'';}
export function campaignFromBrief(raw,copy={intro:'Bring your friends and enjoy some time together.',cta:'Make a plan and join us.',tagline:'Good company starts here.'},venue='Your venue'){
 const b=validateBrief(raw);const creative=validateCopy(copy);const facts=[dateLabel(b.date),b.time&&'From '+b.time,b.location||venue,b.price&&'Price: '+b.price,b.booking&&'Details / booking: '+b.booking].filter(Boolean).join('\n');
 const text=[b.title,creative.intro,b.details,facts,creative.cta].filter(Boolean).join('\n\n');
 return {facebook:text,instagram:text+'\n\n#TheLocal #LocalEvents',whatsapp:[b.title,b.details,facts,creative.cta].filter(Boolean).join('\n\n'),announcementTitle:b.title,announcementBody:[creative.intro,b.details,facts,creative.cta].filter(Boolean).join('\n\n'),posterTagline:creative.tagline,reviewNotes:[!b.date&&'Confirm the event date.',!b.time&&'Confirm the start time.',!b.price&&'Add the price or confirm entry arrangements.',!b.booking&&'Add a booking or information link if needed.'].filter(Boolean)};
}
export function validateContent(input){const result={};for(const [key,max]of Object.entries({facebook:5000,instagram:5000,whatsapp:5000,announcementTitle:120,announcementBody:5000,posterTagline:100})){if(typeof input?.[key]!=='string'||input[key].length>max)throw Error('Check your draft text lengths.');result[key]=input[key];}return result;}
export function paidMarketingUntil(session,subscription,record,now=Date.now()){
 if(!session?.livemode||session.mode!=='subscription'||session.status!=='complete'||session.payment_status!=='paid'||session.currency!=='gbp'||session.amount_total!==1499||session.metadata?.source!=='venue_marketing'||session.metadata?.purchaser!==record.user_id||session.metadata?.venue!==record.venue_id)return null;
 const lines=session.line_items?.data;if(lines?.length!==1||session.line_items.has_more||lines[0].price?.id!==PRICE_ID||lines[0].quantity!==1)return null;
 const sub=subscription;const items=sub?.items?.data;const invoice=sub?.latest_invoice;
 if(!sub?.livemode||sub.status!=='active'||sub.metadata?.source!=='venue_marketing'||sub.metadata?.venue!==record.venue_id||sub.metadata?.purchaser!==record.user_id||items?.length!==1||items[0].price?.id!==PRICE_ID||items[0].quantity!==1||invoice?.status!=='paid'||invoice.currency!=='gbp'||invoice.amount_paid!==1499||!Number.isFinite(items[0].current_period_end)||items[0].current_period_end*1000<=now)return null;
 return new Date(items[0].current_period_end*1000).toISOString();
}
