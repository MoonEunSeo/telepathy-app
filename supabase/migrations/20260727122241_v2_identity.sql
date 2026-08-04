-- ERD V2 / Phase 1 — 신원 도메인 (Actor·회원·인증·게스트)
-- 근거: Linear TEL-6 §9~§11, §34

create table public.actors (
  id                    uuid primary key default gen_random_uuid(),
  actor_type            text not null check (actor_type in ('USER', 'GUEST')),
  status                text not null default 'ACTIVE'
                          check (status in ('ACTIVE', 'SUSPENDED', 'DELETED', 'MERGED')),
  merged_into_actor_id  uuid references public.actors (id) on delete set null,
  created_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  legacy_user_id        uuid,
  legacy_guest_id       uuid,
  constraint actors_no_self_merge
    check (merged_into_actor_id is null or merged_into_actor_id <> id),
  constraint actors_legacy_type_match
    check (
      (actor_type = 'USER'  and legacy_guest_id is null) or
      (actor_type = 'GUEST' and legacy_user_id  is null)
    )
);

comment on table public.actors is '회원·게스트·삭제된 과거 사용자를 아우르는 공통 신원 식별자';
comment on column public.actors.status is 'DELETED = 프로필은 없고 활동 이력만 남은 orphan 포함';
comment on column public.actors.legacy_user_id is '레거시 users.id (Backfill 대조용, 이전 완료 후 제거 검토)';

create unique index actors_legacy_user_id_key
  on public.actors (legacy_user_id) where legacy_user_id is not null;
create unique index actors_legacy_guest_id_key
  on public.actors (legacy_guest_id) where legacy_guest_id is not null;

create index actors_actor_type_status_idx on public.actors (actor_type, status);
create index actors_merged_into_idx
  on public.actors (merged_into_actor_id) where merged_into_actor_id is not null;

create table public.users (
  actor_id       uuid primary key references public.actors (id) on delete restrict,
  phone          text not null unique,
  nickname       text not null unique,
  gender         text check (gender in ('남성', '여성')),
  birthdate      date,
  real_name      text,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);

comment on table public.users is '회원 프로필. 인증 정보는 user_credentials 로 분리한다';
comment on column public.users.nickname is '현재 닉네임(전체 유니크). 과거 시점 닉네임은 chat_session_members.nickname_snapshot';

create index users_nickname_idx on public.users (nickname);

create table public.user_credentials (
  user_id               uuid primary key references public.users (actor_id) on delete cascade,
  username              text not null unique,
  password_hash         text not null,
  password_algorithm    text not null default 'bcrypt'
                          check (password_algorithm in ('bcrypt', 'argon2id')),
  failed_attempt_count  integer not null default 0 check (failed_attempt_count >= 0),
  locked_until          timestamptz,
  password_changed_at   timestamptz,
  created_at            timestamptz not null default now()
);

comment on column public.user_credentials.password_algorithm is 'bcrypt(레거시) → 로그인 성공 시 argon2id 로 재해시 (§8.2)';

create table public.guest_profiles (
  actor_id          uuid primary key references public.actors (id) on delete cascade,
  guest_token_hash  text,
  nickname          text,
  last_seen_at      timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

comment on column public.guest_profiles.guest_token_hash is '레거시 게스트는 복구 토큰이 없어 NULL 로 이전된다';
comment on column public.guest_profiles.nickname is '레거시 게스트 닉네임은 활동 로그의 스냅샷에서 복원한다';

create table public.nickname_histories (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid not null references public.actors (id) on delete cascade,
  nickname       text not null,
  started_at     timestamptz not null,
  ended_at       timestamptz,
  change_reason  text not null default 'USER_CHANGE'
                   check (change_reason in ('SIGNUP_AUTO', 'USER_CHANGE', 'ADMIN_CHANGE', 'SYSTEM')),
  created_at     timestamptz not null default now(),
  constraint nickname_histories_period_valid
    check (ended_at is null or ended_at >= started_at)
);

comment on column public.nickname_histories.change_reason is 'SIGNUP_AUTO = 가입 시 랜덤 부여';

create index nickname_histories_actor_started_idx
  on public.nickname_histories (actor_id, started_at desc);
create index nickname_histories_nickname_idx on public.nickname_histories (nickname);

create table public.phone_verification_challenges (
  id               uuid primary key default gen_random_uuid(),
  phone            text not null,
  purpose          text not null
                     check (purpose in ('SIGNUP', 'ACCOUNT_RECOVERY', 'PHONE_CHANGE')),
  code_hash        text not null,
  attempt_count    integer not null default 0 check (attempt_count >= 0),
  expires_at       timestamptz not null,
  verified_at      timestamptz,
  consumed_at      timestamptz,
  request_ip_hash  text,
  created_at       timestamptz not null default now(),
  constraint phone_verification_consumed_requires_verified
    check (consumed_at is null or verified_at is not null)
);

comment on table public.phone_verification_challenges is '인증번호는 해시로만 저장한다. 서버 메모리 저장 금지 (§11)';

create index phone_verification_phone_created_idx
  on public.phone_verification_challenges (phone, created_at desc);
