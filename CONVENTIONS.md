# 기술 규약 및 아키텍처

telepathy-app의 구조·기술스택·코딩 규약. 마이그레이션 로드맵은 [CLAUDE.md](CLAUDE.md) 참조.

---

# A. 아키텍처

## A.1 전체 구성

```
[브라우저] ──HTTP /api──▶ [Express 5 + TS]  ──▶ [Supabase PostgreSQL]
    │                          │
    └────Socket.IO─────────────┘
```

- 프론트는 **Vite로 빌드 → `telepathy-front/dist`를 Express가 정적 서빙**한다.
  즉 운영에서는 **API와 웹이 같은 오리진(:5000)** 이다.
- 개발 중에는 Vite dev(5179)가 `/api`를 `:5000`으로 프록시한다.
  `vite preview`에는 프록시 설정이 없어 API 호출이 실패하므로, prod 동작 확인은 `npm start` → `localhost:5000`.

## A.2 디렉터리

```
telepathy-app/
├─ server/
│  ├─ index.ts              진입점 — HTTP + Socket.IO 서버, io.use 인증
│  ├─ app.ts                Express 앱 — CORS·미들웨어·라우트 마운트·정적 서빙
│  ├─ env.ts                .env 로더 (⚠️ 반드시 최상단 import)
│  └─ src/
│     ├─ routes/            *.routes.ts — 도메인별 REST
│     ├─ middleware/        auth.ts(decodeToken/requireMember/requireSession), validateRefund.ts
│     ├─ config/            supabase.ts(싱글턴), chat.socket.ts(매칭·채팅 핸들러)
│     └─ utils/             round.ts(15초 라운드), flush.ts, badwords.ts, logger.ts …
├─ telepathy-front/         현 활성 프론트 (React 19 + Vite + TS)
│  └─ src/
│     ├─ pages/ components/ contexts/ hooks/ games/ utils/
│     ├─ config/socket.ts   소켓 싱글턴 (autoConnect: false)
│     ├─ themes/base/tokens.css   디자인 토큰 SSOT
│     └─ types/             @shared 재노출 + 프론트 전용 타입
├─ client/                  ⚠️ 레거시 프론트 — 신규 작업 금지
├─ shared/                  공유 계약 타입 (타입 전용, 런타임 코드 0)
└─ docs/                    성능 베이스라인 등
```

**UI/디자인 작업은 `telepathy-front`.** `client/`는 telepathy-front로 대체된 레거시다.

## A.3 인증 구조

JWT를 **`token` 쿠키**(HttpOnly)에 담아 회원·게스트가 **같은 쿠키를 공유**한다.
구분은 페이로드의 `role` 필드로 한다.

```ts
// 회원   jwt.sign({ user_id, username, role: 'member' })
// 게스트 jwt.sign({ user_id, nickname, role: 'guest' })
```

`server/src/middleware/auth.ts`가 단일 해석 지점이다.

| 함수 | 용도 |
|---|---|
| `decodeToken(token)` | 검증 + `SessionUser` 반환. 실패는 예외가 아닌 **`null`** |
| `requireMember` | 회원 전용 (마이페이지·결제·확성기) |
| `requireSession` | 회원 + 게스트 (신고·피드백) |

- **HTTP와 Socket.IO가 `decodeToken`을 공유**한다 (`server/index.ts`의 `io.use`).
- ⚠️ **`role` 없는 구 토큰은 `member`로 간주**(하위 호환). 게스트 토큰 발급·재발급 시
  `role: 'guest'`를 빠뜨리면 게스트가 회원으로 오인된다.
- ⚠️ 게스트는 **`users` 테이블에 행이 없다** → FK 제약이 걸린 컬럼에 게스트 id를 넣을 수 없다.

## A.4 매칭·채팅 (Socket.IO)

```
15초 라운드(round.ts: Math.floor(now/15000))
  → client emit 'join_match' { nickname, word, round }
  → 서버: telepathy_sessions_queue 에 waiting 등록
  → 같은 word+round 의 다른 waiting 조회
  → 있으면 매칭 성사 (나중에 join 한 쪽 핸들러에서 실행)
      · 양쪽 status='matched', room_id 부여
      · telepathy_sessions_log 기록
      · word_history 기록 (회원만)
      · 양쪽 socket.join(roomId) 후 'matched' emit
```

**매칭 블록은 두 번째 참가자의 핸들러에서 한 번만 실행된다.** 이 컨텍스트에서
`me`는 나중에 들어온 쪽, `partner`는 큐에서 조회한 먼저 들어온 쪽이다.

