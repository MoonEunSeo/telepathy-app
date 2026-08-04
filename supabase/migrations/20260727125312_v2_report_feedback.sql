-- ERD V2 / Phase 3 — 신고·제재·감정피드백·밸런스게임 (TEL-6 §20~§24)

alter table public.chat_session_members
  add constraint chat_session_members_id_session_key unique (id, session_id);

create table public.report_reason_codes (
  code           text primary key,
  label          text not null,
  is_active      boolean not null default true,
  display_order  integer not null default 0
);
comment on table public.report_reason_codes is
  '레거시는 UI 한글 문장을 그대로 배열 저장했다. 코드로 분리해 문구 변경에 영향받지 않게 한다';

insert into public.report_reason_codes (code, label, display_order) values
  ('ADVERTISING', '광고, 홍보 메시지를 계속 보내요.', 1),
  ('HARASSMENT',  '비난, 괴롭힘, 욕설을 했어요.',      2),
  ('THREAT',      '위협적인 말을 했어요.',             3),
  ('SEXUAL',      '성적인 발언 및 행위를 했어요.',     4),
  ('OTHER',       '기타 (자유기술)',                   5);

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.chat_sessions (id) on delete restrict,
  reporter_member_id  uuid not null,
  reported_member_id  uuid not null,
  extra_message       text,
  status              text not null default 'PENDING'
                        check (status in ('PENDING', 'RESOLVED')),
  resolved_by         uuid references public.actors (id) on delete set null,
  resolution_type     text check (resolution_type in
                        ('NO_ACTION', 'WARNING', 'TEMP_SUSPENSION', 'PERM_SUSPENSION')),
  resolution_message  text,
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  constraint reports_no_self_report check (reporter_member_id <> reported_member_id),
  constraint reports_no_duplicate unique (session_id, reporter_member_id, reported_member_id),
  constraint reports_resolved_needs_detail
    check (status <> 'RESOLVED' or (resolved_at is not null and resolution_type is not null)),
  constraint reports_reporter_in_session
    foreign key (reporter_member_id, session_id)
    references public.chat_session_members (id, session_id) on delete restrict,
  constraint reports_reported_in_session
    foreign key (reported_member_id, session_id)
    references public.chat_session_members (id, session_id) on delete restrict
);
create index reports_status_created_idx on public.reports (status, created_at desc);
create index reports_reported_idx on public.reports (reported_member_id);

create table public.report_reason_items (
  report_id    uuid not null references public.reports (id) on delete cascade,
  reason_code  text not null references public.report_reason_codes (code) on delete restrict,
  primary key (report_id, reason_code)
);
comment on table public.report_reason_items is
  '레거시 reasons ARRAY 를 대체한다. 신고 1건에 사유 N개가 행으로 저장된다';

create table public.user_sanctions (
  id                 uuid primary key default gen_random_uuid(),
  actor_id           uuid not null references public.actors (id) on delete restrict,
  sanction_type      text not null check (sanction_type in ('TEMPORARY', 'PERMANENT')),
  reason_type        text not null
                       check (reason_type in ('REPORT_ACCUMULATION', 'ADMIN_ACTION', 'SYSTEM')),
  starts_at          timestamptz not null default now(),
  ends_at            timestamptz,
  created_by         uuid references public.actors (id) on delete set null,
  related_report_id  uuid references public.reports (id) on delete set null,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now(),
  constraint user_sanctions_period_by_type
    check ((sanction_type = 'TEMPORARY' and ends_at is not null and ends_at > starts_at)
        or (sanction_type = 'PERMANENT' and ends_at is null))
);
comment on column public.user_sanctions.reason_type is
  'REPORT_ACCUMULATION = 최근 30일 서로 다른 신고자 5회 이상 → 72시간 자동 임시정지 (§20.4)';
create index user_sanctions_active_idx
  on public.user_sanctions (actor_id, ends_at) where revoked_at is null;

create table public.session_feedback (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.chat_sessions (id) on delete restrict,
  from_member_id  uuid not null,
  to_member_id    uuid not null,
  emotion         text not null
                    check (emotion in ('기뻐요', '괜찮아요', '슬퍼요', '행복해요', '화나요')),
  trigger_type    text not null default 'NORMAL'
                    check (trigger_type in ('NORMAL', 'REPORTED', 'LEFT')),
  created_at      timestamptz not null default now(),
  constraint session_feedback_once_per_member unique (session_id, from_member_id),
  constraint session_feedback_not_self check (from_member_id <> to_member_id),
  constraint session_feedback_from_in_session
    foreign key (from_member_id, session_id)
    references public.chat_session_members (id, session_id) on delete restrict,
  constraint session_feedback_to_in_session
    foreign key (to_member_id, session_id)
    references public.chat_session_members (id, session_id) on delete restrict
);
comment on table public.session_feedback is
  '닉네임·회원ID 를 중복 저장하지 않는다. 상대는 세션 참여자 기준으로 식별한다 (§23)';

create table public.balance_games (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions (id) on delete cascade,
  topic       text not null,
  created_at  timestamptz not null default now()
);

create table public.balance_game_choices (
  game_id     uuid not null references public.balance_games (id) on delete cascade,
  member_id   uuid not null references public.chat_session_members (id) on delete cascade,
  choice      text not null check (choice in ('A', 'B')),
  created_at  timestamptz not null default now(),
  primary key (game_id, member_id)
);
comment on table public.balance_game_choices is
  '레거시 user1_choice/user2_choice 한 행 고정 구조를 참여자별 행으로 분리한다 (§24)';

create index balance_games_session_idx on public.balance_games (session_id);
