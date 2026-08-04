-- ERD V2 / Phase 5 — 공지·알림·AI 단어·시즌테마·프레즌스 (TEL-6 §6.3, §13, §25, §26, §36)

create extension if not exists btree_gist;

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  content       text not null,
  status        text not null default 'DRAFT'
                  check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at  timestamptz,
  expires_at    timestamptz,
  created_by    uuid references public.actors (id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint announcements_published_needs_time
    check (status <> 'PUBLISHED' or published_at is not null),
  constraint announcements_period_valid
    check (expires_at is null or published_at is null or expires_at >= published_at)
);
create index announcements_status_published_idx
  on public.announcements (status, published_at desc);

create table public.announcement_comments (
  id                 uuid primary key default gen_random_uuid(),
  announcement_id    uuid not null references public.announcements (id) on delete cascade,
  actor_id           uuid references public.actors (id) on delete set null,
  nickname_snapshot  text,
  content            text not null,
  status             text not null default 'VISIBLE'
                       check (status in ('VISIBLE', 'HIDDEN', 'DELETED')),
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
comment on column public.announcement_comments.actor_id is
  '레거시 comments 는 FK 가 없어 작성자를 특정 못 하는 행이 있을 수 있다 → nullable';
create index announcement_comments_announcement_idx
  on public.announcement_comments (announcement_id, created_at desc);

create table public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  actor_id           uuid not null references public.actors (id) on delete cascade,
  notification_type  text not null
                       check (notification_type in
                         ('REPORT_RECEIVED', 'REPORT_RESOLVED', 'AUTO_SUSPENSION',
                          'ADMIN_SANCTION', 'PAYMENT_COMPLETED', 'ITEM_GRANTED',
                          'ANNOUNCEMENT')),
  title              text not null,
  body               text,
  reference_type     text,
  reference_id       uuid,
  read_at            timestamptz,
  created_at         timestamptz not null default now()
);
comment on table public.notifications is
  '신고 처리 완료 알림 등. 피신고자에 대한 구체적 조치는 과도하게 공개하지 않는다 (§20.3)';
create index notifications_actor_unread_idx
  on public.notifications (actor_id, created_at desc) where read_at is null;
create index notifications_actor_created_idx
  on public.notifications (actor_id, created_at desc);

create table public.trend_word_candidates (
  id               uuid primary key default gen_random_uuid(),
  text             text not null,
  source           text,
  trend_score      numeric(6, 3),
  safety_status    text not null default 'PENDING'
                     check (safety_status in ('PENDING', 'SAFE', 'BLOCKED')),
  approval_status  text not null default 'PENDING'
                     check (approval_status in ('PENDING', 'APPROVED', 'REJECTED')),
  ai_reason        text,
  approved_word_id uuid references public.words (id) on delete set null,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  constraint trend_word_blocked_cannot_approve
    check (not (safety_status = 'BLOCKED' and approval_status = 'APPROVED')),
  constraint trend_word_approved_needs_word
    check (approval_status <> 'APPROVED' or approved_word_id is not null)
);
create unique index trend_word_candidates_pending_unique
  on public.trend_word_candidates (text) where approval_status = 'PENDING';
create index trend_word_candidates_review_idx
  on public.trend_word_candidates (approval_status, trend_score desc);

create table public.theme_campaigns (
  id             uuid primary key default gen_random_uuid(),
  theme_key      text not null
                   check (theme_key in ('default', 'halloween', 'christmas',
                                        'new-year', 'spring')),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  is_active      boolean not null default true,
  asset_version  text,
  created_at     timestamptz not null default now(),
  constraint theme_campaigns_period_valid check (ends_at > starts_at),
  constraint theme_campaigns_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at) with &&) where (is_active)
);
comment on constraint theme_campaigns_no_overlap on public.theme_campaigns is
  '활성 테마 기간 중복 방지 — 동시에 두 시즌 테마가 적용되는 상황을 막는다';

create table public.presence_snapshots (
  captured_at           timestamptz primary key default now(),
  online_user_count     integer not null default 0 check (online_user_count >= 0),
  online_guest_count    integer not null default 0 check (online_guest_count >= 0),
  waiting_match_count   integer not null default 0 check (waiting_match_count >= 0),
  active_session_count  integer not null default 0 check (active_session_count >= 0)
);
comment on table public.presence_snapshots is
  '실시간 원본은 Socket.IO 연결 상태. 여기에는 통계용 스냅샷만 주기 저장한다 (§26)';
