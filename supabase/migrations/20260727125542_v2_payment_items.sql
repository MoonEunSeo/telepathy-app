-- ERD V2 / Phase 4 — 결제·아이템·매칭 제한 (TEL-6 §19, §27~§31)

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  product_code  text not null unique,
  product_type  text not null check (product_type in ('MEGAPHONE', 'EXTRA_MATCH')),
  name          text not null,
  quantity      integer not null check (quantity > 0),
  price         integer not null check (price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
comment on column public.products.price is
  '서버 측 가격표. 레거시는 가격이 화면에만 있어 결제 검증이 동어반복이었다';

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.actors (id) on delete restrict,
  status        text not null default 'PENDING'
                  check (status in ('PENDING', 'PAID', 'ITEM_PENDING', 'COMPLETED',
                                    'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  total_amount  integer not null default 0 check (total_amount >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on column public.orders.status is
  'ITEM_PENDING = 결제는 됐으나 아이템 지급이 실패해 재처리 대기 중 (§30)';
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete restrict,
  quantity     integer not null check (quantity > 0),
  unit_amount  integer not null check (unit_amount >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete restrict,
  payment_method       text not null check (payment_method in ('BANK_TRANSFER', 'PG')),
  provider             text,
  expected_depositor   text,
  actual_depositor     text,
  amount               integer not null check (amount >= 0),
  status               text not null default 'PENDING'
                         check (status in ('PENDING', 'PAID', 'FAILED',
                                           'REFUNDED', 'PARTIALLY_REFUNDED')),
  paid_at              timestamptz,
  failed_at            timestamptz,
  created_at           timestamptz not null default now(),
  legacy_sp_payment_id uuid,
  constraint payments_paid_needs_time
    check (status <> 'PAID' or paid_at is not null)
);
create unique index payments_legacy_key
  on public.payments (legacy_sp_payment_id) where legacy_sp_payment_id is not null;
create index payments_status_created_idx on public.payments (status, created_at desc);
create index payments_order_idx on public.payments (order_id);

create table public.payment_events (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid references public.payments (id) on delete set null,
  event_key          text not null unique,
  source             text not null,
  raw_body           jsonb,
  parsed_amount      bigint,
  parsed_sender      text,
  parsed_bank        text,
  processing_status  text not null default 'RECEIVED'
                       check (processing_status in ('RECEIVED', 'MATCHED', 'UNMATCHED',
                                                    'DUPLICATE', 'FAILED')),
  created_at         timestamptz not null default now()
);
comment on column public.payment_events.event_key is
  '동일 은행 알림이 반복 수신되어도 한 번만 처리하기 위한 멱등 키 (§28)';
create index payment_events_status_idx on public.payment_events (processing_status, created_at desc);
create index payment_events_payment_idx
  on public.payment_events (payment_id) where payment_id is not null;

create table public.user_item_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.actors (id) on delete restrict,
  item_type       text not null check (item_type in ('MEGAPHONE', 'EXTRA_MATCH')),
  quantity_delta  integer not null check (quantity_delta <> 0),
  reason_type     text not null
                    check (reason_type in ('PURCHASE', 'USE', 'REFUND',
                                           'ADMIN_GRANT', 'ADMIN_REVOKE')),
  reference_type  text,
  reference_id    uuid,
  created_at      timestamptz not null default now()
);
comment on table public.user_item_ledger is
  '아이템 잔액의 유일한 원본. 잔액은 quantity_delta 합계로 계산한다 (§29)';
create index user_item_ledger_user_item_idx
  on public.user_item_ledger (user_id, item_type, created_at desc);
create index user_item_ledger_reference_idx
  on public.user_item_ledger (reference_type, reference_id);

create or replace function public.user_item_balance(p_user_id uuid, p_item_type text)
returns integer language sql stable as $fn$
  select coalesce(sum(quantity_delta), 0)::integer
  from public.user_item_ledger
  where user_id = p_user_id and item_type = p_item_type;
$fn$;

create table public.daily_match_usage (
  id                uuid primary key default gen_random_uuid(),
  actor_id          uuid not null references public.actors (id) on delete cascade,
  usage_date        date not null,
  free_match_count  integer not null default 0
                      check (free_match_count >= 0 and free_match_count <= 5),
  paid_match_count  integer not null default 0 check (paid_match_count >= 0),
  updated_at        timestamptz not null default now(),
  constraint daily_match_usage_unique unique (actor_id, usage_date)
);
comment on column public.daily_match_usage.free_match_count is
  '하루 무료 매칭 5회 상한 (§19). 초과분은 user_item_ledger 의 EXTRA_MATCH 로 처리한다';
