// Shared, factual feature catalogue for visitors and members.
export const features = [
 ['tables','Virtual Pub Tables','Keep your group together','Private table conversations, invitations, photos and plans.','Virtual Pub Tables','virtual-pub-tables','Meet'],
 ['messages','Private messages','Keep the conversation going','Start or join a private chat with people you invite.','Private Chats','virtual-pub-tables','Meet'],
 ['feed','Community feed','See what’s happening','Share local news, photos and updates with your community.','Local Updates','whos-up-for-it','Meet'],
 ['venues','Find a Local','Find your next favourite place','Explore participating pubs, social clubs and community venues.','Venue Hub','discover-venues','Discover'],
 ['events','Events & plans','Make a night of it','Discover venue events and organise plans with your community.','Who’s Up for It?','whos-up-for-it','Discover'],
 ['marketplace','Buy, Sell or Give Away','Give good things another home','Browse, list and message about items in your local marketplace.','Buy, Sell or Give Away','marketplace','Discover'],
 ['trades','Trades & services','Find help close to home','Explore local providers and their service listings.','Trades & Services','local-tradesmen','Discover'],
 ['games','Games Room','Bring the pub games with you','Explore browser games, practise and challenge yourself. Available modes vary by game.','Arcade','games-room','Play'],
 ['football','Football','Follow the match together','Explore football updates and analysis. Any paid options are shown separately.','Football','campaigns/football-gold-3d.jpg','Play'],
 ['quiz','Quiz','Put your knowledge to the test','Try a quiz and enjoy a little friendly competition.','Quiz','games-v68/quiz.webp','Play'],
 ['pub-quiz-pro','Pub Quiz Pro','Bring quiz night to your venue','Host themed rounds with pictures and video, phone answers and a projector display. Players join free. Paid hosting is coming soon.','Pub Quiz Pro','quiz-winner.webp','Premium'],
 ['challenges','Competitions & leaderboards','Add some friendly rivalry','Explore tournaments and community standings.','Tournaments','club-competitions','Play'],
 ['photos','Photos & memories','Keep the good times together','Share photos with your community. Member galleries require sign-in.','Photos','tl65-pub-hero.webp','Meet'],
 ['rounds','Rounds & kitty','Keep the group organised','Track rounds and the group kitty with your community.','Rounds','buy-a-round','Meet'],
 ['kitty','Group kitty','Keep track together','Record your community kitty and shared contributions.','Kitty','buy-a-round','Meet'],
 ['leaderboard','Leaderboards','Follow your progress','See standings from activities recorded by your community.','Leaderboard','club-competitions','Play'],
 ['community','Your community','Make your Local yours','Find your community members and shared activities.','Community','discover-venues','Meet'],
 ['safety','Safety & inclusion','Help keep your community welcoming','Privately report behaviour that needs attention from authorised reviewers.','Report Behaviour','tl65-pub-hero.webp','Meet'],
 ['rewards','Rewards & membership','More from your venue','See membership and reward options offered by participating venues. Availability varies.','Venue Hub','rewards-membership','For venues'],
 ['tickets','Tickets & bookings','Plan your next visit','Explore events and booking options on participating venue pages. Prices and availability vary.','Events','whos-up-for-it','For venues'],
 ['alerts','Message alerts','Don’t miss the conversation','Receive supported message alerts after allowing notifications on your device.','Alerts','virtual-pub-tables','Meet'],
 ['install','Install The Local','Keep your Local close','Add The Local to your phone or computer using a supported browser.','Install','campaigns/venue-launch.jpg','Discover'],
 ['builder','Your own venue app','Make your venue the destination','Explore a branded app for your venue, with events, content and member tools. Venue subscriptions are separate.','Venue App Builder','campaigns/venue-launch.jpg','For venues']
].map(([id,name,title,description,page,image,category])=>Object.freeze({id,name,title,description,page,image,category}));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function featureHref(feature){
 if(feature.id==='builder')return 'for-venues.html';
 if(feature.id==='pub-quiz-pro')return 'pub-quiz-pro.html';
 if(feature.id==='dj'||feature.id==='race-night')return 'guest.html?page='+feature.id;
 if(feature.id==='football')return 'football.html';
 if(feature.id==='install')return 'install.html';
 const publicPages=new Set(['tables','venues','events','marketplace','trades','games','challenges','photos','rounds','rewards','tickets']);
 return publicPages.has(feature.id)?'guest.html?page='+feature.id:'index.html?section='+encodeURIComponent({'Private Chats':'messages','Local Updates':'feed',Alerts:'alerts',Quiz:'quiz',Kitty:'kitty',Leaderboard:'leaderboard',Community:'community','Report Behaviour':'report'}[feature.page]||feature.id);
}
export function featureGallery({member=false}={}){
 return `<section class="social-feature-section" aria-labelledby="social-feature-title"><div class="social-section-heading"><div><span class="social-eyebrow">MORE THAN A FEED</span><h2 id="social-feature-title">One Local. Plenty to discover.</h2><p>Meet, make plans, play and support your local community.</p></div></div><div class="social-feature-grid">${features.map(f=>`<article class="social-feature-card" style="background:linear-gradient(150deg,#17130e,#080808)!important;border:1px solid #c69b46!important"><img ${f.image.endsWith(".svg") ? 'class="social-feature-icon"' : ""} src="${["messages","feed","photos","kitty","leaderboard","community","safety","tickets","alerts","install","quiz","builder"].includes(f.id) ? f.id + ".webp" : "assets/" + (f.image.includes(".") ? f.image : "feature-slides/" + f.image + ".webp")}" alt="" width="504" height="333" loading="lazy"><div><h3>${f.name}</h3><p>${f.description}</p>${member&&f.id!=='pub-quiz-pro'?`<button type="button" data-go="${esc(f.page)}">Open <span aria-hidden="true">→</span></button>`:`<a href="${esc(featureHref(f))}">Open <span aria-hidden="true">→</span></a>`}</div></article>`).join('')}</div><p class="social-terms">Personal membership and account setup are free. Venue subscriptions, event tickets and optional paid services are separate. Venue features depend on the participating venue.</p></section>`;
}
export function visitorIntroduction(){return `<section class="social-visitor-hero"><div><span class="social-eyebrow">YOUR PEOPLE. YOUR PLANS. YOUR LOCAL.</span><h2>Your community,<br>closer together.</h2><p>Find somewhere to go, people to go with and more reasons to come back.</p><div class="social-visitor-actions"><a class="social-primary" href="index.html?register=1">Join free</a><a href="guest.html?page=venues">Find a Local</a></div><p class="social-free-note">Free personal membership · No payment details to join</p></div><img src="assets/tl65-pub-hero.webp" width="504" height="333" alt="Friends enjoying time together at a pub"></section>`;}
