-- 비밀번호 재설정 (비로그인) — TEL-15 §2.1
--
-- 레거시 /api/password/reset 은 username 만 받아 누구의 비밀번호든 바꿔 준다.
-- 재설정이 성립하려면 "그 계정에 등록된 번호"의 인증이 있어야 한다.
-- 그 결합을 앱이 아니라 여기서 강제한다.
--
-- 인증 소비와 비밀번호 교체는 한 트랜잭션이어야 한다.
-- 나뉘면 (a) 인증만 소비되고 비밀번호는 그대로거나
--        (b) 같은 인증으로 두 번 재설정되는 상태가 생긴다.
create or replace function public.reset_password(
  p_username      text,
  p_password_hash text
) returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor_id     uuid;
  v_phone        text;
  v_challenge_id uuid;
begin
  select uc.actor_id, u.phone
    into v_actor_id, v_phone
    from user_credentials uc
    join users  u on u.actor_id = uc.actor_id
    join actors a on a.id       = uc.actor_id
   where uc.username = p_username
     and a.status = 'ACTIVE';

  -- 아이디가 없다는 사실을 밖으로 흘리지 않는다.
  -- 인증 미완료와 같은 실패로 합쳐 응답을 구분 불가능하게 만든다.
  if v_actor_id is null then
    raise exception 'RECOVERY_NOT_VERIFIED';
  end if;

  -- 핵심. 챌린지를 계정의 전화번호로 찾는다.
  -- 이 결합이 없으면 자기 번호를 인증하고 남의 비밀번호를 바꿀 수 있다.
  -- for update 로 잠가 같은 인증을 두 요청이 동시에 소비하지 못하게 한다.
  select id into v_challenge_id
    from phone_verification_challenges
   where phone = v_phone
     and purpose = 'ACCOUNT_RECOVERY'
     and verified_at is not null
     and consumed_at is null
     and expires_at > now()
   order by verified_at desc
   limit 1
     for update;

  if v_challenge_id is null then
    raise exception 'RECOVERY_NOT_VERIFIED';
  end if;

  update user_credentials
     set password_hash        = p_password_hash,
         password_algorithm   = 'bcrypt',
         password_changed_at  = now(),
         -- 본인 확인을 통과했으므로 잠금을 푼다.
         -- 풀지 않으면 재설정 직후 로그인이 막히고 사용자는 이유를 모른다.
         failed_attempt_count = 0,
         locked_until         = null
   where actor_id = v_actor_id;

  update phone_verification_challenges
     set consumed_at = now()
   where id = v_challenge_id;
end;
$$;

revoke all on function public.reset_password(text, text) from public;
revoke execute on function public.reset_password(text, text) from anon, authenticated;
grant execute on function public.reset_password(text, text) to service_role;
