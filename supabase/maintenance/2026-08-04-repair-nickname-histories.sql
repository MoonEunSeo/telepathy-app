-- 데이터 정리 — 닉네임 이력 불변식 복구 (TEL-29)
--
-- 대상: v2-dev. 마이그레이션 이력에 등록하지 않는다 (스키마 변경이 아니다).
--
-- ── 왜 ────────────────────────────────────────────────────
-- "현재 닉네임 = 열린 이력 행(ended_at IS NULL)" 이 지켜지지 않는다.
-- 레거시 nickname.routes.ts 가 이력 INSERT 실패를 삼켰기 때문이다
-- ("절대 throw 하지 않음", 47행).
--
-- 실측 (2026-08-04, 회원 1,192명)
--   이력이 아예 없음                     34명
--   열린 이력이 users.nickname 과 다름   60명
--   열린 이력이 2개 이상                  0명   ← 그래서 부분 UNIQUE 인덱스를 바로 걸 수 있었다
--
-- ── 진실은 users.nickname 이다 ────────────────────────────
-- 계획안 §10: "현재 닉네임은 users 또는 guest_profiles 가 원본이다."
--
-- 언제 바뀌었는지는 기록이 없다 — 그 INSERT 가 실패했던 것이라 그렇다.
-- 어긋난 열린 이력을 지금 닫고 현재 닉네임으로 새로 연다.
-- 과거 이름이 보존되고, change_reason = 'SYSTEM' 이 "이 행은 복구된 것" 을 표시한다.
-- 덮어쓰기(열린 행의 nickname 만 교체)를 택하지 않은 이유는 그러면
-- 그 사람이 쓰던 과거 이름이 영구히 사라지기 때문이다.
--
-- ⚠️ 이 스크립트만으로는 부족하다. cutover 가 레거시 이력을 그대로 베껴 오므로
--    운영 전환 때 같은 상태가 다시 만들어진다. 같은 로직이
--    supabase/cutover/02-identity.sql 에도 들어 있다.

begin;

-- (1) 열린 이력이 현재 닉네임과 다르면 닫는다. 과거 이름은 그 행에 남는다.
update public.nickname_histories h
   set ended_at = now()
  from public.users u
 where h.actor_id = u.actor_id
   and h.ended_at is null
   and h.nickname is distinct from u.nickname;

-- (2) 이력은 있는데 열린 것이 없는 계정 — 복구 시점부터 현재 닉네임을 연다.
--     (1)에서 방금 닫힌 계정이 여기로 온다. 언제 바뀌었는지 모르므로 now() 다.
insert into public.nickname_histories (actor_id, nickname, started_at, change_reason)
select u.actor_id, u.nickname, now(), 'SYSTEM'
  from public.users u
 where exists (select 1 from public.nickname_histories h
                where h.actor_id = u.actor_id)
   and not exists (select 1 from public.nickname_histories h
                    where h.actor_id = u.actor_id and h.ended_at is null);

-- (3) 이력이 아예 없던 계정 — 가입 시각부터 연다.
--     한 번도 바꾸지 않았을 가능성이 높아 now() 보다 사실에 가깝다.
insert into public.nickname_histories (actor_id, nickname, started_at, change_reason)
select u.actor_id, u.nickname, u.created_at, 'SYSTEM'
  from public.users u
 where not exists (select 1 from public.nickname_histories h
                    where h.actor_id = u.actor_id);

commit;

-- ─────────────────────────────────────────────────────────
-- 검증 — 아래가 모두 0 이어야 한다
-- ─────────────────────────────────────────────────────────
-- select
--   (select count(*) from users u
--      where not exists (select 1 from nickname_histories h
--                         where h.actor_id = u.actor_id))                as 이력_없음,
--   (select count(*) from users u
--      where not exists (select 1 from nickname_histories h
--                         where h.actor_id = u.actor_id and h.ended_at is null)) as 열린이력_없음,
--   (select count(*) from users u
--      join nickname_histories h on h.actor_id = u.actor_id and h.ended_at is null
--     where h.nickname is distinct from u.nickname)                      as 불일치;
--
-- 복구된 행 수 (기대: 94)
--   select count(*) from nickname_histories where change_reason = 'SYSTEM';
