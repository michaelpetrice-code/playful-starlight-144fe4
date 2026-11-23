import { questionBank, questionsFor } from './pub-quiz-questions.mjs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const byId = id => document.getElementById(id);
const { supabaseUrl, supabaseAnonKey } = window.LADS_CONFIG;
const db = createClient(supabaseUrl, supabaseAnonKey);
const setup = byId('setup-form');
const room = byId('room');
const draftKey = 'local-quiz-party-draft';
let partyAttempt;
let checkoutReady = false;
const projector = new URLSearchParams(location.search).get('display') === 'projector';
if (projector) document.body.classList.add('quiz-projector');
const answerLetters = ['A', 'B', 'C', 'D'];
let code, state, busy = false, refreshTimer, accessRequest = 0, mediaAllowed = false;

function node(tag, text) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  return item;
}
function button(label, action) {
  const item = node('button', label);
  item.type = 'button';
  item.onclick = action;
  return item;
}
function field(label, control) {
  const item = node('label', label);
  item.append(control);
  return item;
}
function input(maxLength, value = '') {
  const item = node('input');
  item.maxLength = maxLength;
  item.value = value;
  item.required = true;
  return item;
}
async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) {
    if (error.code === 'PGRST202') throw Error('Pub Quiz is awaiting server setup.');
    if (error.code === '23505') throw Error('That team name is already in use.');
    throw Error(error.message);
  }
  return data;
}
function announce(text = '') { byId('status').textContent = text; }
async function action(operation) {
  if (busy) return;
  busy = true;
  announce();
  try { await operation(); }
  catch (error) { announce(error.message); }
  finally { busy = false; }
}

const rounds = byId('rounds');
const topics = Object.keys(questionBank);
for (const topic of topics) byId('round-topics').append(new Option(topic));

