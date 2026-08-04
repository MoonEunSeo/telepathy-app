-- 회원 탈퇴 — TEL-28
--
-- ── 왜 RPC 인가 ───────────────────────────────────────────
-- actors 상태 전이와 users 삭제가 한 트랜잭션이어야 한다.
-- 나뉘면 프로필만 사라지고 상태는 ACTIVE 로 남는 계정이 생긴다.
-- supabase-js 에 트랜잭션 API 가 없어 함수로 묶는다.
--
-- ── 레거시와 무엇이 다른가 ────────────────────────────────
-- 레거시 withdraw.routes.ts 는 users 행만 DELETE 했다. 그 결과 활동 로그의
-- user_id 가 아무것도 가리키지 않게 됐다.
--
-- 운영 실측(2026-08-04): 닉네임 이력을 가진 1,292명 중 134명, 결제한 34명 중
-- 7명이 users 에 없다. 회원 전용 경로라 게스트로는 설명되지 않는다.
-- 돈을 낸 사람의 계정이 사라져 환불·정산 추적이 불가능하다.
--
-- V2 는 actors 를 남긴다. 매칭·채팅·결제·제재가 actors 를 RESTRICT 로 참조하므로
-- DB 가 애초에 actor 삭제를 막는다. 프로필만 지우고 신원의 껍데기는 남긴다.
--
-- ── 무엇이 지워지고 무엇이 남나 ───────────────────────────
--   지워짐  users (전화번호·실명·생년월일·닉네임)
--           user_credentials (FK CASCADE — 로그인 정보)
--   남음    actors (status = DELETED)
--           nickname_histories · match_attempts · chat_* · orders · user_item_ledger
--
-- 전화번호가 사라지므로 같은 번호로 재가입할 수 있다. 의도된 동작이다.
-- 그래서 정지 중 탈퇴를 막는다 — 아래 참조.
create or replace function public.withdraw_user(p_actor_id uuid)
returns boolean
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_status text;
begin
  -- for update 로 잠근다. 같은 요청이 두 번 들어와도 한 번만 처리된다.
  select status into v_status
    from actors
   where id = p_actor_id
     for update;

  -- 없는 actor. 토큰은 유효한데 계정이 없는 경우다.
  if v_status is null then
    return false;
  end if;

  -- 제재 중 탈퇴를 허용하면 탈퇴 → 재가입으로 정지를 우회할 수 있다.
  -- 프로필을 지우는 설계라 전화번호가 사라져 재가입을 막을 수단이 없어진다.
  -- 계획안 §8.1 은 전화번호의 용도로 "정지 회원 재가입 확인" 을 명시한다.
  --
  -- actors.status 를 SUSPENDED 로 바꾸는 코드는 아직 없다(§20.4 신고·제재 도메인).
  -- 그 기능이 붙었을 때 구멍이 열려 있지 않도록 미리 막아 둔다.
  if v_status = 'SUSPENDED' then
    raise exception 'WITHDRAW_SUSPENDED';
  end if;

  -- 이미 탈퇴했거나 병합된 계정. 오류가 아니라 "할 일이 없음" 이다.
  if v_status <> 'ACTIVE' then
    return false;
  end if;

  update actors
     set status     = 'DELETED',
         deleted_at = now()
   where id = p_actor_id;

  -- user_credentials 는 FK CASCADE 로 함께 사라진다.
  -- nickname_histories 는 actors 를 참조하므로 남는다 — 과거 대화·신고에
  -- 당시 닉네임이 보존돼야 하기 때문이다 (계획안 §10).
  delete from users where actor_id = p_actor_id;

  return true;
end;
$$;

revoke all on function public.withdraw_user(uuid) from public;
revoke execute on function public.withdraw_user(uuid) from anon, authenticated;
grant execute on function public.withdraw_user(uuid) to service_role;
