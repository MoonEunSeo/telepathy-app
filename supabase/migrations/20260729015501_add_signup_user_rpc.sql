-- 회원가입 — 4테이블 동시 쓰기 (TEL-15)
--
-- supabase-js 에는 트랜잭션 API 가 없다. PostgREST 로 4번 나눠 쓰면
-- 서로 다른 4개의 트랜잭션이 되어, 3번째가 실패하면 앞의 2개가 남는다.
-- 그 사람은 로그인도 못 하고 재가입도 못 한다 (phone·nickname 이 UNIQUE 라
-- 이미 선점된 상태). 게다가 조용히 그렇게 된다.
--
-- Postgres 함수 호출 하나가 곧 하나의 트랜잭션이다. 예외가 나면
-- 함수가 한 모든 일이 자동으로 취소된다.
--
-- plpgsql 을 쓰는 이유는 UNIQUE 위반을 컬럼별로 구분해 번역하기 위함이다.
-- language sql 로도 CTE 로 이을 수 있으나 예외를 잡을 수 없다.

create or replace function public.signup_user(
  p_username      text,
  p_password_hash text,
  p_phone         text,
  p_nickname      text,
  p_gender        text default null,
  p_birthdate     date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor_id     uuid;
  v_challenge_id uuid;
  v_constraint   text;
begin
  -- 전화 인증 확인. 레거시 회원가입은 phone 을 그대로 믿었다.
  -- for update 로 잠가 같은 인증을 두 요청이 동시에 소비하지 못하게 한다.
  select id into v_challenge_id
    from phone_verification_challenges
   where phone = p_phone
     and purpose = 'SIGNUP'
     and verified_at is not null
     and consumed_at is null
     and expires_at > now()
   order by verified_at desc
   limit 1
     for update;

  if v_challenge_id is null then
    raise exception 'PHONE_NOT_VERIFIED';
  end if;

  insert into actors (actor_type, status)
       values ('USER', 'ACTIVE')
    returning id into v_actor_id;

  insert into users (actor_id, phone, nickname, gender, birthdate)
       values (v_actor_id, p_phone, p_nickname, p_gender, p_birthdate);

  insert into user_credentials (actor_id, username, password_hash, password_algorithm)
       values (v_actor_id, p_username, p_password_hash, 'bcrypt');

  -- "현재 닉네임 = 열린 이력 행(ended_at IS NULL)" 불변식을 신규 가입부터 지킨다.
  -- 기존 데이터 94건이 이 규칙을 어기고 있으나(이력 없음 34 · 불일치 60)
  -- 정리는 별도 작업으로 뺀다.
  insert into nickname_histories (actor_id, nickname, started_at, change_reason)
       values (v_actor_id, p_nickname, now(), 'SIGNUP_AUTO');

  -- 인증 소비. 같은 인증으로 두 번 가입할 수 없다.
  update phone_verification_challenges
     set consumed_at = now()
   where id = v_challenge_id;

  return v_actor_id;

exception
  when unique_violation then
    -- 미리 조회해서 검사하면 조회와 INSERT 사이에 남이 끼어든다.
    -- 검사를 DB 제약에 맡기고, 걸린 제약을 사람이 읽을 메시지로 번역한다.
    get stacked diagnostics v_constraint = constraint_name;

    if v_constraint = 'user_credentials_username_key' then
      raise exception 'USERNAME_TAKEN';
    elsif v_constraint = 'users_phone_key' then
      raise exception 'PHONE_TAKEN';
    elsif v_constraint = 'users_nickname_key' then
      raise exception 'NICKNAME_TAKEN';
    else
      raise;
    end if;
end;
$$;

revoke all on function public.signup_user(text, text, text, text, text, date) from public;
grant execute on function public.signup_user(text, text, text, text, text, date) to service_role;
