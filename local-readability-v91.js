
/* Optional, persistent readability controls. No user profile or backend writes. */
(()=>{
 const KEY='tl-readability-v91',root=document.documentElement;
 let prefs={size:0,contrast:false};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved==='object')prefs={size:[0,1,2].includes(saved.size)?saved.size:0,contrast:saved.contrast===true}}catch(_){}
 const apply=()=>{
  root.classList.toggle('tl91-large',prefs.size===1);
  root.classList.toggle('tl91-extra',prefs.size===2);
  root.classList.toggle('tl91-contrast',prefs.contrast);
  const size=document.getElementById('tl91-font');
  if(size){size.setAttribute('aria-label',['Use normal text size','Use large text size','Use extra large text size'][prefs.size]);size.title=['Normal text size','Large text size','Extra large text size'][prefs.size];size.textContent=['A','A+','A++'][prefs.size]}
  const contrast=document.getElementById('tl91-contrast');
  if(contrast)contrast.setAttribute('aria-pressed',String(prefs.contrast));
 };
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch(_){}apply()};
 function mount(){
  if(document.getElementById('tl91-a11y'))return;
  const wrap=document.createElement('div');
  wrap.id='tl91-a11y';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','Reading and accessibility options');
  wrap.innerHTML='<span class="tl91-label">Easy Read</span><button id="tl91-font" type="button" aria-label="Change text size">A+</button><button id="tl91-contrast" type="button" aria-label="Toggle high contrast" aria-pressed="false">◐</button>';
  document.body.append(wrap);
  wrap.querySelector('#tl91-font').addEventListener('click',()=>{prefs.size=(prefs.size+1)%3;save()});
  wrap.querySelector('#tl91-contrast').addEventListener('click',()=>{prefs.contrast=!prefs.contrast;save()});
  apply();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 apply();
})();
