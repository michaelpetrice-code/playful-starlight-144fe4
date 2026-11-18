import { blankApp, el, features, httpsUrl, renderVenue, slugify, themes } from './venue-app-content.js';

export async function mountVenueBuilder(root, sb, user) {
  if (!root) return;
  const status = el('p', { className: 'vb-status', role: 'status' }, 'Checking venue subscription…');
  root.replaceChildren(status);
  if (!sb || !user) {
    status.textContent = 'Sign in to The Local with your venue subscriber account to build an app.';
    return;
  }
  const { data, error } = await sb.rpc('local_builder_get');
  if (!root.isConnected) return;
  if (error || !data?.eligible) {
    status.textContent = error ? 'The builder is temporarily unavailable. Try again later.' :
      'An active venue subscription is required. Contact The Local to activate builder access.';
    return;
  }

  // v205: server-authorised team controls. The owner counts towards five places.
  const teamPanel = el('section', { className: 'vb-team-panel' });
  teamPanel.style.cssText = 'padding:18px;margin:16px 0;border:1px solid #b59a53;border-radius:14px';
  const teamHeading = el('h3', {}, 'App administrators');
  const teamStatus = el('p', { role: 'status' }, 'Loading administrators…');
  const teamList = el('div');
  const teamForm = el('form');
  const teamInput = el('input', { type: 'text', placeholder: 'Existing member UUID', required: true });
  teamInput.setAttribute('aria-label', 'Existing member user ID');
  const teamAdd = el('button', { type: 'submit' }, 'Add administrator');
  teamForm.append(teamInput, teamAdd);
  teamPanel.append(teamHeading, teamStatus, teamList, teamForm);
  async function refreshTeam() {
    const { data: team, error: teamError } = await sb.rpc('local_builder_team_list');
    if (teamError) { teamStatus.textContent = 'Team settings unavailable: ' + teamError.message; teamForm.hidden = true; return; }
    const members = team.members || [];
    const hasOwnerRecord = members.some(m => m.role === 'owner');
    const count = members.length + (hasOwnerRecord ? 0 : 1);
    teamStatus.textContent = `${count} of 5 administrator places used, including owner.`;
    teamForm.hidden = !team.is_owner || count >= 5;
    teamList.replaceChildren();
    for (const member of members) {
      const line = el('p', {}, `${member.role === 'owner' ? 'Owner' : 'Administrator'} · ${member.user_id}`);
      if (team.is_owner && member.role === 'admin') {
        const remove = el('button', { type: 'button' }, 'Remove');
        remove.addEventListener('click', async () => {
          if (!confirm('Remove this administrator?')) return;
          const { error: removeError } = await sb.rpc('local_builder_team_remove', { p_user: member.user_id });
          teamStatus.textContent = removeError ? removeError.message : 'Administrator removed.';
          if (!removeError) await refreshTeam();
        });
        line.append(' ', remove);
      }
      teamList.append(line);
    }
    if (!members.length) teamList.append(el('p', {}, 'Only the app owner currently has access.'));
  }
  teamForm.addEventListener('submit', async event => {
    event.preventDefault();
    teamAdd.disabled = true;
    const { error: addError } = await sb.rpc('local_builder_team_add', { p_user: teamInput.value.trim() });
    teamStatus.textContent = addError ? addError.message : 'Administrator added.';
    if (!addError) { teamInput.value = ''; await refreshTeam(); }
    teamAdd.disabled = false;
  });
  root.prepend(teamPanel);
  refreshTeam();

  const mediaBucket = 'local-venue-media';
  async function uploadImage(file, onComplete, message) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message.textContent = 'Choose a JPG, PNG or WebP image.'; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.textContent = 'Images must be 5 MB or smaller.'; return;
    }
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    message.textContent = 'Uploading image…';
    const { error } = await sb.storage.from(mediaBucket).upload(path, file, {
      contentType: file.type, upsert: false, cacheControl: '3600'
    });
    if (error) { message.textContent = `Upload failed: ${error.message}. Check the media storage setup.`; return; }
    const { data: publicData } = sb.storage.from(mediaBucket).getPublicUrl(path);
    if (!httpsUrl(publicData?.publicUrl)) { message.textContent = 'Unable to get a public image URL.'; return; }
    onComplete(publicData.publicUrl);
    message.textContent = 'Image uploaded. Save your draft or publish to keep this change.';
  }
  function imagePicker(label, onComplete) {
    const input = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': label });
    const message = el('small', { className: 'vb-upload-status', role: 'status' }, 'JPG, PNG or WebP, up to 5 MB');
    input.addEventListener('change', async () => {
      input.disabled = true;
      try { await uploadImage(input.files?.[0], onComplete, message); }
      finally { input.disabled = false; input.value = ''; }
    });
    return el('div', { className: 'vb-image-picker' }, el('label', {}, label, input), message);
  }
  const libraryItems = [["Pub atmosphere", "assets/tl65-pub-hero.webp", "Photo", "pub bar drinks welcome"], ["Venue discovery", "assets/feature-slides/discover-venues.webp", "Photo", "venue location contact find"], ["Events", "assets/feature-slides/whos-up-for-it.webp", "Photo", "events what on tickets party"], ["Room hire", "assets/coombe/concert-room.webp", "Photo", "room hire booking function concert"], ["Lounge", "assets/coombe/lounge.webp", "Photo", "lounge room hire meeting"], ["Games", "assets/feature-slides/games-room.webp", "Photo", "games darts pool snooker"], ["Rewards", "assets/feature-slides/rewards-membership.webp", "Photo", "rewards loyalty membership"], ["Competitions", "assets/feature-slides/club-competitions.webp", "Photo", "competition bingo draw raffle"], ["Community", "assets/feature-slides/virtual-pub-tables.webp", "Photo", "community social members"], ["Marketplace", "assets/feature-slides/marketplace.webp", "Photo", "marketplace buy sell"], ["Local trades", "assets/feature-slides/local-tradesmen.webp", "Photo", "trades local"], ["Calendar", "assets/builder-library/calendar.svg", "Icon", "events dates schedule"], ["Tickets", "assets/builder-library/ticket.svg", "Icon", "tickets booking payment"], ["Live music", "assets/builder-library/music.svg", "Icon", "music band concert live"], ["Competitions", "assets/builder-library/trophy.svg", "Icon", "competition draw raffle"], ["Rewards", "assets/builder-library/gift.svg", "Icon", "rewards prizes gifts"], ["Gallery", "assets/builder-library/camera.svg", "Icon", "photos gallery"], ["Community", "assets/builder-library/users.svg", "Icon", "members social groups"], ["Cafe", "assets/builder-library/coffee.svg", "Icon", "cafe coffee food"], ["Charity", "assets/builder-library/heart.svg", "Icon", "charity fundraiser"], ["Featured", "assets/builder-library/star.svg", "Icon", "featured popular"], ["Room hire", "assets/builder-library/home.svg", "Icon", "room hire building"], ["Games", "assets/builder-library/gamepad.svg", "Icon", "games gaming"]];
  // v199: locally bundled expanded media library. Existing assets are reused; new icons are original SVG badges.
  libraryItems.push(...[["Food & Drink 01", "assets/studio-icons/food-drink-01.svg", "Icon", "food & drink 🍺", "Food & Drink"], ["Food & Drink 02", "assets/studio-icons/food-drink-02.svg", "Icon", "food & drink 🍻", "Food & Drink"], ["Food & Drink 03", "assets/studio-icons/food-drink-03.svg", "Icon", "food & drink 🍷", "Food & Drink"], ["Food & Drink 04", "assets/studio-icons/food-drink-04.svg", "Icon", "food & drink 🍸", "Food & Drink"], ["Food & Drink 05", "assets/studio-icons/food-drink-05.svg", "Icon", "food & drink 🥂", "Food & Drink"], ["Food & Drink 06", "assets/studio-icons/food-drink-06.svg", "Icon", "food & drink 🍹", "Food & Drink"], ["Food & Drink 07", "assets/studio-icons/food-drink-07.svg", "Icon", "food & drink ☕", "Food & Drink"], ["Food & Drink 08", "assets/studio-icons/food-drink-08.svg", "Icon", "food & drink 🫖", "Food & Drink"], ["Food & Drink 09", "assets/studio-icons/food-drink-09.svg", "Icon", "food & drink 🍔", "Food & Drink"], ["Food & Drink 10", "assets/studio-icons/food-drink-10.svg", "Icon", "food & drink 🍕", "Food & Drink"], ["Food & Drink 11", "assets/studio-icons/food-drink-11.svg", "Icon", "food & drink 🍟", "Food & Drink"], ["Food & Drink 12", "assets/studio-icons/food-drink-12.svg", "Icon", "food & drink 🥪", "Food & Drink"], ["Food & Drink 13", "assets/studio-icons/food-drink-13.svg", "Icon", "food & drink 🍽️", "Food & Drink"], ["Food & Drink 14", "assets/studio-icons/food-drink-14.svg", "Icon", "food & drink 🍰", "Food & Drink"], ["Food & Drink 15", "assets/studio-icons/food-drink-15.svg", "Icon", "food & drink 🥗", "Food & Drink"], ["Entertainment 01", "assets/studio-icons/entertainment-01.svg", "Icon", "entertainment 🎤", "Entertainment"], ["Entertainment 02", "assets/studio-icons/entertainment-02.svg", "Icon", "entertainment 🎸", "Entertainment"], ["Entertainment 03", "assets/studio-icons/entertainment-03.svg", "Icon", "entertainment 🎹", "Entertainment"], ["Entertainment 04", "assets/studio-icons/entertainment-04.svg", "Icon", "entertainment 🎵", "Entertainment"], ["Entertainment 05", "assets/studio-icons/entertainment-05.svg", "Icon", "entertainment 🎶", "Entertainment"], ["Entertainment 06", "assets/studio-icons/entertainment-06.svg", "Icon", "entertainment 🎧", "Entertainment"], ["Entertainment 07", "assets/studio-icons/entertainment-07.svg", "Icon", "entertainment 🎭", "Entertainment"], ["Entertainment 08", "assets/studio-icons/entertainment-08.svg", "Icon", "entertainment 🎬", "Entertainment"], ["Entertainment 09", "assets/studio-icons/entertainment-09.svg", "Icon", "entertainment 🎟️", "Entertainment"], ["Entertainment 10", "assets/studio-icons/entertainment-10.svg", "Icon", "entertainment 🎯", "Entertainment"], ["Entertainment 11", "assets/studio-icons/entertainment-11.svg", "Icon", "entertainment 🎱", "Entertainment"], ["Entertainment 12", "assets/studio-icons/entertainment-12.svg", "Icon", "entertainment 🎲", "Entertainment"], ["Entertainment 13", "assets/studio-icons/entertainment-13.svg", "Icon", "entertainment 🃏", "Entertainment"], ["Entertainment 14", "assets/studio-icons/entertainment-14.svg", "Icon", "entertainment ♟️", "Entertainment"], ["Entertainment 15", "assets/studio-icons/entertainment-15.svg", "Icon", "entertainment 🎮", "Entertainment"], ["Events 01", "assets/studio-icons/events-01.svg", "Icon", "events 📅", "Events"], ["Events 02", "assets/studio-icons/events-02.svg", "Icon", "events 🗓️", "Events"], ["Events 03", "assets/studio-icons/events-03.svg", "Icon", "events 🎉", "Events"], ["Events 04", "assets/studio-icons/events-04.svg", "Icon", "events 🎊", "Events"], ["Events 05", "assets/studio-icons/events-05.svg", "Icon", "events 🎈", "Events"], ["Events 06", "assets/studio-icons/events-06.svg", "Icon", "events 🎁", "Events"], ["Events 07", "assets/studio-icons/events-07.svg", "Icon", "events 🏆", "Events"], ["Events 08", "assets/studio-icons/events-08.svg", "Icon", "events 🥇", "Events"], ["Events 09", "assets/studio-icons/events-09.svg", "Icon", "events 🎫", "Events"], ["Events 10", "assets/studio-icons/events-10.svg", "Icon", "events 📣", "Events"], ["Events 11", "assets/studio-icons/events-11.svg", "Icon", "events 🔔", "Events"], ["Events 12", "assets/studio-icons/events-12.svg", "Icon", "events 📢", "Events"], ["Venue & Facilities 01", "assets/studio-icons/venue-facilities-01.svg", "Icon", "venue & facilities 🏠", "Venue & Facilities"], ["Venue & Facilities 02", "assets/studio-icons/venue-facilities-02.svg", "Icon", "venue & facilities 🏡", "Venue & Facilities"], ["Venue & Facilities 03", "assets/studio-icons/venue-facilities-03.svg", "Icon", "venue & facilities 🏛️", "Venue & Facilities"], ["Venue & Facilities 04", "assets/studio-icons/venue-facilities-04.svg", "Icon", "venue & facilities 🏟️", "Venue & Facilities"], ["Venue & Facilities 05", "assets/studio-icons/venue-facilities-05.svg", "Icon", "venue & facilities 🏢", "Venue & Facilities"], ["Venue & Facilities 06", "assets/studio-icons/venue-facilities-06.svg", "Icon", "venue & facilities 🪑", "Venue & Facilities"], ["Venue & Facilities 07", "assets/studio-icons/venue-facilities-07.svg", "Icon", "venue & facilities 🛋️", "Venue & Facilities"], ["Venue & Facilities 08", "assets/studio-icons/venue-facilities-08.svg", "Icon", "venue & facilities 🚪", "Venue & Facilities"], ["Venue & Facilities 09", "assets/studio-icons/venue-facilities-09.svg", "Icon", "venue & facilities 🅿️", "Venue & Facilities"], ["Venue & Facilities 10", "assets/studio-icons/venue-facilities-10.svg", "Icon", "venue & facilities ♿", "Venue & Facilities"], ["Venue & Facilities 11", "assets/studio-icons/venue-facilities-11.svg", "Icon", "venue & facilities 🚻", "Venue & Facilities"], ["Venue & Facilities 12", "assets/studio-icons/venue-facilities-12.svg", "Icon", "venue & facilities 📍", "Venue & Facilities"], ["Venue & Facilities 13", "assets/studio-icons/venue-facilities-13.svg", "Icon", "venue & facilities 🗺️", "Venue & Facilities"], ["Venue & Facilities 14", "assets/studio-icons/venue-facilities-14.svg", "Icon", "venue & facilities 📞", "Venue & Facilities"], ["Venue & Facilities 15", "assets/studio-icons/venue-facilities-15.svg", "Icon", "venue & facilities 📧", "Venue & Facilities"], ["Community 01", "assets/studio-icons/community-01.svg", "Icon", "community 👥", "Community"], ["Community 02", "assets/studio-icons/community-02.svg", "Icon", "community 🤝", "Community"], ["Community 03", "assets/studio-icons/community-03.svg", "Icon", "community ❤️", "Community"], ["Community 04", "assets/studio-icons/community-04.svg", "Icon", "community ⭐", "Community"], ["Community 05", "assets/studio-icons/community-05.svg", "Icon", "community 🌟", "Community"], ["Community 06", "assets/studio-icons/community-06.svg", "Icon", "community 📸", "Community"], ["Community 07", "assets/studio-icons/community-07.svg", "Icon", "community 📷", "Community"], ["Community 08", "assets/studio-icons/community-08.svg", "Icon", "community 💬", "Community"], ["Community 09", "assets/studio-icons/community-09.svg", "Icon", "community 🗨️", "Community"], ["Community 10", "assets/studio-icons/community-10.svg", "Icon", "community 📱", "Community"], ["Community 11", "assets/studio-icons/community-11.svg", "Icon", "community 💻", "Community"], ["Community 12", "assets/studio-icons/community-12.svg", "Icon", "community 🛍️", "Community"], ["Community 13", "assets/studio-icons/community-13.svg", "Icon", "community 🎗️", "Community"], ["Community 14", "assets/studio-icons/community-14.svg", "Icon", "community 💝", "Community"], ["Community 15", "assets/studio-icons/community-15.svg", "Icon", "community 🐾", "Community"], ["Sports 01", "assets/studio-icons/sports-01.svg", "Icon", "sports ⚽", "Sports"], ["Sports 02", "assets/studio-icons/sports-02.svg", "Icon", "sports 🏉", "Sports"], ["Sports 03", "assets/studio-icons/sports-03.svg", "Icon", "sports 🏏", "Sports"], ["Sports 04", "assets/studio-icons/sports-04.svg", "Icon", "sports 🎾", "Sports"], ["Sports 05", "assets/studio-icons/sports-05.svg", "Icon", "sports 🏸", "Sports"], ["Sports 06", "assets/studio-icons/sports-06.svg", "Icon", "sports 🏀", "Sports"], ["Sports 07", "assets/studio-icons/sports-07.svg", "Icon", "sports 🏐", "Sports"], ["Sports 08", "assets/studio-icons/sports-08.svg", "Icon", "sports 🏓", "Sports"], ["Sports 09", "assets/studio-icons/sports-09.svg", "Icon", "sports 🏌️", "Sports"], ["Sports 10", "assets/studio-icons/sports-10.svg", "Icon", "sports 🚴", "Sports"], ["Sports 11", "assets/studio-icons/sports-11.svg", "Icon", "sports 🏃", "Sports"], ["Sports 12", "assets/studio-icons/sports-12.svg", "Icon", "sports 🏅", "Sports"], ["Sports 13", "assets/studio-icons/sports-13.svg", "Icon", "sports 🏁", "Sports"], ["Sports 14", "assets/studio-icons/sports-14.svg", "Icon", "sports 🥊", "Sports"], ["Sports 15", "assets/studio-icons/sports-15.svg", "Icon", "sports 🎣", "Sports"]], ...[["Concert Room", "assets/coombe/concert-room.webp", "Photo", "concert room coombe", "Venue & Events"], ["Lounge", "assets/coombe/lounge.webp", "Photo", "lounge coombe", "Venue & Events"], ["Venue Banner", "assets/coombe/venue-banner.jpg", "Photo", "venue banner coombe", "Venue & Events"], ["Buy A Round", "assets/feature-slides/buy-a-round.webp", "Photo", "buy a round feature-slides", "Venue & Events"], ["Club Competitions", "assets/feature-slides/club-competitions.webp", "Photo", "club competitions feature-slides", "Venue & Events"], ["Discover Venues", "assets/feature-slides/discover-venues.webp", "Photo", "discover venues feature-slides", "Venue & Events"], ["Games Room", "assets/feature-slides/games-room.webp", "Photo", "games room feature-slides", "Venue & Events"], ["Local Tradesmen", "assets/feature-slides/local-tradesmen.webp", "Photo", "local tradesmen feature-slides", "Venue & Events"], ["Marketplace", "assets/feature-slides/marketplace.webp", "Photo", "marketplace feature-slides", "Venue & Events"], ["Rewards Membership", "assets/feature-slides/rewards-membership.webp", "Photo", "rewards membership feature-slides", "Venue & Events"], ["Virtual Pub Tables", "assets/feature-slides/virtual-pub-tables.webp", "Photo", "virtual pub tables feature-slides", "Venue & Events"], ["Whos Up For It", "assets/feature-slides/whos-up-for-it.webp", "Photo", "whos up for it feature-slides", "Venue & Events"], ["Battle", "assets/games-v64/battle.webp", "Artwork", "battle games-v64", "Games & Sports"], ["Blocks", "assets/games-v64/blocks.webp", "Artwork", "blocks games-v64", "Games & Sports"], ["Connect4", "assets/games-v64/connect4.webp", "Artwork", "connect4 games-v64", "Games & Sports"], ["Cross", "assets/games-v64/cross.webp", "Artwork", "cross games-v64", "Games & Sports"], ["Darts", "assets/games-v64/darts.webp", "Artwork", "darts games-v64", "Games & Sports"], ["Ludo", "assets/games-v64/ludo.webp", "Artwork", "ludo games-v64", "Games & Sports"], ["Pool Hero", "assets/games-v64/pool-hero.webp", "Artwork", "pool hero games-v64", "Games & Sports"], ["Pool", "assets/games-v64/pool.webp", "Artwork", "pool games-v64", "Games & Sports"], ["Quiz", "assets/games-v64/quiz.webp", "Artwork", "quiz games-v64", "Games & Sports"], ["Search", "assets/games-v64/search.webp", "Artwork", "search games-v64", "Games & Sports"], ["Snooker", "assets/games-v64/snooker.webp", "Artwork", "snooker games-v64", "Games & Sports"], ["Solitaire", "assets/games-v64/solitaire.webp", "Artwork", "solitaire games-v64", "Games & Sports"], ["Ttt", "assets/games-v64/ttt.webp", "Artwork", "ttt games-v64", "Games & Sports"], ["Battle", "assets/games-v68/battle.webp", "Artwork", "battle games-v68", "Games & Sports"], ["Blocks", "assets/games-v68/blocks.webp", "Artwork", "blocks games-v68", "Games & Sports"], ["Connect4", "assets/games-v68/connect4.webp", "Artwork", "connect4 games-v68", "Games & Sports"], ["Cross", "assets/games-v68/cross.webp", "Artwork", "cross games-v68", "Games & Sports"], ["Darts", "assets/games-v68/darts.webp", "Artwork", "darts games-v68", "Games & Sports"], ["Ludo", "assets/games-v68/ludo.webp", "Artwork", "ludo games-v68", "Games & Sports"], ["Pool", "assets/games-v68/pool.webp", "Artwork", "pool games-v68", "Games & Sports"], ["Quiz", "assets/games-v68/quiz.webp", "Artwork", "quiz games-v68", "Games & Sports"], ["Search", "assets/games-v68/search.webp", "Artwork", "search games-v68", "Games & Sports"], ["Snooker", "assets/games-v68/snooker.webp", "Artwork", "snooker games-v68", "Games & Sports"], ["Solitaire", "assets/games-v68/solitaire.webp", "Artwork", "solitaire games-v68", "Games & Sports"], ["Ttt", "assets/games-v68/ttt.webp", "Artwork", "ttt games-v68", "Games & Sports"], ["Community", "assets/pub-v97/community.webp", "Photo", "community pub-v97", "Venue & Events"], ["Events", "assets/pub-v97/events.webp", "Photo", "events pub-v97", "Venue & Events"], ["Friends", "assets/pub-v97/friends.webp", "Photo", "friends pub-v97", "Venue & Events"], ["Games", "assets/pub-v97/games.webp", "Photo", "games pub-v97", "Venue & Events"], ["Marketplace", "assets/pub-v97/marketplace.webp", "Photo", "marketplace pub-v97", "Venue & Events"], ["Photos", "assets/pub-v97/photos.webp", "Photo", "photos pub-v97", "Venue & Events"], ["Pub Cover", "assets/pub-v97/pub-cover.webp", "Photo", "pub cover pub-v97", "Venue & Events"], ["Rounds", "assets/pub-v97/rounds.webp", "Photo", "rounds pub-v97", "Venue & Events"], ["Trades", "assets/pub-v97/trades.webp", "Photo", "trades pub-v97", "Venue & Events"], ["Venues", "assets/pub-v97/venues.webp", "Photo", "venues pub-v97", "Venue & Events"], ["Tl65 Pub Hero", "assets/tl65-pub-hero.webp", "Photo", "tl65 pub hero assets", "Venue & Events"]]);
  // v200: 48 original, locally hosted industry-specific SVG icon designs.
  libraryItems.push(...[["Football", "assets/industry-icons/sports-01.svg", "Icon", "Football Sports", "Sports"], ["Rugby", "assets/industry-icons/sports-02.svg", "Icon", "Rugby Sports", "Sports"], ["Cricket", "assets/industry-icons/sports-03.svg", "Icon", "Cricket Sports", "Sports"], ["Fixtures", "assets/industry-icons/sports-04.svg", "Icon", "Fixtures Sports", "Sports"], ["Team", "assets/industry-icons/sports-05.svg", "Icon", "Team Sports", "Sports"], ["Trophy", "assets/industry-icons/sports-06.svg", "Icon", "Trophy Sports", "Sports"], ["Neighbourhood", "assets/industry-icons/community-01.svg", "Icon", "Neighbourhood Community", "Community"], ["Volunteers", "assets/industry-icons/community-02.svg", "Icon", "Volunteers Community", "Community"], ["Meetup", "assets/industry-icons/community-03.svg", "Icon", "Meetup Community", "Community"], ["Hall", "assets/industry-icons/community-04.svg", "Icon", "Hall Community", "Community"], ["Notices", "assets/industry-icons/community-05.svg", "Icon", "Notices Community", "Community"], ["Groups", "assets/industry-icons/community-06.svg", "Icon", "Groups Community", "Community"], ["Comrades", "assets/industry-icons/veterans-01.svg", "Icon", "Comrades Veterans", "Veterans"], ["Remembrance", "assets/industry-icons/veterans-02.svg", "Icon", "Remembrance Veterans", "Veterans"], ["Branch", "assets/industry-icons/veterans-03.svg", "Icon", "Branch Veterans", "Veterans"], ["History", "assets/industry-icons/veterans-04.svg", "Icon", "History Veterans", "Veterans"], ["Parade", "assets/industry-icons/veterans-05.svg", "Icon", "Parade Veterans", "Veterans"], ["Reunion", "assets/industry-icons/veterans-06.svg", "Icon", "Reunion Veterans", "Veterans"], ["Support", "assets/industry-icons/charity-01.svg", "Icon", "Support Charity", "Charity"], ["Fundraising", "assets/industry-icons/charity-02.svg", "Icon", "Fundraising Charity", "Charity"], ["Donations", "assets/industry-icons/charity-03.svg", "Icon", "Donations Charity", "Charity"], ["Campaign", "assets/industry-icons/charity-04.svg", "Icon", "Campaign Charity", "Charity"], ["Helpers", "assets/industry-icons/charity-05.svg", "Icon", "Helpers Charity", "Charity"], ["Causes", "assets/industry-icons/charity-06.svg", "Icon", "Causes Charity", "Charity"], ["Live Music", "assets/industry-icons/entertainment-01.svg", "Icon", "Live Music Entertainment", "Entertainment"], ["Tickets", "assets/industry-icons/entertainment-02.svg", "Icon", "Tickets Entertainment", "Entertainment"], ["Stage", "assets/industry-icons/entertainment-03.svg", "Icon", "Stage Entertainment", "Entertainment"], ["Performers", "assets/industry-icons/entertainment-04.svg", "Icon", "Performers Entertainment", "Entertainment"], ["Festival", "assets/industry-icons/entertainment-05.svg", "Icon", "Festival Entertainment", "Entertainment"], ["Showtime", "assets/industry-icons/entertainment-06.svg", "Icon", "Showtime Entertainment", "Entertainment"], ["Coffee", "assets/industry-icons/food-drink-01.svg", "Icon", "Coffee Food & Drink", "Food & Drink"], ["Menu", "assets/industry-icons/food-drink-02.svg", "Icon", "Menu Food & Drink", "Food & Drink"], ["Dining", "assets/industry-icons/food-drink-03.svg", "Icon", "Dining Food & Drink", "Food & Drink"], ["Loyalty", "assets/industry-icons/food-drink-04.svg", "Icon", "Loyalty Food & Drink", "Food & Drink"], ["Bakery", "assets/industry-icons/food-drink-05.svg", "Icon", "Bakery Food & Drink", "Food & Drink"], ["Takeaway", "assets/industry-icons/food-drink-06.svg", "Icon", "Takeaway Food & Drink", "Food & Drink"], ["Shopping", "assets/industry-icons/retail-01.svg", "Icon", "Shopping Retail", "Retail"], ["Offers", "assets/industry-icons/retail-02.svg", "Icon", "Offers Retail", "Retail"], ["Products", "assets/industry-icons/retail-03.svg", "Icon", "Products Retail", "Retail"], ["Delivery", "assets/industry-icons/retail-04.svg", "Icon", "Delivery Retail", "Retail"], ["Shopfront", "assets/industry-icons/retail-05.svg", "Icon", "Shopfront Retail", "Retail"], ["Customers", "assets/industry-icons/retail-06.svg", "Icon", "Customers Retail", "Retail"], ["Darts", "assets/industry-icons/sports-games-01.svg", "Icon", "Darts Sports & Games", "Sports & Games"], ["Pool", "assets/industry-icons/sports-games-02.svg", "Icon", "Pool Sports & Games", "Sports & Games"], ["Snooker", "assets/industry-icons/sports-games-03.svg", "Icon", "Snooker Sports & Games", "Sports & Games"], ["Games", "assets/industry-icons/sports-games-04.svg", "Icon", "Games Sports & Games", "Sports & Games"], ["Challenge", "assets/industry-icons/sports-games-05.svg", "Icon", "Challenge Sports & Games", "Sports & Games"], ["Leaderboard", "assets/industry-icons/sports-games-06.svg", "Icon", "Leaderboard Sports & Games", "Sports & Games"]]);
  // Local recommendations are explainable, private and require the owner's approval.
  const mediaHints = {
    events: 'events calendar music', tickets: 'tickets events music', room: 'room hire lounge',
    bingo: 'bingo competitions', draw: 'draw competitions prizes', rewards: 'rewards loyalty',
    gallery: 'gallery photos', games: 'games darts', contact: 'venue contact'
  };
  function suggestedMedia(context = {}) {
    const words = [context.feature && mediaHints[context.feature], context.title, context.detail,
      draft?.name, draft?.type].filter(Boolean).join(' ').toLowerCase();
    const tokens = new Set(words.match(/[a-z]{3,}/g) || []);
    const scored = libraryItems.map(([label, path, kind, tags]) => {
      const keywords = `${label} ${tags}`.toLowerCase().match(/[a-z]{3,}/g) || [];
      let score = keywords.reduce((total, word) => total + (tokens.has(word) ? 2 : 0), 0);
      if (context.feature && (mediaHints[context.feature] || '').split(' ').some(w => keywords.includes(w))) score += 3;
      if (context.kind === kind) score += 2;
      return { label, path, kind, score };
    });
    return scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 5);
  }
  function recommendedChoices(context, onComplete) {
    const wrap = el('div', { className: 'vb-media-recommendations' });
    const heading = el('p', {}, 'Assistant suggestions — choose one, or browse the full library');
    const choices = el('div', { className: 'vb-media-suggestions' });
    const message = el('small', { role: 'status' }, 'Nothing changes until you choose a picture.');
    function paint() {
      choices.replaceChildren();
      for (const item of suggestedMedia(context())) {
        const button = el('button', { type: 'button', className: 'vb-media-choice', title: `Use ${item.label}` },
          el('img', { src: item.path, alt: '' }), el('span', {}, `${item.label} · ${item.kind}`));
        button.addEventListener('click', () => {
          onComplete(new URL(item.path, document.baseURI).href);
          message.textContent = `${item.label} selected. Check your live preview, then save when ready.`;
        });
        choices.append(button);
      }
    }
    const refresh = el('button', { type: 'button' }, 'Update suggestions');
    refresh.addEventListener('click', paint);
    wrap.append(heading, choices, refresh, message);
    paint();
    return wrap;
  }
  function libraryPicker(onComplete) {
    const open = el('button', { type: 'button', className: 'vb-library-open' }, 'Choose from image & icon library');
    open.addEventListener('click', () => {
      const backdrop = el('div', { className: 'vb-library-backdrop' });
      const dialog = el('section', { className: 'vb-library-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose an image or icon' });
      const heading = el('h2', {}, 'Choose a picture or icon');
      const explanation = el('p', {}, 'Select a picture below. It will appear in your app preview straight away. You can change it later.');
      const close = el('button', { type: 'button' }, 'Close');
      const search = el('input', { type: 'search', placeholder: 'Search pictures, events, tickets, games…', 'aria-label': 'Search the image library' });
      const filter = el('select', { 'aria-label': 'Choose image type' }, ...['All','Photo','Icon','Artwork'].map(x => el('option', { value:x }, x)));
      const category = el('select', { 'aria-label': 'Choose category' }, ...['All categories',...new Set(libraryItems.map(item => item[4] || (item[2] === 'Icon' ? 'General icons' : 'Venue & Events')))].map(x => el('option', { value:x }, x)));
      const industryOnly = el('input', { type:'checkbox', 'aria-label':'Show suggested industry media only' });
      industryOnly.checked = true;
      const favouriteOnly = el('input', { type:'checkbox', 'aria-label':'Show favourites only' });
      const favouritesKey = `the-local:studio-favourites:${user.id}`;
      let favourites = new Set();
      try { favourites = new Set(JSON.parse(localStorage.getItem(favouritesKey) || '[]')); } catch {}
      const count = el('p', { className:'vb199-library-count', role:'status' });
      const grid = el('div', { className: 'vb-library-grid' });
      const dismiss = () => { backdrop.remove(); open.focus(); };
      close.addEventListener('click', dismiss);
      backdrop.addEventListener('click', e => { if (e.target === backdrop) dismiss(); });
      function paint() {
        const q = search.value.trim().toLowerCase();
        grid.replaceChildren();
        for (const [label, path, kind, tags, group] of libraryItems) {
          if (filter.value !== 'All' && filter.value !== kind) continue;
          if (category.value !== 'All categories' && category.value !== (group || (kind === 'Icon' ? 'General icons' : 'Venue & Events'))) continue;
          if (industryOnly.checked && !(
            kind === 'Icon' && (group === selectedIndustry.media || group === 'Community' || group === 'Events' || group === 'Venue & Facilities') ||
            kind !== 'Icon' && (String(tags).toLowerCase().includes(selectedIndustry.id) || ['Venue & Events','Games & Sports'].includes(group))
          )) continue;
          if (favouriteOnly.checked && !favourites.has(path)) continue;
          if (!`${label} ${tags || ''} ${group || ''} ${kind}`.toLowerCase().includes(q)) continue;
          const choice = el('button', { type:'button', className:'vb-library-choice', 'aria-label': `Use ${label}` },
            el('img', { src:path, alt:'', loading:'lazy' }), el('span', {}, label), el('small', {}, kind));
          choice.addEventListener('click', () => {
            onComplete(new URL(path, document.baseURI).href);
            dismiss();
          });
          const favourite = el('button', {type:'button',className:'vb199-favourite','aria-label':`Favourite ${label}`}, favourites.has(path) ? '★ Saved' : '☆ Save');
          favourite.addEventListener('click', () => { if (favourites.has(path)) favourites.delete(path); else favourites.add(path); try {localStorage.setItem(favouritesKey, JSON.stringify([...favourites]));} catch {} paint(); });
          const itemWrap = el('div',{className:'vb199-media-tile'},choice,favourite);
          grid.append(itemWrap);
        }
        count.textContent = `${grid.children.length} matching choices · ${libraryItems.length} available`;
        if (!grid.children.length) grid.append(el('p', {}, 'No matching pictures. Try another search.'));
      }
      search.addEventListener('input', paint); filter.addEventListener('change', paint); category.addEventListener('change', paint); favouriteOnly.addEventListener('change', paint); industryOnly.addEventListener('change', paint);
      dialog.append(heading, explanation, close, el('div',{className:'vb199-filters'},search,filter,category,el('label',{},industryOnly,' Recommended for my industry'),el('label',{},favouriteOnly,' Favourites only')),count,grid);
      backdrop.append(dialog); document.body.append(backdrop); paint(); search.focus();
    });
    return open;
  }
  const saved = data.app;
  const recoveryKey = `the-local:venue-builder:draft:${user.id}`;
  let recovery = null;
  try {
    const raw = localStorage.getItem(recoveryKey);
    if (raw) {
      const candidate = JSON.parse(raw);
      if (candidate?.version === 1 && candidate?.draft && typeof candidate.draft.name === 'string' &&
          candidate.draft.features && typeof candidate.draft.features === 'object' &&
          typeof candidate.updatedAt === 'number') recovery = candidate;
    }
  } catch { /* Private browsing may disable local storage. Cloud saving still works. */ }
  const cloudUpdatedAt = saved?.updated_at ? Date.parse(saved.updated_at) : 0;
  const restoreRecovery = !!recovery && recovery.updatedAt > (Number.isFinite(cloudUpdatedAt) ? cloudUpdatedAt : 0) &&
    window.confirm('We found newer unfinished changes saved on this device. Restore them?');
  const draft = structuredClone(restoreRecovery ? recovery.draft : (saved?.draft || blankApp));
  let revision = saved?.revision || 0;
  let published = !!saved?.published;
  let autoSaveActive = false;
  let autoSaveTimer = null;
  let cloudSaving = null;
  let editNumber = 0;
  let savedEditNumber = 0;
  let autoSaveNotice = null;
  const saveLocal = () => {
    try {
      localStorage.setItem(recoveryKey, JSON.stringify({ version: 1, updatedAt: Date.now(),
        draft, slug: slugInput.value }));
      return true;
    } catch { return false; }
  };
  function markChanged() {
    if (!autoSaveActive) return;
    editNumber++;
    const localOK = saveLocal();
    if (autoSaveNotice) autoSaveNotice.textContent = localOK
      ? 'Changes backed up on this device · saving online shortly…'
      : 'Saving online shortly…';
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => { void saveOnlineAutomatically(); }, 2500);
  }
  async function saveOnlineAutomatically() {
    if (!autoSaveActive || cloudSaving || editNumber === savedEditNumber) return;
    // Keep incomplete edits safely on this device until the server accepts them.
    if (draft.name.trim().length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugInput.value) ||
        Object.values(draft.features).flat().some(card => !card.title?.trim()) ||
        (draft.logo && !httpsUrl(draft.logo)) ||
        Object.values(draft.features).flat().some(card => (card.paymentUrl && !httpsUrl(card.paymentUrl)))) {
      if (autoSaveNotice) autoSaveNotice.textContent = 'Progress saved on this device · complete required fields to save online';
      return;
    }
    const version = editNumber;
    const slug = slugInput.value;
    const snapshot = structuredClone(draft);
    if (autoSaveNotice) autoSaveNotice.textContent = 'Saving online…';
    cloudSaving = sb.rpc('local_builder_save', { p_slug: slug, p_draft: snapshot,
      p_revision: revision, p_publish: false }).catch(() => ({ error: { message: 'Network unavailable' } }));
    const result = await cloudSaving;
    cloudSaving = null;
    if (result.error) {
      if (autoSaveNotice) autoSaveNotice.textContent = 'Progress backed up on this device · online save unavailable';
    } else {
      revision = result.data;
      savedEditNumber = version;
      slugInput.readOnly = true;
      slugEdited = true;
      if (autoSaveNotice) autoSaveNotice.textContent = editNumber === version
        ? 'All changes saved online' : 'Latest changes saving shortly…';
    }
    if (editNumber !== savedEditNumber) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => { void saveOnlineAutomatically(); }, 900);
    }
  }
  let suggestion;
  const form = el('form', { className: 'vb-editor' });
  const details = el('fieldset', {}, el('legend', {}, 'Venue details'));
  const modules = el('fieldset', {}, el('legend', {}, 'Features and content'));
  const preview = el('aside', { className: 'vb-preview', 'aria-label': 'Live venue app preview' });
  const editor = el('div', { className: 'vb-grid' }, form, preview);
  const draftButton = el('button', { type: 'submit', value: 'draft' }, 'Save draft');
  const publishButton = el('button', { type: 'submit', value: 'publish', className: 'vb-primary' }, 'Publish app');
  const unpublish = el('button', { type: 'button' }, 'Unpublish app');
  const publicLink = el('a', { target: '_blank', rel: 'noopener' }, 'Open published app');
  const actions = el('div', { className: 'vb-actions' }, draftButton, publishButton, unpublish, publicLink);
  const template = el('button', { type: 'button' }, 'Add social club features');
  const previewNotice = el('p', { className: 'vb-preview-notice', role: 'status' }, 'Changes appear here immediately. They are not public until you publish.');
  const refreshPreview = () => {
    preview.replaceChildren(el('h2', {}, 'Live preview — changes appear instantly'), previewNotice, renderVenue(draft, { preview: true }));
    preview.dataset.theme = draft.theme;
    markChanged();
  };
  let slugEdited = !!saved;
  const slugInput = el('input', { required: '', maxlength: '60', minlength: '3', pattern: '[a-z0-9]+(-[a-z0-9]+)*', placeholder: 'your-venue-name' });
  slugInput.value = (restoreRecovery ? recovery.slug : null) || saved?.slug || '';
  if (saved) slugInput.readOnly = true;
  slugInput.addEventListener('input', () => { slugEdited = true; markChanged(); });
  const inputs = {};
  for (const [key, label, max, kind] of [
    ['name', 'Venue name', 90], ['type', 'Venue type', 60], ['town', 'Town', 90],
    ['welcome', 'Welcome message', 700, 'textarea'], ['logo', 'Logo URL (optional, HTTPS)', 1024, 'url']
  ]) {
    const input = el(kind === 'textarea' ? 'textarea' : 'input', {
      maxlength: max, ...(kind === 'url' ? { type: 'url' } : {}), ...(key === 'name' ? { required: '', minlength: '2' } : {})
    });
    input.value = draft[key];
    input.addEventListener('input', () => {
      draft[key] = input.value;
      if (key === 'logo') input.setCustomValidity(input.value && !httpsUrl(input.value) ? 'Use a valid HTTPS link.' : '');
      if (key === 'name' && !slugEdited) slugInput.value = slugify(input.value);
      refreshPreview();
    });
    inputs[key] = input;
    details.append(el('label', {}, label, input));
    if (key === 'name') details.append(el('label', {}, 'Public link name', slugInput));
  }
  details.append(recommendedChoices(() => ({ title: draft.name, detail: draft.type, kind: 'Icon' }), url => { draft.logo = inputs.logo.value = url; refreshPreview(); }));
  details.append(libraryPicker(url => { draft.logo = inputs.logo.value = url; refreshPreview(); }));
  details.append(imagePicker('Upload your venue logo', url => {
    draft.logo = inputs.logo.value = url;
    refreshPreview();
  }));
  const removeLogo = el('button', { type: 'button' }, 'Remove custom logo');
  removeLogo.addEventListener('click', () => {
    draft.logo = inputs.logo.value = '';
    refreshPreview();
  });
  details.append(removeLogo);
  const theme = el('select', {}, ...themes.map(value => el('option', { value }, value[0].toUpperCase() + value.slice(1))));
  theme.value = draft.theme;
  theme.addEventListener('change', () => { draft.theme = theme.value; refreshPreview(); status.textContent = `Preview updated to ${theme.value}. Save draft to keep this change.`; });
  details.append(el('label', {}, 'Theme', theme));

  // Owner-approved event suggestions. No invented dates, prices or payment links.
  function eventCardAssistant() {
    const wrap = el('section', { className: 'vb-event-assistant' });
    const title = el('h3', {}, 'Create a complete event card with the assistant');
    const help = el('p', {}, 'Choose an event, then check the suggested wording and picture. You decide whether to add it.');
    const eventType = el('select', { 'aria-label': 'Event type' }, ...[
      ['quiz', 'Quiz night'], ['music', 'Live music'], ['bingo', 'Bingo night'],
      ['family', 'Family fun day'], ['charity', 'Charity fundraiser'], ['sports', 'Sports screening'],
      ['custom', 'Something else']
    ].map(([v,t]) => el('option', { value:v }, t)));
    const custom = el('input', { type:'text', maxlength:90, placeholder:'Event name (for something else)' });
    const date = el('input', { type:'date', 'aria-label':'Event date (optional)' });
    const time = el('input', { type:'time', 'aria-label':'Start time (optional)' });
    const location = el('input', { type:'text', maxlength:160, placeholder:'Room or location (optional)' });
    const price = el('input', { type:'number', min:'0', step:'0.01', placeholder:'Entry price in £ (optional)' });
    const templates = {
      quiz: ['Quiz Night', 'Bring your team together for a friendly quiz night. Everyone is welcome.', 'quiz competition'],
      music: ['Live Music Night', 'Join us for an evening of live music and good company.', 'live music concert'],
      bingo: ['Bingo Night', 'Join us for a sociable evening of bingo and plenty of fun.', 'bingo competitions'],
      family: ['Family Fun Day', 'Bring the family along for a day of activities and entertainment.', 'community family'],
      charity: ['Charity Fundraiser', 'Come together to support a good cause at our fundraising event.', 'charity fundraiser'],
      sports: ['Live Sports Screening', 'Watch the big match with fellow supporters at our venue.', 'games sports'],
      custom: ['Community Event', 'Join us at our venue for a special event. More details will be announced soon.', 'events community']
    };
    const result = el('div', { className:'vb-event-proposal', role:'status' });
    const suggest = el('button', { type:'button', className:'vb-primary' }, 'Suggest my event card');
    let proposed = null;
    const approve = el('button', { type:'button', className:'vb-primary' }, 'Approve and add to my preview');
    approve.hidden = true;
    suggest.addEventListener('click', () => {
      const [defaultTitle, detail, tags] = templates[eventType.value];
      const name = eventType.value === 'custom' ? (custom.value.trim() || defaultTitle) : defaultTitle;
      const media = suggestedMedia({ feature:'events', title:name, detail:tags });
      proposed = { title:name, detail, url:'' };
      if (date.value) proposed.date = date.value;
      if (time.value) proposed.time = time.value;
      if (location.value.trim()) proposed.location = location.value.trim();
      if (price.value !== '' && Number.isFinite(Number(price.value)) && Number(price.value) >= 0) proposed.price = price.value;
      let chosen = media[0] || null;
      const choices = el('div', { className:'vb-media-suggestions' });
      media.forEach((m, i) => {
        const b = el('button', { type:'button', className:'vb-media-choice' },
          el('img', { src:m.path, alt:'' }), el('span', {}, `${m.label} · ${m.kind}`));
        b.setAttribute('aria-pressed', String(i === 0));
        b.addEventListener('click', () => {
          chosen = m;
          choices.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        });
        choices.append(b);
      });
      result.replaceChildren(el('h4', {}, 'Your suggested card — review before adding'),
        el('p', {}, proposed.title), el('p', {}, proposed.detail),
        el('p', {}, [proposed.date, proposed.time, proposed.location, proposed.price !== undefined ? `£${proposed.price}` : ''].filter(Boolean).join(' · ') || 'No date, time, location or price supplied'),
        el('p', {}, 'Choose the picture or icon you prefer:'), choices,
        el('small', {}, 'The assistant does not invent dates, prices or payment details. You can edit everything after adding.'));
      approve.hidden = false;
      approve.onclick = () => {
        if (!draft.features.events) draft.features.events = [];
        if (draft.features.events.length >= 8) { result.append(el('p', {}, 'Events already has eight cards. Remove one before adding another.')); return; }
        const card = { ...proposed };
        if (chosen) card.image = new URL(chosen.path, document.baseURI).href;
        draft.features.events.push(card);
        drawModules(); refreshPreview();
        status.textContent = 'Event added to your live preview. Review and edit it, then select Save draft.';
        approve.hidden = true;
      };
    });
    wrap.append(title, help, el('label', {}, 'Type of event', eventType),
      el('label', {}, 'Your own event name (optional)', custom),
      el('label', {}, 'Date (optional)', date), el('label', {}, 'Start time (optional)', time),
      el('label', {}, 'Location (optional)', location), el('label', {}, 'Price (optional)', price),
      suggest, result, approve);
    return wrap;
  }
  function drawModules() {
    modules.replaceChildren(el('legend', {}, 'Features and content'), template, eventCardAssistant());
    for (const [key, feature] of Object.entries(features)) {
      const check = el('input', { type: 'checkbox' });
      check.checked = Object.hasOwn(draft.features, key);
      const panel = el('div', { className: 'vb-module' }, el('label', { className: 'vb-toggle' }, check, feature.label));
      const cards = draft.features[key];
      if (check.checked) {
        const list = el('div', { className: 'vb-cards' });
        cards.forEach((card, i) => {
          const item = el('fieldset', {}, el('legend', {}, `${feature.label} card ${i + 1}`));
          for (const [field, label, max] of [['title', 'Title', 90], ['detail', 'Details', 700], ['url', 'HTTPS link (optional)', 1024]]) {
            const input = el(field === 'detail' ? 'textarea' : 'input', {
              maxlength: max, ...(field === 'url' ? { type: 'url' } : {}), ...(field === 'title' ? { required: '' } : {})
            });
            input.value = card[field];
            if (field === 'url' && input.value && !httpsUrl(input.value)) input.setCustomValidity('Use a valid HTTPS link.');
            input.addEventListener('input', () => {
              card[field] = input.value;
              if (field === 'url') input.setCustomValidity(input.value && !httpsUrl(input.value) ? 'Use a valid HTTPS link.' : '');
              refreshPreview();
            });
            item.append(el('label', {}, label, input));
          }
          const optionalFields = [
            ['date', 'Date', 'date', 10], ['time', 'Start time', 'time', 5],
            ['endTime', 'End time', 'time', 5], ['location', 'Location / room', 'text', 160],
            ['price', 'Price (£)', 'number', 12], ['paymentDetails', 'Payment information (optional)', 'textarea', 400],
            ['paymentUrl', 'Secure payment / ticket booking URL (HTTPS)', 'url', 1024]
          ];
          for (const [field, label, type, max] of optionalFields) {
            const input = el(type === 'textarea' ? 'textarea' : 'input', {
              ...(type !== 'textarea' ? { type } : {}),
              ...(type === 'number' ? { min: '0', step: '0.01', inputmode: 'decimal' } : { maxlength: max })
            });
            input.value = card[field] ?? '';
            input.addEventListener('input', () => {
              if (input.value) card[field] = input.value;
              else delete card[field];
              if (field === 'paymentUrl') input.setCustomValidity(input.value && !httpsUrl(input.value) ? 'Use a valid HTTPS payment link.' : '');
              refreshPreview();
            });
            item.append(el('label', {}, label, input));
          }
          item.append(el('small', { className: 'vb-upload-status' }, 'Use a trusted external checkout link. Never enter card numbers, bank details or secret payment credentials here.'));
          item.append(recommendedChoices(() => ({ feature: key, title: card.title, detail: card.detail }), url => { card.image = url; refreshPreview(); }));
          item.append(libraryPicker(url => { card.image = url; refreshPreview(); }));
          item.append(imagePicker('Upload a photo for this card', url => {
            card.image = url;
            refreshPreview();
          }));
          if (card.image) {
            const clearPhoto = el('button', { type: 'button' }, 'Remove card photo');
            clearPhoto.addEventListener('click', () => { delete card.image; drawModules(); refreshPreview(); });
            item.append(clearPhoto);
          }
          const remove = el('button', { type: 'button' }, 'Remove card');
          remove.addEventListener('click', () => {
            cards.splice(i, 1); drawModules(); refreshPreview(); modules.querySelector(`[data-add="${key}"]`)?.focus();
          });
          item.append(remove);
          list.append(item);
        });
        const add = el('button', { type: 'button', 'data-add': key }, 'Add card');
        add.disabled = cards.length >= 8;
        add.addEventListener('click', () => {
          cards.push({ title: '', detail: '', url: '' }); drawModules(); refreshPreview();
          modules.querySelectorAll(`[data-module="${key}"] input[required]`)[cards.length - 1]?.focus();
        });
        panel.append(list, add);
      }
      panel.dataset.module = key;
      check.addEventListener('change', () => {
        if (check.checked) draft.features[key] = [];
        else if (cards.length && !window.confirm(`Remove the ${feature.label} feature and its draft cards?`)) { check.checked = true; return; }
        else delete draft.features[key];
        drawModules(); refreshPreview(); modules.querySelector(`[data-module="${key}"] input`)?.focus();
      });
      modules.append(panel);
    }
  }

  template.addEventListener('click', () => {
    for (const key of Object.keys(features)) draft.features[key] ||= [];
    if (!draft.welcome && draft.name) {
      draft.welcome = `Welcome to ${draft.name}. Find out what’s on, explore our venue and get in touch.`;
      inputs.welcome.value = draft.welcome;
    }
    drawModules();
    refreshPreview();
    status.textContent = 'Social club features added. Add your own event, ticket and venue details before publishing.';
  });

  // v199: fast, owner-approved starting templates. Never overwrite an existing app silently.
  const starterSets = [
    { name:'Traditional Pub', type:'Pub', theme:'emerald', keys:['events','games','contact','gallery'] },
    { name:'Social Club', type:'Social club', theme:'burgundy', keys:['events','tickets','room','rewards','contact'] },
    { name:'Sports Club', type:'Sports club', theme:'navy', keys:['events','games','gallery','contact'] },
    { name:'Live Music Venue', type:'Live music venue', theme:'charcoal', keys:['events','tickets','gallery','contact'] },
    { name:'Community Centre', type:'Community centre', theme:'emerald', keys:['events','room','gallery','contact'] },
    { name:'Working Men’s Club', type:'Working men’s club', theme:'burgundy', keys:['events','room','draw','rewards','contact'] }
  ];
  // v200: industry-aware setup. All suggestions are reviewable and never publish automatically.
  const industryProfiles = [
    {id:'pub',name:'Pubs & Bars',type:'Pub',theme:'emerald',keys:['events','games','rewards','gallery','contact'],media:'Food & Drink',tables:'Virtual Pub Tables',intro:'Pull up a chair and meet your local community.'},
    {id:'sports',name:'Sports Clubs',type:'Sports club',theme:'navy',keys:['events','gallery','games','contact'],media:'Sports',tables:'Team Clubhouse',intro:'Join your team, supporters and club conversations.'},
    {id:'community',name:'Community Centres',type:'Community centre',theme:'emerald',keys:['events','room','gallery','contact'],media:'Community',tables:'Community Circles',intro:'Connect with neighbours, volunteers and local groups.'},
    {id:'veterans',name:'Veterans & Associations',type:'Veterans association',theme:'burgundy',keys:['events','gallery','contact'],media:'Community',tables:'Comrades’ Mess',intro:'Reconnect with comrades and association members.'},
    {id:'charity',name:'Charities & Nonprofits',type:'Charity',theme:'emerald',keys:['events','gallery','contact'],media:'Community',tables:'Supporter Circles',intro:'Bring supporters and volunteers together.'},
    {id:'music',name:'Music & Entertainment',type:'Live music venue',theme:'charcoal',keys:['events','tickets','gallery','contact'],media:'Entertainment',tables:'Backstage Lounge',intro:'Talk about shows and connect with fans.'},
    {id:'hospitality',name:'Cafés & Restaurants',type:'Cafe or restaurant',theme:'emerald',keys:['events','rewards','gallery','contact'],media:'Food & Drink',tables:'Coffee & Conversation',intro:'Meet other regulars and share recommendations.'},
    {id:'retail',name:'Shops & Local Businesses',type:'Independent business',theme:'navy',keys:['events','gallery','contact'],media:'Community',tables:'Local Connections',intro:'Bring customers and the local community together.'}
  ];
  let selectedIndustry = industryProfiles.find(p => p.type.toLowerCase() === String(draft.type||'').toLowerCase()) || industryProfiles[0];
  const starterStatus = el('p',{role:'status'},'Choose a starting point. Your changes stay private until you publish.');
  const starterCards = el('div',{className:'vb199-starters'});
  for (const preset of starterSets) {
    const button = el('button',{type:'button',className:'vb199-starter'},
      el('strong',{},preset.name),el('span',{},preset.keys.map(key=>features[key].label).join(' · ')));
    button.addEventListener('click',()=>{
      if ((Object.keys(draft.features).length || draft.welcome) && !window.confirm('Add this starter layout to your existing draft? Your current cards will be kept.')) return;
      if (!draft.type || draft.type === 'Social club') draft.type = inputs.type.value = preset.type;
      draft.theme = theme.value = preset.theme;
      for (const key of preset.keys) draft.features[key] ||= [];
      if (!draft.welcome) draft.welcome = inputs.welcome.value = `Welcome to ${draft.name || 'our venue'}${draft.town ? ` in ${draft.town}` : ''}. Discover our events, facilities and community news.`;
      drawModules();refreshPreview();starterStatus.textContent = `${preset.name} starter added. Add your own content and preview before publishing.`;
    });
    starterCards.append(button);
  }
  const industrySelect = el('select', {'aria-label':'Select your industry'}, ...industryProfiles.map(profile=>el('option',{value:profile.id},profile.name)));
  industrySelect.value = selectedIndustry.id;
  const industryInfo = el('p',{className:'vb200-industry-info',role:'status'});
  const applyIndustry = el('button',{type:'button',className:'vb-primary'},'✨ Create my industry starter');
  const industryPreview = () => {
    const profile = industryProfiles.find(p=>p.id===industrySelect.value) || industryProfiles[0];
    industryInfo.textContent = `${profile.name}: recommended features — ${profile.keys.map(k=>features[k].label).join(', ')}. Suggested community area: ${profile.tables}.`;
  };
  industrySelect.addEventListener('change',industryPreview);
  applyIndustry.addEventListener('click',()=>{
    const profile = industryProfiles.find(p=>p.id===industrySelect.value) || industryProfiles[0];
    if ((Object.keys(draft.features).length || draft.welcome) && !window.confirm('Add these industry features to your draft? Existing content will be kept.')) return;
    selectedIndustry = profile;
    draft.type = inputs.type.value = profile.type;
    draft.theme = theme.value = profile.theme;
    for(const key of profile.keys) draft.features[key] ||= [];
    if(!draft.welcome) draft.welcome = inputs.welcome.value = `Welcome to ${draft.name || 'our organisation'}. ${profile.intro}`;
    drawModules();refreshPreview();industryInfo.textContent = `${profile.name} starter applied. Your changes are still private.`;
  });
  const tablesHelp = el('section',{className:'vb200-tables'},
    el('h3',{},'Pull Up a Chair — for every community'),
    el('p',{},'Your community area can be called Virtual Pub Tables, Team Clubhouse, Community Circles, Comrades’ Mess, Supporter Circles or Backstage Lounge. These are suggested names for The Local’s existing virtual tables feature.'),
    el('p',{},'Member permissions, moderation and organisation-specific table separation must be configured and tested before offering isolated tables in subscriber apps.'),
    el('a',{href:'secure-tables.html',target:'_blank',rel:'noopener'},'Preview existing virtual tables'));
  const industrySection = el('section',{className:'vb200-industry-section'},
    el('h2',{},'AI-guided industry setup'),
    el('p',{},'Choose your industry. Apply a recommended starter in one click, then use the AI assistant to refine the wording. No app goes live without your approval.'),
    industrySelect,applyIndustry,industryInfo,tablesHelp);
  industryPreview();
  const starterSection = el('section',{className:'vb199-starter-section'},el('h2',{},'Start with a professional design'),
    el('p',{},'Choose a venue style and we will set up suggested sections, colours and welcome wording. You can change everything.'),starterCards,starterStatus);
  const brief = el('textarea', { maxlength: '1200', placeholder: 'A family-friendly social club with live music, kids’ bingo and a function room…' });
  const ask = el('button', { type: 'button' }, 'Suggest an app with AI');
  const apply = el('button', { type: 'button', className: 'vb-primary' }, 'Apply suggestion');
  apply.hidden = true;
  const response = el('div', { role: 'status', className: 'vb-ai-result' });
  ask.addEventListener('click', async () => {
    if (brief.value.trim().length < 5) { response.textContent = 'Describe your venue and what members should be able to do.'; brief.focus(); return; }
    ask.disabled = true; apply.hidden = true; response.textContent = 'Preparing a suggestion…';
    try {
      const result = await sb.functions.invoke('venue-builder-ai', { body: { prompt: brief.value, name: draft.name, type: draft.type, town: draft.town } });
      if (result.error) {
        const payload = await result.error.context?.json?.().catch(() => null);
        throw new Error(payload?.message || 'The AI assistant is unavailable. You can still edit your app.');
      }
      suggestion = result.data;
      response.replaceChildren(el('p', {}, suggestion.note),
        el('p', {}, `${suggestion.theme} · ${suggestion.features.map(key => features[key].label).join(', ')}`),
        el('blockquote', {}, suggestion.welcome));
      apply.hidden = false;
    } catch (err) { response.textContent = err.message; }
    finally { ask.disabled = false; }
  });
  apply.addEventListener('click', () => {
    draft.welcome = inputs.welcome.value = suggestion.welcome;
    draft.theme = theme.value = themes.includes(suggestion.theme) ? suggestion.theme : 'emerald';
    for (const key of suggestion.features) draft.features[key] ||= [];
    drawModules(); refreshPreview();
    apply.hidden = true;
    response.textContent = 'Suggestion applied. Review your draft before publishing.';
  });
  // Context-aware assistant: each action is proposed first and applied only by the owner.
  const coachMessage = el('p', { className: 'vb-coach-message', role: 'status' }, 'Tell me what you want to change, or choose a suggestion below.');
  const coachInput = el('textarea', { maxlength: '800', placeholder: 'For example: Make my app burgundy, add an events section, or help me write a welcome message.' });
  const coachSuggestions = el('div', { className: 'vb-actions' });
  const coachPlan = el('div', { className: 'vb-coach-plan', role: 'status' });
  const coachApply = el('button', { type: 'button', className: 'vb-primary' }, 'Apply these changes to my preview');
  coachApply.hidden = true;
  let pendingCoach = null;
  function makePlan(request) {
    const query = request.toLowerCase();
    const matchTheme = themes.find(value => query.includes(value));
    const matchFeatures = Object.entries(features).filter(([key, feature]) => query.includes(key) || query.includes(feature.label.toLowerCase()));
    const welcome = /welcome|introduction|greeting/.test(query);
    const actions = [];
    if (matchTheme) actions.push(`Change the colour theme to ${matchTheme}`);
    if (matchFeatures.length) actions.push(`Enable ${matchFeatures.map(([,v])=>v.label).join(', ')}`);
    if (welcome) actions.push('Create a friendly welcome message using the venue name and town');
    if (!actions.length) {
      pendingCoach = null; coachApply.hidden = true;
      coachPlan.textContent = 'I can change your theme, add a feature or create a welcome message. For more detailed wording, use “Suggest an app with AI” below.';
      return;
    }
    pendingCoach = { matchTheme, matchFeatures: matchFeatures.map(([key])=>key), welcome };
    coachPlan.replaceChildren(el('strong', {}, 'Here is what I can do:'), el('ul', {}, ...actions.map(action => el('li', {}, action))));
    coachApply.hidden = false;
  }
  const coachAsk = el('button', { type: 'button' }, 'Show suggested changes');
  coachAsk.addEventListener('click', () => makePlan(coachInput.value));
  for (const [label, prompt] of [
    ['Choose burgundy colours', 'Make my app burgundy'],
    ['Add events', 'Add What’s On events'],
    ['Add room hire', 'Add Room Hire'],
    ['Write my welcome', 'Help me write a welcome message']
  ]) {
    const button = el('button', { type: 'button' }, label);
    button.addEventListener('click', () => { coachInput.value = prompt; makePlan(prompt); });
    coachSuggestions.append(button);
  }
  coachApply.addEventListener('click', () => {
    if (!pendingCoach) return;
    if (pendingCoach.matchTheme) draft.theme = theme.value = pendingCoach.matchTheme;
    for (const key of pendingCoach.matchFeatures) draft.features[key] ||= [];
    if (pendingCoach.welcome) {
      draft.welcome = inputs.welcome.value = `Welcome to ${draft.name || 'our venue'}${draft.town ? ` in ${draft.town}` : ''}! Discover our latest events, activities and news. We look forward to seeing you.`;
    }
    drawModules(); refreshPreview();
    coachMessage.textContent = 'Done — see the live preview. Review your changes and select Save draft when ready.';
    coachApply.hidden = true; pendingCoach = null;
  });
  const coach = el('section', { className: 'vb-coach' }, el('h2', {}, 'Your app-building assistant'),
    el('p', {}, 'You can describe a change in everyday words. I will show you what I can do before changing anything.'),
    el('label', {}, 'What would you like to do?', coachInput), coachSuggestions,
    el('div', { className: 'vb-actions' }, coachAsk, coachApply), coachPlan, coachMessage);

  const assistant = el('section', { className: 'vb-assistant' }, el('h2', {}, 'AI setup assistant'),
    el('label', {}, 'Describe the app you want to create', brief),
    el('p', {}, 'The brief and venue details are sent to the AI service. Keep personal information out of your brief.'),
    el('div', { className: 'vb-actions' }, ask, apply), response);

  function updateLinks() {
    publicLink.hidden = unpublish.hidden = !published;
    publicLink.href = `venue-app.html?venue=${encodeURIComponent(slugInput.value)}`;
  }
  function busy(value) {
    for (const node of [draftButton, publishButton, unpublish]) node.disabled = value;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const publish = event.submitter?.value === 'publish';
    if (publish && !Object.keys(draft.features).length) { status.textContent = 'Choose at least one feature before publishing.'; return; }
    if (publish && !Object.entries(draft.features).some(([key, cards]) => cards.length || ['room', 'bingo', 'games', 'contact'].includes(key))) {
      status.textContent = 'Add content to a feature before publishing.'; return;
    }
    if (draft.name.trim().length < 2) { status.textContent = 'Enter the venue name.'; inputs.name.focus(); return; }
    if (Object.values(draft.features).flat().some(card => !card.title.trim())) { status.textContent = 'Give each card a title.'; return; }
    if (publish && !window.confirm('Publish these details to your public venue app?')) return;
    clearTimeout(autoSaveTimer);
    if (cloudSaving) await cloudSaving;
    const snapshot = structuredClone(draft);
    const slug = slugInput.value;
    busy(true);
    const result = await sb.rpc('local_builder_save', {
      p_slug: slug, p_draft: snapshot, p_revision: revision, p_publish: publish
    }).catch(() => ({ error: { message: 'Unable to reach The Local. Your edits are still here.' } }));
    busy(false);
    if (result.error) { status.textContent = result.error.message || 'Unable to save your app.'; return; }
    revision = result.data;
    savedEditNumber = editNumber;
    saveLocal();
    if (autoSaveNotice) autoSaveNotice.textContent = publish ? 'Published and saved online' : 'All changes saved online';
    published ||= publish;
    slugInput.value = slug;
    slugInput.readOnly = true;
    slugEdited = true;
    updateLinks();
    status.textContent = publish ? 'App published. Share its public link with your members.' : 'Draft saved.';
  });
  unpublish.addEventListener('click', async () => {
    if (!window.confirm('Take the public venue app offline? Your draft will be kept.')) return;
    busy(true);
    const result = await sb.rpc('local_builder_unpublish', { p_revision: revision })
      .catch(() => ({ error: { message: 'Unable to reach The Local. Try again.' } }));
    busy(false);
    if (result.error) { status.textContent = result.error.message; return; }
    revision = result.data; published = false; updateLinks();
    status.textContent = 'App unpublished. Your draft is saved.';
  });
  const notifyStatus = el('p', { role: 'status' }, 'Choose which changes should be eligible for notifications. Sending notifications requires the delivery service to be connected.');
  const notifyChoices = [
    ['new_event', 'New events and activities'],
    ['event_change', 'Event date, time or location changes'],
    ['new_ticket', 'New tickets or booking opportunities'],
    ['venue_news', 'Venue announcements and updates']
  ];
  const notifyChecks = new Map();
  const notifyForm = el('section', { className: 'vb-notify' }, el('h2', {}, 'Member notifications'),
    el('p', {}, 'Decide what members may be notified about. Members must opt in before any push alerts are sent.')); 
  for (const [key, label] of notifyChoices) {
    const input = el('input', { type: 'checkbox' });
    notifyChecks.set(key, input);
    notifyForm.append(el('label', { className: 'vb-notify-choice' }, input, label));
  }
  const notifySave = el('button', { type: 'button' }, 'Save notification preferences');
  notifySave.addEventListener('click', async () => {
    notifySave.disabled = true; notifyStatus.textContent = 'Saving preferences…';
    const settings = Object.fromEntries([...notifyChecks].map(([key,input])=>[key,input.checked]));
    const result = await sb.from('local_builder_notification_settings').upsert({ owner_id: user.id, settings }, { onConflict: 'owner_id' });
    notifySave.disabled = false;
    notifyStatus.textContent = result.error ? `Could not save: ${result.error.message}. Run the v180 notification SQL setup first.` : 'Preferences saved. Notifications will not be delivered until member opt-in and the sending service are configured.';
  });
  notifyForm.append(notifySave, notifyStatus);
  sb.from('local_builder_notification_settings').select('settings').eq('owner_id', user.id).maybeSingle().then(({data: savedNotify}) => {
    if (savedNotify?.settings) for (const [key,input] of notifyChecks) input.checked = !!savedNotify.settings[key];
  });
  const inbox = el('div', { className: 'vb-inbox-result', role: 'status' });
  const showInbox = el('button', { type: 'button' }, 'Load enquiries');
  showInbox.addEventListener('click', async () => {
    showInbox.disabled = true; inbox.textContent = 'Loading enquiries…';
    const result = await sb.rpc('local_builder_inbox').catch(() => ({ error: true }));
    showInbox.disabled = false;
    if (result.error) { inbox.textContent = 'Unable to load enquiries.'; return; }
    if (!result.data.length) { inbox.textContent = 'No enquiries yet.'; return; }
    inbox.replaceChildren(...result.data.map(item => el('article', {},
      el('h3', {}, features[item.feature].label),
      el('p', {}, `${item.email} · ${new Date(item.created_at).toLocaleString('en-GB')}`),
      el('p', {}, item.message))));
  });

  // Beginner-friendly guided setup: uses the existing editor and AI endpoint.
  // It never publishes or sends content to the AI without an explicit click.
  const guideSteps = [
    { title: 'Tell us about your venue', description: 'Start with the name of your pub, club or venue, what kind of place it is, and the town it is in.', tip: 'Example: The Oak Social Club · Social club · Coventry', target: () => inputs.name, action: 'Enter your venue name, type and town. You can change these later.' },
    { title: 'Make it look like your venue', description: 'Upload your logo if you have one. Choose a colour theme and write a friendly welcome message.', tip: 'No logo? That is fine. You can add one later. A simple welcome is enough to start.', target: () => inputs.welcome, action: 'Choose a theme, add your logo and write a welcome message.' },
    { title: 'Choose what visitors can see', description: 'Tick the sections you need, such as events, room hire, tickets or contact details. You do not need every section.', tip: 'For a social club, start with Events, Room Hire and Contact. You can add more later.', target: () => modules.querySelector('input[type="checkbox"]'), action: 'Tick the features you want in your app.' },
    { title: 'Add pictures and information', description: 'Choose Add card in a section. Give each card a title and description. Add a photo, date, time, location or price when useful.', tip: 'Example: Friday Quiz Night · 7:30 pm · Main Lounge · £2 entry. Leave anything that does not apply blank.', target: () => modules.querySelector('.vb-cards input'), action: 'Add at least one card to a chosen section.' },
    { title: 'Check your app before sharing', description: 'Look at the live preview. Use Save draft to keep your work private. Publish app only when you are happy for the public to see it.', tip: 'You can come back to edit your app later. Save draft does not make your app public.', target: () => draftButton, action: 'Save your draft, or publish when you are ready.' }
  ];
  let guideIndex = 0;
  const guideTitle = el('h3', {});
  const guideProgress = el('p', { className: 'vb-guide-progress', 'aria-live': 'polite' });
  const guideDescription = el('p', {});
  const guideTip = el('p', { className: 'vb-guide-tip' });
  const guideAction = el('p', { className: 'vb-guide-action' });
  const guideBack = el('button', { type: 'button' }, 'Previous step');
  const guideNext = el('button', { type: 'button', className: 'vb-primary' }, 'Next step');
  const guideFocus = el('button', { type: 'button' }, 'Show me where');
  const guideAi = el('button', { type: 'button' }, 'Help me write my app');
  const guideHide = el('button', { type: 'button' }, 'Hide guide');
  const guideResume = el('button', { type: 'button' }, 'Show beginner guide');
  const guide = el('section', { className: 'vb-guide', 'aria-label': 'Step-by-step app building guide' },
    el('h2', {}, 'Your step-by-step app guide'),
    el('p', {}, 'No computer experience needed. Follow each step at your own pace.'),
    guideProgress, guideTitle, guideDescription, guideTip, guideAction,
    el('div', { className: 'vb-guide-controls' }, guideBack, guideFocus, guideAi, guideNext, guideHide));
  function renderGuide() {
    const step = guideSteps[guideIndex];
    guideProgress.textContent = `Step ${guideIndex + 1} of ${guideSteps.length}`;
    guideTitle.textContent = step.title;
    guideDescription.textContent = step.description;
    guideTip.textContent = `Helpful suggestion: ${step.tip}`;
    guideAction.textContent = `What to do now: ${step.action}`;
    guideBack.disabled = guideIndex === 0;
    guideNext.textContent = guideIndex === guideSteps.length - 1 ? 'Start again' : 'Next step';
  }
  guideBack.addEventListener('click', () => { guideIndex = Math.max(0, guideIndex - 1); renderGuide(); });
  guideNext.addEventListener('click', () => { guideIndex = (guideIndex + 1) % guideSteps.length; renderGuide(); });
  guideFocus.addEventListener('click', () => {
    const target = guideSteps[guideIndex].target();
    if (!target) {
      modules.scrollIntoView({ behavior: 'smooth', block: 'start' });
      guideAction.textContent = 'First tick a feature, then select Add card to enter its details.';
      return;
    }
    showStep(guideIndex <= 1 ? 0 : guideIndex <= 3 ? 1 : 3);
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
  });
  guideAi.addEventListener('click', () => {
    advanced.open = true; assistant.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!brief.value.trim()) brief.value = [draft.name && `Our venue is called ${draft.name}.`, draft.type && `It is a ${draft.type}.`, draft.town && `It is in ${draft.town}.`, 'Please suggest a friendly welcome and useful features for our visitors.'].filter(Boolean).join(' ');
    brief.focus({ preventScroll: true });
    response.textContent = 'Read or change the description, then select “Suggest an app with AI”. Nothing is sent until you select that button.';
  });
  guideHide.addEventListener('click', () => { guide.hidden = true; guideResume.hidden = false; });
  guideResume.addEventListener('click', () => { guide.hidden = false; guideResume.hidden = true; guide.scrollIntoView({ behavior: 'smooth' }); });
  guideResume.hidden = true;
  renderGuide();
  // v187: mobile-first focused setup and owner-controlled launch/share centre.
  const launchStatus = el('p', { role: 'status', className: 'vb-launch-status' });
  const launchUrl = () => new URL(`venue-app.html?venue=${encodeURIComponent(slugInput.value)}`, document.baseURI).href;
  const shareCopy = el('button', { type: 'button' }, 'Copy app link');
  const shareNative = el('button', { type: 'button' }, 'Share from my phone');
  const shareWhatsapp = el('a', { target: '_blank', rel: 'noopener noreferrer' }, 'Share on WhatsApp');
  const shareEmail = el('a', {}, 'Share by email');
  const sharePanel = el('section', { className: 'vb-launch-share' },
    el('h2', {}, 'Your app is ready to share'),
    el('p', {}, 'Invite your customers to open your app. You can share this link again at any time.'),
    el('div', { className: 'vb-launch-share-actions' }, shareCopy, shareNative, shareWhatsapp, shareEmail), launchStatus);
  function updateSharePanel() {
    sharePanel.hidden = !published;
    if (!published) return;
    const url = launchUrl();
    const message = `Visit ${draft.name || 'our venue'} on The Local: ${url}`;
    shareWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    shareEmail.href = `mailto:?subject=${encodeURIComponent(`Visit ${draft.name || 'our venue'} app`)}&body=${encodeURIComponent(message)}`;
  }
  shareCopy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(launchUrl()); launchStatus.textContent = 'Link copied. Paste it into a message, social post or your website.'; }
    catch { launchStatus.textContent = `Copy this link: ${launchUrl()}`; }
  });
  shareNative.addEventListener('click', async () => {
    if (!navigator.share) { launchStatus.textContent = 'Your browser does not support direct sharing. Use Copy app link instead.'; return; }
    try { await navigator.share({ title: draft.name || 'Our venue app', text: 'Visit our app on The Local', url: launchUrl() }); }
    catch (err) { if (err?.name !== 'AbortError') launchStatus.textContent = 'Sharing was unavailable. Try Copy app link.'; }
  });
  const launchGuide = el('section', { className: 'vb-launch-guide' },
    el('h2', {}, 'Launch assistant'),
    el('p', {}, 'I will guide you through the final checks. Nothing goes public until you choose Publish app.'),
    el('ol', {},
      el('li', {}, 'Check your venue name, town and welcome message.'),
      el('li', {}, 'Choose at least one feature and add its details.'),
      el('li', {}, 'Check the preview for spelling, photos, dates and prices.'),
      el('li', {}, 'Select Publish app and confirm. Then share your link below.')));
  const launchCheck = el('button', { type: 'button' }, 'Check if my app is ready');
  const launchFeedback = el('p', { role: 'status' });
  launchCheck.addEventListener('click', () => {
    const missing = [];
    if (!draft.name?.trim()) missing.push('add your venue name');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugInput.value)) missing.push('choose a valid app link');
    if (!draft.welcome?.trim()) missing.push('add a welcome message');
    if (Object.values(draft.features || {}).flat().some(card => !card.title?.trim())) missing.push('give every card a title');
    if (Object.values(draft.features || {}).flat().some(card => (card.paymentUrl && !httpsUrl(card.paymentUrl)) || (card.url && !httpsUrl(card.url)))) missing.push('correct invalid HTTPS links');
    if (!draft.town?.trim()) missing.push('add your town');
    if (!Object.keys(draft.features || {}).length) missing.push('choose at least one feature');
    if (!Object.entries(draft.features || {}).some(([key,cards]) => cards.length || ['room','bingo','games','contact'].includes(key))) missing.push('add information to a feature');
    launchFeedback.textContent = missing.length ? `Before publishing: ${missing.join('; ')}.` : 'Your basic details look ready. Check your preview and confirm all information is correct, then select Publish app.';
  });
  launchGuide.append(launchCheck, launchFeedback);
  const focusBar = el('nav', { className: 'vb-focus-nav', 'aria-label': 'Builder sections' });
  const focusSteps = [
    ['1. Venue', details], ['2. Features', modules], ['3. Preview', preview],
    ['4. Go live', launchGuide], ['5. Share', sharePanel]
  ];
  let focusedStep = 0;
  const focusButtons = focusSteps.map(([name], index) => {
    const button = el('button', { type: 'button' }, name);
    button.addEventListener('click', () => showStep(index));
    focusBar.append(button); return button;
  });
  const focusNext = el('button', { type: 'button', className: 'vb-primary' }, 'Next step');
  const focusBack = el('button', { type: 'button' }, 'Previous step');
  const focusControls = el('div', { className: 'vb-focus-controls' }, focusBack, focusNext);
  function showStep(index) {
    focusedStep = Math.max(0, Math.min(index, focusSteps.length - 1));
    for (let i=0;i<focusSteps.length;i++) {
      const selected = i === focusedStep;
      focusSteps[i][1].classList.toggle('vb-focus-hidden', !selected);
      focusButtons[i].setAttribute('aria-current', selected ? 'step' : 'false');
    }
    focusBack.disabled = focusedStep === 0;
    focusNext.hidden = focusedStep === focusSteps.length - 1;
    focusNext.textContent = focusedStep === 3 ? 'Share your app' : 'Next step';
    focusBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  focusNext.addEventListener('click', () => showStep(focusedStep+1));
  focusBack.addEventListener('click', () => showStep(focusedStep-1));
  // Keep published state and share destinations in sync after a successful save.
  form.addEventListener('submit', () => setTimeout(updateSharePanel, 700));
  const publishObserver = new MutationObserver(updateSharePanel);
  publishObserver.observe(publicLink, { attributes: true, attributeFilter: ['hidden','href'] });
  updateSharePanel();
  drawModules(); updateLinks(); refreshPreview();
  status.textContent = restoreRecovery ? 'Your unfinished changes were restored from this device.' : (saved ? (published ? 'Your app is published.' : 'Your saved draft is ready to edit.') : '');
  form.append(details, modules);
  const advanced = el('details', { className: 'vb-advanced' }, el('summary', {}, 'AI App Studio — writing, coaching and notifications'), coach, assistant, notifyForm);
  const aiQuick = el('button',{type:'button',className:'vb199-ai-quick'},'✨ Ask AI to build my first draft');
  aiQuick.addEventListener('click',()=>{advanced.open=true; assistant.scrollIntoView({behavior:'smooth',block:'start'});brief.focus({preventScroll:true});});
  autoSaveNotice = el('p', { className: 'vb-autosave-status', role: 'status' }, 'Automatic saving is on');
  root.replaceChildren(el('h1', {}, 'Venue App Builder'),
    el('p', { className: 'vb-simple-intro' }, 'Choose your industry, customise its pictures and features, then preview and publish when ready.'), industrySection, starterSection,
    teamPanel, autoSaveNotice, aiQuick, focusBar, focusControls, guideResume, guide, editor, launchGuide, advanced, el('div', { className: 'vb-save' }, actions, status), sharePanel,
    el('section', { className: 'vb-inbox' }, el('h2', {}, 'Venue enquiries'), showInbox, inbox));
  showStep(published ? 4 : 0);
  for (const button of [draftButton, publishButton]) button.setAttribute('form', 'vb-edit-form');
  form.id = 'vb-edit-form';
  autoSaveActive = true;
  if (restoreRecovery) { editNumber++; saveLocal(); autoSaveTimer = setTimeout(() => { void saveOnlineAutomatically(); }, 1500); }
  window.addEventListener('pagehide', () => { if (autoSaveActive) saveLocal(); }, { once: true });
}

