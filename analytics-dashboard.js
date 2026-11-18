import {mountUKCoverage} from './uk-coverage-v197.js';
import { memberPages, pageLabel } from './page-share.js?v=173';

const number = new Intl.NumberFormat('en-GB');
const dates = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',timeZone:'UTC'});
const format = value => number.format(Number(value) || 0);
const date = value => dates.format(new Date(value + 'T12:00:00Z'));
const extraPages = {welcome:'Welcome & sign-in','for-venues':'For Venues','venue-app':'Venue app',subscription:'Venue subscription',builder:'Venue App Builder'};
const eventNames = {
  directory_search:'Venue directory searches', venue_profile:'Venue profile views',
  venue_app:'Venue app link clicks', install_interest:'Install instructions opened',
  plan_selected:'Venue plan selected', checkout_opened:'Stripe checkout opened'
};

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function section(title, detail) {
  const element = node('section',undefined,'tl-an-card');
  element.append(node('h3',title));
  if(detail) element.append(node('p',detail,'tl-an-note'));
  return element;
}

function dataTable(title, columns, rows, detail) {
  const element = section(title, detail);
  if (!rows.length) {
    element.append(node('p','No data in this period.','tl-an-note'));
    return element;
  }
  const wrap = node('div',undefined,'tl-an-table-wrap');
  const table = node('table');
  table.setAttribute('aria-label',title);
  const head = table.createTHead().insertRow();
  for (const column of columns) {
    const th = node('th',column);
    th.scope = 'col';
    head.append(th);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    for (const value of row) tr.insertCell().textContent = typeof value === 'number' ? format(value) : value;
  }
  wrap.append(table);
  element.append(wrap);
  return element;
}

function trend(data) {
  const element = section('Activity over time','Daily visits and page views · UK time');
  const chart = node('div',undefined,'tl-an-chart');
  chart.setAttribute('aria-label','Daily activity chart');
  chart.setAttribute('role','img');
  if (!data.trend.some(row => row.visits || row.views)) {
    element.append(node('p','No measured activity in this period.','tl-an-note'));
    return element;
  }
  const max = Math.max(1,...data.trend.map(row => Math.max(row.views,row.visits)));
  for (const row of data.trend) {
    const pair = node('div',undefined,'tl-an-pair');
    pair.title = date(row.day) + ' · ' + format(row.visits) + ' visits · ' + format(row.views) + ' page views';
    for (const key of ['visits','views']) {
      const bar = node('span',undefined,'tl-an-' + key);
      bar.style.height = (100 * row[key] / max) + '%';
      pair.append(bar);
    }
    chart.append(pair);
  }
  const labels = node('div',undefined,'tl-an-dates');
  labels.append(node('span',date(data.start)),node('span','Gold: visits · Green: page views'),node('span',date(data.end)));
  const details = node('details');
  details.append(node('summary','View daily figures'),dataTable('Daily figures',['Date','Visits','Page views'],data.trend.map(row => [date(row.day),row.visits,row.views])));
  element.append(chart,labels,details);
  return element;
}

