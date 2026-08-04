-- 운영 전환 4/N — 신고·감정피드백·밸런스게임
--   legacy_reported_reports  → reports + report_reason_items
--   legacy_emotion_feedback  → session_feedback
--   legacy_balance_game_logs → balance_games + balance_game_choices
--
-- 선행: 03-matching-chat.sql (chat_sessions·chat_session_members 가 있어야 한다)
--
-- ── 이 도메인의 어려움 ────────────────────────────────────
-- V2 는 신고·피드백을 "세션 참여자(member)" 기준으로 식별한다.
-- 레거시는 user_id/partner_id 를 직접 들고 있어, 세션을 되짚어야 member 를 찾는다.
-- legacy_emotion_feedback 에는 room_id 조차 없어 (user, partner) 가 함께 있는
-- 세션 중 시각이 가장 가까운 것으로 추정한다.
--
-- ── 알려진 손실 ───────────────────────────────────────────
-- 1. 게스트 신고·피드백 (reporter_guest_id 등) — actor 가 없어 이관 불가
-- 2. 세션을 특정 못 하는 피드백 — 두 사람이 함께한 방을 못 찾으면 버린다
-- 3. 신고 처리 상태 — 레거시에 없어 전부 PENDING 으로 둔다
-- 4. emotion 값이 V2 check 목록에 없는 행은 제외된다

begin;

-- ─────────────────────────────────────────────────────────
-- 1) reports
-- 제약: 자기 신고 금지, (session, reporter, reported) 유일,
--       reporter/reported 가 그 세션의 member 여야 한다
-- ─────────────────────────────────────────────────────────
insert into public.reports (id, session_id, reporter_member_id, reported_member_id,
                            extra_message, status, created_at)
select distinct on (cs.id, rm.id, dm.id)
       gen_random_uuid(), cs.id, rm.id, dm.id, r.extra_message, 'PENDING',
       coalesce(r.created_at, now())
from public.legacy_reported_reports r
join public.chat_sessions        cs on cs.legacy_room_id = r.room_id
join public.actors               ra on ra.legacy_user_id = r.reporter_id
join public.actors               da on da.legacy_user_id = r.reported_id
join public.chat_session_members rm on rm.session_id = cs.id and rm.actor_id = ra.id
join public.chat_session_members dm on dm.session_id = cs.id and dm.actor_id = da.id
where r.reporter_id is not null
  and r.reported_id is not null
  and r.reporter_id <> r.reported_id
order by cs.id, rm.id, dm.id, r.created_at;

-- ─────────────────────────────────────────────────────────
-- 2) report_reason_items
-- 레거시는 UI 한글 문장을 배열로 저장했다. label 로 코드를 찾고,
-- 목록에 없는 문장은 OTHER 로 떨어뜨린다.
-- ─────────────────────────────────────────────────────────
insert into public.report_reason_items (report_id, reason_code)
select distinct rp.id, coalesce(rc.code, 'OTHER')
from public.legacy_reported_reports r
join public.chat_sessions        cs on cs.legacy_room_id = r.room_id
join public.actors               ra on ra.legacy_user_id = r.reporter_id
join public.actors               da on da.legacy_user_id = r.reported_id
join public.chat_session_members rm on rm.session_id = cs.id and rm.actor_id = ra.id
join public.chat_session_members dm on dm.session_id = cs.id and dm.actor_id = da.id
join public.reports              rp on rp.session_id = cs.id
                                   and rp.reporter_member_id = rm.id
                                   and rp.reported_member_id = dm.id
cross join lateral unnest(coalesce(r.reasons, array[]::text[])) as reason(txt)
left join public.report_reason_codes rc on rc.label = reason.txt;

-- ─────────────────────────────────────────────────────────
-- 3) session_feedback
--
-- room_id 가 없다. 두 사람이 함께 member 인 세션 중 피드백 시각과
-- 가장 가까운 것을 고른다. 제약 unique (session_id, from_member_id) 때문에
-- 레거시 행 하나당 최대 하나만 남긴다.
-- ─────────────────────────────────────────────────────────
insert into public.session_feedback (id, session_id, from_member_id, to_member_id,
                                     emotion, trigger_type, created_at)
