import { sharedPage, memberPageUrl } from './page-share.js?v=173';
import {bindVenueSignIn} from './venue-member-sign-in.js?v=170';
import { selectedVenuePlan, venuePlans, venueSignupReturn } from './venue-plans.js?v=154';

const cfg=window.LADS_CONFIG||{};
const gate=document.getElementById('tl-auth-gate');
const message=document.getElementById('tl-auth-message');
const form=document.getElementById('tl-auth-form');
const nameRow=document.getElementById('tl-auth-name-row');
const nameInput=document.getElementById('tl-auth-name');
const confirmRow=document.getElementById('tl-auth-confirm-row');
const confirmInput=document.getElementById('tl-auth-confirm');
const emailInput=document.getElementById('tl-auth-email');
const passInput=document.getElementById('tl-auth-password');
const submit=document.getElementById('tl-auth-submit');
const params = new URLSearchParams(location.search);
const plan = selectedVenuePlan(params);
const venueSignup = plan && !params.has('checkout');
const guestLink = document.getElementById('tl-continue-guest');
const guestUrl = new URL('guest.html', location.href);
for (const key of ['page', 'venue', 'item', 'community', 'published', 'source', 'section', 'game', 'share-game', 'venue-return', 'utm_source', 'utm_campaign']) {
  if (params.has(key)) guestUrl.searchParams.set(key, params.get(key));
}
if (/^#(?:venue|join-private|join-community)=/.test(location.hash) || location.hash === '#tables') {
  guestUrl.hash = location.hash;
}
guestLink.href = guestUrl.href;
guestLink.hidden = /(?:^#|&)type=recovery(?:&|$)/.test(location.hash);
const authTitle = document.getElementById('tl-auth-title');
const authSubtitle = document.getElementById('tl-auth-subtitle');
const planLabel = document.getElementById('tl-venue-auth-plan');
const emailActions = document.getElementById('tl-venue-auth-email-actions');
const resend = document.getElementById('tl-venue-auth-resend');
const changeEmail = document.getElementById('tl-venue-auth-change-email');
const incomingPage = sharedPage();
const publicVenue = new URLSearchParams(location.hash.slice(1)).get('venue');
const game = params.get('share-game');
const shareReturn = incomingPage ? new URL(memberPageUrl(incomingPage.page, incomingPage))
  : publicVenue && /^[a-z0-9_-]{1,90}$/i.test(publicVenue) ? new URL(memberPageUrl('venues',{venue:publicVenue})) : null;
if (shareReturn && incomingPage?.page === 'arcade' && /^[a-z0-9-]{1,30}$/.test(game || '')) shareReturn.searchParams.set('share-game',game);
const signupRedirect = venueSignup ? venueSignupReturn(location.origin, plan) : shareReturn?.href;
let client=null,mode='login',working=false;
let pendingEmail = '';

if (venueSignup) {
  planLabel.hidden = false;
  planLabel.textContent = '14 days free, then ' + venuePlans[plan].renewal + '.';
}
function status(text,kind=''){message.textContent=text;message.dataset.kind=kind}
function show(yes){
 document.documentElement.classList.toggle('tl-auth-locked',yes);
 gate.hidden=!yes;
 if(!yes){pendingEmail='';status('');return;}
 if(venueSignup && mode==='register' && pendingEmail) showEmailConfirmation();
}
function setMode(next){
 mode=next;
 form.hidden=false;
 emailActions.hidden=true;
 nameRow.hidden=mode!=='register';
 confirmRow.hidden=mode!=='register'||Boolean(venueSignup);
 confirmInput.required=!confirmRow.hidden;
 nameInput.required=mode==='register';
 passInput.autocomplete=mode==='register'?'new-password':'current-password';
 submit.textContent=mode==='register'?(venueSignup?'Create venue account':'Create account'):'Log in';
 authTitle.textContent=mode==='register'?(venueSignup?'Create your venue account':'Join The Local'):'Welcome to The Local';
 authSubtitle.textContent=venueSignup
  ? (mode==='register'?'Confirm your email and you’ll be ready to start your trial.':'Log in to continue to your chosen plan.')
  : (mode==='register'?'Create your free member account. No payment details or commitment.':'Sign in with your Local account or continue with your Coombe account.');
 document.getElementById('tl-auth-switch').textContent=mode==='register'?'Already have an account? Log in':'New here? Create an account';
 document.getElementById('tl-auth-forgot').hidden=mode==='register';
 status('');
}
function showEmailConfirmation() {
  form.hidden = true;
  emailActions.hidden = false;
  authTitle.textContent = 'Check your email';
  authSubtitle.textContent = 'Open the confirmation link sent to ' + pendingEmail + ' to continue to your plan.';
  authTitle.focus();
}

resend.addEventListener('click', async () => {
  if (!client || working || !pendingEmail) return;
  busy(true);
  try {
    const { error } = await client.auth.resend({
      type: 'signup', email: pendingEmail, options: { emailRedirectTo: signupRedirect }
    });
    if (error) throw error;
    status('If confirmation is still needed, we’ve sent another email.','success');
  } catch (error) {
    status(error.message, 'error');
  } finally {
    busy(false);
  }
});
changeEmail.addEventListener('click', () => {
  pendingEmail = '';
  setMode('register');
  emailInput.focus();
});
authTitle.tabIndex = -1;

// v206: Removed redundant Coombe sign-in shortcut; standard account sign-in remains.

function busy(yes){working=yes;resend.disabled=yes;changeEmail.disabled=yes;submit.disabled=yes;document.getElementById('tl-auth-switch').disabled=yes;document.getElementById('tl-auth-forgot').disabled=yes}
document.getElementById('tl-auth-switch').addEventListener('click',()=>setMode(mode==='login'?'register':'login'));
document.getElementById('tl-auth-forgot').addEventListener('click',async()=>{
 const email=emailInput.value.trim();
 if(!email){status('Enter your email address first.','error');emailInput.focus();return}
 if(!client){status('Login service is unavailable.','error');return}
 busy(true);
 try{
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  if(error)throw error;
  status('If that address is registered, you will receive a password-reset email.','success');
 }catch(e){status(e.message,'error')}finally{busy(false)}
});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(working)return;
 if(!client){status('Sign-in is still connecting. Please try again shortly.','error');return;}
 const email=emailInput.value.trim(),password=passInput.value;
 if(password.length<6){status('Use a password of at least 6 characters.','error');return}
 busy(true);
 try{
  if(mode==='register'){
   if(confirmInput.required && password!==confirmInput.value)throw Error('Passwords do not match. Please try again.');
   const display_name=nameInput.value.trim();
   if(display_name.length<2||display_name.length>60)throw Error('Please enter a name between 2 and 60 characters.');
   const options = { data: { display_name, full_name: display_name } };
   if (signupRedirect) options.emailRedirectTo = signupRedirect;
   const {data,error}=await client.auth.signUp({email,password,options});
   if(error)throw error;
   if(data.session) show(false);
   else if (venueSignup) {
    pendingEmail = email;
    passInput.value = '';
    showEmailConfirmation();
   } else status('Check your email to confirm your account, then log in.','success');
  }else{
   const {error}=await client.auth.signInWithPassword({email,password});
   if(error)throw error;
   show(false);
  }
 }catch(e){status(e.message,'error')}finally{busy(false)}
});
async function init(){
 show(true);setMode((venueSignup && !params.has('confirmed')) || (!venueSignup && params.get('register') === '1') ? 'register' : 'login');
 if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){status('Sign-in has not been configured. Contact the site administrator.','error');busy(true);return}
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  show(!data.session);
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT')show(true);
   else if(event==='SIGNED_IN'&&session)show(false);
  });
 }catch(e){show(true);status('Unable to connect to the sign-in service. Check your internet connection and try refreshing.','error')}
}
init();
