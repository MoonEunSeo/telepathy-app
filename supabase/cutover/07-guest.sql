-- 운영 전환 7/N — 게스트 도메인 + 게스트 활동 보완
--   게스트 id → actors(GUEST) + guest_profiles + legacy_actor_map
--   그리고 03~06 이 회원만 넣고 건너뛴 게스트 활동을 채운다
--
-- 선행: 03-matching-chat.sql ~ 06-content-bookmarks.sql (세션·라운드·단어가 있어야 한다)
--
-- ── 이 파일만 역설계가 아니라 신규 설계다 ─────────────────
-- dev-v2 에 원본이 없다. legacy_actor_map 에 kind='GUEST' 587건이 있지만
-- 그 actor_id 587개는 actors 에 하나도 존재하지 않는다 — uuid 만 발급하고
-- 삽입 단계에서 멈춘 미완 작업이다.
--
-- 운영의 distinct 게스트도 정확히 587 이라 대상은 같다.
-- 설계는 v2_identity 마이그레이션의 컬럼 주석을 따랐다.
--   guest_token_hash — "레거시 게스트는 복구 토큰이 없어 NULL 로 이전된다"
--   nickname         — "레거시 게스트 닉네임은 활동 로그의 스냅샷에서 복원한다"
--
-- ── 설계 결정 ─────────────────────────────────────────────
-- status = 'DELETED' 로 둔다. 레거시 게스트는 복구 토큰이 없어 재접속이
-- 불가능하다. ACTIVE 로 두면 살아 있는 신원으로 오인되어 매칭·집계에 섞인다.
-- 활동 이력은 그대로 남으므로 통계·신고 추적에는 문제가 없다.

begin;

-- ─────────────────────────────────────────────────────────
-- 0) 게스트 id 와 활동 흔적을 한 번에 모은다
-- 닉네임은 각 로그에 스냅샷으로 흩어져 있어, 가장 최근 것을 쓴다.
-- ─────────────────────────────────────────────────────────
create temp table guest_seed on commit drop as
select s.guest_id,
       min(s.ts)                                                        as first_at,
       max(s.ts)                                                        as last_at,
       (array_agg(s.nickname order by s.ts desc nulls last)
          filter (where s.nickname is not null))[1]                     as nickname
from (
  select guest_id          as guest_id, nickname,          created_at as ts from public.legacy_telepathy_sessions_queue where guest_id          is not null
  union all
  select guest_id,                      nickname,          created_at      from public.legacy_telepathy_sessions       where guest_id          is not null
  union all
  select matched_guest_id,              matched_nickname,  created_at      from public.legacy_telepathy_sessions       where matched_guest_id  is not null
  union all
  select user_guest_id,                 nickname,          created_at      from public.legacy_telepathy_sessions_log   where user_guest_id     is not null
  union all
  select partner_guest_id,              partner_nickname,  created_at      from public.legacy_telepathy_sessions_log   where partner_guest_id  is not null
  union all
  select sender_guest_id,               sender_nickname,   timestamp       from public.legacy_chat_logs                where sender_guest_id   is not null
  union all
  select receiver_guest_id,             receiver_nickname, timestamp       from public.legacy_chat_logs                where receiver_guest_id is not null
  union all
  select user_guest_id,                 user_nickname,     created_at      from public.legacy_emotion_feedback         where user_guest_id     is not null
  union all
  select partner_guest_id,              partner_nickname,  created_at      from public.legacy_emotion_feedback         where partner_guest_id  is not null
  union all
  select reporter_guest_id,             null,              created_at      from public.legacy_reported_reports         where reporter_guest_id is not null
  union all
  select reported_guest_id,             null,              created_at      from public.legacy_reported_reports         where reported_guest_id is not null
) s
group by s.guest_id;

-- ─────────────────────────────────────────────────────────
-- 1) actors (GUEST)
-- 제약 actors_legacy_type_match — GUEST 는 legacy_user_id 가 null 이어야 한다
-- ─────────────────────────────────────────────────────────
insert into public.actors (id, actor_type, status, created_at, deleted_at, legacy_guest_id)
select gen_random_uuid(), 'GUEST', 'DELETED',
       coalesce(g.first_at, g.last_at, now()), g.last_at, g.guest_id
from guest_seed g;

-- ─────────────────────────────────────────────────────────
-- 2) guest_profiles
-- 토큰은 없다. 이미 만료된 것으로 둔다(expires_at = 마지막 활동).
-- ─────────────────────────────────────────────────────────
insert into public.guest_profiles (actor_id, guest_token_hash, nickname,
                                   last_seen_at, expires_at, created_at)
