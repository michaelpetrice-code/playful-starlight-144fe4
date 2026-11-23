import Stripe from 'npm:stripe@22.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (name: string) => Deno.env.get(name) ?? '';
const origin = env('QUIZ_APP_ORIGIN') || 'https://thelocal.me.uk';
const live = env('QUIZ_STRIPE_MODE') === 'live';
const partyPrice = env('QUIZ_PARTY_PRICE');
const prices = { standard: env('QUIZ_STANDARD_PRICE'), subscriber: env('QUIZ_SUBSCRIBER_PRICE') };
const key = env('QUIZ_STRIPE_KEY');
const webhookSecret = env('QUIZ_STRIPE_WEBHOOK_SECRET');
const checkoutReady = env('QUIZ_CHECKOUT_ENABLED') === 'true' && live &&
  Boolean(origin && key && webhookSecret && prices.standard && prices.subscriber && partyPrice);
const stripe = key ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }) : null;
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
const json = (body: object, status = 200) => Response.json(body, { status, headers });
const id = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

async function checkout(request: Request) {
  if (request.headers.get('origin') !== origin) return json({ message: 'Unexpected origin.' }, 403);
  const body = await request.json();
  if (body?.status === true) return json({ checkoutReady });
  if (!checkoutReady || !stripe) return json({ message: 'Paid quiz checkout is coming soon.' }, 503);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ message: 'Sign in to continue.' }, 401);
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user?.email_confirmed_at) return json({ message: 'Sign in with a confirmed email.' }, 401);
  const { venue, party, attempt } = body;
  if (party === true) {
    const { data: complimentary, error: accessError } = await db.rpc('local_quiz_party_complimentary');
    if (accessError) throw accessError;
    if (complimentary) return json({ message: 'Your account has complimentary hosting.' }, 409);
    if (!partyPrice || !id(attempt)) return json({ message: 'Party pass checkout is not configured.' }, 503);
    const price = await stripe.prices.retrieve(partyPrice);
    if (!price.active || price.livemode !== live || price.currency !== 'gbp' ||
        price.unit_amount !== 799 || price.type !== 'one_time') {
      return json({ message: 'Party pass price is misconfigured.' }, 503);
    }
    const url = new URL('/pub-quiz.html?party=1', origin);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: user.email,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { source: 'pub_quiz_party', purchaser: user.id },
      success_url: url.href + '&checkout=success', cancel_url: url.href,
    }, { idempotencyKey: 'quiz-party-' + user.id + '-' + attempt });
    if (session.status !== 'open' || !session.url) return json({ message: 'Checkout has already completed or expired.' }, 409);
    return json({ url: session.url });
  }
  if (!prices.standard || !prices.subscriber || prices.standard === prices.subscriber) return json({ message: 'Quiz checkout is not configured.' }, 503);
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
  const secret = webhookSecret;
  const signature = request.headers.get('stripe-signature');
  if (!stripe || !secret || !signature) return json({ message: 'Missing webhook signature.' }, 400);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret, undefined, cryptoProvider);
  } catch { return json({ message: 'Invalid webhook signature.' }, 400); }
  if (event.livemode !== live) return json({ received: true });
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const incoming = event.data.object;
    if (incoming.metadata?.source !== 'pub_quiz_party' || !partyPrice) return json({ received: true });
    const session = await stripe.checkout.sessions.retrieve(incoming.id);
    const purchaser = session.metadata?.purchaser;
    if (!purchaser || !id(purchaser) || session.mode !== 'payment' || session.payment_status !== 'paid' ||
        session.livemode !== live || session.currency !== 'gbp' || session.amount_total !== 799) return json({ received: true });
    const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
    if (lines.data.length !== 1 || lines.data[0].price?.id !== partyPrice || lines.data[0].quantity !== 1) return json({ received: true });
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const { error } = await db.from('local_quiz_party_passes').upsert(
      { checkout_id: session.id, purchaser_id: purchaser, live: session.livemode },
      { onConflict: 'checkout_id', ignoreDuplicates: true },
    );
    if (error) throw error;
    return json({ received: true });
  }
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
