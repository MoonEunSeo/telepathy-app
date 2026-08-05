# common — 응답 규약·RLS·DB·전환 순서

> 리니어 요약본. **다르면 리니어가 맞다.** 갱신 2026-08-05
> 원본: TEL-20 · TEL-27 · TEL-12 · TEL-11 · TEL-15 · TEL-6(계획안) · TEL-5(역할분담)

---

## 1. 지금의 교착 상태 (TEL-20)

`server/app.ts` 가 **레거시 라우트 14개를 마운트**하고 있고 전부 레거시 테이블을 직접 참조한다.

```
/api/auth · /api/register · /api/password · /api/verify-mvp · /api/auth/withdraw
/api/nickname · /api/user · /api/match · /api/word-history · /api/feedback
/api/report · /api/comments · /api/sp_payments · /api/webhook
+ src/config/chat.socket.ts (채팅 소켓)
```

`supabase/cutover/` 에 운영 전환 SQL 7단계가 준비돼 있으나, **`01-rename-legacy.sql` 이 테이블 15개를 `legacy_*` 로 개명하는 순간 위 라우트가 전부 대상을 잃는다.** 매칭·채팅·결제·신고가 동시에 죽는다.

반대로 `modules/auth`·`modules/phone` 은 완성됐는데 **마운트하지 못한다** — 운영 DB 에 V2 스키마가 없어서.

> **코드와 스키마가 서로를 기다리는 교착이다.** 2026-08-04, **운영 스키마 전환을 코드 이관 후로 미루기로 결정**했다. TEL-20 이 코드 쪽을 먼저 끝내 교착을 푼다.

### ⚠️ `.env` 커넥션은 하나다 — 중복 기재
`config/supabase.v2.ts` 는 `config/supabase.ts` **와 같은 인스턴스에 타입만 씌운 것**이라 두 계층이 항상 같은 DB 를 본다. 전환이 끝날 때까지 **v2-dev 를 보면 레거시가 깨지고 운영을 보면 V2 가 깨지는** 상태가 계속된다.

프로젝트 ref: v2-dev `gczftwqeulqzedcirqrr` / 운영 `brjfsvjutgirenreaofv`

---

## 2. 전환 순서

```
1-1 응답 규약(TEL-27) ← 선행. 규약 없이 모듈을 쓰면 나중에 다시 고쳐야 한다
      ↓
1-2 탈퇴 → 1-3 닉네임 → 1-4 게스트   (TEL-15 신원 잔여)
      ↓
2-1 마운트 전환(TEL-21) ← 선행. 응답 형식이 2-2~2-6 전부에 걸린다
      ↓
2-2 매칭 → 2-3 채팅        ← 채팅 세션이 매칭 성사에서 생성된다
      ↓
2-4 신고 · 2-5 결제 · 2-6 콘텐츠   ← 서로 독립, 병렬 가능
      ↓
cutover SQL 7단계 실행 (별건)
```

각 항목은 같은 패턴을 따른다 — **스키마(Zod) → repository → service → controller → route → 검증 스크립트.**

**항목마다 PR 을 따로 연다.** 한 번에 올리면 리뷰가 불가능하고 롤백 단위도 사라진다.

> **타입체크만으로는 부족하다.** TEL-15 에서 타입체크를 통과하는데 동작이 틀린 상태가 **세 번** 나왔고(`bcrypt.compare` 블록 소실 · `.eq()` 컬럼명 미수정 · `maxAge` 오타) 셋 다 검증 스크립트가 잡았다. **항목마다 스크립트를 남긴다.**

---

## 3. 공통 응답 규약 (TEL-27 / PR #19)

레거시는 응답 형태가 라우트마다 달랐다 — `{success}` · `{error}` · `{active}` · `{exists}` · `{count}` · 배열 그대로 · **`user_id`·`id`·`userId` 셋 중 아무거나**. 프론트가 `data.user_id || data.id || data.userId` 로 받고 있어 **서버가 무엇을 주는지 아무도 몰랐다** (확인 결과 준 적 있는 건 `userId` 하나뿐).

