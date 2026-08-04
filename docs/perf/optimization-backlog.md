# 최적화 백로그

> 작성일: **2026-07-27** / 기준 커밋: `bb35c3b`
> [S1~S7](README.md)이 **측정하고 개선한 기록**이라면, 이 문서는 **코드에서 발견했으나 아직 착수하지 않은 것**의 목록이다.

각 항목은 다음을 갖춘다 — **위치 · 현상 · 근거 · 개선안 · 측정 방법.**
근거 없는 항목은 넣지 않는다. "그럴 것 같다"는 개선 근거가 되지 못한다.

ID는 측정 시나리오(S1~S7)와 구분하기 위해 **O(Optimization)** 를 쓴다.

---

## 우선순위

| ID | 항목 | 분류 | 비용 | 효과 | 상태 |
|---|---|---|---|---|---|
| [O8](#o8-rls-전-테이블-비활성) | RLS 전 테이블 비활성 | 보안 | 매우 낮음 | 매우 높음 | 📋 [TEL-12](https://linear.app/newtelepathy/issue/TEL-12) |
| [O9](#o9-jwt-원문을-로그에-출력) | JWT 원문 로그 출력 | 보안 | 매우 낮음 | 매우 높음 | 📋 [TEL-13](https://linear.app/newtelepathy/issue/TEL-13) |
| [O10](#o10-session-status-인증-누락) | `/session-status` 인증 누락 | 보안 | 낮음 | 높음 | 📋 [TEL-14](https://linear.app/newtelepathy/issue/TEL-14) |
| [O4](#o4-코드-스플리팅-미착수) | 코드 스플리팅 | 프론트 | 낮음 | 높음 | ⛔ 미착수 |
| [O3](#o3-supabase-클라이언트-12개-중복-생성) | Supabase 클라이언트 12개 | 서버 | 낮음 | 중간 | ⛔ 미착수 |
| [O6](#o6-구조화되지-않은-로그-40개) | 구조화되지 않은 로그 | 서버 | 낮음 | 중간 | ⛔ 미착수 |
| [O1](#o1-onlinecount-이중-브로드캐스트) | `onlineCount` 이중 브로드캐스트 | 서버 | 중간 | 높음 | ⛔ 미착수 |
| [O2](#o2-매칭-경쟁-상태와-db-왕복-6회) | 매칭 경쟁 상태 · 왕복 6회 | 서버 | 중간 | 높음 | ⛔ 미착수 |
| [O12](#o12-db-인덱스가-코드로-관리되지-않음) | DB 인덱스 미관리 | DB | 중간 | 미확인 | ⛔ 미착수 |
| [O5](#o5-select-남용) | `select('*')` 남용 | 서버 | 낮음 | 낮음 | ⛔ 미착수 |
| [O7](#o7-flushround-트랜잭션-부재) | `flushRound` 트랜잭션 부재 | 서버 | 중간 | 중간 | ⛔ 미착수 |
| [O14](#o14-큐와-채팅-세션의-수명-불일치) | 큐·채팅 세션 수명 불일치 | 정합성 | 중간 | 중간 | ⛔ 미착수 |
| [O13](#o13-프로덕션에서-tsx로-ts-직접-실행) | prod에서 `tsx` 직접 실행 | 배포 | 중간 | 미확인 | ⛔ 미착수 |
| [O11](#o11-수평-확장을-막는-4개-지점) | 수평 확장 차단 4개 지점 | 확장성 | 높음 | — | ⛔ 미착수 |

> **O8~O10은 성능이 아니라 보안이다.** 이 문서에는 발견 기록만 두고,
> 실제 처리는 Linear 이슈로 분리했다 — **TEL-12 · TEL-13 · TEL-14** (2026-07-28 등록).
> TEL-13·TEL-14는 [TEL-7](https://linear.app/newtelepathy/issue/TEL-7)(인증·권한 보안 강화 1차)의 후속이며,
> TEL-12(RLS)는 DB 테이블 정규화 과정에서 발생한 별건이다.

### 착수 순서 권장

```
O8·O9·O10  (지금 노출 중 — 즉시)
→ O4·O3·O6 (저비용 · 부하테스트 전 정지작업)
→ 부하테스트  (O1·O2·O12의 근거를 만든다)
→ O1·O2·O12 (측정된 병목을 고친다)
→ O13·O7·O14
→ O11       (AWS 이전 + Redis 이후)
```

O3·O6을 부하테스트 **앞에** 두는 이유는, 로그 I/O와 클라이언트 중복이 남아 있으면
베이스라인 수치에 노이즈가 섞여 이후 개선폭을 증명할 수 없기 때문이다.
[측정 원칙](README.md)의 "한 번에 하나씩"과 같은 이유다.

---

## O1. `onlineCount` 이중 브로드캐스트

**위치**
- [`server/index.ts:73-83`](../../server/index.ts) — 수동 카운터 `onlineUsers`로 `io.emit`
- [`server/src/config/chat.socket.ts:38`](../../server/src/config/chat.socket.ts) — `io.engine.clientsCount`로 `io.emit`

**현상**
접속·해제 1건마다 **전체 클라이언트에게 2번** 브로드캐스트된다.
동시 접속 N명일 때 접속 1건당 **2N개 메시지**가 나간다.

**근거**
핸들러가 두 곳에 등록돼 있고 둘 다 `io.emit`(전체 브로드캐스트)을 호출한다.
두 값의 출처도 다르다 — 수동 카운터는 `io.use` 인증을 통과한 소켓만, `clientsCount`는
엔진 레벨 전체를 센다. **숫자가 서로 다르며 화면에서 깜빡이는 원인**이기도 하다.
[known-issues](../project/known-issues.md)에 "소스 이원화"로 기록돼 있으나 성능 항목으로는 다뤄지지 않았다.

**개선안**
1. 소스를 하나로 통일한다 (인증 통과 소켓 기준 권장 — 계획안 §26의 "인증 완료된 Socket만 포함"과 일치)
2. 접속마다 emit하지 않고 **1초 주기로 집계해, 값이 변했을 때만** emit한다

접속당 2N → 초당 최대 N으로 떨어진다.

**측정 방법**
소켓 클라이언트 N개를 붙였다 떼면서 `onlineCount` 이벤트 수신 횟수를 센다.
[S6](s6-polling/README.md)와 같은 포맷(분당 건수 Before/After)으로 기록한다.

---

## O2. 매칭 경쟁 상태와 DB 왕복 6회

**위치** [`server/src/config/chat.socket.ts:114-199`](../../server/src/config/chat.socket.ts)

**현상 ①  read-then-write 경쟁 상태**

```
① waiting 조회 (select)  →  ② 두 행을 matched 로 update
```

①과 ② 사이에 원자성이 없다. 같은 `word` + `round`에 **3명 이상이 동시 진입**하면
A가 조회한 `waiting[0]`을 B도 동시에 조회해 **한 사람이 두 방에 매칭**되거나
한쪽이 유령 방에 남을 수 있다.

15초 라운드 경계에 요청이 몰리는 구조라 실제로 발생할 조건이 갖춰져 있다.

**현상 ②  매칭 1건당 DB 왕복 6회**

```
delete(재선택 정리) → insert(큐 등록) → select(상대 조회)
→ update(나) → update(상대) → insert(로그)
```

세 번째 이후가 전부 순차 `await`다. 라운드 경계에 몰리는 구조에서 이 왕복 수가 곧 지연이다.

**개선안**
Postgres 함수(RPC)로 묶어 `FOR UPDATE SKIP LOCKED` 기반 단일 트랜잭션 처리.
**왕복 6회 → 1회**이면서 경쟁 상태도 동시에 해소된다.

계획안 §14.2가 요구하는 *"Transaction으로 연결"* 과 방향이 같다.

**측정 방법**
같은 `word`·`round`에 동시 진입하는 부하 시나리오로 중복 매칭 발생 건수를 센다.
개선 후 0건 + 매칭 지연(p95) Before/After.

---

## O3. Supabase 클라이언트 12개 중복 생성

**위치** 싱글턴 [`server/src/config/supabase.ts:8`](../../server/src/config/supabase.ts) 외에
아래 11개 라우트가 각자 `createClient`를 호출한다.

```
auth · history · feedback · nickname · match · payments
password · report · register · withdraw · webhook
```

**현상**
[architecture.md](../conventions/architecture.md)에는 `supabase.ts(싱글턴)`으로 문서화돼 있으나
**실제로는 12개 인스턴스가 존재**한다. 문서와 코드가 어긋난 상태다.

**근거**
각 클라이언트가 독립된 커넥션·재시도 상태를 보유한다.
동시 접속이 늘면 애플리케이션보다 **Supabase 커넥션 한도에 먼저 걸린다.**

**개선안**
전부 `import supabase from '../config/supabase'`로 통일.
위험도가 낮고 효과를 즉시 확인할 수 있다.

**측정 방법**
부하테스트 중 Supabase 대시보드의 활성 커넥션 수 Before/After.

---

## O4. 코드 스플리팅 미착수

**위치** `telepathy-front/src/` 전역

**현상**
`React.lazy` · `Suspense` · `manualChunks` 사용처가 **0건**이다.
모든 페이지 코드가 한 번들에 들어 있어, 로그인 화면 하나를 보려고
채팅·마이페이지·결제 코드까지 전부 다운로드한다.

**근거**
[S5](s5-lighthouse/README.md)가 이미 진단을 마쳤다.

| 지표 | 값 |
|---|---|
| 성능 점수(중앙값) | 76 |
| LCP | 4,165 ms |
| TBT / CLS | 0 / 0 (최상) |
| 원인 | 550KB 단일 번들 |
| `unused-javascript` | ≈540 ms 절감 여지 |

빌드도 같은 경고를 낸다 — *"chunks larger than 500 kB … use dynamic import() to code-split."*

**개선안**
1. **라우트 기반 분할** — `React.lazy` + `Suspense`로 페이지별 청크 (효과 최대)
2. 무거운 의존성 지연 로드 — 초기에 불필요한 모듈
   (`@portone/browser-sdk` 는 2026-08-04 PortOne 제거로 해소됐다)
3. unused CSS 정리

**측정 방법**
[S5와 동일 조건](s5-lighthouse/README.md) — Lighthouse 12 CLI, prod 빌드, 3회 중앙값.
**측정 체계가 이미 확립돼 있어 재측정 비용이 사실상 0이다.**

> ⚠️ **AWS 이전 전에 끝낼 것.** 이전 후에 하면 개선폭이 인프라 변경 효과와 섞여
> 무엇이 효과였는지 증명할 수 없다.

---

## O5. `select('*')` 남용

**위치** 매칭 조회([`chat.socket.ts:140`](../../server/src/config/chat.socket.ts)),
`/end`·`/session-status`([`match.routes.ts`](../../server/src/routes/match.routes.ts)) 등

**현상** 필요한 컬럼만이 아니라 행 전체를 가져온다.

**개선안** 사용하는 컬럼만 명시. 특히 매칭 조회는 라운드마다 반복되므로 효과가 누적된다.

**측정 방법** 응답 바이트 수 Before/After. [S7](s7-compression/README.md)처럼 `curl` 출력으로 검증 가능하다.

---

## O6. 구조화되지 않은 로그 40개

**위치** 11개 파일에 `console.log` **40건**

**현상**
- 소켓 연결마다 출력되는 로그가 있어 접속이 몰리면 **로그 I/O 자체가 부하**가 된다
- [`flush.ts:8`](../../server/src/utils/flush.ts)의 `console.log('🧪 flushRound supabase 객체:', typeof supabase)` —
  디버그 잔재가 **30초마다** 실행 중이다
- 레벨 구분이 없어 운영에서 필요한 로그와 디버그 로그가 섞인다

**개선안**
[`logger.ts`](../../server/src/utils/logger.ts) 기반으로 레벨 분리, 디버그 잔재 제거.
**부하테스트 전에 처리해야 베이스라인이 오염되지 않는다.**

> 관련: [O9](#o9-jwt-원문을-로그에-출력) — 로그 정리 시 함께 처리한다.

---

## O7. `flushRound` 트랜잭션 부재

**위치** [`server/src/utils/flush.ts`](../../server/src/utils/flush.ts)

**현상**
`select` → `insert`(로그) → `delete`(큐)가 각각 독립 요청이다.
**insert 성공 후 delete가 실패하면 중복 로그가 남는다.**
`logs`가 빈 배열일 때도 insert를 호출한다.

**개선안**
Postgres 함수로 묶어 `INSERT INTO log SELECT … ; DELETE …`를 한 트랜잭션에서 처리.
왕복 3회 → 1회이면서 정합성도 확보된다.

**측정 방법** 중복 로그 행 수(같은 `round` + `user_id`) 0건 확인.

---

## O8. RLS 전 테이블 비활성

> 🔴 **보안 — 성능 항목 아님. [TEL-12](https://linear.app/newtelepathy/issue/TEL-12) 로 등록됨 (Urgent / Todo).**

**현상**
운영 `Telepathy` 의 `public` 스키마 **14개 테이블**, 그리고 마이그레이션 대상
`telepathy-v2-dev` 의 **52개 테이블 전부** Row Level Security 비활성.
두 프로젝트 모두 Supabase 가 critical 등급으로 경고한다.
anon 키만 있으면 전체 행을 읽고 수정할 수 있다.

노출 규모 (`count(*)` 실측, 2026-07-28):

| | 운영 `Telepathy` | `telepathy-v2-dev` |
|---|---|---|
| 회원 개인정보 | `users` **1,191** (`password_hash`·`phone`·`real_name`) | `users`·`user_credentials`·`legacy_users` 각 1,191 (**3중 복제**) |
| 대화 | `chat_logs` **8,222** | `chat_messages` 8,003 + `legacy_chat_logs` 8,175 |
| 환불 계좌 | `sp_payments` **131** (`refund_account`) | `legacy_sp_payments` 131 |
| 신고 | `reported_reports` 20 (신고자↔피신고자 대응) | `reports` 18 + `report_reason_items` 33 |

익명 대화가 서비스의 핵심 가치인데 그 대화 내용과 매칭 상대가 노출 대상이며,
v2-dev 의 `user_credentials` 는 **인증 정보만 모아둔 테이블**이라 특히 위험하다.

> ⚠️ 최초 기록 시 `list_tables` 추정치를 인용해 규모를 과소평가했다
> (`chat_logs` 761 → 실제 8,222, `users` 1 → 실제 1,191).
> 행 수는 반드시 `count(*)` 로 확인한다 — [tech-adoption-review](../project/tech-adoption-review.md) 참조.

**위험도를 낮추는 요소**
프론트엔드는 Supabase를 직접 사용하지 않으며(`telepathy-front/src`에 참조 0건),
저장소 어디에도 anon 키가 없다. 서버만 `SERVICE_ROLE_KEY`로 접근한다.

**그래서 수정이 유난히 쉽다**
`service_role` 키는 RLS를 우회하므로 **정책 없이 RLS만 켜도 서버 동작은 영향이 없고
외부 접근만 차단된다.**

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nickname_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telepathy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telepathy_sessions_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telepathy_sessions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.megaphone_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;
```

⚠️ 운영 DB 변경이므로 **실행 전 PM 공유 필요.**

**`telepathy-v2-dev` 를 먼저 하는 편이 안전하다.** 아직 어떤 서버도 붙어 있지 않아
(Render·로컬 모두 운영 DB 를 본다) **깨질 기능이 0** 이고, 운영에 적용할 SQL 의 리허설이 된다.
신규 테이블을 계속 만드는 프로젝트이므로 기본 권한도 함께 잠근다.

```sql
-- v2-dev: 앞으로 만들 테이블도 자동 차단
alter default privileges in schema public revoke all on tables from anon, authenticated;
```

---

## O9. JWT 원문을 로그에 출력

> 🔴 **보안 — [TEL-13](https://linear.app/newtelepathy/issue/TEL-13) 으로 등록됨 (Urgent / Todo).**

**위치** [`server/src/routes/match.routes.ts:28`](../../server/src/routes/match.routes.ts)

```ts
console.log('📥 /end token:', token);
```

**현상**
플랫폼 로그(Render / CloudWatch)에 **유효한 인증 토큰이 평문으로 축적된다.**
로그 접근 권한이 있으면 누구나 계정을 탈취할 수 있다.

계획안 §8.3이 금지한 *"비밀번호를 로그에 출력"* 과 같은 범주다.

**개선안** 해당 로그 제거. [O6](#o6-구조화되지-않은-로그-40개) 작업 시 전체 로그를 함께 점검한다.

---

## O10. `/session-status` 인증 누락

> 🔴 **보안 — [TEL-14](https://linear.app/newtelepathy/issue/TEL-14) 로 등록됨 (High / Todo).**

**위치** [`server/src/routes/match.routes.ts:95-119`](../../server/src/routes/match.routes.ts)

**현상**
인증 미들웨어 없이 `userId`를 **body로 받아 그대로 조회**하고,
`...data`로 **행 전체를 응답**한다.

```ts
router.post('/session-status', async (req, res) => {
  const { word, round, userId } = req.body;   // ← 검증 없음
  …
  return res.json({ active: …, ...data });     // ← 행 전체 노출
});
```

남의 `userId`만 알면 그 사용자가 어떤 단어를 골랐고 누구와 매칭됐는지 조회된다.
**익명성이 핵심 가치인 서비스에서 그 익명성이 뚫려 있다.**

**개선안**
`requireSession` 미들웨어 적용 + `userId`를 body가 아닌 **토큰에서** 취득 +
응답을 필요 필드만으로 축소.

---

## O11. 수평 확장을 막는 4개 지점

**현상** 인스턴스를 2대로 늘리는 순간 깨지는 지점들이다.

| 위치 | 문제 |
|---|---|
| [`index.ts:100`](../../server/index.ts) `cron.schedule` | **모든 인스턴스가 동시에 `flushRound` 실행** → 같은 라운드 로그 중복 insert, delete 경합 |
| [`index.ts:91`](../../server/index.ts) `setInterval` | 인스턴스마다 라운드 타이머 → `round:change`가 N번 emit |
| [`chat.socket.ts:21`](../../server/src/config/chat.socket.ts) `recentBroadcasts` | 인메모리 Map → 인스턴스 분리 시 중복 방지 무력화 |
| [`index.ts:72`](../../server/index.ts) `onlineUsers` | 인스턴스별 로컬 값 → 전체 접속자 수 산출 불가 |

여기에 Socket.IO 자체가 **다중 인스턴스에서 `@socket.io/redis-adapter`를 요구**한다.
서로 다른 서버에 붙은 두 사용자는 같은 room에 있어도 메시지가 전달되지 않는다.

**즉 Redis 없이는 2대로 확장할 수 없다.** "Redis를 써보고 싶어서"가 아니라
확장의 전제 조건이라는 점이 코드로 확인된다.

**개선안**
- cron → **분산 락**, 라운드 타이머 → **리더 선출**
- `recentBroadcasts` · `onlineUsers` → Redis
- Socket.IO → `@socket.io/redis-adapter`

**유리한 점**
[`index.ts:48`](../../server/index.ts)이 `transports: ['websocket']`이라 폴링 폴백이 없다.
**ALB sticky session 없이도 확장 가능하다.**
(대신 WebSocket을 차단하는 네트워크에서 접속이 실패하는 트레이드오프는 별도 판단 필요)

계획안 §26의 *"서버를 여러 인스턴스로 확장할 때 사용할 수 있도록
Presence Repository 인터페이스를 분리한다"* 와 직접 연결된다.

---

## O12. DB 인덱스가 코드로 관리되지 않음

**현상** 저장소에 **`.sql` 파일이 0건**이다. 스키마와 인덱스가 Supabase 콘솔에만 존재하며,
어떤 인덱스가 걸려 있는지 코드로 알 수 없다.

**근거**
매칭 조회는 `word` + `round` + `status` 3개 조건 필터([`chat.socket.ts:140`](../../server/src/config/chat.socket.ts))다.
복합 인덱스가 없으면 **매 매칭마다 seq scan**이며, 부하테스트 1순위 병목 후보다.

**개선안**
1. `EXPLAIN ANALYZE`로 현재 실행 계획 확인
2. 필요한 인덱스 추가 (계획안 §34가 *"매칭 Round·Word·Status"* 를 우선 인덱싱 대상으로 명시)
3. **스키마·인덱스를 `.sql`로 저장소에 편입** — 계획안의 "Supabase SQL Migration" 전환 첫 단계

**측정 방법** `EXPLAIN ANALYZE` 실행 계획 및 실행 시간 Before/After.

---

## O13. 프로덕션에서 `tsx`로 TS 직접 실행

**위치** [`package.json:7`](../../package.json) — `"start": "tsx --tsconfig server/tsconfig.json server/index.ts"`

**현상**
프로덕션에서 TypeScript를 런타임 트랜스파일로 직접 실행한다.
기동 시간과 메모리에 오버헤드가 있으며, **부하테스트 수치를 왜곡한다.**

**개선안**
빌드 산출물(`tsc` 또는 `esbuild`) 실행으로 전환. AWS 이전 시점에 함께 처리한다.

**측정 방법** 서버 기동 시간, RSS 메모리, 동일 부하에서의 응답 지연 Before/After.

---

## O14. 큐와 채팅 세션의 수명 불일치

**위치**
- [`chat.socket.ts:377`](../../server/src/config/chat.socket.ts) — `leaveRoom` (정상 종료)
- [`chat.socket.ts:392`](../../server/src/config/chat.socket.ts) — `disconnecting` (비정상 종료)
- [`flush.ts`](../../server/src/utils/flush.ts) — 30초 cron 정리

**현상 ①  종료 처리가 비대칭이다**

| 경로 | 상대에게 알림 | DB 상태 |
|---|---|---|
| `leaveRoom` (나가기 버튼) | ✅ | ✅ `status='ended'` |
| `disconnecting` (브라우저 닫기) | ✅ | ❌ **없음** |

브라우저를 그냥 닫으면 큐 행이 `matched` 인 채로 남는다.
지금까지 드러나지 않은 이유는 `flushRound` 가 30초마다 치우기 때문이다.
**배치가 뒤를 봐주고 있어 비대칭이 보이지 않았다.**

**현상 ②  긴 채팅에서는 `leaveRoom` 의 update 도 무의미하다 — 더 중요한 발견**

큐 행의 수명을 계산하면 이렇다.

```
라운드 N(15초) 에 매칭  →  라운드 N+1 이 되면 flush 대상
                        →  다음 cron(최대 30초) 에 삭제
```

**매칭 후 대략 15~45초면 큐 행이 사라진다.** 채팅은 그보다 오래 간다.

```ts
await supabase.from('telepathy_sessions_queue')
  .update({ status: 'ended' })
  .match({ user_id, room_id });   // ← 대상 행이 이미 없다
```

행이 없어도 Supabase 는 이것을 오류로 주지 않는다. `error` 는 `null` 이고 0건이 갱신된다.
즉 `status='ended'` 가 의미를 갖는 건 **15초 안에 끝난 채팅뿐**이다.

**근거 — 수명이 다른 두 가지가 한 테이블에 있다**

| | 수명 |
|---|---|
| 매칭 대기열 | 라운드 1회 (15초) |
| 채팅 세션 | 사용자가 나갈 때까지 (수 분) |

`telepathy_sessions_queue` 는 이름 그대로 **매칭 대기열**이고 라운드 단위로 살고 죽는다.
거기에 채팅 세션 상태를 함께 얹었기 때문에, **짧은 쪽 기준으로 정리될 때 긴 쪽 정보가 함께 사라진다.**

그 결과 **활성 채팅 세션의 실질적 상태는 DB 가 아니라 소켓 메모리(room 멤버십)에만 존재한다.**
서버가 재시작되면 통째로 사라지며, 다중 인스턴스에서는 공유되지 않는다 —
[O11](#o11-수평-확장을-막는-4개-지점) 의 인메모리 상태 문제와 같은 뿌리다.

**개선안**

1. **단기** — `disconnecting` 에서도 상태를 갱신해 비대칭을 없앤다.
   `socket.rooms` 에서 roomId 를 꺼내 쓰면 되지만, 현상 ② 때문에 효과는 제한적이다.
2. **근본** — 채팅 세션을 별도 테이블로 분리한다.
   `chat_sessions(room_id, status, started_at, ended_at)` 형태로 두어 큐는 매칭까지만 책임지게 한다.
   [마이그레이션 계획](../project/migration-plan.md)의 정규화 범위와 방향이 같다.

**측정 방법**

1. 45초 이상 채팅한 뒤 나가기 버튼 → 갱신된 행 수가 **0건**임을 확인 (현상 ② 재현)
2. 브라우저 강제 종료 → 큐 행 `status` 가 `matched` 로 남는지 확인 (현상 ① 재현)
3. 개선 후 두 경우 모두 세션 상태가 `ended` 로 남는지 확인

> 재현 시 **나가기 버튼으로만 테스트하면 드러나지 않는다.** 짧은 채팅에서는 정상 동작하기 때문이다.

---

## 관련 문서

- [성능 측정](README.md) — 측정 원칙, S1~S7 기록
- [기술 도입 검토 및 기각 기록](../project/tech-adoption-review.md) — Kafka·Spark·ES·GraphQL
- [알려진 이슈](../project/known-issues.md) — 이월 과제
- [마이그레이션 계획 요약](../project/migration-plan.md) — TEL-6