select a.id, null, g.nickname, g.last_at, g.last_at,
       coalesce(g.first_at, g.last_at, now())
from guest_seed g
join public.actors a on a.legacy_guest_id = g.guest_id;

-- 3) 매핑표
insert into public.legacy_actor_map (legacy_id, actor_id, kind)
select a.legacy_guest_id, a.id, 'GUEST'
from public.actors a
where a.legacy_guest_id is not null;

-- ─────────────────────────────────────────────────────────
-- 4) match_attempts — 게스트 매칭 시도
-- 03 은 user_id 가 있는 행만 넣었다. 게스트 행(queue 2,128 · log 46)을 채운다.
-- legacy_id 가 03 과 겹치지 않도록 접두사를 붙인다
-- (제약: unique (legacy_source, legacy_id)).
-- ─────────────────────────────────────────────────────────
insert into public.match_attempts (id, actor_id, round_id, word_id, status, socket_id,
                                   matched_session_id, queued_at, finished_at,
                                   legacy_source, legacy_id, created_at)
select gen_random_uuid(), a.id, mr.id, w.id,
       case when cs.id is not null then 'MATCHED' else 'EXPIRED' end,
       q.socket_id, cs.id, coalesce(q.created_at, now()), coalesce(q.created_at, now()),
       'QUEUE', 'g:' || q.id::text, coalesce(q.created_at, now())
from public.legacy_telepathy_sessions_queue q
join public.actors       a  on a.legacy_guest_id = q.guest_id
join public.match_rounds mr on mr.round_key      = q.round
left join public.words         w  on w.text           = q.word
left join public.chat_sessions cs on cs.legacy_room_id = q.room_id
where q.guest_id is not null and q.user_id is null and q.round is not null;

insert into public.match_attempts (id, actor_id, round_id, word_id, status,
                                   matched_session_id, queued_at, finished_at,
                                   legacy_source, legacy_id, created_at)
select gen_random_uuid(), a.id, mr.id, w.id,
       case when cs.id is not null then 'MATCHED' else 'EXPIRED' end,
       cs.id, coalesce(l.created_at, now()), coalesce(l.created_at, now()),
       'LOG', 'g:' || l.id::text, coalesce(l.created_at, now())
from public.legacy_telepathy_sessions_log l
join public.actors       a  on a.legacy_guest_id = l.user_guest_id
join public.match_rounds mr on mr.round_key      = l.round
left join public.words         w  on w.text           = l.word
left join public.chat_sessions cs on cs.legacy_room_id = l.room_id::text
where l.user_guest_id is not null and l.user_id is null and l.round is not null;

-- ─────────────────────────────────────────────────────────
-- 5) chat_session_members — 게스트 참여자
-- 03 과 같은 방식이되 guest 컬럼을 본다. 제약 unique (session_id, actor_id).
-- ─────────────────────────────────────────────────────────
insert into public.chat_session_members (id, session_id, actor_id, nickname_snapshot,
                                         joined_at, left_at, leave_reason, created_at)
select gen_random_uuid(), cs.id, a.id, m.nickname, m.first_at, m.last_at, 'UNKNOWN',
       coalesce(m.first_at, m.last_at, now())
from (
  select p.room,
         p.guest_id,
         (array_agg(p.nickname order by p.ts desc nulls last)
            filter (where p.nickname is not null))[1] as nickname,
         min(p.ts) as first_at,
         max(p.ts) as last_at
  from (
    select room_id::text as room, sender_guest_id   as guest_id, sender_nickname   as nickname, timestamp  as ts from public.legacy_chat_logs              where room_id is not null and sender_guest_id   is not null
    union all
    select room_id::text,         receiver_guest_id,             receiver_nickname,             timestamp        from public.legacy_chat_logs              where room_id is not null and receiver_guest_id is not null
    union all
    select room_id::text,         user_guest_id,                 nickname,                      created_at       from public.legacy_telepathy_sessions_log where room_id is not null and user_guest_id     is not null
    union all
    select room_id::text,         partner_guest_id,              partner_nickname,              created_at       from public.legacy_telepathy_sessions_log where room_id is not null and partner_guest_id  is not null
    union all
    select room_id::text,         guest_id,                      nickname,                      created_at       from public.legacy_telepathy_sessions     where room_id is not null and guest_id          is not null
    union all
    select room_id::text,         matched_guest_id,              matched_nickname,              created_at       from public.legacy_telepathy_sessions     where room_id is not null and matched_guest_id  is not null
  ) p
  group by p.room, p.guest_id
) m
join public.chat_sessions cs on cs.legacy_room_id  = m.room
join public.actors        a  on a.legacy_guest_id  = m.guest_id;

