-- 로그인 실패 카운터의 원자적 증가 (TEL-15)
--
-- 기존 구현은 findLoginCredential 로 읽은 값에 앱에서 +1 해 쓰는 방식이라
-- 동시 요청에서 증가가 유실됐다 (실측: 동시 4회 실패 → 카운터 2).
-- 잠금이 사실상 걸리지 않아 무차별 대입 방어가 무력해진다.
--
-- 한 UPDATE 문 안에서 읽고 쓰면 Postgres 가 행을 잠가 순서를 보장한다.
--
-- 잠금 정책(최대 시도 횟수·잠금 시간)은 인자로 받는다.
-- 비즈니스 규칙은 service 에 남기고 DB 는 원자적 실행만 담당한다.

create or replace function public.record_login_failure(
  p_actor_id     uuid,
  p_max_attempts integer,
  p_lock_minutes integer
)
returns table (new_failed_count integer, new_locked_until timestamptz)
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.user_credentials uc
     set failed_attempt_count = case
           when uc.failed_attempt_count + 1 >= p_max_attempts then 0
           else uc.failed_attempt_count + 1
         end,
         locked_until = case
           when uc.failed_attempt_count + 1 >= p_max_attempts
             then now() + make_interval(mins => p_lock_minutes)
           else uc.locked_until
         end
   where uc.user_id = p_actor_id
  returning uc.failed_attempt_count, uc.locked_until;
$$;

-- Postgres 는 새 함수에 PUBLIC 실행 권한을 자동으로 준다.
-- 테이블 권한은 TEL-12 에서 회수했으나 함수는 별개다.
revoke all on function public.record_login_failure(uuid, integer, integer) from public;
grant execute on function public.record_login_failure(uuid, integer, integer) to service_role;
