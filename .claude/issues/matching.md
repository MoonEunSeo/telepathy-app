# matching — 큐·라운드·성사

> 리니어 요약본. **다르면 리니어가 맞다.** 갱신 2026-08-05
> 원본: TEL-22(2-2) · TEL-19 · TEL-18 · TEL-14 · TEL-13 · TEL-7

---

## 1. ⚠️ 매칭 로직은 라우트가 아니라 소켓에 있다 (TEL-22)

`match.routes.ts` 는 **121줄뿐**이고, 실제 매칭 성사는 **`src/config/chat.socket.ts` 의 `join_match` 핸들러(약 100~318행)** 에 있다. **이 파일을 열지 않고 라우트만 보면 범위를 절반으로 잘못 잡는다.**

`chat.socket.ts` 는 세 항목에 걸쳐 나뉜다. 같은 파일을 셋이 건드리므로 순서를 지킨다.

| 핸들러 | 담당 |
|---|---|
| `join_match` | **매칭 (TEL-22)** |
| `chatMessage`·`typing`·`leaveRoom`·`disconnecting` | 채팅 (TEL-23) |
| `megaphone:send` | 결제 (TEL-25) |

---

## 2. 전환 대상

| 레거시 | V2 |
|---|---|
| `telepathy_sessions_queue` (11,423행) | `match_attempts` (status QUEUE/MATCHED/EXPIRED) |
| `telepathy_sessions_log` (12,531행) | `match_attempts` (로그 계열) |
| `telepathy_sessions` | `match_attempts` |
| 라운드 계산 (`time.ts`, 15초 주기) | `match_rounds` (22,550행, 이관 검증 완료) |
| 단어 목록 | `words` (643행, 이관 검증 완료) |

엔드포인트: `GET /api/match/current-round` · `POST /api/match/end` · `POST /api/match/session-status` · `GET /api/server-time`

**매칭은 채팅(TEL-23)의 선행이다** — 채팅 세션이 매칭 성사 지점에서 만들어진다.

---

## 3. 착수 전 반드시 처리 — `status` DEFAULT 가 `'ENDED'`

`match_rounds` 와 `chat_sessions` 의 `status` DEFAULT 가 **`'ENDED'`** 다.
앱이 status 를 빠뜨리면 **신규 라운드가 조용히 "종료" 상태로 생성된다. 오류가 나지 않아 발견이 늦다.**

→ `'SCHEDULED'`(rounds) / `'READY'`(sessions) 로 교정하는 마이그레이션을 **먼저** 넣는다.

---

## 4. 알려진 버그

### 4.1 매칭 성사가 라운드 만료에 덮어써진다 (TEL-19)

`match_attempts.status` 는 **어떤 상태에서 어떤 상태로 갈 수 있는지가 어디에도 정의돼 있지 않다.**

```
① expireRound 가 먼저 WAITING → EXPIRED 로 전이
② 매칭 코드가 같은 행을 MATCHED 로 갱신
   └ 직전 상태가 EXPIRED 였다는 사실을 확인하지 않는다 → 그대로 덮어쓴다
```

`expireAttempts` 는 `.eq('status','WAITING')` 로 **자기 쪽 방향만** 막는다. 반대 방향은 막는 게 없다.

**DB 제약도 이 전이를 막지 못한다.**

| 제약 | 내용 |
|---|---|
| `match_attempts_status_check` | `status IN ('WAITING','MATCHED','CANCELLED','EXPIRED')` |
| `match_attempts_matched_needs_session` | `status='MATCHED'` 면 `matched_session_id` 필수 |

둘 다 **"값의 집합"만 검사하고 "전이의 방향"은 검사하지 않는다.** `EXPIRED → MATCHED` 는 둘 다 통과한다.

부분 UNIQUE 인덱스 `match_attempts_one_active_per_actor` 도 못 막는다 — 조건이 `finished_at IS NULL` 이라, `expireRound` 가 `EXPIRED` 와 함께 `finished_at` 을 채운 행은 **인덱스 대상에서 빠진다.**

**영향**: `finished_at` 이 만료 시각인 채 `MATCHED` 가 된다 / **매칭 성공률(§42)이 부풀려진다** — 롤백 판단 기준(§41 "성공률 5% 이상 급감")이 이 값을 쓴다 / 상대는 만료된 시도와 매칭됐다고 믿고 대화방에 들어간다.