function addQuestion(list, data = { prompt: '', options: ['', '', '', ''], correct: 0 }) {
  if (rounds.querySelectorAll('.quiz-question').length >= 60) {
    announce('A quiz can have up to 60 questions.');
    return;
  }
  const group = node('fieldset');
  group.className = 'quiz-question';
  group.append(node('legend', 'Question'));
  const prompt = input(240, data.prompt);
  prompt.name = 'prompt';
  group.append(field('Question text', prompt));
  const correct = node('select');
  data.options.forEach((value, index) => {
    const option = input(120, value);
    option.name = 'option';
    group.append(field('Answer ' + answerLetters[index], option));
    correct.add(new Option('Answer ' + answerLetters[index], index));
  });
  correct.name = 'correct';
  correct.value = data.correct;
  group.append(field('Correct answer', correct), button('Remove question', () => {
    if (list.children.length > 1) group.remove();
  }));
  const media = node('div');
  media.className = 'quiz-media-fields';
  media.hidden = !mediaAllowed;
  const kind = node('select');
  kind.name = 'media-kind';
  kind.append(new Option('Text question', ''), new Option('Picture', 'image'), new Option('Video clip', 'video'));
  const url = input(2048, data.media?.url || '');
  url.name = 'media-url';
  url.type = 'url';
  url.placeholder = 'https://';
  const alt = input(200, data.media?.alt || '');
  alt.name = 'media-alt';
  const urlField = field('Direct HTTPS media URL', url);
  const altField = field('Picture description', alt);
  kind.onchange = () => {
    urlField.hidden = !kind.value;
    url.disabled = !kind.value;
    altField.hidden = kind.value !== 'image';
    alt.disabled = kind.value !== 'image';
  };
  kind.value = data.media?.kind || '';
  kind.onchange();
  media.append(field('Question media', kind), urlField, altField);
  group.append(media);
  list.append(group);
}
function numberRounds() {
  [...rounds.children].forEach((round, index) => {
    round.querySelector('legend').textContent = 'Round ' + (index + 1);
    round.querySelector('.quiz-remove-round').disabled = rounds.children.length === 1;
  });
}
function addRound(topic, questions, level = 'Mix') {
  if (rounds.children.length >= 20 || rounds.querySelectorAll('.quiz-question').length >= 60) {
    announce('A quiz can have up to 20 rounds and 60 questions.');
    return;
  }
  const round = node('fieldset');
  round.append(node('legend'));
  const topicInput = input(60, topic);
  topicInput.name = 'round-topic';
  topicInput.setAttribute('list', 'round-topics');
  const list = node('div');
  list.className = 'quiz-round-questions';
  const remove = button('Remove round', () => {
    round.remove();
    numberRounds();
  });
  remove.className = 'quiz-remove-round';
  const controls = node('div');
  controls.className = 'actions';
  const difficulty = node('select');
  difficulty.name = 'difficulty';
  for (const label of ['Child', 'Teenager', 'Adult', 'Mix']) difficulty.add(new Option(label));
  difficulty.value = level;
  let changed = Boolean(questions);
  list.addEventListener('input', () => { changed = true; });
  list.addEventListener('click', event => { if (event.target.closest('button')) changed = true; });
  function generate(explicit = false) {
    const generated = questionsFor(topicInput.value, difficulty.value);
    if (!generated.length) {
      if (explicit) announce('Choose a listed topic for automatic questions, or write your own for a custom topic.');
      return;
    }
    if (rounds.querySelectorAll('.quiz-question').length - list.children.length + generated.length > 60) {
      announce('A quiz can have up to 60 questions.');
      return;
    }
    if (changed && !window.confirm('Replace the questions already in this round?')) return;
    list.replaceChildren();
    generated.forEach(question => addQuestion(list, question));
    changed = false;
    announce();
  }
  const assistant = button('Generate with AI', async () => {
    const topic = topicInput.value.trim();
    const level = difficulty.value;
    const venue = setup.elements.venue.value;
    if (!topic) { announce('Enter a round topic first.'); topicInput.focus(); return; }
    const hasRoom = () => rounds.querySelectorAll('.quiz-question').length - list.children.length + 5 <= 60;
    if (!hasRoom()) { announce('Leave room for five questions within the 60-question limit.'); return; }
    assistant.disabled = true;
    assistant.textContent = 'Generating…';
    announce();
    try {
      const { data, error } = await db.functions.invoke('quiz-ai', {
        body: { topic, difficulty: level, venue: venue === 'party' ? null : venue },
      });
      if (error) {
        const detail = await error.context?.json?.().catch(() => null);
        throw Error(detail?.message || 'The AI assistant is unavailable. Try the question bank.');
      }
      if (!round.isConnected || byId('setup').hidden || topic !== topicInput.value.trim() ||
          level !== difficulty.value || venue !== setup.elements.venue.value) return;
      if (!hasRoom()) throw Error('There is no longer room for five questions.');
      if (!window.confirm('Replace this round’s questions with the AI draft?')) return;
      list.replaceChildren();
      data.questions.forEach(question => addQuestion(list, question));
      changed = true;
      announce('AI draft added. Check the questions and answers before hosting.');
    } catch (error) {
      announce(error.message);
    } finally {
      assistant.disabled = false;
      assistant.textContent = 'Generate with AI';
    }
  });
  topicInput.onchange = difficulty.onchange = () => generate();
  controls.append(button('Use question bank', () => generate(true)), assistant,
    button('Add question to round', () => { addQuestion(list); changed = true; }), remove);
  round.append(field('Round topic', topicInput), field('Difficulty', difficulty), list, controls);
  rounds.append(round);
  if (questions) questions.forEach(question => addQuestion(list, question));
  else if (topic) generate();
  else addQuestion(list);
  numberRounds();
}
byId('add').onclick = () => addRound('');
byId('sample').onclick = () => {
  addRound('Music');
  addRound('Sport');
};
addRound('General Knowledge');

