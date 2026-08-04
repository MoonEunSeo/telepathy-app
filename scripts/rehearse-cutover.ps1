# 운영 전환 리허설 — 백업본에 이행 SQL 전체를 적용해 본다.
#
# 운영·dev 어느 쪽에도 접속하지 않는다. 로컬 컨테이너 안에서만 벌어진다.
#
# 순서: 백업 복원 → 01(rename) → migrations 14건 → 02~07(이행)
#
# 실행: powershell -ExecutionPolicy Bypass -File scripts/rehearse-cutover.ps1

$ErrorActionPreference = 'Stop'

$CONTAINER = 'tel-rehearse'
$IMAGE     = 'public.ecr.aws/supabase/postgres:17.6.1.156'
$ROOT      = Split-Path $PSScriptRoot -Parent

# ---------- 최신 백업 ----------
$backup = Get-ChildItem (Join-Path $HOME 'backups/telepathy') -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $backup) { throw '백업이 없습니다. scripts/backup-prod-db.ps1 을 먼저 실행하세요.' }
Write-Host "백업: $($backup.FullName)`n"

# ---------- 컨테이너 ----------
try { docker rm -f $CONTAINER 2>$null | Out-Null } catch {}
Write-Host '컨테이너 기동...'
docker run --name $CONTAINER -e POSTGRES_PASSWORD=postgres -d $IMAGE | Out-Null
if ($LASTEXITCODE -ne 0) { throw '컨테이너 기동 실패' }

$ready = $false
foreach ($i in 1..60) {
  docker exec $CONTAINER pg_isready -U postgres -q 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $ready) { throw '컨테이너가 준비되지 않았습니다.' }

# pg_isready 가 통과해도 Supabase 이미지의 초기화 스크립트가 더 돌고 있다.
Start-Sleep -Seconds 10

# graphql 확장이 DDL 마다 이벤트 트리거를 때리는데, 초기화가 덜 끝난 상태면
# "could not open relation with OID" 로 복원이 깨진다.
# 리허설은 데이터 이관 검증이 목적이라 graphql 스키마 반영이 필요 없다.
# 소유자가 supabase_admin 이라 postgres 로는 끌 수 없다. 실패해도 진행한다
# (충분히 대기하면 트리거가 정상 동작하므로 복원 자체는 통과한다).
Write-Host '이벤트 트리거 비활성화 시도...'
docker exec $CONTAINER psql -U supabase_admin -d postgres -q -c @'
do $$
declare t record;
begin
  for t in select evtname from pg_event_trigger where evtenabled <> 'D' loop
    execute format('alter event trigger %I disable', t.evtname);
  end loop;
end $$;
'@
if ($LASTEXITCODE -ne 0) { Write-Host '     (건너뜀 — 권한 없음)' } else { Write-Host '     ok' }
$global:LASTEXITCODE = 0

# ---------- 적용 헬퍼 ----------
$script:step = 0
function Invoke-Sql([string]$label, [string]$path) {
  $script:step++
  $n = '{0:d2}' -f $script:step
  Write-Host ("[{0}] {1}" -f $n, $label)
  docker cp $path "${CONTAINER}:/tmp/step.sql" | Out-Null
  docker exec $CONTAINER psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -f /tmp/step.sql
  if ($LASTEXITCODE -ne 0) {
    Write-Host ("     ✗ 실패 — 여기서 멈췄습니다: {0}" -f $label)
    throw "리허설 중단: $label"
  }
  Write-Host '     ok'
}

# ---------- 1. 백업 복원 ----------
Invoke-Sql '백업 스키마'   (Join-Path $backup.FullName '02-schema.sql')
Invoke-Sql '백업 데이터'   (Join-Path $backup.FullName '03-data.sql')

# ---------- 2. rename ----------
Invoke-Sql '01-rename-legacy' (Join-Path $ROOT 'supabase/cutover/01-rename-legacy.sql')

# ---------- 3. V2 마이그레이션 ----------
# 파일명이 14자리 버전으로 시작하는 것만. 20260729_grant_megaphone_payment.sql 은
# 이력에 없는 폐기 파일이라 제외된다 (migrations/README.md 참조).
$migrations = Get-ChildItem (Join-Path $ROOT 'supabase/migrations') -Filter '*.sql' |
  Where-Object { $_.Name -match '^\d{14}_' } | Sort-Object Name
