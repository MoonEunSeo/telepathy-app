-- TEL-11 리허설 후 발견된 두 공백을 메운다.
--   ① 단어장(MyWords) 의 is_favorite/memo 가 갈 곳이 없었다
--   ② 계좌이체 환불 계좌를 저장할 컬럼이 없었다 (§27.1 계좌이체가 1차 결제수단인데 §31 환불 실행 불가)

-- ─────────────────────────────────────────────────────────────
-- ① 단어장 (MyWords)
-- ─────────────────────────────────────────────────────────────
-- 레거시 word_history 는 user_nickname·partner_nickname·word 텍스트를 중복 저장했다.
-- 만남 기록 자체는 chat_sessions + chat_session_members 가 이미 원본이므로,
-- 여기에는 사용자의 개인 표시(즐겨찾기·메모)만 둔다.
create table public.word_bookmarks (
  id          uuid        primary key default gen_random_uuid(),
  actor_id    uuid        not null references public.actors(id)        on delete cascade,
  session_id  uuid                 references public.chat_sessions(id) on delete set null,
  word_id     uuid        not null references public.words(id),
  is_favorite boolean     not null default false,
  memo        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint word_bookmarks_memo_len check (memo is null or char_length(memo) <= 500)
);

-- 만남 1건당 북마크 1개. 레거시의 (user, word, partner) 단위를 세션으로 표현한다.
create unique index word_bookmarks_actor_session_uk
  on public.word_bookmarks (actor_id, session_id)
  where session_id is not null;

-- 세션을 특정할 수 없는 이관분은 (actor, word) 로 중복을 막는다.
create unique index word_bookmarks_actor_word_uk
  on public.word_bookmarks (actor_id, word_id)
  where session_id is null;

create index word_bookmarks_actor_created_idx
  on public.word_bookmarks (actor_id, created_at desc);

create index word_bookmarks_favorite_idx
  on public.word_bookmarks (actor_id)
  where is_favorite;

-- §34 규칙: 신규 테이블은 생성과 동시에 RLS 를 활성화한다.
-- 정책은 만들지 않는다 = 기본 거부. 서버는 service_role 로 우회한다.
alter table public.word_bookmarks enable row level security;

comment on table public.word_bookmarks is
  '단어장(MyWords). 만남 기록의 원본은 chat_sessions/chat_session_members 이며 여기에는 개인 표시만 둔다. 레거시 word_history 의 is_favorite/memo 를 대체';
comment on column public.word_bookmarks.session_id is
  '이 북마크가 비롯된 만남. 레거시 이관분은 세션 특정이 불가해 null 일 수 있다';

-- ─────────────────────────────────────────────────────────────
-- ② 환불 계좌
-- ─────────────────────────────────────────────────────────────
alter table public.payments
  add column refund_bank    text,
  add column refund_account text;

comment on column public.payments.refund_bank is
  '환불 수취 은행. 계좌이체(BANK_TRANSFER) 결제의 환불 실행에 필요 (§31)';
comment on column public.payments.refund_account is
  '환불 수취 계좌번호. 개인정보이므로 조회를 최소화하고 저장 시 암호화를 검토한다';

-- 레거시 sp_payments 에 남아 있던 환불 계좌를 복구한다.
-- dev 환경의 값은 마스킹된 사본이며, 운영 Backfill 시 실제 값이 들어온다.
update public.payments p
set refund_bank    = l.refund_bank,
    refund_account = l.refund_account
from public.legacy_sp_payments l
where p.legacy_sp_payment_id = l.id
  and (l.refund_bank is not null or l.refund_account is not null);
