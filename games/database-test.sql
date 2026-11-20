begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();r jsonb;g uuid;d jsonb:='{"kind":"noughts","turn":0,"moves":0,"finished":false,"winner":null,"board":[0,0,0,0,0,0,0,0,0]}'::jsonb;
begin
 insert into auth.users(id) values(a),(b),(c);
 r:=public.tl_arcade_service('create',a,jsonb_build_object('kind','noughts','state',d));g:=(r#>>'{match,id}')::uuid;
 if r#>>'{match,status}'<>'waiting' then raise exception 'TEST FAIL waiting';end if;
 begin perform public.tl_arcade_service('get',c,jsonb_build_object('id',g));raise exception 'TEST FAIL outsider';exception when others then if sqlerrm='TEST FAIL outsider' then raise;end if;end;
 r:=public.tl_arcade_service('join',b,jsonb_build_object('id',g));if r#>>'{match,status}'<>'playing' or (r#>>'{match,version}')::int<>1 then raise exception 'TEST FAIL join';end if;
 begin perform public.tl_arcade_service('commit',b,jsonb_build_object('id',g,'version',1,'state',d));raise exception 'TEST FAIL turn';exception when others then if sqlerrm='TEST FAIL turn' then raise;end if;end;
 begin perform public.tl_arcade_service('commit',a,jsonb_build_object('id',g,'version',0,'state',d));raise exception 'TEST FAIL stale';exception when others then if sqlerrm='TEST FAIL stale' then raise;end if;end;
 begin perform public.tl_arcade_service('commit',a,jsonb_build_object('id',g,'state',d));raise exception 'TEST FAIL missing version';exception when others then if sqlerrm='TEST FAIL missing version' then raise;end if;end;
 r:=public.tl_arcade_service('commit',a,jsonb_build_object('id',g,'version',1,'state',jsonb_set(d,'{turn}','1')));
 if (r#>>'{match,version}')::int<>2 then raise exception 'TEST FAIL commit';end if;
 begin perform public.tl_arcade_service('commit',a,jsonb_build_object('id',g,'version',1,'state',d));raise exception 'TEST FAIL replay';exception when others then if sqlerrm='TEST FAIL replay' then raise;end if;end;
 if has_table_privilege('authenticated','public.tl_arcade_matches','select') or has_table_privilege('anon','public.tl_arcade_matches','select') or has_function_privilege('authenticated','public.tl_arcade_service(text,uuid,jsonb)','execute') or has_function_privilege('anon','public.tl_arcade_service(text,uuid,jsonb)','execute') then raise exception 'TEST FAIL grants';end if;
end $$;
select 'PASS: creation, invitation join, outsider denial, wrong-turn denial, version checks, duplicate replay denial, service-only access' as result;
rollback;
