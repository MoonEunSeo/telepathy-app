-- 운영 전환 3/N — 매칭·채팅 도메인
--   legacy_telepathy_sessions_queue / _log / sessions → words + match_rounds + match_attempts
--   legacy_chat_logs → chat_sessions + chat_session_members + chat_messages
--
-- 선행: 02-identity.sql (actors 가 있어야 한다)
--
-- ── dev-v2 대비 방침 ──────────────────────────────────────
-- dev-v2 는 queue 11,184 중 8,558 / log 12,329 중 10,363 만 이관했고
-- legacy_telepathy_sessions 10,270 은 통째로 버렸다(legacy_source='SESSIONS' 가 0건).
-- 여기서는 데이터를 더 보존한다 — 02 에서 orphan actor 를 만들었으므로
-- FK 를 만족시킬 수 있는 행은 모두 넣는다.
--
-- ── 확정된 규칙 (dev-v2 와 수치가 정확히 일치) ─────────────
--   words       = 모든 레거시 테이블의 distinct word (643)
--   match_rounds = queue.round ∪ log.round (22,550)
--
-- ── 알려진 손실 ───────────────────────────────────────────
-- 1. user_id 가 null 인 행(게스트 단독) — actor 가 없어 이관 불가
-- 2. round 가 null 인 queue/log 행 — match_attempts.round_id 가 not null 이다
-- 3. 세션 종료 사유·정확한 시각 — 레거시에 없어 UNKNOWN / 로그 최소·최대 시각으로 채운다

begin;

-- ─────────────────────────────────────────────────────────
-- 1) words — 단어 마스터
-- 레거시는 각 테이블에 word 텍스트를 중복 저장했다. 여기서 유일화한다.
-- ─────────────────────────────────────────────────────────
insert into public.words (id, text, source_type, is_active, created_at)
select gen_random_uuid(), w.word, 'LEGACY', true, now()
from (
  select word from public.legacy_telepathy_sessions_queue where word is not null
  union select word from public.legacy_telepathy_sessions_log where word is not null
  union select word from public.legacy_telepathy_sessions     where word is not null
  union select word from public.legacy_chat_logs              where word is not null
  union select word from public.legacy_word_history           where word is not null
) w;

-- ─────────────────────────────────────────────────────────
-- 2) match_rounds — 라운드
-- round 는 epoch ms ÷ 15000 이다. 15초 슬롯으로 되돌린다.
-- ─────────────────────────────────────────────────────────
insert into public.match_rounds (id, round_key, starts_at, ends_at, status, created_at)
select gen_random_uuid(),
       r.round,
       to_timestamp(r.round * 15.0),
       to_timestamp(r.round * 15.0 + 15),
       'ENDED',
       now()
from (
  select round from public.legacy_telepathy_sessions_queue where round is not null
  union select round from public.legacy_telepathy_sessions_log where round is not null
) r;

-- ─────────────────────────────────────────────────────────
-- 3) chat_sessions — 방(room_id) 단위로 세션을 복원한다
--
-- room_id 는 세 테이블에 흩어져 있고 타입도 varchar/uuid 로 갈린다.
-- text 로 통일해 모으고, 시각은 그 방의 로그 최소·최대로 잡는다.
-- ─────────────────────────────────────────────────────────
insert into public.chat_sessions (id, word_id, status, matched_at, chat_started_at,
                                  ended_at, end_reason, legacy_room_id, created_at)
-- created_at 은 not null 이다. 로그의 시각이 전부 null 인 방이 실제로 있어
-- (리허설에서 발견) coalesce 로 막는다. matched_at 등은 nullable 이라 그대로 둔다.
select gen_random_uuid(),
       w.id,
       'ENDED',
       src.first_at,
       src.first_at,
       src.last_at,
       'UNKNOWN',            -- 레거시에 종료 사유가 없다
       src.room,
       coalesce(src.first_at, src.last_at, now())
from (
  select x.room,
         min(x.ts)   as first_at,
         max(x.ts)   as last_at,
         min(x.word) as word
  from (
    select room_id::text as room, timestamp  as ts, word from public.legacy_chat_logs               where room_id is not null
    union all
    select room_id::text,          created_at,      word from public.legacy_telepathy_sessions_log  where room_id is not null
    union all
    select room_id::text,          created_at,      word from public.legacy_telepathy_sessions      where room_id is not null
  ) x
  group by x.room
) src
left join public.words w on w.text = src.word;

-- ─────────────────────────────────────────────────────────
-- 4) chat_session_members — 방 참여자
--
-- 참여자는 세 테이블에 sender/receiver, user/partner, user/matched 로 나뉘어 있다.
-- 방·회원 단위로 유일화한다 (제약: unique (session_id, actor_id)).
-- ─────────────────────────────────────────────────────────
insert into public.chat_session_members (id, session_id, actor_id, nickname_snapshot,
                                         joined_at, left_at, leave_reason, created_at)
select gen_random_uuid(),
       cs.id,
       a.id,
       m.nickname,
       m.first_at,
       m.last_at,
       'UNKNOWN',
       coalesce(m.first_at, m.last_at, now())
