# supabase/cutover — 운영 DB V2 전환 SQL

운영(`brjfsvjutgirenreaofv`)의 레거시 15개 테이블을 V2 구조로 옮기는 이행 SQL이다.

`supabase/migrations/` 와 성격이 다르다. 저쪽은 **스키마 정의**(dev-v2 와 공유)이고,
여기는 **운영 데이터를 한 번 옮기는 작업**이다. 마이그레이션 이력에 등록하지 않는다.

> ⚠️ **아직 검증되지 않았다.** 운영에 적용하기 전 반드시 리허설을 거친다(아래).

---

## 왜 새로 썼나

dev-v2 에는 변환 **결과**만 있고 **로직**이 없다. 마이그레이션 14건 어디에도
`rename to` 가 없고 `insert` 는 시드·RPC 본문뿐이다
([migrations/README.md](../migrations/README.md) 참조).

그래서 dev-v2 의 `legacy_*` ↔ V2 데이터를 대조해 규칙을 역설계했다.
`actors.legacy_user_id` · `match_attempts.legacy_source/legacy_id` ·
`chat_sessions.legacy_room_id` · `payments.legacy_sp_payment_id` 같은
추적 컬럼이 남아 있어 복원이 가능했다.

**dev-v2 의 데이터를 그대로 옮기는 방법은 쓸 수 없다** — 마스킹된 더미다
(전화번호 1192건 중 실제 형태 1건, 비밀번호 해시 distinct 2개,
`chat_messages` 8,003건이 distinct 1개).

---

## 적용 순서

```
scripts/backup-prod-db.ps1          # 반드시 먼저
  ↓
01-rename-legacy.sql                # ⚠️ 여기서부터 다운타임
  ↓
supabase/migrations/ 14건 순서대로   # V2 스키마 생성
  ↓
02-identity.sql                     # actors 가 먼저 있어야 나머지가 붙는다
  ↓
03-matching-chat.sql                # words·chat_sessions 를 04·06 이 참조한다
  ↓
04-report-feedback.sql   05-payment-items.sql   06-content-bookmarks.sql
  ↓
07-guest.sql                        # 게스트 신원 + 게스트 활동 보완
```

02 → 03 순서는 고정이다. 04·05·06 은 03 이후라면 자유롭고, **07 은 마지막**이다
(04 가 넣은 피드백과 중복을 피하려면 그 뒤여야 한다).

| 파일 | 옮기는 것 |
|---|---|
| `01-rename-legacy.sql` | 레거시 15개 → `legacy_*`, `legacy_actor_map` 생성 |
| `02-identity.sql` | `actors` `users` `user_credentials` `nickname_histories` `legacy_actor_map` |
| `03-matching-chat.sql` | `words` `match_rounds` `chat_sessions` `chat_session_members` `chat_messages` `match_attempts` |
| `04-report-feedback.sql` | `reports` `report_reason_items` `session_feedback` `balance_games` `balance_game_choices` |
| `05-payment-items.sql` | `orders` `payments` `payment_events` `user_item_ledger` |
| `06-content-bookmarks.sql` | `announcements` `announcement_comments` `word_bookmarks` |
| `07-guest.sql` | `actors`(GUEST) `guest_profiles` + 게스트의 매칭·참여·메시지·피드백 |

### 07 은 역설계가 아니라 신규 설계다

dev-v2 에 원본이 없다. `legacy_actor_map` 에 `kind='GUEST'` 587건이 있지만
그 `actor_id` 587개는 **`actors` 에 하나도 존재하지 않는다** — uuid 만 발급하고
삽입에서 멈춘 미완 작업이다. 운영의 distinct 게스트도 정확히 587 이라 대상은 같다.

설계는 `v2_identity` 마이그레이션의 컬럼 주석을 따랐다 —
`guest_token_hash` 는 NULL, 닉네임은 활동 로그 스냅샷에서 복원.
`status` 는 `DELETED` 로 둔다. 레거시 게스트는 복구 토큰이 없어 재접속이
불가능하고, `ACTIVE` 로 두면 살아 있는 신원으로 오인되어 매칭·집계에 섞인다.

