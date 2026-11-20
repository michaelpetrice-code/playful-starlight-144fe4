const form=document.querySelector('#partner-form'),status=document.querySelector('#partner-status'),draft=document.querySelector('#partner-email');
function invalidate(){draft.hidden=true;draft.removeAttribute('href');status.textContent='';}
form.addEventListener('input',invalidate);
for(const link of document.querySelectorAll('[data-interest]'))link.addEventListener('click',()=>{form.elements.interest.value=link.dataset.interest;invalidate();});
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const values=new FormData(form),subject='The Local enquiry: '+values.get('interest'),body=['Hello The Local,','',...['interest','business','contact','area'].map(key=>({interest:'Interested in',business:'Business',contact:'Contact name',area:'Area'}[key])+': '+String(values.get(key)).trim()),'',String(values.get('message')).trim(),'','Please contact me about this enquiry. I understand that availability, price and duration must be agreed separately, and no booking or payment has been made.'].join('\n');draft.href='mailto:info@thelocal.me.uk?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);draft.hidden=false;status.textContent='Your email draft is ready. Open it, review it and send it in your email app. Nothing has been sent yet.';});

form.querySelector('button[type=submit]').disabled=false;
