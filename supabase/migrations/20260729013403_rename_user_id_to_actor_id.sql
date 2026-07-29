-- actors.id 를 담는 컬럼의 이름을 actor_id 로 통일한다 (TEL-16 §5.1)
--
-- 11개 테이블은 actor_id 인데 3곳만 user_id 였다. FK 전수 스캔으로
-- 위반이 정확히 이 3건뿐임을 확인했다.
--
-- user_id 라는 이름은 거짓말이다. V2 의 users 테이블에는 id 컬럼이
-- 아예 없고 PK 가 actor_id 다. 게스트도 actors 에 들어가므로
-- "user" 가 아닌 actor 의 id 가 담길 수 있다.
--
-- legacy_* 9개 테이블에도 user_id 가 있으나 옛 구조를 보존한
-- 스냅샷이므로 건드리지 않는다.

alter table public.orders           rename column user_id to actor_id;
alter table public.user_credentials rename column user_id to actor_id;
alter table public.user_item_ledger rename column user_id to actor_id;

-- FK 제약 이름은 컬럼 rename 을 따라오지 않는다.
-- 생성 타입의 foreignKeyName 에 그대로 노출되므로 함께 고친다.
alter table public.orders
  rename constraint orders_user_id_fkey to orders_actor_id_fkey;
alter table public.user_credentials
  rename constraint user_credentials_user_id_fkey to user_credentials_actor_id_fkey;
alter table public.user_item_ledger
  rename constraint user_item_ledger_user_id_fkey to user_item_ledger_actor_id_fkey;

-- language sql 함수는 본문을 텍스트로 저장했다가 실행 시점에 해석한다.
-- 컬럼 rename 을 따라오지 않으므로 재생성하지 않으면 런타임에 터진다.

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
   where uc.actor_id = p_actor_id
  returning uc.failed_attempt_count, uc.locked_until;
$$;

-- 파라미터 이름(p_user_id)은 그대로 둔다. 바꾸려면 drop 후 재생성이라
-- 권한을 다시 부여해야 하고, 이 함수를 부르는 앱 코드가 아직 없어
-- 지금 서두를 이유가 없다. 본문의 컬럼 참조만 고친다.
-- set search_path 는 없던 것을 이번에 추가한다 (보안 어드바이저 권고).
create or replace function public.user_item_balance(p_user_id uuid, p_item_type text)
returns integer
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(sum(quantity_delta), 0)::integer
  from public.user_item_ledger
  where actor_id = p_user_id and item_type = p_item_type;
$$;
