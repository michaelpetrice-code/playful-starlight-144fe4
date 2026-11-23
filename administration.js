import { seasonalAdminView, bindSeasonalAdmin } from './seasonal-decorations.js?v=249';
import { mountAnalytics } from './analytics-dashboard.js?v=196';
import { ownerView, bindOwner } from './owner-dashboard.js';
import { adminView, bindAdmin } from './local-admin.js';
import { mountClubAdmin } from './simple-admin-v82.js';
import { mountVenueControls } from './venue-control.js?v=198';
import { venueApprovalsView, bindVenueApprovals } from './venue-approvals.js';
import { safetyView, bindSafety } from './safety-reporting.js';

export async function loadAdministration(sb, user, ownerAccess) {
  if (!sb || !user) return null;
  const [local, role, staff] = await Promise.all([
    sb.rpc('is_local_admin'),
    sb.rpc('local_administration_roles'),
    sb.from('platform_venue_staff').select('role,venue_id,platform_venues(id,name,slug)')
      .eq('user_id', user.id).in('role', ['owner', 'admin', 'manager'])
  ]);
  const controls = {
    owner: ownerAccess,
    local: !local.error && local.data === true,
    applications: !role.error && role.data?.applications === true,
    safety: !role.error && role.data?.safety === true,
    staff: staff.error ? [] : (staff.data || []).filter(row => row.platform_venues)
  };
  return controls.owner || controls.local || controls.applications || controls.safety || controls.staff.length ? controls : null;
}

export function mountAdministration(root, context, access, openPane) {
  const content = root.querySelector('[data-admin-content]');
  const menu = root.querySelector('[data-admin-menu]');
  const panes = [];
  if (access.owner) panes.push(['overview', 'Owner dashboard', ownerView, () => bindOwner(context)]);
  if (access.owner) panes.push(['analytics', 'Analytics', () => '', () => mountAnalytics(content, context.sb)]);
  if (access.owner || access.local) {
    panes.push(['seasonal', 'Seasonal decorations', seasonalAdminView, () => bindSeasonalAdmin(content)]);
    panes.push(['content', 'Club content & notifications', () => '', () => mountClubAdmin(context.sb, context.user, content)]);
    panes.push(['market', 'Marketplace & trades', adminView, () => bindAdmin(context)]);
  }
  if (access.owner || access.applications) panes.push(['applications', 'Venue applications', () => venueApprovalsView(true), () => bindVenueApprovals(context)]);
  if (access.owner || access.safety) panes.push(['safety', 'Safety reports', () => safetyView(true), () => bindSafety({ ...context, committee: true })]);
  if (access.staff.length) panes.push(['venue', 'Venue controls', () => '', () => mountVenueControls({ ...context, staff: access.staff }, content)]);

  if(access.owner) panes.splice(1,0,['assistant','Guided assistant',ownerView,async()=>{await bindOwner(context);content.querySelector('[data-owner-focus=assistant]')?.click();}]);
  root.classList.add('tl197-admin');
  const intro=document.createElement('div');intro.className='tl197-admin-intro';intro.innerHTML='<span class="tl197-kicker">THE LOCAL · CONTROL CENTRE</span><h2>Your control centre</h2><p>Start with Owner dashboard for priorities, income, members and content. Choose a specialist section for venue approvals, safety or analytics. Access follows your verified permissions.</p>';
  root.insertBefore(intro,menu);
  menu.classList.add('admin-task-menu');content.classList.add('admin-task-content');
  const buttons = new Map();
  let active;
  function show(name) {
    const pane = panes.find(item => item[0] === name);
    if (!pane || pane[0] === active) return;
    active = name;
    for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(name === key));
    content.innerHTML = pane[2]();
    Promise.resolve().then(() => { if (active === name && root.isConnected) return pane[3](); }).catch(error => {
      if (active === name && root.isConnected) content.textContent = error.message || 'Unable to load this section.';
    });
  }
  for (const [name, label] of panes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.adminPane = name;
    button.textContent = label;
    button.onclick = () => show(name);
    buttons.set(name, button);
    menu.append(button);
  }
  content.addEventListener('click', event => {
    const name = event.target.closest('[data-owner-pane]')?.dataset.ownerPane;
    if (name) show(name);
  });
  show(buttons.has(openPane) ? openPane : panes[0]?.[0]);
}
