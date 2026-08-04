-- 운영 전환 2/N — 신원 도메인
--   legacy_users → actors + users + user_credentials + legacy_actor_map
--
-- 선행: 01-rename-legacy.sql → V2 마이그레이션 14건
--
-- dev-v2 의 결과를 역설계해 복원했다. 변환 로직이 마이그레이션 이력에
-- 남아 있지 않기 때문이다 (supabase/migrations/README.md 참조).
--
-- ── 시간대 ────────────────────────────────────────────────
-- legacy_users 의 created_at·last_login·deleted_at 은 timestamp without time zone 이다.
-- UTC 로 확인됐다 — nickname_histories(timestamptz) 와 교차검증했을 때
-- UTC 해석 시 가입↔닉네임부여 간격이 7~15초, KST 해석 시 9시간 어긋난다.
--
-- ── 알려진 손실 ───────────────────────────────────────────
-- 1. 닉네임 중복 57건·null 1건 — V2 users.nickname 은 not null unique 다.
--    계정을 버리지 않기 위해 접미사를 붙인다. 해당 사용자는 닉네임이 바뀐다.
-- 2. 게스트 미이관 — dev-v2 에서도 actors 의 GUEST 는 0건이고 guest_profiles 도
--    비어 있다. 원본이 없어 역설계 대상이 아니다. 별도 설계가 필요하다.
-- 3. orphan 은 프로필 없이 actors 만 만든다. 활동 이력의 FK 를 살리기 위함이다.
-- 4. 전화번호 중복 3쌍 — 정규화하면 users.phone UNIQUE 를 위반한다. 나중 가입분을
--    MERGED 로 접는다. 프로필·자격증명은 없지만 actor 가 남아 활동 이력은 보존된다.
--    로그인은 actors.status 로 막힌다 (auth.service 가 ACTIVE 만 통과시킨다).
--    정규화해도 01x 형식이 아닌 2건은 그대로 옮긴다 — V2 users.phone 에 CHECK 이 없다.

begin;

-- ─────────────────────────────────────────────────────────
-- 0) 전화번호 정규화 결과를 미리 만든다 — 뒤의 여러 단계가 참조한다
--
-- 저장 형식은 숫자만이다 (utils/phone.ts 의 normalizePhone 과 같은 규칙).
-- rn 은 같은 번호 안에서의 가입 순서다. rn = 1 이 프로필을 갖고
-- rn > 1 은 MERGED 로 접힌다.
-- ─────────────────────────────────────────────────────────
create temp table phone_norm on commit drop as
select id,
       norm,
       row_number() over (partition by norm order by created_at, id) as rn
from (
  select l.id,
         l.created_at,
         case
           when regexp_replace(l.phone, '[^0-9]', '', 'g') like '82%'
             then '0' || substring(regexp_replace(l.phone, '[^0-9]', '', 'g') from 3)
           else regexp_replace(l.phone, '[^0-9]', '', 'g')
         end as norm
  from public.legacy_users l
) x;

-- ─────────────────────────────────────────────────────────
-- 1) 회원 actor
-- ─────────────────────────────────────────────────────────
insert into public.actors (id, actor_type, status, created_at, legacy_user_id)
select gen_random_uuid(),
       'USER',
       case when l.is_deleted then 'DELETED' else 'ACTIVE' end,
       l.created_at at time zone 'UTC',
       l.id
from public.legacy_users l;

-- ─────────────────────────────────────────────────────────
-- 1-b) 같은 전화번호로 두 번 가입한 계정을 병합한다
--
-- 운영에 3쌍(6계정) 있다. 정규화하면 users.phone UNIQUE 를 위반하므로
-- 나중 가입분을 MERGED 로 접고 먼저 가입한 actor 를 가리키게 한다.
-- 프로필(users)·자격증명(user_credentials)은 만들지 않지만 actor 는 남으므로
-- 매칭·채팅 이력의 FK 가 그대로 살아 있다. 로그인은 status 로 막힌다.
-- ─────────────────────────────────────────────────────────
update public.actors a
   set status               = 'MERGED',
       merged_into_actor_id = keep.actor_id
  from phone_norm p
  join (
    select p1.norm, a1.id as actor_id
    from phone_norm p1
    join public.actors a1 on a1.legacy_user_id = p1.id
    where p1.rn = 1
  ) keep on keep.norm = p.norm
 where a.legacy_user_id = p.id
   and p.rn > 1;

-- ─────────────────────────────────────────────────────────
-- 2) orphan actor — 로그에만 등장하고 legacy_users 에 없는 id
--
-- 탈퇴 등으로 users 행은 사라졌지만 활동 로그에 id 가 남은 경우다.
-- 이들에게 actor 를 주지 않으면 이후 매칭·채팅 이관에서 FK 가 전부 깨진다.
-- ─────────────────────────────────────────────────────────
insert into public.actors (id, actor_type, status, created_at, legacy_user_id)
select gen_random_uuid(), 'USER', 'DELETED', now(), o.id
from (
  select user_id       as id from public.legacy_telepathy_sessions_queue where user_id    is not null
  union select partner_id     from public.legacy_telepathy_sessions_queue where partner_id is not null
  union select user_id        from public.legacy_telepathy_sessions_log   where user_id    is not null
  union select partner_id     from public.legacy_telepathy_sessions_log   where partner_id is not null
  union select user_id        from public.legacy_telepathy_sessions       where user_id    is not null
  union select matched_user_id from public.legacy_telepathy_sessions      where matched_user_id is not null
  union select user_id        from public.legacy_emotion_feedback         where user_id    is not null
  union select partner_id     from public.legacy_emotion_feedback         where partner_id is not null
  union select user_id        from public.legacy_word_history             where user_id    is not null
  union select partner_id     from public.legacy_word_history             where partner_id is not null
  union select user1_id       from public.legacy_balance_game_logs        where user1_id   is not null
  union select user2_id       from public.legacy_balance_game_logs        where user2_id   is not null
  union select user_id        from public.legacy_megaphone_logs           where user_id    is not null
  union select user_id        from public.legacy_sp_payments              where user_id    is not null
  union select user_id        from public.legacy_payments                 where user_id    is not null
  union select user_id        from public.legacy_nickname_histories       where user_id    is not null
) o
where not exists (select 1 from public.legacy_users l where l.id = o.id);