Write-Host "`nV2 마이그레이션 $($migrations.Count) 건`n"
foreach ($m in $migrations) { Invoke-Sql $m.BaseName $m.FullName }

# ---------- 4. 이행 ----------
Write-Host ''
foreach ($f in '02-identity', '03-matching-chat', '04-report-feedback',
                '05-payment-items', '06-content-bookmarks', '07-guest') {
  Invoke-Sql $f (Join-Path $ROOT "supabase/cutover/$f.sql")
}

# ---------- 5. 검증 ----------
Write-Host "`n=== 이관 결과 ===`n"
docker exec $CONTAINER psql -U postgres -d postgres -c @'
select 'actors(USER)'   as t, count(*) from actors where actor_type='USER'
union all select 'actors(GUEST)',  count(*) from actors where actor_type='GUEST'
union all select 'users',          count(*) from users
union all select 'user_credentials', count(*) from user_credentials
union all select 'guest_profiles',  count(*) from guest_profiles
union all select 'nickname_histories', count(*) from nickname_histories
union all select 'words',           count(*) from words
union all select 'match_rounds',    count(*) from match_rounds
union all select 'match_attempts',  count(*) from match_attempts
union all select 'chat_sessions',   count(*) from chat_sessions
union all select 'chat_session_members', count(*) from chat_session_members
union all select 'chat_messages',   count(*) from chat_messages
union all select 'reports',         count(*) from reports
union all select 'session_feedback', count(*) from session_feedback
union all select 'balance_games',   count(*) from balance_games
union all select 'orders',          count(*) from orders
union all select 'payments',        count(*) from payments
union all select 'payment_events',  count(*) from payment_events
union all select 'user_item_ledger', count(*) from user_item_ledger
union all select 'announcement_comments', count(*) from announcement_comments
union all select 'word_bookmarks',  count(*) from word_bookmarks;
'@

Write-Host "`n=== 보존율 (레거시 대비) ===`n"
docker exec $CONTAINER psql -U postgres -d postgres -c @'
select 'users' as domain,
       (select count(*) from legacy_users) as legacy,
       (select count(*) from users) as v2
union all select 'chat_messages',
       (select count(*) from legacy_chat_logs),
       (select count(*) from chat_messages)
union all select 'match(queue+log)',
       (select count(*) from legacy_telepathy_sessions_queue)
         + (select count(*) from legacy_telepathy_sessions_log),
       (select count(*) from match_attempts)
union all select 'reports',
       (select count(*) from legacy_reported_reports),
       (select count(*) from reports)
union all select 'feedback',
       (select count(*) from legacy_emotion_feedback),
       (select count(*) from session_feedback)
union all select 'payments',
       (select count(*) from legacy_sp_payments),
       (select count(*) from payments)
union all select 'comments',
       (select count(*) from legacy_comments),
       (select count(*) from announcement_comments);
'@

Write-Host "`n=== 무결성 ===`n"
docker exec $CONTAINER psql -U postgres -d postgres -c @'
select 'nickname 중복' as check, count(*) - count(distinct nickname) as bad from users
union all select 'actor 타입 혼선',
  (select count(*) from actors
    where (actor_type='GUEST' and legacy_user_id is not null)
       or (actor_type='USER'  and legacy_guest_id is not null))
union all select 'megaphone 잔액 불일치',
  (select count(*) from legacy_users l join actors a on a.legacy_user_id = l.id
    where coalesce(l.megaphone_count,0)
      <> (select coalesce(sum(quantity_delta),0) from user_item_ledger
           where actor_id = a.id and item_type='MEGAPHONE'))
union all select 'actor 없는 로그 id',
  (select count(*) from (
     select user_id as id from legacy_telepathy_sessions_queue where user_id is not null
     union select partner_id from legacy_telepathy_sessions_queue where partner_id is not null) o
   where not exists (select 1 from actors a where a.legacy_user_id = o.id));
'@

Write-Host "`n리허설 완료. 정리하려면: docker rm -f $CONTAINER"
