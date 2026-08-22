# supabase/migrations

`telepathy-v2-dev`(`gczftwqeulqzedcirqrr`)에 적용된 마이그레이션을 여기에 둔다.

## 현황 — 저장소 18건 (2026-08-23)

이 디렉터리가 생기기 전에 적용된 10건이 Supabase 에만 남아 있었으나,
2026-08-04 에 이력에서 내보내 채웠다. **이제 여기만으로 V2 스키마를 재현할 수 있다.**

| 버전             | 이름                                       | 내용                                                                                                      |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `20260727122241` | `v2_identity`                              | `actors` `users` `user_credentials` `guest_profiles` `nickname_histories` `phone_verification_challenges` |
| `20260727122652` | `v2_matching_chat`                         | `match_attempts` `match_rounds` `chat_sessions` `chat_session_members` `chat_messages` `words` 외 4       |
| `20260727125312` | `v2_report_feedback`                       | `reports` `report_reason_codes/items` `session_feedback` `balance_games/choices` `user_sanctions`         |
| `20260727125542` | `v2_payment_items`                         | `orders` `order_items` `payments` `payment_events` `products` `user_item_ledger` `daily_match_usage`      |
| `20260727125753` | `v2_content_notification`                  | `announcements(+comments)` `notifications` `presence_snapshots` `theme_campaigns` `trend_word_candidates` |
| `20260728061000` | `enable_rls_and_revoke_anon_privileges`    | 전 테이블 RLS + `anon` 권한 회수                                                                          |
| `20260728065746` | `v2_add_word_bookmarks_and_refund_account` | `word_bookmarks`, `payments` 환불계좌 컬럼                                                                |
| `20260729003910` | `add_record_login_failure_rpc`             | `record_login_failure()`                                                                                  |
| `20260729003957` | `revoke_anon_execute_on_login_failure_rpc` | 함수 권한 회수 + `alter default privileges`                                                               |
| `20260729013403` | `rename_user_id_to_actor_id`               | 컬럼명 통일 + 참조 함수 재생성                                                                            |
| `20260729015501` | `add_signup_user_rpc`                      | `signup_user()`                                                                                           |
| `20260729055827` | `add_reset_password_rpc`                   | `reset_password()`                                                                                        |
| `20260803070550` | `v2_item_purchase_and_consume`             | `item_balance()` `record_item_purchase()` `consume_item()`                                                |
| `20260803233207` | `phone_verification_rpcs_and_indexes`      | `record_challenge_attempt()` `mark_challenge_verified()`                                                  |
| `20260804083423` | `add_withdraw_user_rpc`                    | `withdraw_user()`                                                                                         |
| `20260804085643` | `add_change_nickname_rpc`                  | `change_nickname()`                                                                                       |
| `20260822165751` | `add_commit_match_rpc`                     | Redis 선점 결과를 V2 매칭·채팅 원장에 멱등 확정                                                           |

`20260729_grant_megaphone_payment.sql`은 Supabase 마이그레이션 시간 버전
규칙을 따르지 않는 초기 운영 SQL이다. 새 환경 적용 전에 버전 정리가
필요하며, 신규 파일은 14자리 UTC timestamp를 사용한다.

원본 조회는 이렇게 한다.

```sql
select version, name, statements from supabase_migrations.schema_migrations order by version;
```

### ⚠️ 이 마이그레이션만으로는 빈 DB 에 적용되지 않는다

두 가지가 이 디렉터리 밖에 있다.

| 빠진 것                     | 설명                                                                  |
| --------------------------- | --------------------------------------------------------------------- |
| `legacy_*` 테이블 생성      | `legacy_users` 등 16개. 어느 마이그레이션에도 `rename to` 가 없다     |
| 레거시 → V2 **데이터 변환** | `actors` 1,447 · `match_attempts` 16,565 등을 채운 로직이 이력에 없다 |