### 방침 — 봉투를 더한다 (점진)
최종 형태는 §35 그대로 가되 **최상위 `message` 를 한시 병기**한다. 프론트는 화면 단위로 옮겨가고, **마지막 도메인(TEL-26)에서 걷어낸다.**

> **전면 교체를 안 한 이유**: 프론트 전 화면을 동시에 고쳐야 하는데, **2-1 의 마운트 전환(로그인이 죽을 수 있는 작업)과 겹치면 무엇 때문에 깨졌는지 가려낼 수 없다.**

### 구성
`shared/errorCodes.ts`(코드 단일 출처) · `shared/api.ts`(`ApiSuccess<T>`·`ApiError`·`ApiResponse<T>`) · `AppError.code` · `middleware/requestId` · `errorHandler` 변환 · **`utils/respond.sendOk`(성공 응답 단일 출구)**

### 설계 판단
- **`code` 를 `message` 앞에 뒀다.** 뒤에 두고 선택 인자로 만들면 코드를 빠뜨린 곳이 조용히 남는다. `ErrorCode` 유니온이라 그 자리에 한글 문구를 넣으면 **컴파일이 막힌다.**
- **`sendOk` 로 감쌌다.** 과도기 필드를 컨트롤러마다 손으로 넣으면 걷어낼 때 빠뜨린 곳이 남는다. **지울 자리가 한 곳이어야 한다.**
- **4xx 는 로그를 남기지 않는다.** 남기면 일상적 실패가 오류 로그를 채워 진짜 장애가 묻힌다.
- **로그인 실패 4곳 전부 `INVALID_CREDENTIALS`** — 아이디 부재·불일치·잠금·정지를 구분해 흘리지 않는다.

### 타입체크가 잡은 것
`LoginResponse` 등을 `ApiSuccess<null>` 로 바꿨더니 **레거시 라우트 14곳이 깨졌다.** 레거시가 같은 타입을 성공·실패 양쪽에 쓰고 있었다 — `ApiResult` 가 `success: boolean` 이라 둘 다 통과했던 것. → 레거시 이름은 두고 V2 는 `AuthLoginResponse` 접두 이름. 레거시가 사라지면 짧은 이름을 물려받는다.

### 착수 전 가정 중 틀린 것 (기록)
초안에 *"프론트가 한글 `message` 문자열로 분기하는 곳이 있다"* 고 적었으나 **사실이 아니었다.** 저장소 전체에서 문자열 비교는 `useSocket.tsx:53` 하나뿐이고 채팅 메시지 중복 판정이라 무관. `error.code` 는 그대로 넣었다 — §35 가 요구하고, **앞으로의** 문자열 분기를 막기 위해.

### 검증
`npx tsx scripts/check-envelope.ts` **22항목.** 다른 `check-*-flow` 는 service 를 직접 부르지만 이건 **HTTP 응답 모양**을 봐야 해서 라우터를 메모리에서 띄운다(DB 안 씀).
핵심은 ⑨ — **응답의 `requestId` 로 서버 로그를 찾을 수 있는가.** 응답에만 넣고 로그에 안 남기면 이 기능은 쓸모없다.

---

## 4. RLS 전 테이블 비활성 (TEL-12, Urgent)

| 프로젝트 | RLS 비활성 |
|---|---|
| 운영 `Telepathy` | **14개** |
| `telepathy-v2-dev` | **52개 전부** → ✅ 조치 완료 |

**anon 키만으로 전 테이블의 행을 읽고 수정할 수 있다.** 노출 규모(`count(*)` 실측): 운영 `users` **1,191행**(`password_hash`·`phone`·`real_name`·`birthdate`) · `chat_logs` **8,222행** · `sp_payments` **131행**(환불계좌) · `telepathy_sessions_log` 12,351행.