---

## 알려진 손실

**허용 방침에 따라** 완벽 재현보다 동작하는 이행을 택했다. 각 파일 상단에도 적어 두었다.

| 손실 | 파일 | 사유 |
|---|---|---|
| **닉네임 57건 변경** | 02 | V2 `users.nickname` 이 `not null unique` 인데 운영에 중복 57·null 1 이 있다. 계정을 버리는 대신 `닉네임_a3f9c2` 접미사를 붙인다 |
| 게스트 복구 토큰 | 07 | 레거시에 없다. `guest_token_hash` 는 NULL 이고 재접속이 불가능하다 |
| 닉네임 없는 게스트 | 07 | 신고에만 등장한 게스트는 스냅샷이 없어 `nickname` 이 null 이 된다 |
| **게스트 신고** | 07 | `reported_reports` 의 `reporter_guest_id`/`reported_guest_id` 는 이관하지 않는다. 04 의 회원 조합만 들어간다 |
| `round` null 행 | 03 | `match_attempts.round_id` 가 `not null` 이다 |
| 세션 종료 사유·정확한 시각 | 03 | 레거시에 없다. `UNKNOWN` + 로그 최소·최대 시각으로 채운다 |
| 신고 처리 상태 | 04 | 레거시에 없다. 전부 `PENDING` |
| 세션 특정 실패 피드백 | 04 | `legacy_emotion_feedback` 에 `room_id` 가 없다. 두 사람이 함께한 방을 시각 근접으로 추정하고, 못 찾으면 버린다 |
| `order_items` 전체 | 05 | 레거시에 상품 마스터가 없고 단어세트 결제가 섞여 있어 `product_type` 매핑이 불가능하다. 금액·상태는 `orders`/`payments` 에 남는다 |
| 단어장의 만남 상대 | 06 | `word_bookmarks` 에 대응 컬럼이 없고 `word_history` 에 `room_id` 가 없어 `session_id` 를 특정할 수 없다 |

**dev-v2 보다 더 많이 보존하는 지점**도 있다. dev 는 `legacy_telepathy_sessions`
10,270건을 통째로 버렸고(`legacy_source='SESSIONS'` 가 0건) `user_item_ledger` 도 0건이지만,
여기서는 `chat_sessions` 복원과 확성기 잔액 이관에 활용한다.

---

## 리허설 — 운영을 건드리지 않고 검증한다

오늘 만든 백업이 여기서 쓰인다. **실데이터로 전 과정을 시험할 수 있다.**

```bash
# 1. 백업 복원 (Supabase 이미지여야 한다 — 순정 postgres 는 extensions 스키마·롤이 없다)
docker run --name tel-cutover -e POSTGRES_PASSWORD=postgres -d public.ecr.aws/supabase/postgres:17.6.1.156
docker cp <백업>/02-schema.sql tel-cutover:/tmp/ && docker cp <백업>/03-data.sql tel-cutover:/tmp/
docker exec tel-cutover psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/02-schema.sql
docker exec tel-cutover psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/03-data.sql

# 2. 이행 SQL 을 순서대로 적용하고 각 파일 하단의 검증 쿼리를 돌린다
```

각 파일 끝에 검증 쿼리를 주석으로 넣어 두었다. 행 수 보존·제약 충족·손실 원인 분해를 확인한다.

**리허설에서 실패가 나오는 것이 정상이다.** 닉네임 중복처럼 실데이터에서만
드러나는 문제가 더 있을 수 있다.

---

## 아직 없는 것

- **서버 코드 V2 이행** — 이 SQL 을 적용해도 앱은 동작하지 않는다.
  마운트된 라우트가 `telepathy_sessions_queue` · `chat_logs` · `sp_payments` 등
  사라진 테이블을 참조한다. TEL-15 는 로그인·회원가입만 끝난 상태다
- **롤백 절차** — 현재는 백업 복원이 유일한 수단이다
