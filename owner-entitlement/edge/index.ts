import { createClient } from 'npm:@supabase/supabase-js@2';

export const apiVersion = '2026-09-30.endive';
export const env = (key: string) => Deno.env.get(key) || '';
export const liveMode = () => env('STRIPE_BILLING_MODE') === 'live';
export const plans = () => ({
  monthly: { id: env('STRIPE_MONTHLY_PRICE_ID'), amount: 2999, interval: 'month' },
  annual: { id: env('STRIPE_ANNUAL_PRICE_ID'), amount: 29900, interval: 'year' }
});
export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  } });
}
export class StripeError extends Error {
  constructor(readonly status: number) { super('Stripe request failed: '+status); }
}
export async function stripe(path: string, body?: Record<string, string>, attempt?: string) {
  const key = env('STRIPE_RESTRICTED_KEY');
  const prefix=liveMode()?'rk_live_':'rk_test_';
  if (!key.startsWith(prefix)) throw Error('Stripe billing mode and restricted key do not match.');
  const headers: Record<string, string> = { Authorization: 'Bearer ' + key, 'Stripe-Version': apiVersion };
  if (attempt) headers['Idempotency-Key'] = attempt;
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: body ? 'POST' : 'GET', headers,
    body: body ? new URLSearchParams(body) : undefined,
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new StripeError(response.status);
  return response.json();
}
export function dbResult<T>(result: {error: unknown; data: T}): T {
  if (result.error) throw Error('Billing data could not be updated.');
  return result.data;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return json({});
  if (req.method !== 'POST') return json({ message:'Method not allowed.' },405);
  const token = req.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({message:'Sign in to manage billing.'},401);
  try {
    const client = createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'), {auth:{persistSession:false}});
    const {data:{user},error}=await client.auth.getUser(token);
    if (error || !user?.email || !user.email_confirmed_at) return json({message:'Sign in with a verified email.'},401);
    const input=await req.json().catch(()=>null);
    if (!['checkout','portal'].includes(input?.action)) return json({message:'Choose a billing action.'},400);
    const site = new URL(env('VENUE_APP_URL'));
    if (site.protocol !== 'https:' || site.username || site.password) throw Error('Set the HTTPS site URL.');
    const returnUrl=new URL('index.html?section=billing',site).href;
    const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
    if(input.action==='checkout'){
      const owner=dbResult(await db.from('local_platform_owners').select('user_id').eq('user_id',user.id).maybeSingle());
      if(owner)return json({complimentary:true,message:'Permanent complimentary owner access; no payment details or Stripe checkout required.'});
    }
    let customer=dbResult(await db.from('local_billing_customers').select('customer_id').eq('user_id',user.id).maybeSingle())?.customer_id;
    if (!customer && input.action==='portal') return json({message:'No billing account is linked yet.'},404);
    const plan=Object.hasOwn(plans(),input.plan) ? plans()[input.plan as keyof ReturnType<typeof plans>] : null;
    if (input.action==='checkout' && !plan?.id) return json({message:'Choose an available plan.'},400);
    if (!customer) {
      // Do not include mutable email in the idempotent creation parameters.
      const created=await stripe('customers',{'metadata[local_user_id]':user.id},'local-venue-customer-'+user.id);
      customer=created.id;
      dbResult(await db.from('local_billing_customers').upsert({user_id:user.id,customer_id:customer},{onConflict:'user_id'}));
    }
    if (input.action==='portal') {
      const session=await stripe('billing_portal/sessions',{customer,return_url:returnUrl});
      return json({url:session.url});
    }
    const price=await stripe('prices/'+encodeURIComponent(plan!.id));
    if (!price.active || price.currency!=='gbp' || price.unit_amount!==plan!.amount ||
      price.recurring?.interval!==plan!.interval || price.recurring?.interval_count!==1) {
      return json({message:'This plan is temporarily unavailable.'},503);
    }
    const subscriptions=await stripe('subscriptions?customer='+encodeURIComponent(customer)+'&status=all&limit=100');
    if (subscriptions.has_more || subscriptions.data.some((row:{status:string})=>!['canceled','incomplete_expired'].includes(row.status))) {
      return json({message:'You already have a subscription in progress. Open Manage billing.'},409);
    }
    // A database lease serialises checkout creation per customer, including across browser tabs.
    const lease=crypto.randomUUID();
    const reserved=dbResult(await db.rpc('local_reserve_billing_checkout',{p_user:user.id,p_lease:lease}));
    if (!reserved) return json({message:'A checkout is already open. Return to that tab, or check Manage billing.'},409);
    const session=await stripe('checkout/sessions',{
        mode:'subscription',customer,client_reference_id:user.id,
        integration_identifier:'the-local-venue-ksvjmqpt',
        payment_method_collection:'always',
        'subscription_data[trial_period_days]':'14',
        'subscription_data[trial_settings][end_behavior][missing_payment_method]':'cancel',
        'line_items[0][price]':plan!.id,'line_items[0][quantity]':'1',
        'subscription_data[metadata][local_user_id]':user.id,
        'subscription_data[metadata][local_product]':'venue-app',
        'metadata[local_product]':'venue-app','metadata[local_lease]':lease,
        success_url:returnUrl+'&checkout=success',cancel_url:returnUrl+'&checkout=cancelled&plan='+encodeURIComponent(input.plan),
        expires_at:String(Math.floor(Date.now()/1000)+31*60)
      },'local-venue-checkout-'+lease).catch(async error=>{
        if(error instanceof StripeError && [400,401,403,404].includes(error.status)){
          await db.rpc('local_release_billing_checkout',{p_user:user.id,p_lease:lease});
        }
        throw error;
      });
    return json({url:session.url});
  } catch {
    return json({message:'Billing is temporarily unavailable. Please try again.'},503);
  }
});

