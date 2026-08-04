-- 운영 데이터 정리 — users.phone 을 저장 형식(숫자만)으로 통일
--
-- supabase/cutover/ 와 성격이 다르다. 저쪽은 V2 전환이고 여기는 운영 데이터 정리다.
-- 마이그레이션 이력에 등록하지 않는다 (스키마 변경이 아니다).
--
-- ── 왜 ────────────────────────────────────────────────────
-- users.phone 이 UNIQUE 인데 형식이 갈려 있어 같은 사람이 두 번 가입할 수 있다.
-- 또 phone_verification_challenges 를 phone 으로 조회하는 signup_user·reset_password
-- RPC 가 형식 불일치로 인증 기록을 못 찾는다.
--
-- 앱은 utils/phone.ts 의 normalizePhone 으로 이미 정규화해 저장한다.
-- 이 스크립트는 그 이전에 쌓인 데이터를 같은 규칙으로 맞춘다.
--
-- ── 실측 (2026-08-04) ─────────────────────────────────────
--   전체 1,191 — 숫자만 1,137 · 공백 41 · 하이픈 12 · 국가번호(+82) 1
--   변경 대상 50건
--   제외  3건 — 정규화하면 서로 겹치는 중복 쌍 (아래)
--   제외  2건 — 정규화해도 01x 형식이 아님 (10자리·12자리)
--
-- ── 중복 3쌍은 건드리지 않는다 ────────────────────────────
-- 정규화하면 UNIQUE 위반이 난다. 6개 계정 중 5개가 실제 활동 이력이 있어
-- 임의로 지울 수 없다. V2 전환 때 actors.merged_into_actor_id 로 병합한다
-- (supabase/cutover/02-identity.sql).

begin;

with normalized as (
  select id,
         phone,
         case
           when regexp_replace(phone, '[^0-9]', '', 'g') like '82%'
             then '0' || substring(regexp_replace(phone, '[^0-9]', '', 'g') from 3)
           else regexp_replace(phone, '[^0-9]', '', 'g')
         end as norm
  from public.users
),
dup as (
  select norm from normalized group by norm having count(*) > 1
)
update public.users u
   set phone = n.norm
  from normalized n
 where u.id = n.id
   and u.phone <> n.norm                            -- 이미 정규화된 행은 건너뛴다
   and n.norm ~ '^01[016-9][0-9]{7,8}$'             -- 무효 2건 제외
   and n.norm not in (select norm from dup);        -- 중복 3쌍 제외

commit;

-- ─────────────────────────────────────────────────────────
-- 검증 — 실행 후 확인한다
-- ─────────────────────────────────────────────────────────
-- 남은 비정규 형식 (기대: 5 = 중복 3 + 무효 2)
--   select count(*) from users where phone <> regexp_replace(phone, '[^0-9]', '', 'g');
--
-- 형식 분포 (기대: 숫자만 1,189 / 나머지 2)
--   select case when phone ~ '^\d{10,11}$' then '숫자만' else '기타' end, count(*)
--     from users group by 1;
--
-- 행 수가 그대로인가 (기대: 1,191)
--   select count(*), count(distinct phone) from users;
