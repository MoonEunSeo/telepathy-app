# telepathy

> 같은 단어를 떠올린 사람끼리 익명으로 대화하는 서비스.

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 5">
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO 4">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
</p>

**Live** · <https://telepathy.my>

---

## 어떻게 동작하나

서비스는 **15초 라운드**로 돈다. 라운드마다 단어 세트가 바뀌고, 사용자는 그중 하나를 고른다.

```
라운드 N (15초)
  │
  ├─ 사용자 A 가 "바다" 선택  →  대기열 등록 (waiting)
  ├─ 사용자 B 가 "바다" 선택  →  대기열에서 A 를 찾음 → 매칭 성사
  │                              · 양쪽 status = matched, 같은 room 배정
  │                              · 양쪽 소켓에 'matched' 전송
  └─ 채팅방으로 이동 — 서로의 신원은 닉네임뿐
```

매칭 **판정**은 DB 대기열에서 일어나지만, **통지**는 소켓이 맡는다.
먼저 단어를 고른 쪽은 자신이 아무 동작도 하지 않은 시점에 매칭되기 때문에,
서버가 능동적으로 알려주지 않으면 폴링 외에는 방법이 없다.

회원가입 없이 **게스트로도 참여**할 수 있다.

---

## 아키텍처

```
                    ┌──────────────────────────────┐
   브라우저  ──────▶ │   Express 5 + TypeScript     │ ──▶ Supabase PostgreSQL
      │             │                              │
      │  REST /api  │  ├ /api/*      REST           │
      │             │  ├ /socket.io  Socket.IO      │
      └─ WebSocket ─┤  └ /*          dist 정적 서빙  │
                    └──────────────────────────────┘
```

Vite 빌드 결과(`telepathy-front/dist`)를 Express 가 직접 서빙한다.
즉 운영에서 **웹과 API 가 같은 오리진**이며, 배포 단위는 하나다.

이 구조 덕분에 `token` 쿠키 하나로 **HTTP 와 Socket.IO 인증을 공유**한다.
검증은 `server/src/middleware/auth.ts` 의 `decodeToken` 한 곳에서만 이뤄지고,
회원과 게스트는 같은 쿠키를 쓰되 페이로드의 `role` 로 구분된다.

통신 채널은 성격으로 나눈다.

| 채널 | 담당 |
|---|---|
| REST | 요청-응답으로 끝나는 것 — 로그인·회원가입·결제 검증·신고·기록 조회 |
| Socket.IO | 서버가 먼저 알려야 하는 것 — 매칭 통지·채팅·확성기·라운드 전환 |

자세한 내용은 [아키텍처 문서](docs/conventions/architecture.md)를 참조한다.

---

## 기술 스택

| 영역 | 사용 |
|---|---|
| 서버 | Node.js + **Express 5** + TypeScript, 런타임 **tsx** |
| DB | Supabase PostgreSQL (`@supabase/supabase-js`) |
| 실시간 | Socket.IO 4 |
| 인증 | `jsonwebtoken` + `cookie-parser`, 해시 `bcrypt`, 검증 `zod` |
| 결제 | 계좌이체 + 은행 알림 웹훅 (PG 는 계획안 §27.1 로 범위 밖) |
| 문자 | `solapi` (휴대폰 인증 OTP) |
| 스케줄 | `node-cron` |
| 프론트 | **React 19** + Vite + TS, `react-router-dom` 7, TanStack Query |
| 스타일 | **Tailwind v4** + CSS 변수 토큰 (preflight 미로드) |
| 린트/포맷 | `oxlint`, `prettier` |

전체 목록과 주의점은 [기술스택 문서](docs/conventions/tech-stack.md)에 있다.

---

## 시작하기

```bash
npm install
npm run build        # 프론트 프로덕션 빌드
npm start            # 서버 실행 (빌드된 프론트 + API) → localhost:5000
```

개발 중에는 서버와 프론트를 따로 띄운다.

```bash
npm run dev                          # 서버 (tsx watch)
cd telepathy-front && npm run dev    # 프론트 (5179, /api → :5000 프록시)
```

커밋 전 **양쪽 타입체크**를 통과시킨다. `shared/` 변경은 서버·프론트 모두에 영향을 준다.

```bash
npm run typecheck                    # 서버
cd telepathy-front && npx tsc -b     # 프론트
```

