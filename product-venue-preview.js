import { blankApp, renderVenue } from './venue-app-content.js';
const form=document.getElementById('venue-preview-form');
const preview=document.getElementById('venue-preview');
const examples = {
  'Social club': ['Live music night', 'See who’s playing and when doors open.', 'Function room', 'Show members where to hold a party.'],
  Pub: ['Friday pub quiz', 'Share quiz times and how to book a table.', 'Private dining area', 'Invite enquiries for group bookings.'],
  'Sports club': ['Saturday home fixture', 'Share the start time and venue details with supporters.', 'Clubhouse hire', 'Show what’s available for team socials and events.'],
  'Community venue': ['Saturday craft workshop', 'Tell visitors when the workshop starts and how to join.', 'Community hall', 'Share hall facilities and invite booking enquiries.']
};
function update(){
  const details = Object.fromEntries(new FormData(form));
  const [eventTitle, eventDetail, roomTitle, roomDetail] = examples[details.type] || examples['Social club'];
  preview.replaceChildren(renderVenue({...blankApp,...details,
    welcome:'See what’s coming up and find a space for your next event.',
    features:{
      events:[{title:eventTitle,detail:eventDetail,url:''}],
      room:[{title:roomTitle,detail:roomDetail,url:''}],
      bingo:[], games:[]
    }
  },{preview:true}));
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  update();
  document.getElementById('venue-preview-status').textContent='Preview updated.';
});
form.addEventListener('change', update);
update();
