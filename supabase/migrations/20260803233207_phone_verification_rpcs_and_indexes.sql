-- 휴대폰 인증 챌린지 — 검증 시도 기록과 확정 (TEL-15)
--
-- 인증번호를 서버 메모리가 아니라 이 테이블에 둔다 (계획안 §11).
-- 지금 verify-mvp.routes.ts 는 Map 에 평문으로 담고 있어 재시작·다중 인스턴스에서
-- 사라지고, 검증 성공이 DB 에 남지 않아 signup_user 가 항상 PHONE_NOT_VERIFIED 를 던진다.

-- 검증 실패 횟수를 원자적으로 올린다.
-- 앱이 읽고 +1 해서 쓰면 동시 요청에서 증가가 유실되고 5회 제한이 사라진다.
-- 한도에 닿으면 만료시켜 죽인다 — 조회가 expires_at > now() 를 보므로 그걸로 끝난다.
create or replace function public.record_challenge_attempt(p_id uuid, p_max integer)
returns integer
language sql
set search_path to 'public', 'pg_temp'
as $$
  update phone_verification_challenges
     set attempt_count = attempt_count + 1,
         expires_at = case
           when attempt_count + 1 >= p_max then now()
           else expires_at
         end
   where id = p_id
  returning attempt_count;
$$;

-- 검증 성공 표시. 조건을 UPDATE 에 넣어 "조회한 뒤 상황이 바뀐" 경우를 걸러낸다.
-- 갱신된 행이 없으면 그 사이 만료됐거나 이미 검증·소비된 것이다.
create or replace function public.mark_challenge_verified(p_id uuid)
returns boolean
language sql
set search_path to 'public', 'pg_temp'
as $$
  with updated as (
    update phone_verification_challenges
       set verified_at = now()
     where id = p_id
       and verified_at is null
       and consumed_at is null
       and expires_at > now()
    returning id
  )
  select exists (select 1 from updated);
$$;

-- 발송 제한은 매 요청마다 건수를 센다. 인덱스가 없으면 전체 스캔이다.
create index if not exists idx_pvc_phone_created
  on phone_verification_challenges (phone, created_at desc);
create index if not exists idx_pvc_ip_created
  on phone_verification_challenges (request_ip_hash, created_at desc);
create index if not exists idx_pvc_lookup
  on phone_verification_challenges (phone, purpose, created_at desc);

revoke all on function public.record_challenge_attempt(uuid, integer) from public;
revoke all on function public.mark_challenge_verified(uuid) from public;
revoke execute on function public.record_challenge_attempt(uuid, integer) from anon, authenticated;
revoke execute on function public.mark_challenge_verified(uuid) from anon, authenticated;
grant execute on function public.record_challenge_attempt(uuid, integer) to service_role;
grant execute on function public.mark_challenge_verified(uuid) to service_role;