-- ─────────────────────────────────────────────────────────
-- 3) 회원 프로필
--
-- 닉네임 충돌 처리: 같은 닉네임 그룹에서 가장 먼저 만든 계정이 원본을 갖고,
-- 나머지는 uuid 앞 6자를 붙인다. null 은 새로 만들어 준다.
-- ─────────────────────────────────────────────────────────
insert into public.users (actor_id, phone, nickname, gender, birthdate, real_name,
                          last_login_at, created_at)
select a.id,
       p.norm,                     -- 정규화된 번호를 저장한다
       case
         when r.nickname is null then '사용자' || left(r.id::text, 6)
         when r.rn > 1           then r.nickname || '_' || left(r.id::text, 6)
         else r.nickname
       end,
       r.gender,
       r.birthdate,
       r.real_name,
       r.last_login at time zone 'UTC',
       r.created_at at time zone 'UTC'
from (
  select l.*,
         row_number() over (partition by l.nickname order by l.created_at, l.id) as rn
  from public.legacy_users l
) r
join public.actors a on a.legacy_user_id = r.id
-- 같은 번호로 두 번 가입한 경우 먼저 가입한 쪽만 프로필을 갖는다 (1-b 에서 병합했다)
join phone_norm    p on p.id = r.id and p.rn = 1;

-- ─────────────────────────────────────────────────────────
-- 4) 인증 정보
--
-- 레거시는 bcrypt 다. 로그인 성공 시 argon2id 로 재해시하는 것은 앱의 몫이다 (§8.2).
-- ─────────────────────────────────────────────────────────
insert into public.user_credentials (actor_id, username, password_hash,
                                     password_algorithm, created_at)
select a.id, l.username, l.password_hash, 'bcrypt', l.created_at at time zone 'UTC'
from public.legacy_users l
join public.actors a on a.legacy_user_id = l.id
-- user_credentials.user_id 가 users(actor_id) 를 참조하므로 프로필이 있는 것만
join phone_norm    p on p.id = l.id and p.rn = 1;

-- ─────────────────────────────────────────────────────────
-- 5) 매핑표 — 이후 도메인 이관이 legacy id 로 actor 를 찾을 때 쓴다
-- ─────────────────────────────────────────────────────────
insert into public.legacy_actor_map (legacy_id, actor_id, kind)
select a.legacy_user_id, a.id, 'USER'
from public.actors a
where a.legacy_user_id is not null;

-- ─────────────────────────────────────────────────────────
-- 6) 닉네임 변경 이력
--
-- 레거시는 (user_id, username, nickname, changed_at) 만 갖는다.
-- V2 는 기간(started_at ~ ended_at)을 표현하므로, 같은 actor 의 다음 변경
-- 시각을 ended_at 으로 채운다. 가장 최근 것은 열어 둔다.
-- ─────────────────────────────────────────────────────────
insert into public.nickname_histories (id, actor_id, nickname, started_at, ended_at,
                                       change_reason, created_at)
select gen_random_uuid(),
       a.id,
       h.nickname,
       h.changed_at,
       lead(h.changed_at) over (partition by h.user_id order by h.changed_at),
       'USER_CHANGE',
       h.changed_at
from public.legacy_nickname_histories h
join public.actors a on a.legacy_user_id = h.user_id
where h.user_id is not null and h.nickname is not null;

commit;

-- ─────────────────────────────────────────────────────────
-- 검증 — 아래가 모두 통과해야 다음 도메인으로 넘어간다
-- ─────────────────────────────────────────────────────────
-- 회원 수 (legacy 1,191 → users·creds 1,188, 차이 3 = 병합된 중복 전화번호)
--   select (select count(*) from legacy_users) as legacy,
--          (select count(*) from users)        as v2,
--          (select count(*) from user_credentials) as creds,
--          (select count(*) from actors where status = 'MERGED') as merged;
--
-- 전화번호가 정규화됐는가 (기대: 비정규 0, 단 01x 아닌 2건은 숫자만이라 통과)
--   select count(*) from users where phone <> regexp_replace(phone, '[^0-9]', '', 'g');
--
-- 병합된 actor 가 원본을 가리키는가 (기대: 0)
--   select count(*) from actors
--    where status = 'MERGED' and merged_into_actor_id is null;
--
-- 닉네임이 유일한가 (접미사 처리가 충돌을 남기지 않았는가)
--   select count(*) - count(distinct nickname) as nickname_dupes from users;
--
-- 접미사가 붙은 계정 수 (예상 57 + null 1 = 58)
--   select count(*) from users where nickname ~ '_[0-9a-f]{6}$' or nickname like '사용자%';
--
-- 활동 로그의 모든 id 가 actor 를 갖는가 (0 이어야 한다)
--   select count(*) from (
--     select user_id as id from legacy_telepathy_sessions_queue where user_id is not null
--     union select partner_id from legacy_telepathy_sessions_queue where partner_id is not null
--   ) o where not exists (select 1 from actors a where a.legacy_user_id = o.id);