function setMediaAccess(enabled) {
  mediaAllowed = enabled;
  rounds.querySelectorAll('.quiz-media-fields').forEach(item => {
    item.hidden = !enabled;
    const kind = item.querySelector('select');
    kind.disabled = !enabled;
    if (!enabled) kind.value = '';
    kind.onchange();
  });
}

async function access() {
  const request = ++accessRequest;
  const create = byId('create');
  create.disabled = true;
  byId('media-access').textContent = '';
  byId('quiz-checkout').hidden = true;
  byId('access').textContent = 'Checking hosting access…';
  try {
    if (setup.elements.venue.value === 'party') {
      const [balance, complimentary] = await Promise.all([
        rpc('local_quiz_party_balance'), rpc('local_quiz_party_complimentary'),
      ]);
      if (request !== accessRequest) return;
      setMediaAccess(true);
      create.disabled = !complimentary && balance < 1;
      byId('quiz-checkout').hidden = !checkoutReady || complimentary || balance > 0;
      byId('quiz-checkout').textContent = 'Buy one Party Quiz Pass · £7.99';
      byId('access').textContent = complimentary ? 'Complimentary hosting for your account.' : balance > 0
        ? 'Opening a new party lobby uses one pass.'
        : checkoutReady ? 'One pass unlocks a single party quiz, including pictures, video and projector view.' : 'Party Quiz Pass checkout is coming soon.';
      return;
    }
    const venues = await rpc('local_quiz_venues');
    const selected = venues.find(venue => venue.id === setup.elements.venue.value);
    const result = selected?.entitlement ?? 'denied';
    const multimedia = selected?.multimedia === true;
    if (request !== accessRequest) return;
    setMediaAccess(multimedia);
    const checkout = byId('quiz-checkout');
    checkout.hidden = !checkoutReady || !selected?.can_buy;
    checkout.textContent = selected?.tier === 'subscriber' ? 'Get Pub Quiz Pro · £9.99/month' : 'Get Pub Quiz Pro · £19.99/month';
    byId('media-access').textContent = multimedia
      ? 'Picture and video questions are enabled for this venue.'
      : 'Picture and video questions require the multimedia add-on.';
    create.disabled = !['paid', 'complimentary'].includes(result);
    byId('access').textContent = ({
      paid: 'This venue can host quizzes.',
      complimentary: 'Complimentary hosting for Coombe Social Club.',
      subscription_required: checkoutReady ? 'Ask your venue owner to subscribe to Pub Quiz Pro.' : 'Paid quiz hosting is coming soon.',
      denied: 'Venue owner or administrator access is required.',
    })[result];
  } catch (error) {
    if (request === accessRequest) byId('access').textContent = error.message;
  }
}
function questionMedia(group) {
  const kind = group.querySelector('[name=media-kind]').value;
  if (!mediaAllowed || !kind) return {};
  const url = new URL(group.querySelector('[name=media-url]').value.trim());
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use a direct HTTPS link for each picture or clip.');
  const alt = group.querySelector('[name=media-alt]').value.trim();
  return { media: { kind, url: url.href, alt: kind === 'image' ? alt : '' } };
}

byId('quiz-checkout').onclick = () => action(async () => {
  const checkout = byId('quiz-checkout');
  checkout.disabled = true;
  try {
    const party = setup.elements.venue.value === 'party';
    if (party) {
      partyAttempt ||= crypto.randomUUID();
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({
          title: setup.elements.title.value,
          rounds: [...rounds.children].map(round => ({
            topic: round.querySelector('[name=round-topic]').value,
            difficulty: round.querySelector('[name=difficulty]').value,
            questions: [...round.querySelectorAll('.quiz-question')].map(readQuestion),
          })),
        }));
      } catch { throw Error('This browser could not save your party draft before checkout.'); }
    }
    const body = party ? { party, attempt: partyAttempt } : { venue: setup.elements.venue.value };
    const { data, error } = await db.functions.invoke('quiz-billing', { body });
    if (error) {
      const detail = await error.context?.json?.().catch(() => null);
      throw Error(detail?.message || 'Quiz checkout is unavailable.');
    }
    const url = new URL(data.url);
    if (url.origin !== 'https://checkout.stripe.com') throw Error('Unexpected checkout address.');
    location.assign(url.href);
  } finally {
    checkout.disabled = false;
  }
});

