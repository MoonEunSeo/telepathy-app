-- 확성기·추가매칭 재화를 V2 모델로 옮긴다.
--
-- 레거시는 users.megaphone_count 카운터였다. V2 는 user_item_ledger 원장이다
-- (migration-plan.md — "잔액 직접 저장 금지"). 증감만 쌓고 합계로 읽는다.
--
-- 레거시 스키마를 참조하던 함수를 먼저 치운다. v2-dev 에서는 실행되지 않으며
-- (payments.user_id 없음) 생성만 성공해 동작하는 것처럼 보였다.
drop function if exists public.grant_megaphone_payment(uuid, text, text, integer, integer);

-- 잔액 = 원장 합계. 조회 지점이 여럿이라 한 곳에 둔다.
create or replace function public.item_balance(p_actor_id uuid, p_item_type text)
returns integer
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(sum(quantity_delta), 0)::integer
    from user_item_ledger
   where actor_id = p_actor_id
     and item_type = p_item_type;
$$;

-- 구매 지급 — orders · order_items · payments · payment_events · user_item_ledger
-- 다섯 테이블이 한 트랜잭션이어야 한다. 중간에 끊기면 "돈은 받고 미지급" 이 된다.
create or replace function public.record_item_purchase(
  p_actor_id     uuid,
  p_product_code text,
  p_event_key    text,
  p_paid_amount  integer,
  p_source       text default 'PORTONE'
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_product    products%rowtype;
  v_order_id   uuid;
  v_payment_id uuid;
  v_constraint text;
begin
  select * into v_product
    from products
   where product_code = p_product_code
     and is_active;

  if not found then
    raise exception 'UNKNOWN_PRODUCT';
  end if;

  -- 수량·금액은 상품표가 정한다. 앱이 보낸 금액은 대조용일 뿐 값으로 쓰지 않는다.
  if p_paid_amount is distinct from v_product.price then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  insert into orders (actor_id, status, total_amount)
       values (p_actor_id, 'PAID', v_product.price)
    returning id into v_order_id;

  insert into order_items (order_id, product_id, quantity, unit_amount)
       values (v_order_id, v_product.id, v_product.quantity, v_product.price);

  insert into payments (order_id, payment_method, provider, amount, status, paid_at)
       values (v_order_id, 'PG', p_source, v_product.price, 'PAID', now())
    returning id into v_payment_id;

  -- 멱등 지점. 레거시의 payments.imp_uid UNIQUE 가 여기로 옮겨왔다.
  -- 같은 결제가 두 번 들어오면 이 INSERT 가 터지고 위의 것이 전부 롤백된다.
  insert into payment_events (payment_id, event_key, source, processing_status)
       values (v_payment_id, p_event_key, p_source, 'MATCHED');

  insert into user_item_ledger
         (actor_id, item_type, quantity_delta, reason_type, reference_type, reference_id)
       values (p_actor_id, v_product.product_type, v_product.quantity,
               'PURCHASE', 'ORDER', v_order_id);

  return jsonb_build_object(
    'status',  'GRANTED',
    'balance', item_balance(p_actor_id, v_product.product_type)
  );

exception
  when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'payment_events_event_key_key' then
      return jsonb_build_object('status', 'DUPLICATE', 'balance', null);
    end if;
    raise;
end;
$$;

-- 사용 차감
create or replace function public.consume_item(
  p_actor_id  uuid,
  p_item_type text,
  p_quantity  integer default 1
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_balance integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- 원장은 "읽고 판단하고 쓴다" 라서 카운터의 `where count > 0` 같은 원자성이 없다.
  -- 직렬화하지 않으면 잔액 1로 두 요청이 동시에 성공해 잔액이 -1 이 된다.
  perform pg_advisory_xact_lock(hashtext(p_actor_id::text || ':' || p_item_type)::bigint);

  v_balance := item_balance(p_actor_id, p_item_type);

  if v_balance < p_quantity then
    return jsonb_build_object('status', 'INSUFFICIENT', 'balance', v_balance);
  end if;

  insert into user_item_ledger (actor_id, item_type, quantity_delta, reason_type)
       values (p_actor_id, p_item_type, -p_quantity, 'USE');

  return jsonb_build_object('status', 'CONSUMED', 'balance', v_balance - p_quantity);
end;
$$;

revoke all on function public.item_balance(uuid, text) from public;
revoke all on function public.record_item_purchase(uuid, text, text, integer, text) from public;
revoke all on function public.consume_item(uuid, text, integer) from public;

revoke execute on function public.item_balance(uuid, text) from anon, authenticated;
revoke execute on function public.record_item_purchase(uuid, text, text, integer, text) from anon, authenticated;
revoke execute on function public.consume_item(uuid, text, integer) from anon, authenticated;

grant execute on function public.item_balance(uuid, text) to service_role;
grant execute on function public.record_item_purchase(uuid, text, text, integer, text) to service_role;
grant execute on function public.consume_item(uuid, text, integer) to service_role;