function render(result, data) {
  result.replaceChildren();
  const cards = node('div',undefined,'tl-an-summary');
  const metrics = [
    ['Measured visits',data.visits,'Visits with analytics enabled'],['Page views',data.views,'One per page per visit, per day'],
    ['New accounts',data.signups,'Accounts created in the shared project'],['Trial starts',data.trial_starts,'Live Stripe trials recorded since analytics was installed'],
    ['Current trials',data.trialing,'Live Stripe snapshot today'],['Active paid plans',data.paid,'Live Stripe snapshot today']
  ];
  for (const [label,value,detail] of metrics) {
    const card = node('section',undefined,'tl-an-card tl-an-metric');
    card.append(node('h3',label),node('strong',format(value)),node('p',detail,'tl-an-note'));
    cards.append(card);
  }
  const counts = new Map(data.actions.map(item => [item.name,item.count]));
  const pageCounts = new Map(data.pages.map(item => [item.name,item.count]));
  const venues = data.venues;
  const leaders = node('div',undefined,'tl-an-grid');
  leaders.append(
    dataTable('Traffic sources',['Source','Visits','Checkout visits'],data.sources.map(r => [r.name,r.count,r.checkout]),'First source recorded for each measured visit. Direct / unknown includes links that hide their referrer.'),
    dataTable('Venue signup journey',['Stage','Measured visits'],[
      ['For Venues page viewed',pageCounts.get('for-venues') || 0],['Plan selected',counts.get('plan_selected') || 0],['Stripe checkout opened',counts.get('checkout_opened') || 0]
    ],'Stage totals for the period. Completed trials appear above as a separate Stripe total.'),
    dataTable('Popular pages',['Page','Views'],data.pages.map(r => [extraPages[r.name] || pageLabel(memberPages[r.name]) || r.name,r.count])),
    dataTable('Community activity',['Action','Total'],Object.entries(data.community_activity),'Counts from saved table activity and venue applications, including activity before analytics was installed.'),
    dataTable('Feature activity',['Action','Visits'],Object.entries(eventNames).slice(0,4).map(([key,label]) => [label,counts.get(key) || 0])),
    dataTable('Venue locations',['Venue','Town','Profile views','App clicks','Install interest'],venues.map(r => [r.name,r.town,r.count,r.launches,r.installs]),'Town of the venue browsed. Install interest counts clicks on instructions.'),
    dataTable('Devices',['Device','Visits'],data.devices.map(r => [r.name,r.count])),
    dataTable('Campaigns',['Campaign','Source','Visits','Checkout visits'],data.campaigns.map(r => [r.name,r.source,r.count,r.checkout]),'Top 30 tagged campaigns.')
  );
  result.append(cards,trend(data),leaders);
}

