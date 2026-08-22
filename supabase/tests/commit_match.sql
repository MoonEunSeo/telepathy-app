-- commit_match() 수동 통합 검증.
-- V2 마이그레이션을 적용한 검증 DB에서 실행한다.
-- 전체를 트랜잭션으로 감싸 테스트 데이터는 남지 않는다.

begin;

insert into public.actors (id, actor_type, status)
values
  ('00000000-0000-4000-8000-000000000001', 'GUEST', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000002', 'GUEST', 'ACTIVE');

do $$
declare
  v_replayed boolean;
begin
  select replayed into v_replayed
    from public.commit_match(
      '10000000-0000-4000-8000-000000000001',
      120000001,
      '통합 테스트',
      '00000000-0000-4000-8000-000000000001',
      'socket-a',
      '테스트A',
      '00000000-0000-4000-8000-000000000002',
      'socket-b',
      '테스트B'
    );

  if v_replayed then
    raise exception '첫 호출이 replay로 처리됐습니다.';
  end if;

  select replayed into v_replayed
    from public.commit_match(
      '10000000-0000-4000-8000-000000000001',
      120000001,
      '통합 테스트',
      '00000000-0000-4000-8000-000000000001',
      'socket-a-retry',
      '테스트A',
      '00000000-0000-4000-8000-000000000002',
      'socket-b-retry',
      '테스트B'
    );

  if not v_replayed then
    raise exception '동일 match_id 재호출이 replay로 처리되지 않았습니다.';
  end if;

  if (select count(*) from public.chat_sessions
       where id = '10000000-0000-4000-8000-000000000001') <> 1
     or (select count(*) from public.chat_session_members
         where session_id = '10000000-0000-4000-8000-000000000001') <> 2
     or (select count(*) from public.match_attempts
         where matched_session_id = '10000000-0000-4000-8000-000000000001'
           and status = 'MATCHED') <> 2 then
    raise exception '매칭 원장 행 수가 예상과 다릅니다.';
  end if;

  begin
    perform *
      from public.commit_match(
        '10000000-0000-4000-8000-000000000001',
        120000001,
        '다른 단어',
        '00000000-0000-4000-8000-000000000001',
        'socket-a',
        '테스트A',
        '00000000-0000-4000-8000-000000000002',
        'socket-b',
        '테스트B'
      );
    raise exception '다른 fingerprint의 match_id 재사용이 허용됐습니다.';
  exception
    when others then
      if sqlerrm <> 'MATCH_ID_CONFLICT' then
        raise;
      end if;
  end;

  begin
    perform *
      from public.commit_match(
        '10000000-0000-4000-8000-000000000002',
        120000002,
        '원자성 테스트',
        '00000000-0000-4000-8000-000000000001',
        'socket-a',
        '테스트A',
        '00000000-0000-4000-8000-000000000099',
        'socket-missing',
        '없는 actor'
      );
    raise exception '없는 actor의 매칭이 허용됐습니다.';
  exception
    when others then
      if sqlerrm <> 'ACTOR_NOT_FOUND' then
        raise;
      end if;
  end;

  if exists (
    select 1 from public.chat_sessions
     where id = '10000000-0000-4000-8000-000000000002'
  ) then
    raise exception '실패한 함수의 세션이 롤백되지 않았습니다.';
  end if;

  if has_function_privilege(
       'anon',
       'public.commit_match(uuid,bigint,text,uuid,text,text,uuid,text,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.commit_match(uuid,bigint,text,uuid,text,text,uuid,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.commit_match(uuid,bigint,text,uuid,text,text,uuid,text,text)',
       'EXECUTE'
     ) then
    raise exception 'commit_match 실행 권한이 예상과 다릅니다.';
  end if;
end;
$$;

rollback;