from (
  select p.room,
         p.legacy_id,
         min(p.nickname) as nickname,
         min(p.ts)       as first_at,
         max(p.ts)       as last_at
  from (
    select room_id::text as room, sender_id      as legacy_id, sender_nickname   as nickname, timestamp  as ts from public.legacy_chat_logs              where room_id is not null and sender_id      is not null
    union all
    select room_id::text,         receiver_id,                 receiver_nickname,             timestamp        from public.legacy_chat_logs              where room_id is not null and receiver_id    is not null
    union all
    select room_id::text,         user_id,                     nickname,                      created_at       from public.legacy_telepathy_sessions_log where room_id is not null and user_id        is not null
    union all
    select room_id::text,         partner_id,                  partner_nickname,              created_at       from public.legacy_telepathy_sessions_log where room_id is not null and partner_id     is not null
    union all
    select room_id::text,         user_id,                     nickname,                      created_at       from public.legacy_telepathy_sessions     where room_id is not null and user_id        is not null
    union all
    select room_id::text,         matched_user_id,             matched_nickname,              created_at       from public.legacy_telepathy_sessions     where room_id is not null and matched_user_id is not null
  ) p
  group by p.room, p.legacy_id
) m
join public.chat_sessions cs on cs.legacy_room_id = m.room
join public.actors        a  on a.legacy_user_id  = m.legacy_id;

-- ─────────────────────────────────────────────────────────
-- 5) chat_messages — 대화 본문
-- sender 가 그 방의 member 로 존재해야 한다 (FK: sender_member_id).
-- ─────────────────────────────────────────────────────────
insert into public.chat_messages (id, session_id, sender_member_id, message, created_at)
select gen_random_uuid(), cs.id, csm.id, cl.message, coalesce(cl.timestamp, now())
from public.legacy_chat_logs cl
join public.chat_sessions        cs  on cs.legacy_room_id = cl.room_id::text
join public.actors               a   on a.legacy_user_id  = cl.sender_id
join public.chat_session_members csm on csm.session_id = cs.id and csm.actor_id = a.id
where cl.sender_id is not null
  and cl.message is not null;

-- ─────────────────────────────────────────────────────────
-- 6) match_attempts — 매칭 시도 원장 (QUEUE)
--
-- finished_at 을 반드시 채운다. 비워 두면 부분 유니크 인덱스
-- match_attempts_one_active_per_actor 가 actor 당 1행만 허용해 이관이 막힌다.
-- 과거 이력이므로 종료된 것으로 본다.
--
-- status 는 매칭 상대가 아니라 chat_sessions 존재 여부로 정한다.
-- 제약 match_attempts_matched_needs_session 이 MATCHED 에 세션을 요구하기 때문이다.
-- ─────────────────────────────────────────────────────────
insert into public.match_attempts (id, actor_id, round_id, word_id, status, socket_id,
                                   matched_session_id, queued_at, finished_at,
                                   legacy_source, legacy_id, created_at)
select gen_random_uuid(),
       a.id,
       mr.id,
       w.id,
       case when cs.id is not null then 'MATCHED' else 'EXPIRED' end,
       q.socket_id,
       cs.id,
       coalesce(q.created_at, now()),
       coalesce(q.created_at, now()),
       'QUEUE',
       q.id::text,
       coalesce(q.created_at, now())
from public.legacy_telepathy_sessions_queue q
join public.actors       a  on a.legacy_user_id = q.user_id
join public.match_rounds mr on mr.round_key     = q.round
left join public.words         w  on w.text           = q.word
left join public.chat_sessions cs on cs.legacy_room_id = q.room_id
where q.user_id is not null and q.round is not null;

-- 7) match_attempts (LOG)
insert into public.match_attempts (id, actor_id, round_id, word_id, status,
                                   matched_session_id, queued_at, finished_at,
                                   legacy_source, legacy_id, created_at)
select gen_random_uuid(),
       a.id,
       mr.id,
       w.id,
       case when cs.id is not null then 'MATCHED' else 'EXPIRED' end,
       cs.id,
       coalesce(l.created_at, now()),
       coalesce(l.created_at, now()),
       'LOG',
       l.id::text,
       coalesce(l.created_at, now())
from public.legacy_telepathy_sessions_log l
join public.actors       a  on a.legacy_user_id = l.user_id
join public.match_rounds mr on mr.round_key     = l.round
left join public.words         w  on w.text           = l.word
left join public.chat_sessions cs on cs.legacy_room_id = l.room_id::text
where l.user_id is not null and l.round is not null;

commit;

-- ─────────────────────────────────────────────────────────
-- 검증
-- ─────────────────────────────────────────────────────────
-- 단어·라운드는 정확히 일치해야 한다
--   select (select count(*) from words) as words,        -- 예상 643
--          (select count(*) from match_rounds) as rounds; -- 예상 22,550
--
-- 세션·메시지 보존율
--   select (select count(*) from chat_sessions) as sessions,   -- 예상 434 (dev 404 보다 많다)
--          (select count(*) from chat_messages) as messages,   -- 예상 8,158 근처
--          (select count(*) from legacy_chat_logs) as legacy;
--
-- 메시지 손실 원인 분해 (sender 가 member 가 아닌 경우)
--   select count(*) from legacy_chat_logs cl
--   where cl.sender_id is not null
--     and not exists (select 1 from actors a where a.legacy_user_id = cl.sender_id);
--
-- 매칭 시도 이관량
--   select legacy_source, count(*) from match_attempts group by legacy_source;