> **익명 대화가 이 서비스의 핵심 가치인데 대화 내용과 매칭 상대가 노출 대상이다.**

### 애플리케이션 방어를 우회한다
Supabase 는 PostgREST(`/rest/v1`)·GraphQL(`/graphql/v1`) 엔드포인트를 공개한다. **이 경로는 Express 서버를 거치지 않는다.** 서버 미들웨어에서 아무리 인증해도 DB 계층에 접근제어가 없으면 통째로 건너뛴다. **층위가 다른 문제다.**

### ⚠️ RLS 를 켜고 정책을 잘못 쓰면 끈 것보다 위험하다
운영 `balance_game_logs` 는 유일하게 RLS 가 켜져 있어 **경고 목록에도 안 뜨는데 실제로는 열려 있다.**

| 정책명 | 적용 롤 | 명령 | 조건 |
|---|---|---|---|
| `service_role_all` | `public` | ALL | `true` |

**Postgres 에서 `public` 은 "public 스키마" 가 아니라 모든 롤이다.** 이름은 service_role 전용을 의도했으나 `to service_role` 이 빠져 **anon 포함 전원에게 전권**을 준다. 경고가 사라져 안전하다고 착각하게 된다.

운영 `users` 의 `auth.uid() = id` UPDATE 정책도 잔재다 — **자체 JWT 를 쓰는 이 프로젝트에서 `auth.uid()` 는 항상 NULL.**

### 정책을 만들지 않고 RLS 만 켜는 것이 정답이다 (실측 정정)
최초에 *"정책이 없으면 앱이 멈춘다"* 고 적었으나 **사실이 아니었다.**

| 최초 가정 | 실측 |
|---|---|
| 정책 없으면 앱이 멈춘다 | `service_role` 은 `rolbypassrls = true` → **검문 자체를 건너뛴다** |
| 정책 설계가 선행돼야 한다 | `telepathy-front/src` 에 Supabase 참조 **0건**, 저장소에 publishable 키 **0건** → 클라이언트 직접 접근 경로가 없어 **정책이 필요 없다** |

### 작업 순서
1. `payments.routes.ts` 를 싱글턴 import 로 교체 (**유일하게 publishable 키를 썼다** — 이대로 켜면 확성기 구매가 깨진다) → 커밋 `7da7362` 로 완료
2. `config/supabase.ts` 의 `|| process.env.SUPABASE_KEY` 폴백 제거
3. 배포 후 **확성기 구매 정상 동작 확인** — RLS 를 켜기 **전에** 해야 원인 구분이 가능하다
4. v2-dev 부터 적용 (리허설) → ✅ 완료
5. 운영 적용 + 위험 정책 2개 제거
6. `anon`·`authenticated` 권한 회수

```sql
alter table public.<테이블명> enable row level security;
drop policy if exists "service_role_all" on public.balance_game_logs;
drop policy if exists "Allow users to update own nickname" on public.users;
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
```

- `alter default privileges` 는 **앞으로 만들 테이블**에도 적용된다. v2-dev 는 마이그레이션으로 테이블을 계속 추가하므로 특히 중요.
- ⚠️ **신규 테이블은 권한은 자동 차단되지만 RLS 는 자동으로 켜지지 않는다.** `create table` 시 `enable row level security` 를 함께 실행하는 것을 규칙으로 둔다.
- ⚠️ **TEL-12 는 테이블만 다뤘고 함수는 범위 밖이었다.** Postgres 는 새 함수에 `PUBLIC` 실행 권한을 자동으로 주고 Supabase 는 `anon`·`authenticated` 에 명시적으로 `EXECUTE` 를 부여한다. **운영에 RLS 를 적용할 때 함수 권한도 같이 봐야 한다.**
- ! **운영 DB 변경이므로 5·6 단계는 실행 전 PM 합의가 필요하다.**
- 계획안 §34 에 **RLS 규정이 아예 없다**(언급 0건). 신규 테이블 기준 추가 여부는 PM 판단.