-- ─────────────────────────────────────────────────────────
-- 6) chat_messages — 게스트가 보낸 메시지 (117건)
-- ─────────────────────────────────────────────────────────
insert into public.chat_messages (id, session_id, sender_member_id, message, created_at)
select gen_random_uuid(), cs.id, csm.id, cl.message, coalesce(cl.timestamp, now())
from public.legacy_chat_logs cl
join public.chat_sessions        cs  on cs.legacy_room_id = cl.room_id::text
join public.actors               a   on a.legacy_guest_id = cl.sender_guest_id
join public.chat_session_members csm on csm.session_id = cs.id and csm.actor_id = a.id
where cl.sender_guest_id is not null
  and cl.sender_id is null
  and cl.message is not null;

-- ─────────────────────────────────────────────────────────
-- 7) session_feedback — 게스트가 남긴 감정 피드백
-- 04 와 같은 추정 방식(두 사람이 함께한 방 중 시각 근접)을 쓴다.
-- ─────────────────────────────────────────────────────────
insert into public.session_feedback (id, session_id, from_member_id, to_member_id,
                                     emotion, trigger_type, created_at)
select gen_random_uuid(), fm_session, fm_id, tm_id, emotion, 'NORMAL',
       coalesce(created_at, now())
from (
  select distinct on (fm_session, fm_id) *
  from (
    -- 04 와 같은 이유로 레거시 행 하나당 세션 하나만 고른다
    select distinct on (f.id)
           f.id as legacy_id, fm.session_id as fm_session, fm.id as fm_id, tm.id as tm_id,
           f.emotion, f.created_at,
           abs(extract(epoch from (cs.created_at - f.created_at))) as gap
    from public.legacy_emotion_feedback f
    join public.actors               fa on fa.legacy_guest_id = f.user_guest_id
    join public.actors               ta on ta.id = coalesce(
           (select x.id from public.actors x where x.legacy_guest_id = f.partner_guest_id),
           (select x.id from public.actors x where x.legacy_user_id  = f.partner_id))
    join public.chat_session_members fm on fm.actor_id = fa.id
    join public.chat_session_members tm on tm.actor_id = ta.id and tm.session_id = fm.session_id
    join public.chat_sessions        cs on cs.id = fm.session_id
    where f.user_guest_id is not null
      and fa.id <> ta.id
      and f.emotion in ('기뻐요', '괜찮아요', '슬퍼요', '행복해요', '화나요')
      -- 04 에서 이미 넣은 조합은 건너뛴다
      and not exists (select 1 from public.session_feedback sf
                       where sf.session_id = fm.session_id and sf.from_member_id = fm.id)
    order by f.id, gap
  ) a
  order by fm_session, fm_id, gap
) x;

commit;

-- ─────────────────────────────────────────────────────────
-- 검증
-- ─────────────────────────────────────────────────────────
-- 게스트 신원
--   select (select count(*) from actors where actor_type = 'GUEST') as guest_actors,   -- 예상 587
--          (select count(*) from guest_profiles) as profiles,                          -- 예상 587
--          (select count(*) from legacy_actor_map where kind = 'GUEST') as map;        -- 예상 587
--
-- 닉네임을 복원하지 못한 게스트 (신고에만 등장한 경우 등)
--   select count(*) from guest_profiles where nickname is null;
--
-- 게스트 활동이 붙었는가
--   select count(*) from match_attempts where legacy_id like 'g:%';                    -- 예상 2,100 근처
--   select count(*) from chat_session_members csm
--     join actors a on a.id = csm.actor_id where a.actor_type = 'GUEST';
--   select count(*) from chat_messages cm
--     join chat_session_members csm on csm.id = cm.sender_member_id
--     join actors a on a.id = csm.actor_id where a.actor_type = 'GUEST';               -- 예상 117 이하
--
-- 회원/게스트 신원이 섞이지 않았는가 (0 이어야 한다)
--   select count(*) from actors
--    where (actor_type = 'GUEST' and legacy_user_id is not null)
--       or (actor_type = 'USER'  and legacy_guest_id is not null);