function exportReport(data) {
  const rows = [['Report','Label','Detail','Count','Checkout visits','App clicks','Install interest'],
    ['Summary','Start date',data.start],['Summary','End date',data.end],
    ...[
      ['Measured visits','visits'],['Page views','views'],['New accounts','signups'],
      ['Trial starts','trial_starts'],['Current live trials','trialing'],['Active paid plans','paid']
    ].map(([label,key]) => ['Summary',label,'',data[key]]),
    ...data.trend.flatMap(r => [['Daily visits',r.day,'',r.visits],['Daily page views',r.day,'',r.views]]),
    ...Object.entries(data.community_activity).map(([name,count]) => ['Community activity',name,'',count]),
    ...data.actions.filter(r=>r.name!=='view').map(r => ['Action',eventNames[r.name] || r.name,'',r.count]),
    ...data.pages.map(r => ['Page',extraPages[r.name] || pageLabel(memberPages[r.name]) || r.name,'',r.count]),
    ...data.sources.map(r => ['Source',r.name,'',r.count,r.checkout]),
    ...data.campaigns.map(r => ['Campaign',r.name,r.source,r.count,r.checkout]),
    ...data.venues.map(r => ['Venue',r.name,r.town,r.count,'',r.launches,r.installs]),
    ...data.devices.map(r => ['Device',r.name,'',r.count])];
  const encode = value => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"','""') + '"';
  };
  const url = URL.createObjectURL(new Blob(['\uFEFF',rows.map(row => Array.from({length:7},(_,i) => encode(row[i])).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
  const a = node('a');
  a.href = url;
  a.download = 'the-local-analytics-' + data.start + '-to-' + data.end + '.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

function campaignTool() {
  const element = section('Build a campaign link','Use a tagged link in your Facebook posts, WhatsApp messages or QR codes to see which campaigns bring people in.');
  const form = node('form',undefined,'tl-an-controls');
  const field = (text, control) => {
    const label = node('label',text);
    label.append(control);
    form.append(label);
  };
  const destination = node('select');
  [['index.html','The Local home'],['index.html?page=tables','Virtual Pub Tables'],['index.html?page=venues','Find a Local'],['for-venues.html','For Venues']].forEach(([value,label]) => destination.add(new Option(label,value)));
  field('Destination',destination);
  const source = node('select');
  for(const label of ['Facebook','WhatsApp','Instagram','TikTok','Email','QR code','Shared link']) {
    source.add(new Option(label,({'QR code':'qr','Shared link':'share'})[label] || label.toLowerCase()));
  }
  field('Source',source);
  const campaign = node('input');
  campaign.required = true;
  campaign.maxLength = 40;
  campaign.pattern = '[A-Za-z0-9][A-Za-z0-9_\\-]{0,39}';
  campaign.placeholder = 'e.g. pub-tables-reel';
  field('Campaign name',campaign);
  form.append(node('button','Generate link'));
  const output = node('input');
  output.setAttribute('aria-label','Generated campaign URL');
  output.readOnly = true;
  output.hidden = true;
  const copy = node('button','Copy link');
  copy.type = 'button';
  copy.hidden = true;
  const status = node('p',undefined,'tl-an-note');
  status.setAttribute('role','status');
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = 'Link copied.'; }
    catch { output.focus(); output.select(); status.textContent = 'Select and copy the link.'; }
  };
  form.onsubmit = event => {
    event.preventDefault();
    const url = new URL(destination.value,'https://thelocal.me.uk/');
    url.searchParams.set('utm_source',source.value);
    url.searchParams.set('utm_campaign',campaign.value.toLowerCase());
    output.value = url.href;
    output.hidden = copy.hidden = false;
    status.textContent = '';
    output.focus();
    output.select();
  };
  element.append(form,output,copy,status);
  return element;
}

function memberDirectory(sb) {
  const panel=section('Member locations & contact directory','Platform owner only. Shows contact details and locations already supplied at registration or stored in account metadata. No IP geolocation, GPS tracking or inferred locations.');
  const message=node('p','Load this directory only when you need to manage member records.','tl-an-note');
  const controls=node('div',undefined,'tl-an-controls');
  const open=node('button','Load member directory');open.type='button';
  const search=node('input');search.type='search';search.placeholder='Search name, email, town or postcode';search.setAttribute('aria-label','Search member directory');search.hidden=true;
  const exportBtn=node('button','Export member contacts CSV');exportBtn.type='button';exportBtn.hidden=true;
  const output=node('div');
  controls.append(open,search,exportBtn);panel.append(message,controls,output);
  let members=[];
  const clean=v=>String(v??'').trim();
  const rows=()=>members.filter(m=>[m.name,m.email,m.phone,m.town,m.region,m.postcode,m.country].some(v=>clean(v).toLowerCase().includes(search.value.trim().toLowerCase())));
  const show=()=>{
    const filtered=rows();
    const loc=filtered.filter(m=>m.town||m.region||m.postcode||m.country);
    const summary=node('p',`${filtered.length} members shown · ${loc.length} with a supplied location · ${filtered.filter(m=>m.email).length} with email · ${filtered.filter(m=>m.phone).length} with phone`,'tl-an-note');
    const counts=new Map();for(const m of loc){const key=[m.town,m.region,m.country].filter(Boolean).join(', ')||'Postcode supplied (town unknown)';counts.set(key,(counts.get(key)||0)+1)}
    const places=dataTable('Member locations',['Town / area','Members'],[...counts].sort((a,b)=>b[1]-a[1]).map(([place,n])=>[place,n]),'Counts based only on supplied profile fields.');
    const contacts=dataTable('Member contact records',['Name','Email','Telephone','Town','Region','Postcode','Country','Joined','Last sign-in'],filtered.slice(0,500).map(m=>[m.name||'Not supplied',m.email||'Not supplied',m.phone||'Not supplied',m.town||'—',m.region||'—',m.postcode||'—',m.country||'—',m.joined?new Date(m.joined).toLocaleDateString('en-GB'):'—',m.last_seen?new Date(m.last_seen).toLocaleDateString('en-GB'):'—']),'Owner-only personal information. Keep exports secure and use contact details only for appropriate purposes.');
    output.replaceChildren(summary,places,contacts);
  };
  open.onclick=async()=>{
    open.disabled=true;message.textContent='Checking platform owner access and loading member records…';
    try{
      const {data,error}=await sb.rpc('local_owner_member_directory',{p_limit:1000});if(error)throw error;
      members=Array.isArray(data?.members)?data.members:[];
      message.textContent=`${members.length} most recent accounts loaded${data?.total>members.length?' (of '+data.total+' total)':''}. Fields not collected by The Local remain blank. Data is not sent to third parties.`;
      search.hidden=false;exportBtn.hidden=false;open.textContent='Refresh member directory';show();
    }catch(e){message.textContent=e?.code==='PGRST202'?'Member directory setup required: run INSTALL-V196-MEMBER-ANALYTICS.sql in Supabase.':'Directory unavailable. Check platform owner access and Supabase setup.'}
    finally{open.disabled=false}
  };
  search.oninput=show;
  exportBtn.onclick=()=>{
    const fields=['name','email','phone','town','region','postcode','country','joined','last_seen'];
    const quote=v=>{let t=clean(v);if(/^[\s]*[=+@-]/.test(t))t="'"+t;return '"'+t.replaceAll('"','""')+'"'};
    const csv=[fields.join(','),...rows().map(m=>fields.map(k=>quote(m[k])).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const a=node('a');a.href=url;a.download='the-local-member-contacts.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return panel;
}

export function mountAnalytics(root, sb) {
  const dashboard = node('div',undefined,'tl-an-dashboard');
  const heading = node('header',undefined,'tl-an-heading');
  heading.append(node('h2','Platform analytics'),node('p','See what people use, which campaigns bring visitors in and how venue trials are performing.','tl-an-note'));
  const controls = node('div',undefined,'tl-an-controls');
  const period = node('select');
  for (const days of [7,30,90]) period.add(new Option('Last ' + days + ' days',days));
  period.value = '30';
  const label = node('label','Date range');
  label.append(period);
  const refresh = node('button','Refresh');
  const download = node('button','Export CSV');
  refresh.type = download.type = 'button';
  controls.append(label,refresh,download);
  const status = node('p',undefined,'tl-an-note');
  status.setAttribute('role','status');
  const result = node('div',undefined,'tl-an-result');
  dashboard.append(heading,controls,status,result,campaignTool());
  root.replaceChildren(dashboard);
  const coverage=section('UK member & venue coverage','Owner-only aggregated locations. Select Members or Venues and explore town concentrations.');
  const mapArea=node('div');coverage.append(mapArea);
  const mapButton=node('button','Load UK coverage map');mapButton.type='button';mapButton.onclick=()=>{mapButton.disabled=true;mountUKCoverage(mapArea,sb).finally(()=>{mapButton.disabled=false})};
  coverage.insertBefore(mapButton,mapArea);
  sb.rpc('local_is_owner').then(({data,error})=>{if(!error&&data===true&&dashboard.isConnected)dashboard.append(coverage)}).catch(()=>{});
  const contactArea=node('div');dashboard.append(contactArea);
  // The database RPC independently enforces owner-only access.
  sb.rpc('local_is_owner').then(({data,error})=>{if(!error&&data===true&&dashboard.isConnected)contactArea.append(memberDirectory(sb));}).catch(()=>{});
  let current, request = 0;
  const load = async () => {
    const id = ++request;
    download.disabled = true;
    refresh.disabled = true;
    result.replaceChildren();
    status.textContent = 'Loading analytics…';
    try {
      const { data,error } = await sb.rpc('local_analytics_report',{p_days:Number(period.value)});
      if (id !== request || !dashboard.isConnected) return;
      if (error) throw error;
      current = data;
      render(result,data);
      status.textContent = date(data.start) + ' to ' + date(data.end) + ' · Visits include people who allow analytics.';
      download.disabled = false;
    } catch (error) {
      if(id !== request || !dashboard.isConnected) return;
      status.textContent = error.code === 'PGRST202'
        ? 'Analytics setup is required. Run INSTALL-V174-ANALYTICS.sql in The Local’s Supabase project.'
        : 'Analytics could not be loaded. Check your platform administrator access and try again.';
    } finally {
      if (id === request) refresh.disabled = false;
    }
  };
  period.onchange = refresh.onclick = load;
  download.onclick = () => exportReport(current);
  void load();
}
