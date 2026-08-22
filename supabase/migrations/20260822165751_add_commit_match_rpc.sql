-- Redis가 선점한 매칭을 V2 원장에 원자적으로 확정한다.
-- Supabase REST 쓰기를 나누면 중간 실패 시 한 사용자만 MATCHED인
-- 상태가 남으므로, 함수 호출 하나를 트랜잭션 경계로 삼는다.

alter table public.match_rounds alter column status set default 'SCHEDULED';
alter table public.chat_sessions alter column status set default 'READY';

create or replace function public.commit_match(
  p_match_id          uuid,
  p_round_key         bigint,
  p_word              text,
  p_current_actor_id  uuid,
  p_current_socket_id text,
  p_current_nickname  text,
  p_partner_actor_id  uuid,
  p_partner_socket_id text,
  p_partner_nickname  text
)
returns table (session_id uuid, replayed boolean)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor_count       integer;
  v_attempt           public.match_attempts%rowtype;
  v_existing_round    bigint;
  v_existing_word     text;
  v_member_count      integer;
  v_matching_members  integer;
  v_matched_attempts  integer;
  v_round_id          uuid;
  v_round_status      text;
  v_word_id           uuid;
  v_word              text := btrim(p_word);
begin
  if p_match_id is null
     or p_round_key is null
     or p_round_key <= 0
     or p_current_actor_id is null
     or p_partner_actor_id is null
     or p_current_actor_id = p_partner_actor_id
     or v_word is null
     or v_word = '' then
    raise exception 'INVALID_MATCH_INPUT';
  end if;

  -- 같은 match_id의 동시 재시도는 하나만 진행한다.
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 0));

  select mr.round_key, w.text
    into v_existing_round, v_existing_word
    from public.chat_sessions cs
    left join public.match_rounds mr on mr.id = cs.round_id
    left join public.words w on w.id = cs.word_id
   where cs.id = p_match_id;

  if found then
    select count(*),
           count(*) filter (
             where csm.actor_id in (p_current_actor_id, p_partner_actor_id)
           )
      into v_member_count, v_matching_members
      from public.chat_session_members csm
     where csm.session_id = p_match_id;

    select count(*)
      into v_matched_attempts
      from public.match_attempts ma
     where ma.matched_session_id = p_match_id
       and ma.status = 'MATCHED'
       and ma.actor_id in (p_current_actor_id, p_partner_actor_id);

    if v_existing_round is distinct from p_round_key
       or v_existing_word is distinct from v_word
       or v_member_count <> 2
       or v_matching_members <> 2
       or v_matched_attempts <> 2 then
      raise exception 'MATCH_ID_CONFLICT';
    end if;

    return query select p_match_id, true;
    return;
  end if;

  -- actor 잠금 순서를 UUID 오름차순으로 고정해 교착 대기를 방지한다.
  perform 1
    from public.actors
   where id in (p_current_actor_id, p_partner_actor_id)
     and status = 'ACTIVE'
   order by id
     for update;
  get diagnostics v_actor_count = row_count;

  if v_actor_count <> 2 then
    raise exception 'ACTOR_NOT_FOUND';
  end if;

  insert into public.match_rounds (round_key, starts_at, ends_at, status)
       values (
         p_round_key,
         to_timestamp(p_round_key::double precision * 15),
         to_timestamp(p_round_key::double precision * 15) + interval '15 seconds',
         'ACTIVE'
       )
  on conflict (round_key) do nothing;

  select id, status
    into v_round_id, v_round_status
    from public.match_rounds
   where round_key = p_round_key
     for update;

  if v_round_status = 'ENDED' then
    raise exception 'ROUND_CLOSED';
  end if;

  update public.match_rounds
     set status = 'ACTIVE'
   where id = v_round_id
     and status = 'SCHEDULED';

  insert into public.words (text)
       values (v_word)
  on conflict (text) do update set text = excluded.text
  returning id into v_word_id;

  -- 같은 라운드·단어의 WAITING은 이어서 확정하지만,
  -- 이미 MATCHED이거나 다른 후보면 중단한다.
  for v_attempt in
    select *
      from public.match_attempts
     where actor_id in (p_current_actor_id, p_partner_actor_id)
       and status in ('WAITING', 'MATCHED')
       and finished_at is null
     order by actor_id
       for update
  loop
    if v_attempt.status <> 'WAITING'
       or v_attempt.round_id <> v_round_id
       or v_attempt.word_id is distinct from v_word_id then
      raise exception 'ACTOR_ALREADY_ACTIVE';
    end if;
  end loop;

  insert into public.chat_sessions (id, round_id, word_id, status, matched_at)
       values (p_match_id, v_round_id, v_word_id, 'READY', now());

  insert into public.chat_session_members (session_id, actor_id, nickname_snapshot)
       values
         (p_match_id, p_current_actor_id, p_current_nickname),
         (p_match_id, p_partner_actor_id, p_partner_nickname);

  update public.match_attempts
     set status = 'MATCHED',
         socket_id = p_current_socket_id,
         matched_session_id = p_match_id
   where actor_id = p_current_actor_id
     and round_id = v_round_id
     and word_id = v_word_id
     and status = 'WAITING'
     and finished_at is null;

  if not found then
    insert into public.match_attempts (
      actor_id, round_id, word_id, status, socket_id, matched_session_id
    ) values (
      p_current_actor_id, v_round_id, v_word_id, 'MATCHED',
      p_current_socket_id, p_match_id
    );
  end if;

  update public.match_attempts
     set status = 'MATCHED',
         socket_id = p_partner_socket_id,
         matched_session_id = p_match_id
   where actor_id = p_partner_actor_id
     and round_id = v_round_id
     and word_id = v_word_id
     and status = 'WAITING'
     and finished_at is null;

  if not found then
    insert into public.match_attempts (
      actor_id, round_id, word_id, status, socket_id, matched_session_id
    ) values (
      p_partner_actor_id, v_round_id, v_word_id, 'MATCHED',
      p_partner_socket_id, p_match_id
    );
  end if;

  return query select p_match_id, false;
end;
$$;

comment on function public.commit_match(uuid, bigint, text, uuid, text, text, uuid, text, text) is
  'Redis 선점 결과를 V2 세션·멤버·시도 원장에 멱등·원자적으로 확정';

revoke all on function public.commit_match(uuid, bigint, text, uuid, text, text, uuid, text, text)
  from public;
revoke execute on function public.commit_match(uuid, bigint, text, uuid, text, text, uuid, text, text)
  from anon, authenticated;
grant execute on function public.commit_match(uuid, bigint, text, uuid, text, text, uuid, text, text)
  to service_role;
