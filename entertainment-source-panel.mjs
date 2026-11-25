import {sourceLinks} from './entertainment-sources.mjs';
for(const panel of document.querySelectorAll('[data-entertainment-sources]')){
 const form=panel.querySelector('form'), output=panel.querySelector('[data-results]'), input=form.querySelector('input'), select=form.querySelector('select');
 function render(){
  const kind=select?.value||panel.dataset.entertainmentSources;
  output.replaceChildren(...sourceLinks(kind,input.value).map(source=>{
   const li=document.createElement('li'), a=document.createElement('a');
   a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.name+' — open provider';li.append(a);return li;
  }));
 }
 form.addEventListener('submit',e=>{e.preventDefault();render();});
 select?.addEventListener('change',render);render();
}
