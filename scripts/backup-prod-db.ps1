# 운영 Supabase DB 백업 — 롤 / 스키마 / 데이터 3분할 논리 덤프
#
# Free 플랜은 Supabase 자동 백업이 없다 (Pro 이상만 제공).
# 공식 문서가 Free 플랜에 권장하는 CLI db dump 방식이다.
# pg_dump 는 Supabase CLI 가 Docker 컨테이너로 띄운다.
#
# 사전 조건
#   1. Docker Desktop 실행 중
#   2. ~/backups/telepathy/pgurl.txt 에 운영 Session pooler 연결 문자열 한 줄
#      - 대시보드 → Telepathy → Connect → Direct 탭 → Session pooler (포트 5432)
#      - Transaction pooler(6543)는 prepared statement 미지원이라 pg_dump 가 실패한다
#      - Free 플랜은 direct connection 이 IPv6 전용이라 반드시 pooler 를 써야 한다
#      - 비밀번호의 특수문자는 percent-encoding 필요 (/ 나 # 가 있으면 URL 파싱이 깨진다)
#
# 실행: powershell -ExecutionPolicy Bypass -File scripts/backup-prod-db.ps1

$ErrorActionPreference = 'Stop'

$PROD_REF    = 'brjfsvjutgirenreaofv'   # 운영 Telepathy
$DEV_REF     = 'gczftwqeulqzedcirqrr'   # dev-v2 — 오지정 방지용
$BACKUP_ROOT = Join-Path $HOME 'backups/telepathy'
$URL_FILE    = Join-Path $BACKUP_ROOT 'pgurl.txt'

# ---------- 연결 문자열 로드 ----------
if (-not (Test-Path $URL_FILE)) { throw "pgurl.txt 가 없습니다: $URL_FILE" }

# 메모장 저장 시 붙는 BOM·개행을 제거한다
$dbUrl = (Get-Content $URL_FILE -Raw).Trim([char]0xFEFF, ' ', "`r", "`n", "`t")
if (-not $dbUrl) { throw 'pgurl.txt 가 비어 있습니다.' }

# ---------- 안전장치: 반드시 운영을 가리켜야 한다 ----------
if ($dbUrl -match $DEV_REF)     { throw "dev-v2($DEV_REF) 를 가리킵니다. 운영이 아니므로 중단합니다." }
if ($dbUrl -notmatch $PROD_REF) { throw "운영 ref($PROD_REF) 를 찾지 못했습니다. 중단합니다." }
if ($dbUrl -notmatch '^postgres(ql)?://') { throw 'postgresql:// 로 시작하지 않습니다.' }
if ($dbUrl -notmatch ':5432/') { throw '포트가 5432 가 아닙니다. Session pooler 문자열인지 확인하세요.' }

# @ 가 2개 이상이면 비밀번호의 특수문자가 인코딩되지 않은 것이다
$atCount = ($dbUrl.ToCharArray() | Where-Object { $_ -eq '@' }).Count
if ($atCount -ne 1) { throw "@ 가 $atCount 개입니다. 비밀번호를 percent-encoding 하세요." }

# ---------- 비밀번호 마스킹 ----------
# CLI 가 연결 실패 시 에러에 연결 문자열을 그대로 뱉을 수 있어, 출력 전에 가린다.
$script:secret = $null
if ($dbUrl -match '://[^:/@]+:([^@]+)@') { $script:secret = $Matches[1] }

function Hide-Secret([string]$t) {
  if ([string]::IsNullOrEmpty($t)) { return '' }
  $r = $t -replace '://[^:/@\s]+:[^@\s]+@', '://***:***@'
  if ($script:secret) { $r = $r.Replace($script:secret, '***') }
  return $r
}

# ---------- 출력 디렉터리 (프로젝트 밖) ----------
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dir   = Join-Path $BACKUP_ROOT $stamp
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Host "백업 위치: $dir`n"