발생 창은 **라운드 경계 ±1초**. §15.5 가 지적한 대로 라운드 경계에 요청이 몰리는 구조라 조건이 이미 갖춰져 있다.

**해결**: 최소 조치는 매칭 UPDATE 에 `.eq('status','WAITING')` 가드. 다만 조회-갱신 사이 원자성 부재가 남으므로 **§15.5 대로 RPC + `FOR UPDATE SKIP LOCKED` 로 전환할 때 함께 처리하는 것이 맞다.** V2 질의를 새로 쓰는 TEL-22 가 그 자리다.

> §15.2 "한 Actor 는 동시에 하나의 WAITING 또는 MATCHED 만" 은 **이미 DB 가 강제하고 있다** (`match_attempts_one_active_per_actor`). 계획안 §15.5 의 "DB 제약이 없다"(2026-07-27 기준)는 **본문 갱신이 필요한 지점.**

### 4.2 라운드 절반이 flush 되지 않는다 (TEL-18)

회차는 **15초**마다 끝나는데 청소부(cron)는 **30초**마다 오고, 올 때마다 **"직전 하나"(`nowRound - 1`)** 만 치운다.

```
시각    12:00:00    :15      :30      :45    12:01:00
회차    │─── A ───│─── B ───│─── C ───│─── D ───│
청소부      ▲                   ▲
치운 것  (그 전)              B ← A 는 지나침    D ← C 는 지나침
```

우연이 아니다. 라운드 경계(`Math.floor(Date.now()/15000)`)와 cron 발화(`*/30 * * * * *`)가 **둘 다 벽시계에 고정**돼 있어 매번 정확히 같은 자리를 빠뜨린다.

**함께 있던 문제 2개**
- 청소 기준이 `.neq('status','ended')` — **"대화가 끝난 것만 빼고 전부"** 라 **지금 대화 중인 사람의 `matched` 접수증까지 지운다.** 그 뒤 나가기를 누르면 0건 갱신되는데 **Supabase 는 이걸 오류로 주지 않는다(`error` 가 null)**. → 최적화 백로그 **O14**
- `join_match` 가 성사 시점에 이미 `result:'matched'` 로그를 넣는데 `flushRound` 가 같은 행을 또 넣는다(중복).

**해결 방향**: cron 을 없애고 **라운드 경계를 이미 감시 중인 `index.ts:89~97` 의 1초 타이머**에 붙인다. `expireRound(endedRound)` 로 **끝난 라운드를 넘겨받아** 추측 자체를 없앤다. 대상은 `waiting` 만.

