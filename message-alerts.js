// Supabase RLS determines which message inserts each signed-in member may see.
export function watchMessageAlerts(client, member, onMessage) {
  if (!client || !member) return () => {};
  let active = true;
  const channel = client.channel(`member-messages:${member}`);
  for (const table of ['tl_table_posts','private_chat_messages','market_messages','local_member_notices']) {
    channel.on('postgres_changes',{event:'INSERT',schema:'public',table}, payload => {
      const row = payload.new;
      if (!active || !row || row.hidden || (table !== 'local_member_notices' && (row.user_id || row.sender_id) === member)) return;
      if (table === 'market_messages' && row.recipient_id !== member) return;
      if (table === 'local_member_notices' && row.user_id !== member) return;
      onMessage({table,id:row.id});
    });
  }
  channel.subscribe();
  return () => { active = false; client.removeChannel(channel); };
}