-- created_at 은 not null 이다. 레거시에 null 인 행이 있어 막는다 (리허설에서 발견).
select gen_random_uuid(), fm_session, fm_id, tm_id, emotion, 'NORMAL',
       coalesce(created_at, now())
from (
  -- 2단계: 제약 unique (session_id, from_member_id) 를 만족시킨다
  select distinct on (fm_session, fm_id) *
  from (
    -- 1단계: 레거시 행 하나당 세션 하나만 고른다.
    -- 이걸 빼면 두 사람이 여러 방에서 만났을 때 원본 1행이 방마다 복제된다
    -- (리허설에서 319 → 471 로 부풀었다).
    select distinct on (f.id)
           f.id          as legacy_id,
           fm.session_id as fm_session,
           fm.id         as fm_id,
           tm.id         as tm_id,
           f.emotion,
           f.created_at,
           abs(extract(epoch from (cs.created_at - f.created_at))) as gap
    from public.legacy_emotion_feedback f
    join public.actors               fa on fa.legacy_user_id = f.user_id
    join public.actors               ta on ta.legacy_user_id = f.partner_id
    join public.chat_session_members fm on fm.actor_id = fa.id
    join public.chat_session_members tm on tm.actor_id = ta.id and tm.session_id = fm.session_id
    join public.chat_sessions        cs on cs.id = fm.session_id
    where f.user_id is not null
      and f.partner_id is not null
      and f.user_id <> f.partner_id
      and f.emotion in ('기뻐요', '괜찮아요', '슬퍼요', '행복해요', '화나요')
    order by f.id, gap
  ) a
  order by fm_session, fm_id, gap
) x;

-- ─────────────────────────────────────────────────────────
-- 4) balance_games
-- ─────────────────────────────────────────────────────────
insert into public.balance_games (id, session_id, topic, created_at)
select gen_random_uuid(), cs.id, b.topic, coalesce(b.created_at, now())
from public.legacy_balance_game_logs b
join public.chat_sessions cs on cs.legacy_room_id = b.room_id
where b.topic is not null;

-- ─────────────────────────────────────────────────────────
-- 5) balance_game_choices
-- 레거시는 user1_choice/user2_choice 를 한 행에 담았다. 참여자별 행으로 편다.
-- 게임 식별은 (세션, 주제, 생성시각) 조합으로 되짚는다.
-- ─────────────────────────────────────────────────────────
insert into public.balance_game_choices (game_id, member_id, choice, created_at)
-- now() 는 트랜잭션 안에서 고정이므로 위 balance_games 삽입값과 그대로 맞는다.
select distinct on (g.id, csm.id) g.id, csm.id, p.choice, coalesce(b.created_at, now())
from public.legacy_balance_game_logs b
join public.chat_sessions        cs  on cs.legacy_room_id = b.room_id
join public.balance_games        g   on g.session_id = cs.id
                                    and g.topic = b.topic
                                    and g.created_at = coalesce(b.created_at, now())
cross join lateral (values (b.user1_id, b.user1_choice), (b.user2_id, b.user2_choice))
                     as p(legacy_id, choice)
join public.actors               a   on a.legacy_user_id = p.legacy_id
join public.chat_session_members csm on csm.session_id = cs.id and csm.actor_id = a.id
where p.legacy_id is not null
  and p.choice in ('A', 'B');

commit;

-- ─────────────────────────────────────────────────────────
-- 검증
-- ─────────────────────────────────────────────────────────
--   select (select count(*) from reports) as reports,                     -- legacy 20 중 세션 특정 가능분
--          (select count(*) from report_reason_items) as reason_items,
--          (select count(*) from session_feedback) as feedback,           -- legacy 319 중
--          (select count(*) from balance_games) as games,
--          (select count(*) from balance_game_choices) as choices;
--
-- 세션을 못 찾아 버려진 신고 (원인 분해)
--   select count(*) from legacy_reported_reports r
--   where not exists (select 1 from chat_sessions cs where cs.legacy_room_id = r.room_id);
