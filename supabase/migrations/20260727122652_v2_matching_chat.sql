-- ERD V2 / Phase 2 — 매칭·채팅 도메인 (TEL-6 §13.4, §14, §15, §17, §18)

create table public.words (
  id           uuid primary key default gen_random_uuid(),
  text         text not null unique,
  category_id  uuid,
  source_type  text not null default 'LEGACY'
                 check (source_type in ('LEGACY', 'MANUAL', 'AI_TREND', 'SEASONAL')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
comment on table public.words is '매칭에 쓰이는 단어 마스터. 레거시는 각 테이블에 word 텍스트가 중복 저장돼 있었다';
create index words_active_idx on public.words (is_active) where is_active;

create table public.word_sets (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  set_type     text not null default 'DEFAULT'
                 check (set_type in ('DEFAULT', 'AI_TREND', 'SEASONAL')),
  status       text not null default 'DRAFT'
                 check (status in ('DRAFT', 'ACTIVE', 'EXPIRED')),
  valid_from   timestamptz,
  valid_until  timestamptz,
  created_at   timestamptz not null default now(),
  constraint word_sets_validity_period
    check (valid_from is null or valid_until is null or valid_until >= valid_from)
);

create table public.word_set_items (
  word_set_id    uuid not null references public.word_sets (id) on delete cascade,
  word_id        uuid not null references public.words (id) on delete restrict,
  display_order  integer not null default 0,
  primary key (word_set_id, word_id)
);

create table public.match_rounds (
  id           uuid primary key default gen_random_uuid(),
  round_key    bigint not null unique,
  word_set_id  uuid references public.word_sets (id) on delete set null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'ENDED'
                 check (status in ('SCHEDULED', 'ACTIVE', 'ENDED')),
  created_at   timestamptz not null default now(),
  constraint match_rounds_period_valid check (ends_at > starts_at)
);
comment on column public.match_rounds.round_key is '레거시 round 값(epoch ms ÷ 15000)을 그대로 사용한다';
create index match_rounds_starts_at_idx on public.match_rounds (starts_at desc);
create index match_rounds_status_idx on public.match_rounds (status) where status <> 'ENDED';

create table public.chat_sessions (
  id               uuid primary key default gen_random_uuid(),
  round_id         uuid references public.match_rounds (id) on delete restrict,
  word_id          uuid references public.words (id) on delete restrict,
  status           text not null default 'ENDED'
                     check (status in ('READY', 'ACTIVE', 'RECONNECTING', 'ENDED')),
  matched_at       timestamptz,
  chat_started_at  timestamptz,
  ended_at         timestamptz,
  end_reason       text
                     check (end_reason in ('NORMAL', 'LEFT', 'DISCONNECTED',
                                           'REPORTED', 'ADMIN', 'TIMEOUT', 'UNKNOWN')),
  legacy_room_id   text,
  created_at       timestamptz not null default now(),
  constraint chat_sessions_ended_has_reason
    check (status <> 'ENDED' or ended_at is null or end_reason is not null)
);
comment on column public.chat_sessions.chat_started_at is '양쪽이 모두 입장한 시점 (§14.3 채팅 시작 정의)';
comment on column public.chat_sessions.legacy_room_id is '레거시 room_id 원값. 이전 완료·검증 후 제거 검토';
create unique index chat_sessions_legacy_room_id_key
  on public.chat_sessions (legacy_room_id) where legacy_room_id is not null;
create index chat_sessions_round_idx on public.chat_sessions (round_id);
create index chat_sessions_status_idx on public.chat_sessions (status) where status <> 'ENDED';

create table public.match_attempts (
  id                  uuid primary key default gen_random_uuid(),
  actor_id            uuid not null references public.actors (id) on delete restrict,
  round_id            uuid not null references public.match_rounds (id) on delete restrict,
  word_id             uuid references public.words (id) on delete restrict,
  status              text not null default 'WAITING'
                        check (status in ('WAITING', 'MATCHED', 'CANCELLED', 'EXPIRED')),
  socket_id           text,
  matched_session_id  uuid references public.chat_sessions (id) on delete set null,
  queued_at           timestamptz not null default now(),
  finished_at         timestamptz,
  legacy_source       text check (legacy_source in ('QUEUE', 'LOG', 'SESSIONS')),
  legacy_id           text,
  created_at          timestamptz not null default now(),
  constraint match_attempts_matched_needs_session
    check (status <> 'MATCHED' or matched_session_id is not null)
);
comment on table public.match_attempts is
  '레거시 telepathy_sessions(구 REST) + _queue + _log 를 통합한 매칭 시도 원장';
create unique index match_attempts_one_active_per_actor
  on public.match_attempts (actor_id)
  where status in ('WAITING', 'MATCHED') and finished_at is null;
create unique index match_attempts_legacy_key
  on public.match_attempts (legacy_source, legacy_id)
  where legacy_source is not null and legacy_id is not null;
create index match_attempts_round_word_status_idx
  on public.match_attempts (round_id, word_id, status);
create index match_attempts_actor_idx on public.match_attempts (actor_id, queued_at desc);
create index match_attempts_session_idx
  on public.match_attempts (matched_session_id) where matched_session_id is not null;

create table public.chat_session_members (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.chat_sessions (id) on delete cascade,
  actor_id           uuid not null references public.actors (id) on delete restrict,
  nickname_snapshot  text,
  joined_at          timestamptz,
  left_at            timestamptz,
  leave_reason       text
                       check (leave_reason in ('NORMAL', 'LEFT', 'DISCONNECTED',
                                               'REPORTED', 'ADMIN', 'TIMEOUT', 'UNKNOWN')),
  created_at         timestamptz not null default now(),
  constraint chat_session_members_unique_actor unique (session_id, actor_id),
  constraint chat_session_members_period_valid
    check (left_at is null or joined_at is null or left_at >= joined_at)
);
create index chat_session_members_actor_idx on public.chat_session_members (actor_id);

create table public.chat_messages (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.chat_sessions (id) on delete cascade,
  sender_member_id   uuid not null references public.chat_session_members (id) on delete restrict,
  client_message_id  text,
  message            text not null,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
comment on column public.chat_messages.client_message_id is
  '§17.2 중복 전송 방지. 레거시 이전분은 NULL';
create unique index chat_messages_sender_client_key
  on public.chat_messages (sender_member_id, client_message_id)
  where client_message_id is not null;
create index chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at);

create table public.session_reconnect_grants (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.chat_sessions (id) on delete cascade,
  member_id      uuid not null references public.chat_session_members (id) on delete cascade,
  grant_type     text not null default 'DEFAULT'
                   check (grant_type in ('DEFAULT', 'SHARE_REWARD')),
  share_channel  text,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);
create unique index session_reconnect_grants_one_share_reward
  on public.session_reconnect_grants (session_id, member_id)
  where grant_type = 'SHARE_REWARD';
create index session_reconnect_grants_member_idx
  on public.session_reconnect_grants (member_id);

create table public.share_events (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid not null references public.actors (id) on delete restrict,
  session_id    uuid references public.chat_sessions (id) on delete set null,
  channel       text not null,
  event_status  text not null default 'REQUESTED'
                  check (event_status in ('REQUESTED', 'COMPLETED', 'FAILED')),
  created_at    timestamptz not null default now()
);
create index share_events_actor_idx on public.share_events (actor_id, created_at desc);
