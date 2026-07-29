# supabase/migrations

`telepathy-v2-dev`(`gczftwqeulqzedcirqrr`)에 적용된 마이그레이션을 여기에 둔다.

## ⚠️ 이 디렉터리는 완전하지 않다

2026-07-29 기준 **DB 에는 10건, 여기에는 3건**만 있다.

| 버전 | 이름 | 여기 있나 |
|---|---|---|
| `20260727122241` | `v2_identity` | ❌ |
| `20260727122652` | `v2_matching_chat` | ❌ |
| `20260727125312` | `v2_report_feedback` | ❌ |
| `20260727125542` | `v2_payment_items` | ❌ |
| `20260727125753` | `v2_content_notification` | ❌ |
| `20260728061000` | `enable_rls_and_revoke_anon_privileges` | ❌ |
| `20260728065746` | `v2_add_word_bookmarks_and_refund_account` | ❌ |
| `20260729003910` | `add_record_login_failure_rpc` | ✅ |
| `20260729003957` | `revoke_anon_execute_on_login_failure_rpc` | ✅ |
| `20260729013403` | `rename_user_id_to_actor_id` | ✅ |

앞의 7건은 이 디렉터리가 생기기 전에 적용됐고 **Supabase 에만 남아 있다.**
TEL-11 에서 작성됐으나 어느 브랜치에도 커밋되지 않았다.

**그래서 이 디렉터리만 보고 스키마를 재현할 수 없다.** 나머지 7건을 내보내
채우는 것이 남은 과제다. 원본은 Supabase 의 마이그레이션 이력에 있다.

```sql
select version, name, statements from supabase_migrations.schema_migrations order by version;
```

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

| | 따라오나 | 대응 |
|---|---|---|
| 인덱스·뷰 | ✅ 자동 | — |
| **FK 제약 이름** | ❌ | `alter table … rename constraint` |
| **`language sql`·`plpgsql` 함수 본문** | ❌ | 같은 마이그레이션에서 재생성 |

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

| 지점 | 검사 |
|---|---|
| `select` 문자열의 컬럼명 | ✅ |
| 결과 속성 접근 (`data.actor_id`) | ✅ |
| **`.eq('actor_id', …)` 필터** | ❌ |

`20260729013403` 때 실제로 3곳 중 2곳만 컴파일러가 짚었다.
`createClient` 를 직접 쓰는 `scripts/` 는 제네릭이 없어 아예 검사 밖이다.

**rename 후에는 반드시 `scripts/check-login-flow.ts` 를 돌린다.**

관련: [Supabase 규약](../../docs/conventions/supabase.md) · TEL-12
