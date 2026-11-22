const allowedHosts = new Set(['fcm.googleapis.com','android.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com']);
export function validSubscription(value) {
  try {
    const url=new URL(value?.endpoint);
    if(url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443') || value.endpoint.length>2048) return false;
    if(!allowedHosts.has(url.hostname) && !url.hostname.endsWith('.notify.windows.com') && !url.hostname.endsWith('.web.push.apple.com')) return false;
    const key=value.keys?.p256dh, auth=value.keys?.auth;
    return /^[A-Za-z0-9_-]{87}=?$/.test(key||'') && /^[A-Za-z0-9_-]{22}={0,2}$/.test(auth||'');
  } catch { return false; }
}
export function permittedRecipient(source, message, member) {
  if(source==='tl_table_posts') return member.status==='approved' && member.table_id===message.table_id && member.user_id!==message.user_id;
  if(source==='private_chat_messages') return member.room_id===message.room_id && member.user_id!==message.sender_id;
  if(source==='market_messages') return member.user_id===message.recipient_id && member.user_id!==message.sender_id;
  if(source==='local_member_notices') return member.user_id===message.user_id;
  return false;
}
export function allowsNotification(preferences, source, tableId) {
  if(preferences?.enabled===false) return false;
  if(source==='tl_table_posts' && preferences?.muted_tables?.includes(tableId)) return false;
  return true;
}
export function messageNotification(source,message,table) {
  let url='/index.html',body='You have a new message on The Local.';
  if(source==='tl_table_posts' && table?.venue_id){url='/secure-tables.html?'+new URLSearchParams({venue:table.venue_id,table:message.table_id,shortcut:'1'});body='New message at one of your tables.';}
  if(source==='private_chat_messages'){url='/index.html?'+new URLSearchParams({section:'private-chats',room:message.room_id});body='You have a new private chat message.';}
  if(source==='market_messages'){url='/index.html?section=marketplace';body='You have a new marketplace message or offer.';}
  if(source==='local_member_notices'){url='/index.html?section=alerts';body='You have an update from The Local.';}
  return {title:'The Local',body,url,tag:'local-message-'+message.id};
}
