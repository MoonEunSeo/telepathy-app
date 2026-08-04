# 백업 복원 검증 — Supabase 이미지에 실제로 복원해 manifest 와 행 수를 대조한다.
#
# 떠본 적 없는 백업은 백업이 아니다. 운영·dev 어느 쪽에도 쓰기를 하지 않는다.
#
# 순정 postgres 이미지를 쓰면 안 된다. 다음이 전부 걸린다.
#   - extensions 스키마 없음 (Supabase 가 기본 제공하는 스키마다)
#   - anon / authenticated / service_role 롤 없음 → GRANT 실패
#   - PG 15 에는 transaction_timeout 파라미터가 없음 (PG 17 에서 추가됐다)
#
# 실행:
#   powershell -ExecutionPolicy Bypass -File scripts/verify-backup-restore.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/verify-backup-restore.ps1 -BackupDir "경로"

param(
  [string]$BackupDir,
  [string]$Image = 'public.ecr.aws/supabase/postgres:17.6.1.156'
)

$ErrorActionPreference = 'Stop'
$CONTAINER = 'tel-restore-test'

# ---------- 대상 백업 결정 ----------
if (-not $BackupDir) {
  $latest = Get-ChildItem (Join-Path $HOME 'backups/telepathy') -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
  if (-not $latest) { throw '백업 디렉터리를 찾지 못했습니다. 먼저 backup-prod-db.ps1 을 실행하세요.' }
  $BackupDir = $latest.FullName
}
if (-not (Test-Path $BackupDir)) { throw "백업 디렉터리가 없습니다: $BackupDir" }
Write-Host "검증 대상: $BackupDir`n"

$schemaFile = Join-Path $BackupDir '02-schema.sql'
$dataFile   = Join-Path $BackupDir '03-data.sql'
foreach ($f in @($schemaFile, $dataFile)) {
  if (-not (Test-Path $f)) { throw "필수 파일이 없습니다: $f" }
}

# ---------- 컨테이너 기동 ----------
try { docker rm -f $CONTAINER 2>$null | Out-Null } catch {}

Write-Host "컨테이너 기동 ($Image)..."
docker run --name $CONTAINER -e POSTGRES_PASSWORD=postgres -d $Image | Out-Null
if ($LASTEXITCODE -ne 0) { throw '컨테이너 기동 실패' }

# Supabase 이미지는 초기화 스크립트가 많아 순정보다 오래 걸린다
Write-Host '준비 대기 중...'
$ready = $false
foreach ($i in 1..60) {
  docker exec $CONTAINER pg_isready -U postgres -q 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $ready) { throw '컨테이너가 120초 안에 준비되지 않았습니다.' }

# ---------- 복원 ----------
# 롤: 이미지에 이미 있는 롤과 충돌할 수 있어 중단시키지 않는다
$roleFile = Join-Path $BackupDir '01-roles.sql'
if (Test-Path $roleFile) {
  Write-Host '01-roles.sql 적용 (충돌 에러는 무시)...'
  docker cp $roleFile "${CONTAINER}:/tmp/roles.sql" | Out-Null
  docker exec $CONTAINER psql -U postgres -d postgres -f /tmp/roles.sql | Out-Null
}

Write-Host '02-schema.sql 복원...'
docker cp $schemaFile "${CONTAINER}:/tmp/schema.sql" | Out-Null
docker exec $CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/schema.sql | Out-Null
if ($LASTEXITCODE -ne 0) { throw '스키마 복원 실패 — 백업이 온전하지 않습니다.' }

Write-Host '03-data.sql 복원...'
docker cp $dataFile "${CONTAINER}:/tmp/data.sql" | Out-Null
docker exec $CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/data.sql | Out-Null
if ($LASTEXITCODE -ne 0) { throw '데이터 복원 실패 — 백업이 온전하지 않습니다.' }

# ---------- 대조 ----------
# n_live_tup 은 통계라 신뢰하지 않는다. 실제 count(*) 를 센다.
$sql = @'
select relname || '=' || (xpath('/row/c/text()',
         query_to_xml(format('select count(*) c from public.%I', relname), false, true, '')))[1]::text
from pg_stat_user_tables where schemaname = 'public';
'@
$raw = docker exec $CONTAINER psql -U postgres -d postgres -t -A -c $sql
if ($LASTEXITCODE -ne 0) { throw '행 수 조회 실패' }

$actual = @{}
foreach ($line in $raw) {
  if ($line -match '^(.+)=(\d+)$') { $actual[$Matches[1].Trim()] = [int]$Matches[2] }
}

$manifest = Join-Path $BackupDir 'manifest.txt'
if (-not (Test-Path $manifest)) {
  Write-Host "`nmanifest.txt 가 없어 대조를 건너뜁니다. 복원된 행 수:"
  $actual.GetEnumerator() | Sort-Object Value -Descending | Format-Table Name, Value -AutoSize
  Write-Host "정리하려면: docker rm -f $CONTAINER"
  return
}

Write-Host "`n덤프 대비 복원 결과:"
$mismatch = 0
$rows = foreach ($line in Get-Content $manifest) {
  $parts = $line -split "`t"
  if ($parts.Count -ne 2) { continue }
  # "public"."users" / public.users 어느 형태든 users 로 맞춘다
  $table = $parts[0] -replace '"', '' -replace '^public\.', ''
  $want  = [int]$parts[1]
  $got   = if ($actual.ContainsKey($table)) { $actual[$table] } else { -1 }
  # PowerShell 5.1 은 해시테이블 리터럴 안에서 if 표현식을 쓸 수 없다
  $okText = 'MISMATCH'
  if ($got -eq $want) { $okText = 'OK' } else { $mismatch++ }
  [pscustomobject]@{
    table    = $table
    dump     = $want
    restored = $got
    ok       = $okText
  }
}
$rows | Sort-Object dump -Descending | Format-Table -AutoSize

$tableCount = (docker exec $CONTAINER psql -U postgres -d postgres -t -A `
  -c "select count(*) from pg_tables where schemaname='public';")
Write-Host "복원된 public 테이블: $tableCount 개"

if ($mismatch -gt 0) {
  throw "$mismatch 개 테이블의 행 수가 일치하지 않습니다. 백업을 신뢰할 수 없습니다."
}
Write-Host "`n검증 통과 — 모든 테이블의 행 수가 일치합니다."
Write-Host "정리하려면: docker rm -f $CONTAINER"
