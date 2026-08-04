-- 닉네임 변경 — TEL-29
--
-- ── 왜 RPC 인가 ───────────────────────────────────────────
-- 닉네임 변경은 세 가지 쓰기다.
--   ① users.nickname 갱신
--   ② 열린 이력(ended_at IS NULL) 닫기
--   ③ 새 이력 행 열기
--
-- 레거시 nickname.routes.ts 는 ①만 하고 ②③의 실패를 의도적으로 삼킨다
-- ("절대 throw 하지 않음", 47행). 그래서 이력이 실제와 어긋난다.
--
-- v2-dev 실측(2026-08-04): 회원 1,192명 중
--   이력이 아예 없음                     34명
--   열린 이력이 users.nickname 과 다름   60명
--
-- 함수 호출 하나가 곧 하나의 트랜잭션이다. 하나라도 실패하면 전부 취소된다.

-- ── 불변식을 DB 가 판정하게 한다 ──────────────────────────
-- "actor 당 열린 이력은 최대 하나."
-- 현재 위반 0건이라 지금 걸 수 있다 — 깨진 94건은 줄이 겹친 게 아니라
-- 없거나 틀린 것이라서 이 인덱스가 잡는 종류가 아니다.
create unique index if not exists nickname_histories_one_open_idx
  on public.nickname_histories (actor_id)
  where ended_at is null;

comment on index public.nickname_histories_one_open_idx is
  '현재 닉네임 = 열린 이력 행 (TEL-29)';

create or replace function public.change_nickname(
  p_actor_id uuid,
  p_nickname text
)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_current    text;
  v_constraint text;
begin
  -- 프로필을 잠그고 현재 닉네임을 읽는다.
  -- 잠그지 않으면 같은 계정의 동시 요청이 이력을 두 줄 열 수 있다.
  select nickname into v_current
    from users
   where actor_id = p_actor_id
     for update;

  -- 탈퇴한 계정의 토큰이 60일간 살아 있다.
  -- 서명이 유효한 것과 프로필이 있는 것은 다른 얘기다.
  if v_current is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  -- 같은 이름이면 아무것도 하지 않는다.
  -- 이력을 남기면 "바뀌지 않은 변경" 이 쌓여 운영자가 읽을 수 없게 된다.
  if v_current = p_nickname then
    return;
  end if;

  update users set nickname = p_nickname where actor_id = p_actor_id;

  -- 닫고 나서 연다. 순서를 바꾸면 부분 UNIQUE 인덱스에 걸린다.
  --
  -- 열린 이력이 없을 수도 있다(복구되지 않은 34건). 없으면 0행 갱신이고,
  -- 뒤의 INSERT 가 결과적으로 불변식을 맞춰 준다.
  --
  -- now() 는 트랜잭션 시작 시각이라 ended_at 과 다음 started_at 이 정확히 같다.
  -- 이력이 시간축에서 끊기지 않는다.
  update nickname_histories
     set ended_at = now()
   where actor_id = p_actor_id
     and ended_at is null;

  insert into nickname_histories (actor_id, nickname, started_at, change_reason)
       values (p_actor_id, p_nickname, now(), 'USER_CHANGE');

exception
  when unique_violation then
    -- 미리 조회해서 검사하면 조회와 UPDATE 사이에 남이 끼어든다.
    -- 검사를 DB 제약에 맡기고 걸린 제약만 번역한다 (signup_user 와 같은 방식).
    get stacked diagnostics v_constraint = constraint_name;

    if v_constraint = 'users_nickname_key' then
      raise exception 'NICKNAME_TAKEN';
    else
      raise;
    end if;
end;
$$;

revoke all on function public.change_nickname(uuid, text) from public;
revoke execute on function public.change_nickname(uuid, text) from anon, authenticated;
grant execute on function public.change_nickname(uuid, text) to service_role;
