export const plans={venue_monthly:{price:'price_1UezLQRlvtejByKsbsDkruzo',amount:1999,monthly:true},subscriber_monthly:{price:'price_1UezLRRlvtejByKsQJvwTSWC',amount:999,monthly:true},party_once:{price:'price_1UezLSRlvtejByKsBbkjdjLx',amount:799,monthly:false}};
export function validPrice(price,plan){const p=plans[plan];return Boolean(p&&price?.active&&price.livemode&&price.currency==='gbp'&&price.unit_amount===p.amount&&(p.monthly?price.type==='recurring'&&price.recurring?.interval==='month'&&price.recurring.interval_count===1:price.type==='one_time'));}
export function paidUntil(session,record,subscription,now=Date.now()){
 const p=plans[record.plan];if(!p||!session?.livemode||session.status!=='complete'||session.payment_status!=='paid'||session.metadata?.source!=='local_dj'||session.metadata?.purchaser!==record.user_id||session.metadata?.venue!==(record.venue_id||'')||session.metadata?.plan!==record.plan||session.currency!=='gbp'||session.amount_total!==p.amount)return null;
 const lines=session.line_items?.data;if(!lines||lines.length!==1||session.line_items.has_more||lines[0].price?.id!==p.price||lines[0].quantity!==1)return null;
 if(!p.monthly)return session.mode==='payment'&&Number.isFinite(session.created)?new Date((session.created+30*24*3600)*1000).toISOString():null;
 if(session.mode!=='subscription'||!subscription?.livemode||subscription.status!=='active'||subscription.metadata?.source!=='local_dj'||subscription.metadata?.purchaser!==record.user_id||subscription.metadata?.venue!==(record.venue_id||''))return null;
 const invoice=subscription.latest_invoice;const items=subscription.items?.data;const item=items?.[0];
 if(!items||items.length!==1||item.quantity!==1||item.price.id!==p.price||invoice?.status!=='paid'||invoice.currency!=='gbp'||invoice.amount_paid!==p.amount||!Number.isFinite(item.current_period_end)||item.current_period_end*1000<=now)return null;
 return new Date(item.current_period_end*1000).toISOString();
}