특히 `20260728065746` 은 `public.legacy_sp_payments` 를 참조하므로,
**`legacy_*` 가 먼저 존재하지 않으면 실패한다.** 순서대로 적용하려면
레거시 테이블을 `legacy_` 접두사로 옮기는 선행 단계가 필요하다.

### ⚠️ dev 의 데이터는 마스킹된 사본이다

`20260728065746` 주석에 명시돼 있다 — _"dev 환경의 값은 마스킹된 사본이며,
운영 Backfill 시 실제 값이 들어온다."_ **dev-v2 의 데이터를 운영으로 그대로
옮기면 안 된다.** 최소한 `payments.refund_bank`/`refund_account` 는 실제 값이 아니다.

### 이력에 없는 파일

`20260729_grant_megaphone_payment.sql` 은 DB 이력에 대응 버전이 없고
파일명도 `{version}_{name}` 규칙에 어긋난다(버전 8자리). 이 함수는
`20260803070550` 에서 `drop function` 으로 제거됐다 — **폐기된 파일이다.**

## 규칙

- **파일명은 DB 의 `version` 과 일치시킨다** — `{version}_{name}.sql`
  어긋나면 CLI 가 같은 마이그레이션을 다시 적용하려 든다
- **적용된 파일은 고치지 않는다.** 바꿔야 하면 새 마이그레이션을 추가한다
- 적용은 Supabase MCP(`apply_migration`) 또는 대시보드 SQL 에디터로 한다

## 함수를 추가할 때

**권한 회수를 잊지 않는다.** Postgres 는 새 함수에 `PUBLIC` 실행 권한을 자동으로 주고,
Supabase 는 그와 별개로 `anon`·`authenticated` 에 **명시적으로** `EXECUTE` 를 부여한다.

```sql
revoke all on function public.함수명(인자타입...) from public;
revoke execute on function public.함수명(인자타입...) from anon, authenticated;
grant execute on function public.함수명(인자타입...) to service_role;
```

`20260729003957` 에서 `alter default privileges` 를 걸어 두었으므로
**그 이후에 만든 함수는 자동으로 `anon`·`authenticated` 가 제외된다.**
다만 `PUBLIC` 기본 권한은 여전히 붙으므로 `revoke ... from public` 은 계속 필요하다.

## 컬럼을 rename 할 때

**세 가지가 자동으로 따라오지 않는다.**

|                                        | 따라오나 | 대응                              |
| -------------------------------------- | -------- | --------------------------------- |
| 인덱스·뷰                              | ✅ 자동  | —                                 |
| **FK 제약 이름**                       | ❌       | `alter table … rename constraint` |
| **`language sql`·`plpgsql` 함수 본문** | ❌       | 같은 마이그레이션에서 재생성      |

함수가 특히 위험하다. 본문을 **텍스트로 저장했다가 실행 시점에 해석**하므로
마이그레이션은 성공하고 **나중에 런타임에 터진다.**

바꾸기 전에 어떤 함수가 그 컬럼을 참조하는지 먼저 찾는다.

```sql
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public' and l.lanname in ('sql', 'plpgsql');
```

### 앱 코드 쪽 — 컴파일러가 다 잡아주지 않는다

생성 타입이 있어도 **`.eq()` 같은 필터의 컬럼명은 검사되지 않는다.**

| 지점                             | 검사 |
| -------------------------------- | ---- |
| `select` 문자열의 컬럼명         | ✅   |
| 결과 속성 접근 (`data.actor_id`) | ✅   |
| **`.eq('actor_id', …)` 필터**    | ❌   |

`20260729013403` 때 실제로 3곳 중 2곳만 컴파일러가 짚었다.
`createClient` 를 직접 쓰는 `scripts/` 는 제네릭이 없어 아예 검사 밖이다.

**rename 후에는 반드시 `scripts/check-login-flow.ts` 를 돌린다.**

관련: [Supabase 규약](../../docs/conventions/supabase.md) · TEL-12
