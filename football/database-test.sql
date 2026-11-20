-- Staging integration checks. Every synthetic record is rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();r jsonb;l uuid;code text;fixture text;
begin
 insert into auth.users(id) values(a),(b),(outsider);
 perform set_config('request.jwt.claim.sub',a::text,true);
 r:=public.tl_football('create',jsonb_build_object('name','Football integration test','name_player','Owner','deadline',now()+interval '1 day'));
 l:=(r#>>'{league,id}')::uuid;code:=r#>>'{league,invite}';
 perform public.tl_football('fixture',jsonb_build_object('id',l,'home','A','away','B'));
 perform public.tl_football('pick',jsonb_build_object('id',l,'team','A'));
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin perform public.tl_football('get',jsonb_build_object('id',l));raise exception 'TEST FAIL: outsider access';exception when others then if sqlerrm='TEST FAIL: outsider access' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 r:=public.tl_football('join',jsonb_build_object('code',code,'name','Player'));
 if not (r->>'pending')::boolean then raise exception 'TEST FAIL: approval';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.tl_football('approve',jsonb_build_object('id',l,'member',b));
 perform set_config('request.jwt.claim.sub',b::text,true);
 r:=public.tl_football('get',jsonb_build_object('id',l));
 if jsonb_array_length(r#>'{league,picks}')<>0 then raise exception 'TEST FAIL: hidden picks leaked';end if;
 begin perform public.tl_football('settings',jsonb_build_object('id',l,'name','Hijacked','theme','red'));raise exception 'TEST FAIL: role bypass';exception when others then if sqlerrm='TEST FAIL: role bypass' then raise;end if;end;
 perform public.tl_football('pick',jsonb_build_object('id',l,'team','B'));
 perform public.tl_football('message',jsonb_build_object('id',l,'text','Hello matchday'));
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin perform public.tl_football('settle',jsonb_build_object('id',l));raise exception 'TEST FAIL: early settlement';exception when others then if sqlerrm='TEST FAIL: early settlement' then raise;end if;end;
 update public.tl_football_leagues set doc=jsonb_set(doc,'{deadline}',to_jsonb(now()-interval '1 minute')) where id=l;
 begin perform public.tl_football('pick',jsonb_build_object('id',l,'team','B'));raise exception 'TEST FAIL: late pick';exception when others then if sqlerrm='TEST FAIL: late pick' then raise;end if;end;
 begin perform public.tl_football('settle',jsonb_build_object('id',l));raise exception 'TEST FAIL: unplayed settlement';exception when others then if sqlerrm='TEST FAIL: unplayed settlement' then raise;end if;end;
 select doc#>>'{fixtures,0,id}' into fixture from public.tl_football_leagues where id=l;
 perform public.tl_football('result',jsonb_build_object('id',l,'fixture',fixture,'status','FT','home_score',2,'away_score',1));
 r:=public.tl_football('settle',jsonb_build_object('id',l));
 if r#>>'{league,status}'<>'complete' or r#>>'{league,winner}'<>a::text then raise exception 'TEST FAIL: wrong winner';end if;
 if has_table_privilege('authenticated','public.tl_football_leagues','select') or has_function_privilege('anon','public.tl_football(text,jsonb)','execute') then raise exception 'TEST FAIL: direct access';end if;
end $$;
select 'PASS: creation, approval, outsider denial, private picks, owner-only controls, posting, deadlines, unplayed matches, settlement and API permissions' as result;
rollback;
