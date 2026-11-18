export const venuePlans = Object.freeze({
  monthly: { label: 'Monthly', renewal: '£29.99 per month' },
  annual: { label: 'Annual', renewal: '£299 per year' }
});

export function selectedVenuePlan(params) {
  const plan = params.get('plan');
  return params.get('section') === 'billing' && Object.hasOwn(venuePlans, plan) ? plan : null;
}

export function venueSignupReturn(origin, plan) {
  const url = new URL('/index.html', origin);
  url.search = new URLSearchParams({ section: 'billing', plan, confirmed: '1' });
  return url.href;
}
