// Keep the original File intact so animated GIFs are never flattened to a still image.
export const attachmentTypes = {
 'image/jpeg':['jpg','image'], 'image/png':['png','image'], 'image/webp':['webp','image'], 'image/gif':['gif','image'],
 'video/mp4':['mp4','video'], 'video/webm':['webm','video'],
 'audio/webm':['webm','audio'], 'audio/ogg':['ogg','audio'], 'audio/mp4':['m4a','audio'],
 'audio/mpeg':['mp3','audio'], 'application/pdf':['pdf','document']
};
export function attachmentError(file){
 if(!file)return '';
 if(file.size>50*1024*1024)return 'Choose a file under 50 MB.';
 if(!attachmentTypes[file.type?.split(';')[0]])return 'Choose a GIF, photo, video, audio file or PDF.';
 return '';
}
export function bindTableAttachments(form,body,{notice=()=>{},onSelect=()=>{},url=URL,DataTransferClass=globalThis.DataTransfer}={}){
 const input=form.elements.media,doc=form.ownerDocument;
 if(!input||!body)return;
 const preview=doc.createElement('div');preview.className='table-attachment-preview';preview.hidden=true;
 const image=doc.createElement('img');image.alt='Attachment preview';
 const name=doc.createElement('span');name.setAttribute('role','status');
 const remove=doc.createElement('button');remove.type='button';remove.textContent='Remove attachment';
 preview.append(image,name,remove);form.append(preview);
 const gif=doc.createElement('input');gif.type='file';gif.accept='image/gif';gif.hidden=true;gif.tabIndex=-1;gif.setAttribute('aria-label','Choose a GIF file');form.append(gif);
 let objectUrl;
 function show(){
  if(objectUrl){url.revokeObjectURL(objectUrl);objectUrl=null}
  const file=input.files?.[0];preview.hidden=!file;image.hidden=true;image.removeAttribute('src');
  if(!file)return;
  const error=attachmentError(file);if(error){input.value='';preview.hidden=true;notice(error);return}
  name.textContent=(file.type==='image/gif'?'GIF · ':'')+file.name;
  if(file.type.startsWith('image/')){objectUrl=url.createObjectURL(file);image.src=objectUrl;image.hidden=false}
  form.querySelector('.messenger-attachments')?.removeAttribute('open');onSelect();
 }
 function attach(file){
  const error=attachmentError(file);if(error){notice(error);return false}
  try{const transfer=new DataTransferClass();transfer.items.add(file);input.files=transfer.files;show();return true}
  catch{notice('Tap + and Attach a file to choose the saved GIF or image.');return false}
 }
 input.addEventListener('change',show);
 gif.addEventListener('change',()=>{const file=gif.files?.[0];if(file)attach(file);gif.value=''});
 const gifToggle=form.querySelector('#chooseChatGif');
 if(gifToggle){
  const picker=doc.getElementById('chatGifPicker');
  if(picker){
   gifToggle.addEventListener('click',()=>{
    picker.hidden=!picker.hidden;
    gifToggle.setAttribute('aria-expanded',String(!picker.hidden));
   });
   picker.querySelector('[data-upload-gif]').addEventListener('click',()=>gif.click());
   for(const choice of picker.querySelectorAll('[data-chat-gif]')){
    choice.addEventListener('click',async()=>{
     choice.disabled=true;
     try{
      const response=await fetch(choice.dataset.chatGif);
      if(!response.ok)throw Error('GIF unavailable');
      const clip=await response.blob();
      const filename=choice.dataset.chatGif.split('/').pop();
      if(attach(new File([clip],filename,{type:'image/gif'}))){
       picker.hidden=true;
       gifToggle.setAttribute('aria-expanded','false');
       body.focus();
      }
     }catch{notice('Couldn’t load that GIF. Try again or choose a saved GIF.')}
     finally{choice.disabled=false}
    });
   }
  }else{
   gifToggle.addEventListener('click',()=>gif.click());
  }
 }
 body.addEventListener('paste',event=>{
  const file=event.clipboardData?.files?.[0];if(!file)return;
  if(attach(file))event.preventDefault();
 });
 remove.addEventListener('click',()=>{input.value='';show();body.focus()});
 form.addEventListener('reset',()=>{input.value='';show()});
 window.addEventListener('pagehide',()=>{if(objectUrl)url.revokeObjectURL(objectUrl)});
 return {attach,refresh:show};
}