# ---------- 덤프 실행 ----------
function Invoke-Dump([string]$label, [string[]]$extra, [string]$outName) {
  $outPath = Join-Path $dir $outName
  $logOut  = Join-Path $dir "$outName.log"
  $logErr  = Join-Path $dir "$outName.err"
  $argList = @('--yes', 'supabase@2', 'db', 'dump', '--db-url', $dbUrl) + $extra + @('-f', $outPath)

  Write-Host "[$label] 덤프 중..."
  $p = Start-Process -FilePath 'npx.cmd' -ArgumentList $argList -NoNewWindow -Wait -PassThru `
         -RedirectStandardOutput $logOut -RedirectStandardError $logErr

  if ($p.ExitCode -ne 0) {
    $err = ''
    if (Test-Path $logErr) { $err = Hide-Secret (Get-Content $logErr -Raw) }
    Write-Host "[$label] 실패 (exit $($p.ExitCode))"
    Write-Host $err
    throw "$label 덤프 실패"
  }

  # 로그에 연결 문자열이 남지 않도록 마스킹해 덮어쓴다
  foreach ($lf in @($logOut, $logErr)) {
    if (-not (Test-Path $lf)) { continue }
    $c = Get-Content $lf -Raw
    if ($c) { Hide-Secret $c | Set-Content $lf -Encoding utf8 } else { Remove-Item $lf -Force }
  }
}

# 스키마 덤프는 --schema 를 주지 않는다.
# public 이 참조하는 extension 생성문 등이 빠질 수 있기 때문이다.
Invoke-Dump 'roles'  @('--role-only')                              '01-roles.sql'
Invoke-Dump 'schema' @()                                           '02-schema.sql'

# 데이터는 public 만 받는다.
# auth 스키마 데이터까지 받으면 Supabase Auth 버전이 다른 곳에 복원할 때 깨진다.
# 이 프로젝트는 자체 인증(public.users + bcrypt)이라 auth 데이터는 쓸 데가 없다.
Invoke-Dump 'data'   @('--data-only', '--use-copy', '--schema', 'public') '03-data.sql'

# ---------- 결과 확인 ----------
Write-Host "`n산출물:"
$files = Get-ChildItem $dir -Filter '*.sql' | Sort-Object Name
$files | Select-Object Name, @{ n = 'KB'; e = { [math]::Round($_.Length / 1KB, 1) } } | Format-Table -AutoSize
foreach ($f in $files) {
  if ($f.Length -eq 0) { throw "$($f.Name) 이 비어 있습니다. 백업이 정상적으로 되지 않았습니다." }
}

# ---------- 행 수 집계 → manifest ----------
# COPY 블록의 행을 세어 기록한다. verify 스크립트가 이 값과 복원 결과를 대조한다.
# pg_class.reltuples 같은 통계 추정치는 실제와 크게 어긋나므로 쓰지 않는다.
$counts = [ordered]@{}
$cur = $null
$n = 0
foreach ($line in [System.IO.File]::ReadLines((Join-Path $dir '03-data.sql'))) {
  if ($null -eq $cur) {
    # pg_dump 는 "public"."users" 처럼 따옴표를 붙인다 → public.users 로 정규화
    if ($line -match '^COPY\s+([^\s(]+)') { $cur = $Matches[1] -replace '"', ''; $n = 0 }
  }
  elseif ($line -eq '\.') { $counts[$cur] = $n; $cur = $null }
  else { $n++ }
}

$manifest = Join-Path $dir 'manifest.txt'
$counts.GetEnumerator() | ForEach-Object { "$($_.Key)`t$($_.Value)" } | Set-Content $manifest -Encoding utf8

Write-Host '덤프된 행 수:'
$counts.GetEnumerator() | Sort-Object { [int]$_.Value } -Descending |
  Format-Table @{ n = 'table'; e = { $_.Key } }, @{ n = 'rows'; e = { $_.Value } } -AutoSize

$total = ($counts.Values | Measure-Object -Sum).Sum
Write-Host "합계 $total 행 / 테이블 $($counts.Count) 개"

Write-Host "`n다음으로 복원 검증 (인자 없이 실행하면 가장 최근 백업을 검증한다):"
Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/verify-backup-restore.ps1'