## A.5 디자인 시스템

`telepathy-front/src/themes/base/tokens.css`가 **단일 진실 공급원(SSOT)**.

- 기본 테마 = `:root` 토큰. 시즌 테마는 `body.halloween-mode{…}` 형태의 토큰 재정의.
- 컴포넌트는 `var(--token)`만 소비 → Tailwind arbitrary value로 사용.
  `className="bg-[var(--color-surface)]"`
- `src/index.css`의 `@theme inline`이 토큰을 Tailwind 유틸리티로 브리지한다 (`bg-surface` 등).
- **일회성 장식값**(그라디언트·마스킹테이프 등)은 토큰화하지 않고 컴포넌트에 리터럴로 둔다.

---

# B. 기술스택

| 영역 | 사용 |
|---|---|
| 서버 | Node.js + **Express 5** + TypeScript, 런타임 **tsx** |
| DB | Supabase PostgreSQL (`@supabase/supabase-js`) |
| 실시간 | Socket.IO 4 |
| 인증 | `jsonwebtoken` + `cookie-parser`, 해시 `bcrypt` |
| 결제 | `@portone/server-sdk` / `@portone/browser-sdk` + 계좌이체 웹훅 |
| 문자 | `solapi` (본인인증 OTP) |
| 스케줄 | `node-cron` |
| 프론트 | **React 19** + Vite + TS, `react-router-dom` 7 |
| 스타일 | **Tailwind v4** + CSS 변수 토큰 (preflight 미로드) |
| 아이콘 | `lucide-react` |
| 알림 UI | `react-toastify` |
| 린트/포맷 | `oxlint`, `prettier`(+`prettier-plugin-tailwindcss`) |

**향후 도입 예정**(TEL-6 확정): Zod(검증), Vitest+Supertest/RTL(테스트), Playwright(E2E), Capacitor(Android).
**도입하지 않는 것**: Next.js, NestJS, React Native, GraphQL, ORM 전환 → [CLAUDE.md](CLAUDE.md) 참조.

## B.1 Tailwind v4 주의점

- **preflight(전역 리셋)를 일부러 로드하지 않는다.** 기존 외관 보존이 목적.
  → `h1`/`p` 등의 UA 기본 여백이 살아 있으므로 **명시적으로 `m-0`·`mt-1` 등을 지정**한다.
  → `<input>`은 폰트를 상속하지 않으므로 `text-[12px]` 등을 직접 준다.
- **arbitrary value 안에 공백을 쓰면 안 된다.** 공백은 `_`로 바꾸거나 제거한다.
  ```
  ❌ bg-[linear-gradient(140deg, #f0c58f, #de87b2)]   // 클래스가 쪼개져 CSS 미생성
  ✅ bg-[linear-gradient(140deg,#f0c58f,#de87b2)]
  ```
- 클래스를 **동적으로 조합하지 않는다.** Tailwind는 소스에 있는 **완성된 문자열**만 스캔한다.
  색상 배열 등은 전체 클래스명을 리터럴로 나열할 것.

---

# C. TypeScript 규약

## C.1 `shared/` 사용 규칙

```
shared/
├─ domain.ts        도메인 모델 (WordHistoryItem, ChatInfo …)
├─ socketEvents.ts  소켓 이벤트 맵 + 페이로드
├─ api.ts           REST 요청/응답 DTO
└─ index.ts         배럴
```

- **`interface`/`type`만** — 런타임 값(함수·상수·클래스) 금지.
- 양쪽 모두 **`import type`** 으로 가져온다 → 컴파일 시 제거되어 tsx·Vite가 resolve할 필요 없음.
- 경로는 **`@shared/*` 별칭** (상대경로 `../../../` 금지).
  ```ts
  import type { WordHistoryItem } from '@shared/domain';
  ```
- 별칭 설정처: `server/tsconfig.json`·`telepathy-front/tsconfig.app.json`의 `paths`,
  `telepathy-front/vite.config.ts`의 `resolve.alias`.
- 프론트는 `src/types/index.ts` 배럴이 `@shared`를 재노출 + 로컬 타입(`AppSocket`, `storage`) 추가.

## C.2 타입 스타일 (정책: 실용적 균형)

- 객체·props는 `interface`, 유니온·별칭은 `type`. 컴포넌트 props는 `XxxProps`.
- **외부 경계는 "실제 쓰는 필드만" 타입 지정 + 경계에서 캐스팅.**
  Supabase·외부 API 응답 전체를 모델링하지 않는다.