**현재 상태 (TEL-22 기준)**: `expireRound` 는 이미 있으나 **`V2_MATCHING_ENABLED` 환경 가드로 꺼져 있다(PR #17).** TEL-22 완료 시 가드를 제거한다.

**알고 갈 대가**: 기존은 insert 실패 시 delete 가 안 돌아 재시도됐는데, `DELETE ... RETURNING` 으로 삭제를 먼저 하면 **로그 적재 실패 시 그 라운드의 unmatched 기록이 사라진다.** 얻는 것은 원자성. 실패 시 페이로드를 `console.error` 로 남겨 복구 여지를 둔다.

**주의**: `.or('round.lte.N,created_at.lt."ISO"')` 의 PostgREST 파싱은 **실제로 돌려봐야 확실하다.** 실패하면 delete 를 둘로 나눈다. `created_at` 조건이 따로 필요한 이유 — 라운드 마지막 순간에 만들어진 행은 아직 15초가 안 됐고, 클라이언트가 미래 라운드 번호를 보내면 라운드 조건으로 안 잡힌다. **둘을 OR 로 묶어야 그물이 메워진다.**

**범위 밖**: `matched`·`ended` 행 청소(채팅 수명을 알 수 없다. `chat_sessions` 분리가 선행) · 소켓 `match:failed` 이벤트 · `round.ts` (한 글자도 건드리지 않는다)

### 4.3 `/session-status` 인증 누락 (TEL-14)

`match.routes.ts:95` 가 **인증 미들웨어 없이** body 의 `userId` 를 그대로 신뢰하고 **행 전체(`select('*')`)** 를 반환한다. 같은 파일의 `/end` 는 `requireSession` 이 있는데 여기만 빠졌다.

남의 `user_id` 만 알면 노출되는 것: **그 사람이 이번 라운드에 고른 단어** · **누구와 매칭됐는지**(`partner_*`) · `room_id` · `socket_id`.

> 익명 매칭 서비스에서 **"누가 누구와 대화 중인가"는 가장 보호돼야 할 정보**다. 그리고 **남의 `user_id` 는 랜덤채팅 1회로 획득할 수 있다** — 공격에 선행 조건이 없다.

**해결**: `requireSession` 적용 · `userId` 를 `req.user` 에서 도출하고 **요청 스키마에서 필드 자체를 제거** · 응답을 실제 쓰는 필드로 축소(O5 와 함께) · 실패 401.

### 4.4 JWT 원문 평문 로그 (TEL-13, Urgent) — 중복 기재

`match.routes.ts:28` `console.log('📥 /end token:', token)`.
`/api/match/end` 는 **채팅 종료마다** 호출 → 세션이 끝날 때마다 유효한 JWT 가 Render 로그(AWS 이전 후 CloudWatch)에 한 건씩 쌓인다. **로그 열람 권한만 있으면 누구 계정으로든 로그인 상태를 재현할 수 있다.**

같은 파일에 `req.body` 전문·`mySession` 전체 등 디버그 로그가 다수 남아 있고, 저장소 전체로는 **11개 파일 40건**. `flush.ts:8` 의 `console.log('🧪 …', typeof supabase)` 는 **30초마다 실행 중**이다. `utils/logger.ts` 기반으로 레벨 분리.

---

## 5. 데이터를 믿지 말 것

- **11,099행이 종료되지 않은 상태로 남아 있다.** 레거시 `flushRound` 가 이미 오작동 중이었다는 뜻. **이관된 데이터의 상태값을 그대로 믿지 않는다.**
- `words.category_id` 는 참조 테이블이 없고 **643행 전부 NULL** — 단어 분류 기능은 없는 것으로 간주.
- **매칭 기록 없는 채팅방 116개**(메시지 2,221건 = 전체의 27.2%)가 있었다. queue/log 만 기준으로 이전하면 채팅의 27%가 유실된다 → `chat_logs.room_id` 를 세션의 1차 원본으로 삼아 복구했다(TEL-11).
- **매칭 경합은 원래 있던 버그다** — 두 사용자가 동시에 단어를 고르면 서로 다른 방이 생긴다. 대기열에서 상대를 원자적으로 집어오는 문제로 **행 잠금(`FOR UPDATE SKIP LOCKED`)** 이 필요하다.

---

## 6. 완료 조건 (TEL-22)

1. `match.routes.ts`·`time.ts` 삭제, `modules/matching` 완성
2. `join_match` 가 `match_attempts` 만 참조 — `telepathy_sessions*` 이름이 코드에 없다
3. `V2_MATCHING_ENABLED` 가드 제거
4. `session-status` 가 인증 없이는 403
5. **`MATCHED` → `EXPIRED` 역전이 차단** (검증 스크립트로 재현·확인)
6. `scripts/check-match-flow.ts` — 큐 진입 → 성사 → 만료를 v2-dev 에 실제로 태운다

---

## 7. 신원 검증 원칙 (TEL-7 §4) — 중복 기재

> "나는 누구인가"(userId·senderId)는 **서버가 토큰에서 도출한다.** "누구에 대해 말하는가"(partnerId)는 클라이언트가 전달할 수 있다.

- `join_match` 는 TEL-7 에서 `socket.data.user` 사용으로 전환됐다. 레거시는 남의 `user_id` 로 **대기열 삭제 → 매칭 방해**가 가능했다.
- 소켓은 `io.use` 로 토큰 없으면 연결 거절. **`io.use` 는 연결 시 1회만 실행**되므로 닉네임 변경 시 재연결이 필요하다.
- 라운드 전환은 폴링 → **서버 푸시(`round:change`)** 로 바뀌었다(TEL-10). 서버 타이머는 사용자 수와 무관하게 1개. **게스트가 소켓에 연결되지 못하면 라운드 전환을 통째로 잃는 회귀**가 생기므로 게스트 토큰 발급 순서를 깨지 않는다.
