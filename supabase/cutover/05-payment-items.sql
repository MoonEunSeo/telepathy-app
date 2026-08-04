-- 운영 전환 5/N — 결제·아이템
--   legacy_sp_payments       → orders + payments
--   legacy_payment_webhooks  → payment_events
--   legacy_users.megaphone_count + legacy_megaphone_logs → user_item_ledger
--
-- 선행: 02-identity.sql
--
-- ── 상품 마스터가 없다 ────────────────────────────────────
-- 레거시에는 products 에 해당하는 테이블이 없고 name·amount 만 있다.
-- V2 product_type 은 MEGAPHONE·EXTRA_MATCH 두 가지인데 레거시에는
-- 단어세트(wordset_text) 결제도 섞여 있어 1:1 매핑이 성립하지 않는다.
-- 단어세트는 migration-plan.md 에서 제거 예정 기능이다.
--
-- 그래서 dev-v2 와 동일하게 order_items 를 만들지 않는다(dev 도 0건).
-- 금액·상태는 orders/payments 에 보존되므로 결제 이력 자체는 남는다.
--
-- ── 알려진 손실 ───────────────────────────────────────────
-- 1. order_items — 상품 매핑 불가 (위 사유)
-- 2. 단어세트 결제의 상품 정보 — wordset_text 는 legacy_sp_payments 에만 남는다
-- 3. legacy_payments(구 PG 결제, 운영 0건) — 대상 없음

begin;

-- ─────────────────────────────────────────────────────────
-- 1) orders
-- ─────────────────────────────────────────────────────────
insert into public.orders (id, actor_id, status, total_amount, created_at, updated_at)
select gen_random_uuid(),
       a.id,
       case
         when p.confirmed_at is not null then 'COMPLETED'
         when p.status ilike '%refund%'  then 'REFUNDED'
         when p.status ilike '%cancel%'  then 'CANCELLED'
         else 'PENDING'
       end,
       coalesce(p.amount, 0),
       coalesce(p.created_at, now()),
       coalesce(p.updated_at, p.created_at, now())
from public.legacy_sp_payments p
join public.actors a on a.legacy_user_id = p.user_id
where p.user_id is not null;

-- ─────────────────────────────────────────────────────────
-- 2) payments
-- 계좌이체가 1차 결제수단이었다 (§27.1).
-- legacy_sp_payment_id 로 원본을 되짚을 수 있게 남긴다.
-- 제약 payments_paid_needs_time — PAID 면 paid_at 이 있어야 한다.
-- ─────────────────────────────────────────────────────────
insert into public.payments (id, order_id, payment_method, provider, expected_depositor,
                             actual_depositor, amount, status, paid_at, created_at,
                             refund_bank, refund_account, legacy_sp_payment_id)
select gen_random_uuid(),
       o.id,
       'BANK_TRANSFER',
       null,
       p.expected_depositor,
       p.actual_depositor,
       coalesce(p.amount, 0),
       case
         when p.confirmed_at is not null then 'PAID'
         when p.status ilike '%refund%'  then 'REFUNDED'
         when p.status ilike '%fail%'    then 'FAILED'
         else 'PENDING'
       end,
       p.confirmed_at,
       coalesce(p.created_at, now()),
       p.refund_bank,
       p.refund_account,
       p.id
from public.legacy_sp_payments p
join public.actors a on a.legacy_user_id = p.user_id
join public.orders o on o.actor_id = a.id and o.created_at = coalesce(p.created_at, now())
where p.user_id is not null;

-- ─────────────────────────────────────────────────────────
-- 3) payment_events — 은행 알림 웹훅
-- event_key 는 not null unique 다. 레거시 id 를 그대로 쓴다.
-- ─────────────────────────────────────────────────────────
insert into public.payment_events (id, payment_id, event_key, source, raw_body,
                                   parsed_amount, parsed_sender, parsed_bank,
                                   processing_status, created_at)
select gen_random_uuid(),
       pay.id,
       w.id::text,
       coalesce(w.app, 'LEGACY'),
       w.raw_body,
       w.parsed_amount,
       w.parsed_sender,
       w.parsed_bank,
       case when w.matched_payment_id is not null then 'MATCHED' else 'UNMATCHED' end,
       coalesce(w.created_at, now())
from public.legacy_payment_webhooks w
left join public.payments pay on pay.legacy_sp_payment_id = w.matched_payment_id;

-- ─────────────────────────────────────────────────────────
-- 4) user_item_ledger — 확성기 잔액을 원장으로 편다
--
-- 레거시는 users.megaphone_count 카운터였다. V2 는 증감 원장이고
-- 잔액은 합계로 읽는다 ("잔액 직접 저장 금지").
--
-- 사용 이력(megaphone_logs)을 USE 로, 현재 잔액을 PURCHASE 로 넣으면
-- 합계가 레거시 잔액과 같아진다:  (사용분 + 잔액) - 사용분 = 잔액
--
-- dev-v2 는 이 테이블이 0건이다. 여기서는 잔액을 보존한다.
-- ─────────────────────────────────────────────────────────

-- 4-1) 사용 이력
insert into public.user_item_ledger (id, actor_id, item_type, quantity_delta,
                                     reason_type, reference_type, created_at)
select gen_random_uuid(), a.id, 'MEGAPHONE', -1, 'USE', 'LEGACY_MEGAPHONE_LOG',
       coalesce(m.created_at at time zone 'UTC', now())
from public.legacy_megaphone_logs m
join public.actors a on a.legacy_user_id = m.user_id
where m.user_id is not null;

-- 4-2) 지급분 = 현재 잔액 + 사용 횟수 (합계가 현재 잔액이 되도록)
insert into public.user_item_ledger (id, actor_id, item_type, quantity_delta,
                                     reason_type, reference_type, created_at)
select gen_random_uuid(), a.id, 'MEGAPHONE',
       coalesce(l.megaphone_count, 0) + coalesce(u.used, 0),
       'ADMIN_GRANT', 'LEGACY_BACKFILL',
       coalesce(l.created_at at time zone 'UTC', now())
from public.legacy_users l
join public.actors a on a.legacy_user_id = l.id
left join (
  select user_id, count(*) as used
  from public.legacy_megaphone_logs
  where user_id is not null
  group by user_id
) u on u.user_id = l.id
-- quantity_delta <> 0 제약. 잔액도 사용도 없는 사용자는 넣지 않는다.
where coalesce(l.megaphone_count, 0) + coalesce(u.used, 0) > 0;

commit;

-- ─────────────────────────────────────────────────────────
-- 검증
-- ─────────────────────────────────────────────────────────
--   select (select count(*) from orders) as orders,               -- legacy_sp_payments 131 중
--          (select count(*) from payments) as payments,
--          (select count(*) from payment_events) as events,       -- legacy 129
--          (select count(*) from user_item_ledger) as ledger;
--
-- 확성기 잔액이 레거시와 같은가 (0 이어야 한다)
--   select count(*) from legacy_users l
--   join actors a on a.legacy_user_id = l.id
--   where coalesce(l.megaphone_count, 0)
--         <> (select coalesce(sum(quantity_delta), 0) from user_item_ledger
--             where actor_id = a.id and item_type = 'MEGAPHONE');
