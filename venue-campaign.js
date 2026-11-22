/* Organic sharing only. No credentials, automatic posts, lead collection or paid APIs. */
(() => {
  'use strict';
  const campaign = 'venue_launch_20261122';
  const channelNames = ['facebook','whatsapp','email','instagram','linkedin'];
  const landing = source => {
    const url = new URL('https://thelocal.me.uk/for-your-venue.html');
    url.search = new URLSearchParams({utm_source:source,utm_medium:'organic',utm_campaign:campaign}).toString();
    return url.href;
  };
  const incoming = new URLSearchParams(location.search);
  const source = channelNames.includes(incoming.get('utm_source')) ? incoming.get('utm_source') : 'share';
  document.querySelectorAll('[data-campaign-link]').forEach(link => {
    const url = new URL(link.getAttribute('href'),location.href);
    url.search = new URLSearchParams({utm_source:source,utm_medium:'organic',utm_campaign:campaign}).toString();
    link.href = url.href;
  });
  const picker = document.querySelector('#campaign-channel');
  const copy = document.querySelector('#campaign-copy');
  const status = document.querySelector('#share-status');
  const open = document.querySelector('#share-channel');
  const terms = 'Venue plans: £29.99/month or £299/year after a 14-day trial. Payment method required for the trial; automatic renewal unless cancelled before it ends. Member accounts are free.';
  function message(channel) {
    const url = landing(channel);
    if(channel === 'whatsapp') return `Know a pub, club or community venue that could use its own app? The Local brings venue information, events and enquiries together, with your own branding. Try the free demo—no account needed: ${url}\n\n${terms}`;
    if(channel === 'email') return `Hi,\n\nThe Local helps pubs, clubs and community venues bring events, information and enquiries together in their own branded app. Publish events with links to your ticket provider, show your facilities and receive venue enquiries.\n\nTry the free venue demo with no account needed:\n${url}\n\n${terms}\n\nQuestions or a walkthrough: info@thelocal.me.uk\n\nMichael\nThe Local`;
    const caption = `RUN A PUB, CLUB OR COMMUNITY VENUE?\n\nYour venue. Your people. Your own app.\n\n• Share events and link to your ticket provider\n• Show your rooms and receive enquiries\n• Use your own logo, colours and venue information\n\nTry the free venue demo—no account needed:\n${url}\n\n${terms}\n\nQuestions? info@thelocal.me.uk`;
    return caption + (channel === 'instagram' ? '\n\nPut the demo link in your bio or share it in a Story link. #TheLocal #Pubs #SocialClubs #CommunityVenues' : '');
  }
  function update() {
    const channel = picker.value;
    copy.value = message(channel);
    if(channel === 'whatsapp') {open.href = 'https://wa.me/?text='+encodeURIComponent(copy.value);open.textContent='Open WhatsApp';}
    else if(channel === 'facebook') {open.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(landing(channel));open.textContent='Share link on Facebook';}
    else if(channel === 'linkedin') {open.href='https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(landing(channel));open.textContent='Share link on LinkedIn';}
    else if(channel === 'email') {open.href='mailto:?subject='+encodeURIComponent('Your venue. Your people. Your own app.')+'&body='+encodeURIComponent(copy.value);open.textContent='Open email draft';}
    else {open.removeAttribute('href');open.textContent='Copy the caption, then post with the image';}
    status.textContent='';
  }
  async function copyMessage() {
    try {await navigator.clipboard.writeText(copy.value);status.textContent='Message copied. Review it before sharing.';}
    catch {copy.focus();copy.select();status.textContent='Select and copy the message above using your browser menu.';}
  }
  if(picker && copy && open) {picker.addEventListener('change',update);document.querySelector('#copy-campaign').addEventListener('click',copyMessage);update();}
  document.querySelector('#native-share')?.addEventListener('click',async () => {
    const text = 'Try The Local’s free venue demo. Your venue. Your people. Your own app.';
    try {
      if(navigator.share) {await navigator.share({title:'The Local for venues',text,url:landing('share')});status.textContent='Sharing finished.';}
      else {await navigator.clipboard.writeText(landing('share'));status.textContent='Campaign link copied.';}
    } catch(error) {status.textContent=error.name==='AbortError'?'Sharing cancelled.':'Choose a channel below and copy its message.';}
  });
})();