function readQuestion(group) {
  return {
    prompt: group.querySelector('[name=prompt]').value.trim(),
    options: [...group.querySelectorAll('[name=option]')].map(option => option.value.trim()),
    correct: Number(group.querySelector('[name=correct]').value),
    media: {
      kind: group.querySelector('[name=media-kind]').value,
      url: group.querySelector('[name=media-url]').value,
      alt: group.querySelector('[name=media-alt]').value,
    },
  };
}
setup.elements.venue.onchange = access;
setup.onsubmit = event => {
  event.preventDefault();
  action(async () => {
    const questions = [...rounds.children].flatMap((round, index) => {
      const topic = round.querySelector('[name=round-topic]').value.trim();
      if (!topic) throw Error('Give each round a topic.');
      return [...round.querySelectorAll('.quiz-question')].map(group => {
        const { prompt, options, correct } = readQuestion(group);
        return { ...questionMedia(group), round: index + 1, topic, prompt, options, correct };
      });
    });
    const party = setup.elements.venue.value === 'party';
    const result = await rpc('local_quiz_create', {
      p_venue: party ? null : setup.elements.venue.value, p_title: setup.elements.title.value, p_questions: questions,
    });
    if (party) {
      const resume = new URL(location.href);
      resume.search = new URLSearchParams({ code: result }).toString();
      history.replaceState(null, '', resume);
      try { sessionStorage.removeItem(draftKey); } catch { /* Private storage can be unavailable. */ }
    }
    await open(result);
  });
};
byId('join-form').onsubmit = event => {
  event.preventDefault();
  action(() => open(event.currentTarget.elements.code.value));
};
async function open(value) {
  const next = value.trim().toUpperCase();
  if (!/^[A-F0-9]{10}$/.test(next)) throw Error('Enter the 10-character quiz code.');
  const result = await rpc('local_quiz_room', { p_code: next });
  if (projector && !result.host) throw Error('Sign in as the host of this quiz to open the projector.');
  code = next;
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('code', code);
  if (projector) url.searchParams.set('display', 'projector');
  history.replaceState(null, '', url);
  state = null;
  show(result);
  byId('setup').hidden = true;
  byId('join').hidden = true;
  room.hidden = false;
  byId('projector-tools').hidden = !projector;
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, 2500);
}
let syncFailed = false;
async function refresh() {
  if (busy || document.hidden || state?.phase === 'finished') return;
  busy = true;
  try {
    const next = await rpc('local_quiz_room', { p_code: code });
    if (projector && !next.host) {
      clearInterval(refreshTimer);
      room.replaceChildren();
      announce('Projector access has ended. Reopen this view from the host controls.');
      return;
    }
    show(next);
    if (syncFailed) announce();
    syncFailed = false;
  } catch {
    syncFailed = true;
    announce('Quiz connection interrupted. Reconnecting…');
  } finally { busy = false; }
}
function actOnRoom(p_action, params = {}) {
  return action(async () => show(await rpc('local_quiz_room', { p_code: code, p_action, ...params })));
}
function mediaView(data) {
  let url;
  try { url = new URL(data.url); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const image = data.kind === 'image';
  const element = node(image ? 'img' : 'video');
  element.className = 'quiz-question-media';
  element.src = url.href;
  if (image) {
    element.alt = data.alt;
    element.referrerPolicy = 'no-referrer';
  } else {
    element.controls = true;
    element.playsInline = true;
    element.preload = 'metadata';
    element.setAttribute('aria-label', 'Question video clip');
  }
  const fallback = node('p', 'This media could not load. Ask the host to check the link or play the clip aloud.');
  fallback.hidden = true;
  element.addEventListener('error', () => { fallback.hidden = false; });
  const wrap = node('div');
  wrap.dataset.questionMedia = '';
  wrap.append(element, fallback);
  return wrap;
}

const fullscreen = byId('projector-fullscreen');
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    announce('Fullscreen is unavailable in this browser. You can still display this tab on the venue screen.');
  }
};
document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
});

