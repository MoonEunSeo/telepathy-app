-- 운영 전환 6/N — 공지·댓글·단어장
--   legacy_comments     → announcements + announcement_comments
--   legacy_word_history → word_bookmarks
--
-- 선행: 03-matching-chat.sql (words 가 있어야 한다)
--
-- ── legacy_comments 는 공지가 없는 방명록이다 ──────────────
-- 레거시에는 공지 테이블이 없고 댓글만 있다(username·nickname·content).
-- V2 는 announcement_comments 가 announcement 에 매달리는 구조라
-- 이관분을 담을 공지 1건을 만든다. dev-v2 도 같은 형태다
-- (announcements 1건 · announcement_comments 91건).
--
-- ── 알려진 손실 ───────────────────────────────────────────
-- 1. 작성자 특정 실패분 — 레거시는 FK 가 없어 username 으로만 되짚는다.
--    못 찾으면 actor_id 를 null 로 두고 nickname_snapshot 만 남긴다 (컬럼이 nullable 이다)
-- 2. word_history 의 만남 상대(partner_id) — word_bookmarks 에 대응 컬럼이 없다.
--    session_id 로 표현해야 하는데 word_history 에 room_id 가 없어 특정 불가 → null
-- 3. session_id 가 null 이면 (actor_id, word_id) 가 유일해야 한다.
--    같은 단어로 여러 번 만난 기록은 하나로 합쳐진다

begin;

-- ─────────────────────────────────────────────────────────
-- 1) 이관분을 담을 공지
-- ─────────────────────────────────────────────────────────
insert into public.announcements (id, title, content, status, published_at, created_at)
select gen_random_uuid(),
       '이전 방명록',
       'V2 이전 전에 남겨진 방명록 글을 보존한 항목입니다.',
       'ARCHIVED',
       coalesce(min(c.created_at at time zone 'UTC'), now()),
       coalesce(min(c.created_at at time zone 'UTC'), now())
from public.legacy_comments c
having count(*) > 0;

-- ─────────────────────────────────────────────────────────
-- 2) 댓글
-- username 으로 작성자를 되짚는다. 못 찾으면 actor_id 는 null 이고
-- 화면 표시는 nickname_snapshot 으로 한다.
-- ─────────────────────────────────────────────────────────
insert into public.announcement_comments (id, announcement_id, actor_id, nickname_snapshot,
                                          content, status, created_at)
select gen_random_uuid(),
       an.id,
       a.id,
       coalesce(c.nickname, c.username),
       c.content,
       'VISIBLE',
       coalesce(c.created_at at time zone 'UTC', now())
from public.legacy_comments c
cross join (select id from public.announcements where title = '이전 방명록' limit 1) an
left join public.legacy_users lu on lu.username = c.username
left join public.actors       a  on a.legacy_user_id = lu.id
where c.content is not null;

-- ─────────────────────────────────────────────────────────
-- 3) word_bookmarks — 단어장(MyWords)
--
-- 레거시 word_history 는 만남 기록 + 개인 표시가 섞여 있었다.
-- V2 에서 만남 기록의 원본은 chat_sessions 이고 여기에는 개인 표시만 둔다.
-- session_id 를 특정할 수 없으므로 null 로 두고, (actor, word) 로 유일화한다.
-- ─────────────────────────────────────────────────────────
insert into public.word_bookmarks (id, actor_id, session_id, word_id,
                                   is_favorite, memo, created_at, updated_at)
select distinct on (a.id, w.id)
       gen_random_uuid(),
       a.id,
       null,
       w.id,
       coalesce(bool_or_flag.is_favorite, false),
       bool_or_flag.memo,
       coalesce(bool_or_flag.connected_at, now()),
       coalesce(bool_or_flag.connected_at, now())
from (
  -- 같은 (사용자, 단어) 가 여러 번이면 즐겨찾기는 하나라도 true 면 true,
  -- 메모는 가장 최근 것을 남긴다.
  select h.user_id,
         h.word,
         bool_or(coalesce(h.is_favorite, false))                              as is_favorite,
         (array_agg(h.memo order by h.connected_at desc nulls last))[1]       as memo,
         min(h.connected_at)                                                  as connected_at
  from public.legacy_word_history h
  where h.user_id is not null and h.word is not null
  group by h.user_id, h.word
) bool_or_flag
join public.actors a on a.legacy_user_id = bool_or_flag.user_id
join public.words  w on w.text           = bool_or_flag.word;

commit;

-- ─────────────────────────────────────────────────────────
-- 검증
-- ─────────────────────────────────────────────────────────
--   select (select count(*) from announcements) as announcements,        -- 1
--          (select count(*) from announcement_comments) as comments,     -- legacy 91
--          (select count(*) from word_bookmarks) as bookmarks;           -- legacy 19 이하
--
-- 작성자를 못 찾은 댓글 수
--   select count(*) from announcement_comments where actor_id is null;
--
-- 즐겨찾기·메모가 보존됐는가
--   select count(*) filter (where is_favorite) as favorites,
--          count(*) filter (where memo is not null) as with_memo
--   from word_bookmarks;