---

## 5. DB 구조 — V2 핵심 (TEL-11)

36테이블 / 마이그레이션 5개 + RLS 1개 + 공백보완 1개. **이 저장소 최초의 SQL 마이그레이션 체계.**

- **`actors`** — 회원·게스트·탈퇴자를 하나의 신원 공간으로 통합. 활동 테이블 FK 가 `users` 가 아닌 `actors.id` 를 참조
- **매칭 3계보 통합** — 사건 1건 = 세션 1행 + 참여자 2행 (기존은 queue 2행 + log 2행)
- **`room_id` 타입 통일** — uuid/text/varchar 혼용 → uuid
- **FK 전면화** — 15테이블 중 4개만 있던 FK 를 전 관계에 적용
- **시각 통일** — `timestamptz` UTC (기존은 4가지 컬럼명 + KST 값 저장 혼재)

**DB 기능 테스트 127건 전량 통과.** 그중 **"막혀야 할 것이 막히는지" 56건**(44%). DB 가 새로 막는 것: 닉네임·전화번호 중복, 그 방에 없던 사람의 신고·피드백, 은행 알림 중복 처리, 처리자 없는 신고 완료, **활동 기록 있는 회원의 물리 삭제**, 동시 중복 매칭, 시즌 테마 기간 겹침.

### 계획안과 다르게 결정한 것

| # | 결정 | 이유 |
|---|---|---|
| 1 | `legacy_user_id`·`legacy_room_id` 추적 컬럼 추가 | 4만여 행 이전의 멱등성·검증·롤백에 필요 |
| 2 | 동시매칭 1건 제한을 **조건부로** (`finished_at is null`) | §15.2 를 문자 그대로 적용하면 **과거 이력끼리 충돌해 Backfill 자체가 불가능** |
| 3 | `words` 를 Phase 5 → **Phase 2 로 이동** | `match_attempts.word_id` 가 참조 |
| 4 | 탈퇴 시 전화번호를 NULL 이 아닌 **결정적 해시로 치환** | NULL 로 지우면 §8.1 중복가입·정지자 재가입 차단이 불가능 |
| 5 | 유료 단어세트 결제의 `order_items` 미생성 | §27.2 에서 제거된 BM. 결제 이력만 회계 목적 보존 |
| 6 | **게스트 데이터를 V2 로 이전하지 않음** | 운영 판단. actor 587·매칭시도 4,034·메시지 172 제외. **레거시 원본은 보존** |
| 7 | `word_bookmarks` 신설 · `payments` 에 환불계좌 컬럼 추가 | 계획서에 자리가 없어 앱 계층에서 막히는 지점 |

### 리허설이 찾아낸 것 — 가짜 데이터로는 안 나왔던 것들
1. **게스트 586명이 "탈퇴 회원" 으로 오분류**되고 있었다. 레거시 앱이 게스트 uuid 를 `user_id`·`partner_id`·`sender_id` 같은 **회원용 컬럼에도 그대로 기록**했다. 초기 분석 탈퇴 833명 → **실제 255명**, actors 2,610 → **2,033**
2. **매칭 기록 없는 채팅방 116개** (메시지 2,221건 = 27.2%) → `chat_logs` 를 1차 원본으로 전량 복구
3. **입금 웹훅 129건 중 주문에 연결된 기록 0건** — 복원 불가
4. NULL 시각 — `emotion_feedback.created_at` **303건 중 266건(88%)**, `telepathy_sessions.created_at` 133건, `chat_logs.timestamp` 6건
5. 운영에 테스트 데이터 혼입 (`testroom`, 인코딩 깨진 사유)

### Backfill 델타가 벌어지고 있다
리허설 이후에도 운영이 계속 동작해 **하루 약 22건씩** 차이가 커진다. 전체 전환 시 **델타 재 Backfill** 이 필요하고, 그 소요가 §40 점검 한도(60분) 안에 드는지 리허설에서 실측해야 한다.