function winnerScreen(scores) {
  if (!scores.length) return node('p', 'Quiz complete.');
  const points = Math.max(...scores.map(team => team.points));
  const winners = scores.filter(team => team.points === points);
  const celebration = node('div');
  celebration.className = 'quiz-winner';
  const names = node('h2', winners.map(team => team.name).join(' & '));
  celebration.append(node('p', winners.length > 1 ? 'Joint quiz winners' : 'Quiz winner'),
    names, node('p', points + (points === 1 ? ' point' : ' points')));
  return celebration;
}

function projectorContent(next) {
  const title = node('h1', next.title);
  const content = node('div');
  if (next.phase === 'lobby') {
    const joinCode = node('strong', next.code);
    joinCode.className = 'join-code';
    content.append(node('h2', 'Join on your phone'), node('p', 'Open Pub Quiz in The Local and enter this code.'), joinCode);
  }
  if (next.prompt) {
    const round = next.topic ? 'Round ' + next.round + ' · ' + next.topic + ' · ' : '';
    content.append(node('p', round + 'Question ' + (next.position + 1) + ' of ' + next.total), node('h2', next.prompt));
    const media = next.media && mediaView(next.media);
    if (media) content.append(media);
    const choices = node('ul');
    choices.className = 'quiz-projector-choices';
    next.options.forEach((option, index) => {
      const correct = next.correct !== null && Number(next.correct) === index;
      const choice = node('li', answerLetters[index] + '. ' + option + (correct ? ' · Correct' : ''));
      if (correct) choice.className = 'quiz-correct-choice';
      choices.append(choice);
    });
    content.append(choices);
  }
  if (next.phase === 'finished') content.append(winnerScreen(next.scores));
  if (next.phase !== 'open') {
    const ranking = node('ol');
    ranking.className = 'quiz-projector-ranks';
    next.scores.slice(0, 10).forEach(team => {
      ranking.append(node('li', team.name + (next.phase === 'lobby' ? '' : ' · ' + team.points + ' points')));
    });
    if (next.scores.length) content.append(node('h2', next.phase === 'lobby' ? 'Teams' : next.phase === 'finished' ? 'Final leaderboard' : 'Leaderboard'), ranking);
    if (next.scores.length > 10) content.append(node('p', 'Showing 10 of ' + next.scores.length + ' teams'));
  }
  room.replaceChildren(title, content);
}

