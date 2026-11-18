-- Apply AFTER ONLINE-CUE-v90.sql. Deploy Edge Function `cue-shot`.
-- RPC is deliberately service_role only: clients cannot submit arbitrary states.
create or replace function public.local_cue_commit_v95(
 p_game uuid,p_version integer,p_actor uuid,p_state jsonb,
 p_next_turn uuid,p_winner uuid,p_finished boolean,p_event jsonb
) returns integer language plpgsql security definer set search_path=public as $$
declare g public.local_cue_matches%rowtype;
begin
 select * into g from public.local_cue_matches where id=p_game for update;
 if not found or g.status<>'playing' or g.version<>p_version or g.turn_user<>p_actor then
  raise exception 'Match changed or turn invalid';
 end if;
 if p_actor not in (g.player_one,g.player_two) or p_next_turn not in (g.player_one,g.player_two) then
  raise exception 'Invalid player';
 end if;
 if p_winner is not null and p_winner not in (g.player_one,g.player_two) then raise exception 'Invalid winner';end if;
 if jsonb_typeof(p_state->'balls')<>'array' or jsonb_array_length(p_state->'balls')>23 or
    jsonb_array_length(p_state->'balls')<2 then raise exception 'Invalid table state';end if;
 update public.local_cue_matches set
  state=p_state,version=g.version+1,turn_user=p_next_turn,
  winner=case when p_finished then p_winner else null end,
  status=case when p_finished then 'finished' else 'playing' end,
  updated_at=now() where id=p_game;
 update public.local_cue_matches set history=(
   select coalesce(jsonb_agg(value order by ord),'[]'::jsonb)
   from jsonb_array_elements(jsonb_build_array(p_event)||g.history) with ordinality as t(value,ord)
   where ord<=40
 ) where id=p_game;
 return g.version+1;
end $$;
revoke all on function public.local_cue_commit_v95(uuid,integer,uuid,jsonb,uuid,uuid,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.local_cue_commit_v95(uuid,integer,uuid,jsonb,uuid,uuid,boolean,jsonb) to service_role;
-- Prevent older client-authorized RPC from bypassing the new referee.
revoke execute on function public.local_cue_shot(uuid,integer,double precision,double precision) from authenticated,anon,public;
-- Ensure Realtime sends changed rows to authenticated participants (RLS still applies).
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='local_cue_matches')
 then alter publication supabase_realtime add table public.local_cue_matches;end if;
end $$;
