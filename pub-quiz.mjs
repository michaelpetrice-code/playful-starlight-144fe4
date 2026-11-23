import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const byId = id => document.getElementById(id);
const { supabaseUrl, supabaseAnonKey } = window.LADS_CONFIG;
const db = createClient(supabaseUrl, supabaseAnonKey);
const setup = byId('setup-form');
const room = byId('room');
const answerLetters = ['A', 'B', 'C', 'D'];
let code, state, busy = false, refreshTimer, accessRequest = 0;

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

function addQuestion(data = { prompt: '', options: ['', '', '', ''], correct: 0 }) {
  const list = byId('questions');
  if (list.children.length >= 60) return;
  const group = node('fieldset');
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
  list.append(group);
}
const sample = [
  { prompt: 'Which city is home to the Roman Baths?', options: ['York', 'Bath', 'Chester', 'Oxford'], correct: 1 },
  { prompt: 'How many sides does a hexagon have?', options: ['Five', 'Seven', 'Six', 'Eight'], correct: 2 },
  { prompt: 'Which band released the song “Here Comes the Sun”?', options: ['The Beatles', 'Queen', 'Fleetwood Mac', 'The Kinks'], correct: 0 },
  { prompt: 'What is the capital of Wales?', options: ['Swansea', 'Newport', 'Bangor', 'Cardiff'], correct: 3 },
];
byId('add').onclick = () => addQuestion();
byId('sample').onclick = () => {
  const list = byId('questions');
  if (list.children.length === 1 && ![...list.querySelectorAll('input')].some(item => item.value)) list.replaceChildren();
  sample.forEach(addQuestion);
};
addQuestion();

async function access() {
  const request = ++accessRequest;
  const create = byId('create');
  create.disabled = true;
  byId('subscribe').hidden = true;
  byId('access').textContent = 'Checking hosting access…';
  try {
    const result = await rpc('local_quiz_host_access', { p_venue: setup.elements.venue.value });
    if (request !== accessRequest) return;
    create.disabled = !['paid', 'complimentary'].includes(result);
    byId('subscribe').hidden = result !== 'subscription_required';
    byId('access').textContent = ({
      paid: 'Hosting included with your active venue subscription.',
      complimentary: 'Complimentary hosting for Coombe Social Club.',
      subscription_required: 'A paid venue subscription is required to host.',
      denied: 'Venue owner or administrator access is required.',
    })[result];
  } catch (error) {
    if (request === accessRequest) byId('access').textContent = error.message;
  }
}
setup.elements.venue.onchange = access;
setup.onsubmit = event => {
  event.preventDefault();
  action(async () => {
    const questions = [...byId('questions').children].map(group => ({
      prompt: group.querySelector('[name=prompt]').value.trim(),
      options: [...group.querySelectorAll('[name=option]')].map(option => option.value.trim()),
      correct: Number(group.querySelector('select').value),
    }));
    const result = await rpc('local_quiz_create', {
      p_venue: setup.elements.venue.value, p_title: setup.elements.title.value, p_questions: questions,
    });
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
  code = next;
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('code', code);
  history.replaceState(null, '', url);
  state = null;
  show(result);
  byId('setup').hidden = true;
  byId('join').hidden = true;
  room.hidden = false;
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, 2500);
}
let syncFailed = false;
async function refresh() {
  if (busy || document.hidden || state?.phase === 'finished') return;
  busy = true;
  try {
    show(await rpc('local_quiz_room', { p_code: code }));
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
function show(next) {
  if (JSON.stringify(state) === JSON.stringify(next)) return;
  const previousName = room.querySelector('input')?.value;
  const editing = room.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
  state = next;
  room.replaceChildren(node('h2', next.title));
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
    room.append(node('h3', 'Question ' + (next.position + 1) + ' of ' + next.total), node('p', next.prompt));
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
  if (next.phase === 'finished') room.append(node('p', 'Quiz complete.'));
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
  const venues = await rpc('local_quiz_venues');
  for (const entry of venues || []) {
    setup.elements.venue.add(new Option(entry.name, entry.id));
  }
  if (!setup.elements.venue.options.length) return;
  if ([...setup.elements.venue.options].some(item => item.value === params.get('venue'))) setup.elements.venue.value = params.get('venue');
  byId('setup').hidden = false;
  await access();
}
init().catch(error => announce(error.message));
