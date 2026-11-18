import { blankApp, renderVenue } from './venue-app-content.js';
const form=document.getElementById('venue-preview-form');
const preview=document.getElementById('venue-preview');
function update(){
  const details=Object.fromEntries(new FormData(form));
  preview.replaceChildren(renderVenue({...blankApp,...details,
    welcome:'Welcome in. See what’s on or ask us about hiring the function room.',
    features:{
      events:[{title:'Live music at the club',detail:'Your upcoming events appear here.',url:''}],
      room:[{title:'Function room',detail:'Share room details and receive enquiries.',url:''}],
      bingo:[], games:[]
    }
  },{preview:true}));
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  update();
  document.getElementById('venue-preview-status').textContent='Preview updated.';
});
update();
