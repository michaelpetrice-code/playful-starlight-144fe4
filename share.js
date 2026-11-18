// Share via the phone's share sheet where available; otherwise copy a ready-to-send invitation.
export async function shareLocal({title='The Local',message,url,notify=()=>{},copied="Invitation copied. Paste it into a message."}={}){
  const link=url||location.origin+location.pathname;
  const text=message||'Join me on The Local — chat, events, games and your local community!';
  if(navigator.share){
    try{await navigator.share({title,text,url:link});return true}
    catch(error){if(error?.name==='AbortError')return false}
  }
  const full=text+'\n'+link;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(full);notify(copied);return true}}catch{}
  const input=document.createElement('textarea');input.value=full;input.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(input);input.select();
  let ok=false;try{ok=document.execCommand('copy')}catch{}input.remove();
  if(ok){notify(copied);return true}
  window.prompt('Copy this link and send it to a friend:',full);return false;
}