- `any` 대신 **`unknown` + 내로잉** 우선. 불가피하면 `// TODO(types)`.
- 응답 객체는 **`satisfies XxxResponse`** 로 계약을 검증한다(타입은 넓히지 않음).

### ⚠️ 타입은 런타임 보증이 아니다

`res.json()`은 `Promise<any>`이고 `as`는 **런타임 검사가 없다.**
서버가 계약을 어기면 `string` 타입 자리에 `null`이 그대로 들어온다.

```ts
const data = (await res.json()) as WordHistoryResponse;  // 무검사
```

→ 외부 경계에서 온 값은 **사용처에서 방어**한다. (`?? ''`, `?.trim() || '익명'`,
배열은 `Array.isArray()` 확인)

## C.3 파일 · 네이밍

- `.ts` = 로직, `.tsx` = JSX, `.d.ts` = 전역 선언만.
- 라우트 `*.routes.ts`, 컴포넌트 PascalCase, 훅 `useXxx`.
- 마이그레이션 중에는 **파일명 변경 없이 확장자만 교체**(diff 최소화).

## C.4 서버 인터롭 (CJS/ESM 혼재)

- `require()`로 불리는 **단일값 export 모듈**은 **`export =`** 사용.
  `export default`면 런타임에 `{ default: x }`가 되어 깨진다.
- named export는 그대로 OK.
- `module`/`moduleResolution`: 서버 `nodenext`, 프론트 `bundler`.
  (TS7이 `node10`을 제거해 `nodenext` 필수)
- `env.ts`는 **진입점 최상단에서 import** — ESM 호이스팅 때문에 순서가 깨지면 `.env`가 늦게 로드된다.

---

# D. Supabase 사용 규약

## D.1 ⚠️ 에러는 예외가 아니라 반환값이다

`supabase-js`는 DB 오류를 **throw하지 않고 `{ data, error }`로 반환**한다.
`error`를 확인하지 않으면 `try/catch`가 있어도 **조용히 실패**한다.

```ts
// ❌ 실패해도 아무 일도 일어나지 않음
await supabase.from('t').insert([row]);

// ✅
const { error } = await supabase.from('t').insert([row]);
if (error) console.error('insert 실패:', error.message, row);
```

## D.2 null 비교

SQL 3값 논리 때문에 `= NULL`은 참이 될 수 없다. `.eq()`로는 null을 못 잡는다.

```ts
query.eq('partner_id', null)     // ❌ 항상 매칭 실패
query.is('partner_id', null)     // ✅ IS NULL
```

## D.3 기타

- 조회는 필요한 컬럼만 `.select('id, word, …')` — **수정 대상을 특정하려면 `id`를 반드시 포함**한다.
- 0/1건 조회는 `.maybeSingle()` (`single()`은 0건일 때 에러).
- 사용자 소유 리소스 수정은 **반드시 소유권 필터**를 함께 건다 (IDOR 방지).
  ```ts
  .update(patch).eq('id', id).eq('user_id', userId)
  ```
- 요청 바디(camelCase)와 DB 컬럼(snake_case)은 **다른 계약**이다.
  라우트에서 필드를 하나씩 옮기며 변환한다 — `req.body`를 통째로 넘기면
  클라이언트가 임의 컬럼을 덮어쓸 수 있다(mass assignment).

---

# E. 검증 명령

```bash
npm run typecheck                    # 서버 타입체크
npm start                            # 서버 실행 (prod 확인: localhost:5000)
npm run dev                          # 서버 tsx watch

cd telepathy-front
npx tsc -b                           # 프론트 타입체크
npx oxlint src/...                   # 린트
npm run dev                          # 5179
npm run build                        # 프로덕션 빌드
```

커밋 전 **서버·프론트 양쪽 타입체크**를 통과시킨다. `shared/` 변경은 양쪽에 영향을 준다.

---

# F. 알려진 이슈 / 이월 과제

- `/api/password/reset`에 본인인증(OTP) 게이팅 없음 → 계정탈취 위험
- 온라인 사용자 수 소스 이원화 (`index.ts` 수동 카운터 vs `chat.socket`의 `io.engine.clientsCount`)
- `telepathy_sessions_queue`에 `role` 컬럼이 없어 게스트 판별을 `username === user_id`로
  **간접 추론**하고 있다 → `actors` 구조 도입 시 해소
- `word_history`는 게스트 FK 문제로 `partner_id`를 null로 두는 임시방편 사용 중
- `MainPage`의 `setInterval(syncFromServer, 1000)` — 1초 폴링(분당 60요청)
- `client/`(레거시)는 `@shared` 경로 불일치로 tsc가 깨진다 (빌드는 type-only라 통과)