> `vite preview` 는 프록시 설정이 없어 `/api` 호출이 실패한다.
> 프로덕션 동작 확인은 `npm start` → `localhost:5000` 에서 한다.

### 환경 변수

서버는 `server/env.ts` 가 `.env` 를 로드한다 — **모든 진입점의 최상단에서 import 해야 한다.**

```
SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY   # 서버만 보유. 프론트는 DB 에 직접 접근하지 않는다
JWT_SECRET
SOLAPI_API_KEY · SOLAPI_API_SECRET · SENDER_PHONE   # 문자 발송 (발신번호 사전등록 필요)
ACCOUNT_SECRET_KEY                                  # 환불 계좌 암호화. 없으면 부팅 거부
```

---

## 디렉터리

```
telepathy-app/
├─ server/
│  ├─ index.ts              진입점 — HTTP + Socket.IO, io.use 인증, 라운드 타이머, cron
│  ├─ app.ts                Express 앱 — 미들웨어·라우트 마운트·정적 서빙
│  └─ src/
│     ├─ modules/auth/      계층 분리 모듈 (route→controller→service→repository)
│     ├─ routes/            *.routes.ts — 도메인별 REST
│     ├─ middleware/        auth · validate · errorHandler
│     ├─ errors/            AppError
│     ├─ config/            supabase · chat.socket (매칭·채팅 핸들러)
│     └─ utils/             round(15초 라운드) · flush · badwords · logger
├─ telepathy-front/         현 활성 프론트 (React 19 + Vite)
├─ client/                  ⚠️ 레거시 — 신규 작업 금지
├─ shared/                  client↔server 공유 계약 타입 (런타임 코드 0)
├─ supabase/migrations/     DB 함수·스키마 SQL
└─ docs/                    아키텍처·규약·성능 측정 문서
```

**UI 작업은 `telepathy-front`** 에서 한다. `client/` 는 대체된 레거시다.

---

## 문서

작업 전에 해당 영역 문서를 확인한다.

| 문서 | 내용 |
|---|---|
| [아키텍처](docs/conventions/architecture.md) | 전체 구성·인증 구조·매칭 흐름·디자인 토큰 |
| [기술스택](docs/conventions/tech-stack.md) | 사용 라이브러리·Tailwind v4 주의점 |
| [TypeScript 규약](docs/conventions/typescript.md) | `shared/` 사용법·타입 스타일 |
| [Supabase 규약](docs/conventions/supabase.md) | 에러 처리·null 비교·소유권 필터 |
| [Git 규약](docs/conventions/git.md) | 브랜치·커밋 형식·PR 기준·`v3` 자동배포 주의 |
| [성능 측정](docs/perf/README.md) | 측정 원칙과 개선 기록 (S1~S7) |
| [최적화 백로그](docs/perf/optimization-backlog.md) | 발견했으나 미착수한 개선 지점 (O1~O13) |
| [마이그레이션 계획](docs/project/migration-plan.md) | DB 정규화 계획 (TEL-6) |
| [알려진 이슈](docs/project/known-issues.md) | 이월 과제 |

### 자주 걸리는 함정

- **Supabase 는 DB 오류를 예외가 아닌 `{ data, error }` 반환값으로 준다** → `error` 확인이 없으면 조용히 실패한다
- **`.eq()` 로는 null 을 잡을 수 없다** (SQL 3값 논리) → `.is()` 를 쓴다
- **Tailwind arbitrary value 안에 공백을 넣지 않는다.** 클래스를 동적으로 조합하지 않는다
- **`as` 는 런타임 검사가 없다** → 외부 경계 값은 사용처에서 방어한다

---

## 진행 중

DB 를 정규화하고(14 → 53 테이블) 서버를 계층 구조로 이행하는 작업이 진행 중이다.
로그인 하나에 입력 검증·HTTP 응답·DB 접근·토큰 발급이 한 함수에 몰려 있던 것을
`route → controller → service → repository` 로 분리하고 있다.

배포는 `v3` 브랜치를 Render 가 자동 배포한다.
**계보 브랜치에 직접 push 하지 않는다** — 작업은 브랜치에서 하고 PR 로 합친다.
자세한 기준은 [Git 규약](docs/conventions/git.md)에 있다.
