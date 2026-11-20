import { track } from './analytics-track.js?v=174';
import { el } from './venue-app-content.js';
import { selectedVenuePlan, venuePlans } from './venue-plans.js?v=154';

export function mountBilling(root, sb, user, params) {
  const status=el('p',{role:'status'},'Checking subscription…');
  const plans=el('div',{className:'tl149-plans'});
  root.replaceChildren(el('h1',{},'Venue subscription'),el('p',{},'Build and publish your branded venue app.'),plans,status);
  if(!sb || !user){status.textContent='Sign in to choose a venue subscription.';return;}
  const controls=[];
  const preferred = selectedVenuePlan(params);
  const awaitingActivation = params.get('checkout') === 'success';
  const emailConfirmed = params.get('confirmed') === '1' && Boolean(user.email_confirmed_at);
  function button(label,action,plan) {
    const control=el('button',{type:'button'},label);
    control.className = 'tl149-action tl-signup-primary';
    control.addEventListener('click',async()=>{
      controls.forEach(item=>{item.disabled=true});
      status.textContent='Opening Stripe…';
      try {
        const {data,error}=await sb.functions.invoke('venue-billing',{body:{action,plan}});
        if (error) {
          const detail=await error.context?.json?.().catch(()=>null);
          throw Error(detail?.message || 'Stripe could not be opened.');
        }
        if(data.complimentary){status.textContent='Owner access is permanently complimentary. No checkout or payment details are required.';location.assign('index.html?section=venue-app-builder');return;}
        const url=new URL(data.url);
        if(url.protocol!=='https:' || !['checkout.stripe.com','billing.stripe.com'].includes(url.hostname)) throw Error('Stripe returned an unexpected address.');
        if(action==='checkout') void track('checkout_opened','subscription');
        location.assign(url.href);
      } catch(error){status.textContent=error.message;controls.forEach(item=>{item.disabled=false});}
    });
    controls.push(control);
    return control;
  }
  async function show() {
    try {
      const {data,error}=await sb.rpc('local_billing_status');
      if(error) throw error;
      if(!root.isConnected)return;
      controls.length=0;
      plans.replaceChildren();
      if (!data.complimentary && !data.eligible && !data.subscribed && !awaitingActivation) {
        if (preferred) {
          const plan = venuePlans[preferred];
          plans.append(el('article', { className: 'tl149-panel tl-venue-plan-summary' },
            emailConfirmed ? el('p', {}, 'Your email is confirmed.') : null,
            el('h2', {}, plan.label + ' plan'),
            el('p', {}, '14 days free, then ' + plan.renewal + '.'),
            el('p', {}, 'No payment today. Stripe asks for a payment method. Your subscription renews automatically unless you cancel before the trial ends through Manage billing.'),
            button('Start my free trial', 'checkout', preferred),
            el('p', {}, el('a', { href: 'for-venues.html#plans' }, 'Change plan'))));
        } else {
          plans.append(el('a', { className: 'tl149-action', href: 'for-venues.html#plans' }, 'Choose a plan'));
        }
      }
      if(data.complimentary){
        const summary=el('p',{role:'status'},'Your platform-owner entitlement is permanently complimentary. It does not expire after 14 days and requires no payment details.');
        const panel=el('section',{className:'tl149-panel'},el('h2',{},'Owner access · £0'),summary);
        const preview=el('p',{},'Choose a plan below to preview its wording. This is an owner-only preview, not a Stripe checkout or a new subscription.');
        for(const id of ['monthly','annual']){const b=el('button',{type:'button'},'Preview '+venuePlans[id].label.toLowerCase()+' plan — no card');b.onclick=()=>{preview.textContent=venuePlans[id].label+' plan preview: ordinary venues see '+venuePlans[id].renewal+'. Your owner account remains £0 with permanent access. No subscription or charge was created.';};panel.append(b);}
        panel.append(preview);if(data.customer)panel.append(el('p',{},'Existing Stripe trials or subscriptions must be checked separately. Complimentary app access alone does not cancel a scheduled Stripe charge. Use Manage existing billing below until that check is complete.'));plans.append(panel);
      }
      if (data.eligible) {
        const accessPanel = el('section', { className: 'tl176-builder-access' },
          el('h2', {}, 'Your Venue App Builder is ready'),
          el('p', {}, 'Your access is active. Create, edit and manage your venue app here.'),
          el('a', {
            className: 'tl149-action tl176-builder-open',
            href: 'index.html?section=venue-app-builder',
            'aria-label': 'Open your Venue App Builder'
          }, 'Open Venue App Builder'));
        plans.prepend(accessPanel);
      }
      if(data.customer) plans.append(button(data.complimentary?'Manage existing billing':'Manage billing','portal'));
      status.textContent=data.complimentary ? 'Permanent complimentary owner access is active. No payment is required for your app access.' : data.eligible ? 'Venue App Builder access is active.' :
        params.get('checkout')==='success' ? 'Waiting for Stripe to confirm your subscription. Check again shortly.' :
        params.get('checkout')==='cancelled' ? 'You left checkout before subscribing. An open Stripe session may take up to 32 minutes to expire.' : '';
      if(!data.eligible && params.get('checkout')==='success') {
        const check=el('button',{type:'button'},'Check activation');
        check.onclick=()=>{check.disabled=true;show().finally(()=>{check.disabled=false});};
        plans.append(check);
      }
    } catch {status.textContent='Subscription information is unavailable. Try refreshing this page.';}
  }
  show();
}
