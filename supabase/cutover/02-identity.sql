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

begin;

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
       r.phone,
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
join public.actors a on a.legacy_user_id = r.id;

-- ─────────────────────────────────────────────────────────
-- 4) 인증 정보
--
-- 레거시는 bcrypt 다. 로그인 성공 시 argon2id 로 재해시하는 것은 앱의 몫이다 (§8.2).
-- ─────────────────────────────────────────────────────────
insert into public.user_credentials (actor_id, username, password_hash,
                                     password_algorithm, created_at)
select a.id, l.username, l.password_hash, 'bcrypt', l.created_at at time zone 'UTC'
from public.legacy_users l
join public.actors a on a.legacy_user_id = l.id;

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
-- 회원 수가 보존됐는가 (users = legacy_users)
--   select (select count(*) from legacy_users) as legacy,
--          (select count(*) from users)        as v2,
--          (select count(*) from user_credentials) as creds;
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
