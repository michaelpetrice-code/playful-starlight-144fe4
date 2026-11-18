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
      if (!data.eligible && !data.subscribed && !awaitingActivation) {
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
      if(data.customer) plans.append(button('Manage billing','portal'));
      status.textContent=data.eligible ? 'Venue App Builder access is active.' :
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
