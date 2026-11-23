import Stripe from 'npm:stripe@22.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (name: string) => Deno.env.get(name) ?? '';
const origin = env('QUIZ_APP_ORIGIN');
const live = env('QUIZ_STRIPE_MODE') === 'live';
const prices = { standard: env('QUIZ_STANDARD_PRICE'), subscriber: env('QUIZ_SUBSCRIBER_PRICE') };
const stripe = new Stripe(env('QUIZ_STRIPE_KEY'), { httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
const json = (body: object, status = 200) => Response.json(body, { status, headers });
const id = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

async function checkout(request: Request) {
  if (request.headers.get('origin') !== origin) return json({ message: 'Unexpected origin.' }, 403);
  if (!prices.standard || !prices.subscriber || prices.standard === prices.subscriber) return json({ message: 'Quiz checkout is not configured.' }, 503);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ message: 'Sign in to continue.' }, 401);
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user?.email_confirmed_at) return json({ message: 'Sign in with a confirmed email.' }, 401);
  const { venue } = await request.json();
  if (!id(venue)) return json({ message: 'Choose an approved venue.' }, 400);
  const { data, error: accessError } = await db.rpc('local_quiz_venues');
  if (accessError) throw accessError;
  const access = data.find((row: { id: string }) => row.id === venue);
  if (!access?.can_buy) return json({ message: 'This venue does not need checkout or requires its verified owner.' }, 403);
  const tier = access.tier === 'subscriber' ? 'subscriber' : 'standard';
  const price = await stripe.prices.retrieve(prices[tier]);
  if (!price.active || price.livemode !== live || price.currency !== 'gbp' ||
      price.unit_amount !== (tier === 'subscriber' ? 999 : 1999) ||
      price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) {
    return json({ message: 'Quiz checkout price is misconfigured.' }, 503);
  }
  const returnUrl = new URL('/pub-quiz.html', origin);
  returnUrl.searchParams.set('venue', venue);
  const metadata = { source: 'pub_quiz_pro', venue, purchaser: user.id, tier };
  // Reuse the same open Checkout Session until it expires. The lease is server-side.
  const { data: lease, error: leaseError } = await db.rpc('local_quiz_checkout_lease', { p_venue: venue });
  if (leaseError) throw leaseError;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{ price: price.id, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    success_url: returnUrl.href + '&checkout=success',
    cancel_url: returnUrl.href,
    expires_at: lease.expires_at,
  }, { idempotencyKey: 'quiz-checkout-' + lease.key });
  if (session.status !== 'open' || !session.url) return json({ message: 'Checkout is processing. Refresh your venue access shortly.' }, 409);
  return json({ url: session.url });
}

async function webhook(request: Request) {
  const secret = env('QUIZ_STRIPE_WEBHOOK_SECRET');
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return json({ message: 'Missing webhook signature.' }, 400);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret, undefined, cryptoProvider);
  } catch { return json({ message: 'Invalid webhook signature.' }, 400); }
  if (event.livemode !== live) return json({ received: true });
  let subscriptionId: string | null = null;
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      if (event.data.object.metadata.source === 'pub_quiz_pro') subscriptionId = event.data.object.id;
      break;
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const details = event.data.object.parent?.subscription_details;
      if (details?.metadata?.source === 'pub_quiz_pro') {
        const subscription = details.subscription;
        subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id ?? null;
      }
      break;
    }
  }
  if (!subscriptionId) return json({ received: true });
  const observed = new Date().toISOString();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] });
  const { source, venue, purchaser, tier } = subscription.metadata;
  const [item] = subscription.items.data;
  if (source !== 'pub_quiz_pro' || !id(venue) || !id(purchaser) ||
      (tier !== 'standard' && tier !== 'subscriber') || !prices[tier] ||
      item?.price.id !== prices[tier] || item.quantity !== 1 || subscription.items.data.length !== 1 ||
      subscription.livemode !== live) return json({ received: true });
  const invoice = subscription.latest_invoice;
  const paid = typeof invoice === 'object' && invoice?.status === 'paid';
  const until = paid && subscription.status === 'active' ? new Date(item.current_period_end * 1000).toISOString() : null;
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { error } = await db.rpc('local_quiz_record_subscription', {
    p_id: subscription.id, p_venue: venue, p_purchaser: purchaser, p_tier: tier,
    p_status: subscription.status, p_until: until, p_live: subscription.livemode, p_observed: observed,
  });
  if (error) throw error;
  return json({ received: true });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405);
  try {
    return request.headers.has('stripe-signature') ? await webhook(request) : await checkout(request);
  } catch (error) {
    console.error('Quiz billing failed', (error as { code?: string }).code ?? 'unexpected_error');
    return json({ message: 'Quiz billing is temporarily unavailable.' }, 500);
  }
});
