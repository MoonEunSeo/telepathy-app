-- 결제 기록(payments insert)과 확성기 지급(users.megaphone_count 증가)을
-- 하나의 트랜잭션으로 묶는다.
--
-- 배경
--   기존 /api/payments/verify 는 두 작업을 별도 요청으로 실행했다.
--     ① payments insert
--     ② rpc('increment_megaphone')
--   이 구조에는 두 가지 결함이 있었다.
--     · ② 가 실패해도 ① 이 롤백되지 않는다 → "결제 기록은 있는데 미지급"
--     · Supabase 는 DB 오류를 예외가 아닌 { data, error } 로 주는데
--       ② 의 반환값을 확인하지 않아 실패를 인지조차 못 했다 (항상 success: true)
--
--   PostgreSQL 함수는 함수 전체가 하나의 트랜잭션이므로,
--   지급이 실패하면 결제 기록도 함께 롤백된다.
--
-- 중복 결제
--   payments.imp_uid 의 unique 제약을 그대로 최종 방어선으로 쓴다.
--   unique_violation 을 함수 안에서 잡아 'DUPLICATE' 로 돌려주므로,
--   호출부는 에러 코드(23505)를 직접 해석할 필요가 없다.
--
-- 적용
--   Supabase 대시보드 → SQL Editor 에 붙여넣고 실행한다.
--   ⚠️ 운영 DB 변경이므로 telepathy-v2-dev 에서 먼저 검증할 것.

create or replace function public.grant_megaphone_payment(
  p_user_id uuid,
  p_imp_uid text,
  p_item    text,
  p_count   integer,
  p_amount  integer
)
returns jsonb
language plpgsql
-- search_path 를 고정한다. 고정하지 않으면 호출자의 search_path 에 따라
-- 다른 스키마의 동명 테이블이 참조될 수 있다.
set search_path = public, pg_temp
as $$
declare
  v_new_count integer;
begin
  -- 방어: 지급 수량은 서버 가격표에서만 오지만, 음수/0 이 들어오면 즉시 중단한다.
  if p_count is null or p_count <= 0 then
    raise exception 'invalid count: %', p_count using errcode = '22023';
  end if;

  -- ① 결제 기록. imp_uid 가 중복이면 여기서 unique_violation 이 발생한다.
  insert into public.payments (user_id, imp_uid, item, count, amount, status)
  values (p_user_id, p_imp_uid, p_item, p_count, p_amount, 'PAID');

  -- ② 지급. ① 과 같은 트랜잭션이므로 여기서 실패하면 ① 도 롤백된다.
  update public.users
     set megaphone_count = coalesce(megaphone_count, 0) + p_count
   where id = p_user_id
  returning megaphone_count into v_new_count;

  -- 대상 회원이 없으면 결제 기록만 남는 상태가 되므로 통째로 되돌린다.
  if not found then
    raise exception 'user not found: %', p_user_id using errcode = 'P0002';
  end if;

  return jsonb_build_object('status', 'GRANTED', 'new_count', v_new_count);

exception
  -- 같은 imp_uid 로 두 번 들어온 경우. 트랜잭션은 롤백되고 지급은 일어나지 않는다.
  when unique_violation then
    return jsonb_build_object('status', 'DUPLICATE', 'new_count', null);
end;
$$;

-- 이 함수는 서버(service_role)만 호출한다. 외부 키로는 호출할 수 없게 막는다.
revoke all on function public.grant_megaphone_payment(uuid, text, text, integer, integer)
  from public, anon, authenticated;