---

## 6. 착수 전 확인 목록 (TEL-20 §6 / TEL-16 §5)

- **`chat_sessions`·`match_rounds` 의 `status` DEFAULT 가 `'ENDED'`** → 매칭 착수 전 `'READY'`/`'SCHEDULED'` 로 교정 필요
- **`balance_game_choices`·`session_reconnect_grants` 가 단일 FK** → 교차 세션 참조가 통과한다
- **`words.category_id`** — 참조 테이블이 없고 643행 전부 NULL
- **`record_item_purchase` 는 재작성 대상** (PG 전제라 계좌이체 2단계에 안 맞음). `item_balance`·`consume_item` 은 그대로 쓴다
- **확성기 구매 복구** — 웹훅 수신부·계좌이체 생성은 있으나 단어세트 전용이고 재화를 지급하지 않는다
- **단어장(MyWords) 존폐 미결** → 콘텐츠 착수 전 결정
- **`legacy_actor_map` GUEST 587행이 유령 actor 를 가리킨다** → 게스트 착수 전 정리
- **`session_feedback.emotion`·`users.gender` CHECK 에 한글 UI 문구가 박혀 있다**

---

## 7. 미해결 보안 — 중복 기재

- **TEL-13 JWT 원문 평문 로그** (Urgent) → [matching.md](matching.md) [auth.md](auth.md)
- **TEL-14 `/session-status` 인증 누락** → [matching.md](matching.md)
- ~~**TEL-17 회원가입 쿠키 `secure:false`**~~ — ✅ **해소.** `fix/tel-17-cookie-policy`·`refactor/unify-cookie-options` 가 v3 에 머지돼 있다(2026-08-05 확인). **리니어 이슈 상태만 Backlog 로 낡아 있으니 Done 으로 옮길 것** → [auth.md](auth.md)
- **service_role 키 교체 필요** — 작업 중 키 일부가 대화에 노출됐다. Supabase 회전 → Render 환경변수 → 재배포
- **비밀번호 찾기에 SMS 인증이 없다** — 지금 운영에서 아무나 남의 비밀번호를 바꿀 수 있다 → [auth.md](auth.md)

---

## 8. 아직 없는 것

- **자동 테스트 0건.** Vitest + Supertest 하네스가 없다(§38 별도). 검증은 전부 `scripts/check-*-flow.ts` 로 한다
- Playwright E2E — 앱 계층 이행 후 가능
- Feature Flag 기반 단계 전환 (§39 5단계)
- Refresh Token / Rate Limit
- **`apps/` 디렉터리 이동** — §5 최종 목표는 `apps/server/src/modules/...` 다. 프론트·빌드 설정까지 건드리므로 **모듈 구조를 먼저 도입하고 이동은 나중에** 기계적으로 처리한다

---

## 9. 산출물 위치

| 경로 | 내용 |
|---|---|
| `supabase/migrations/` | V2 스키마 DDL. **파일 4건인데 DB 에는 11건** — 앞의 7건은 디렉터리가 생기기 전에 적용돼 Supabase 에만 있다 |
| `supabase/cutover/` | 운영 전환 SQL 7단계. 리허설 검증 완료(45,696행 백업 대상) |
| `supabase/tests/` | 테스트 하네스 + 127건 |
| `scripts/backfill/` | ⚠️ **커밋 금지** — 실전화번호 1,192건·실명 23건·대화 8,003건 |
| `docs/db/` | 설계 가이드 · 레거시↔V2 대조표 · 테스트 케이스 |

> 마이그레이션 재생성이 필요하면 **Claude/MCP 로 뽑는 것이 안전하다.** CLI 의 `>` 리다이렉트가 실행 전에 파일을 비워서, 로그인이 안 된 상태면 **파일이 0바이트가 된다**(실제로 겪음).