function show(next) {
  if (JSON.stringify(state) === JSON.stringify(next)) return;
  if (projector) {
    projectorContent(next);
    state = next;
    return;
  }
  const previousName = room.querySelector('input')?.value;
  const editing = room.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
  const currentMedia = state?.position === next.position && next.prompt
    ? room.querySelector('[data-question-media]') : null;
  state = next;
  room.replaceChildren(node('h2', next.title));
  if (next.host) {
    const displayUrl = new URL(location.href);
    displayUrl.searchParams.set('display', 'projector');
    const display = node('a', 'Open projector view');
    display.href = displayUrl;
    display.target = '_blank';
    display.rel = 'noopener';
    display.className = 'quiz-cta quiz-secondary';
    room.append(display);
  }
  if (next.phase === 'lobby' && next.host) {
    room.append(node('p', 'Ask each team captain to open Pub Quiz and enter this code.'));
    const joinCode = node('strong', next.code);
    joinCode.className = 'join-code';
    const share = node('a', 'Team join link');
    share.href = location.href;
    room.append(joinCode, node('p'));
    room.lastElementChild.append(share);
  }
  if (next.phase === 'lobby' && !next.team && !next.host) {
    const join = node('form');
    const name = input(40, previousName);
    name.minLength = 2;
    const submit = node('button', 'Register team');
    join.append(field('Team name', name), submit);
    join.onsubmit = event => { event.preventDefault(); actOnRoom('join', { p_name: name.value }); };
    room.append(join);
    if (editing) name.focus();
  }
  if (next.team) room.append(node('p', 'Your team · ' + next.team));
  if (next.phase === 'lobby') room.append(node('p', 'Waiting for the host to start.'));
  if (next.prompt) {
    if (next.topic) room.append(node('p', 'Round ' + next.round + ' · ' + next.topic));
    room.append(node('h3', 'Question ' + (next.position + 1) + ' of ' + next.total), node('p', next.prompt));
    if (next.media) {
      const media = currentMedia || mediaView(next.media);
      if (media) room.append(media);
    }
    const choices = node('div');
    choices.className = 'choices';
    next.options.forEach((choice, index) => {
      const label = answerLetters[index] + '. ' + choice + (next.selected === index ? ' · Your answer' : '') + (Number(next.correct) === index && next.correct !== null ? ' · Correct' : '');
      const choiceButton = button(label, () => actOnRoom('answer', { p_question: next.position, p_choice: index }));
      choiceButton.disabled = !next.team || next.selected !== null || next.phase !== 'open';
      choices.append(choiceButton);
    });
    room.append(choices);
  }
  if (next.host && next.phase !== 'finished') {
    const label = { lobby: 'Start quiz', open: 'Close answers and reveal', reveal: next.position + 1 === next.total ? 'Finish quiz' : 'Next question' }[next.phase];
    const control = button(label, () => actOnRoom('advance', { p_question: next.position, p_name: next.phase }));
    control.disabled = next.phase === 'lobby' && next.scores.length === 0;
    room.append(control);
  }
  if (next.phase === 'finished') room.append(winnerScreen(next.scores));
  room.append(node('h3', next.phase === 'lobby' ? 'Teams' : 'Leaderboard'));
  const ranks = node('ol');
  next.scores.forEach(team => ranks.append(node('li', team.name + (next.phase === 'lobby' ? '' : ' · ' + team.points + ' points'))));
  room.append(ranks);
}

async function init() {
  const params = new URLSearchParams(location.search);
  const { data: { session } } = await db.auth.getSession();
  if (!session) { byId('signin').hidden = false; return; }
  byId('join').hidden = false;
  if (params.has('code')) {
    byId('join-form').elements.code.value = params.get('code');
    try { await open(params.get('code')); return; }
    catch (error) { announce(error.message); }
  }
  if (projector) {
    byId('join').hidden = true;
    if (!params.has('code')) announce('Open the projector from an active quiz host screen.');
    return;
  }
  const [venues, billing] = await Promise.all([
    rpc('local_quiz_venues'),
    db.functions.invoke('quiz-billing', { body: { status: true } }).catch(() => null),
  ]);
  checkoutReady = billing?.data?.checkoutReady === true;
  for (const entry of venues || []) {
    setup.elements.venue.add(new Option(entry.name, entry.id));
  }
  setup.elements.venue.add(new Option('Private party · Party Quiz Pass', 'party'));
  if (params.get('party') === '1' || !venues?.length) {
    setup.elements.venue.value = 'party';
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (draft?.rounds?.length) {
        setup.elements.title.value = draft.title;
        rounds.replaceChildren();
        draft.rounds.forEach(round => addRound(round.topic, round.questions, round.difficulty));
      }
    } catch { announce('The saved party draft could not be loaded.'); }
  }
  if ([...setup.elements.venue.options].some(item => item.value === params.get('venue'))) setup.elements.venue.value = params.get('venue');
  byId('setup').hidden = false;
  await access();
  if (params.get('checkout') === 'success' && byId('create').disabled) {
    announce('Stripe has returned you to The Local. Payment verification can take a moment. Refresh this page to check access.');
  }
}
init().catch(error => announce(error.message));
