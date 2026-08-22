# AGENTS.md

이 파일은 Telepathy 저장소에서 작업하는 모든 AI 에이전트의 공통 진입점이자 규칙의 단일 진실 공급원이다.
하위 디렉터리의 `AGENTS.md`는 해당 범위에서 이 규칙을 보완한다.

## 프로젝트 개요

Telepathy는 15초 안에 같은 관심 단어를 선택한 사용자를 연결하는 실시간 익명 채팅 서비스다.
웹 서비스가 운영 중이며 프론트·백엔드 분리, Redis 기반 실시간 상태 계층, Capacitor Android 확장을 진행한다.

## 언어 규칙

- 소통, 주석, 문서, 커밋 메시지는 한국어로 작성한다.
- 변수명, 함수명, 클래스명, 타입명, 상수명은 영어로 작성한다.
- 경로는 문서와 설정에서 `/`를 사용한다.

## 현재와 목표 구조

현재 운영 구조:

```text
브라우저 -> Express(정적 프론트 + REST + Socket.IO) -> Supabase PostgreSQL
```

목표 구조:

```text
웹(Cloudflare Pages) ─┐
Capacitor 앱 번들 ────┼─> API/Socket.IO(Lightsail Docker) -> Supabase
                      └───────────────────────────────> Redis
```

목표 구조는 수락된 설계지만 아직 구현 완료 상태가 아니다. 현재 상태와 다음 작업은
[`docs/project/status.md`](docs/project/status.md)를 확인한다.

## 기술 스택

| 영역        | 기술                                                           |
| ----------- | -------------------------------------------------------------- |
| 서버        | Node.js 24, Express 5, TypeScript, Socket.IO 4                 |
| 프론트      | React 19, Vite, TypeScript, TanStack Query                     |
| 스타일      | Tailwind CSS v4, CSS 변수 디자인 토큰                          |
| 데이터      | Supabase PostgreSQL                                            |
| 인증        | JWT, HttpOnly 쿠키; Capacitor용 Bearer 인증 도입 예정          |
| 검증        | Zod, TypeScript strict, Oxlint, Prettier                       |
| 테스트      | Vitest; Supertest/RTL/Playwright 확대 예정                     |
| 인프라 목표 | Cloudflare Pages, AWS Lightsail, Docker, Redis, GitHub Actions |

## 디렉터리 지도

| 경로               | 책임                              | 추가 규칙                                                          |
| ------------------ | --------------------------------- | ------------------------------------------------------------------ |
| `server/`          | Express, Socket.IO, 도메인 서비스 | [`server/AGENTS.md`](server/AGENTS.md)                             |
| `telepathy-front/` | 활성 React/Vite 프론트            | [`telepathy-front/AGENTS.md`](telepathy-front/AGENTS.md)           |
| `shared/`          | REST·Socket 공유 계약 타입        | [`docs/conventions/typescript.md`](docs/conventions/typescript.md) |
| `supabase/`        | SQL migration과 운영 전환         | [`supabase/AGENTS.md`](supabase/AGENTS.md)                         |
| `docs/`            | 아키텍처, 결정, 규약, 측정        | [`docs/README.md`](docs/README.md)                                 |
| `.claude/issues/`  | 기존 기능별 인계 메모             | [`docs/domain/README.md`](docs/domain/README.md)                   |

## 최초 설정과 실행

```bash
npm run setup
npm run dev:server
npm run dev:front
```

- 서버: `http://localhost:5000`
- 프론트 개발 서버: `http://localhost:5179`
- 서버 환경변수는 `.env.example`, 프론트 환경변수는 `telepathy-front/.env.example`을 기준으로 각각 `.env`에 설정한다.
- 실제 비밀값과 개인정보는 절대 커밋하지 않는다.

## 검증 명령

```bash
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
npm run verify
```

단일 테스트:

```bash
npx vitest run server/tests/round.test.ts
```

`npm run verify`는 커밋 또는 PR 전 최종 기준이다. 작업 범위가 작더라도 관련 타입체크와 테스트는 먼저 실행한다.

## 절대 규칙

### TypeScript

- 명시적 `any`를 사용하지 않는다. `unknown`으로 받은 뒤 Zod 또는 타입 가드로 좁힌다.
- `@ts-ignore`를 사용하지 않는다.
- 불가피한 타입 예외는 `@ts-expect-error`와 사유·이슈 번호를 함께 남긴다.
- 외부 입력과 외부 API 응답에 검증 없는 `as SomeType`을 사용하지 않는다.
- `as const`, 검증 이후의 제한된 assertion, 생성 코드의 assertion은 허용한다.
- 응답 계약은 가능한 경우 `satisfies`로 검증한다.
- 타입 전용 의존성은 `import type`을 사용한다.
- `shared/`는 기본적으로 타입 전용이다. 승인된 런타임 예외는 `shared/seo.ts`뿐이다.

### 보안과 데이터

- `.env`, 토큰, 전화번호, 실명, 대화 원문, DB dump를 커밋하거나 로그에 노출하지 않는다.
- Supabase 응답의 `{ data, error }`에서 `error`를 반드시 처리한다.
- 외부 입력은 신뢰하지 않고 경계에서 검증한다.
- 결제·아이템 원장·신고·채팅 로그의 영속 원본은 PostgreSQL이다.
- Redis에는 재생성 가능한 휘발성 상태만 둔다.

### 변경 안전성

- 기존 사용자 변경을 덮어쓰거나 관련 없는 파일을 정리하지 않는다.
- 적용된 migration을 수정하지 않는다. 항상 새 migration을 추가한다.
- 생성 파일 `server/src/types/database.types.ts`를 직접 수정하지 않는다.
- 버그 수정에는 가능한 한 실패를 재현하는 테스트를 먼저 추가한다.
- 기능 플래그를 추가할 때 제거 조건과 관련 이슈를 기록한다.

## 아키텍처 경계

서버 목표 의존성 방향:

```text
Route -> Controller -> Validation(Zod) -> Service -> Repository -> External Service/DB
```

- Route에서 Supabase를 직접 호출하는 신규 코드를 추가하지 않는다.
- Controller는 HTTP 변환을, Service는 도메인 규칙을, Repository는 데이터 접근을 담당한다.
- 프론트 UI는 Supabase에 직접 접근하지 않고 API/Socket 계약을 사용한다.
- API와 Socket 이벤트 계약 변경 시 `shared/`와 소비자 양쪽을 함께 수정한다.
- 캐시는 원본 데이터의 소유자가 아니다. 캐시 무효화와 장애 동작을 설계에 포함한다.

## 작업별 필독 문서

| 작업         | 먼저 읽을 문서                                                |
| ------------ | ------------------------------------------------------------- |
| 전체 구조    | `docs/conventions/architecture.md`, `docs/project/status.md`  |
| 인증         | `.claude/issues/auth.md`, `docs/adr/003-capacitor-auth.md`    |
| 매칭·채팅    | `.claude/issues/matching.md`, `.claude/issues/chat.md`        |
| DB migration | `docs/project/migration-plan.md`, `supabase/AGENTS.md`        |
| 프론트 UI    | `telepathy-front/AGENTS.md`, `docs/conventions/tech-stack.md` |
| 인프라·배포  | `docs/adr/`, `docs/runbooks/deployment.md`                    |
| 성능 최적화  | `docs/perf/README.md`, `docs/perf/optimization-backlog.md`    |

## Git과 커밋

브랜치와 상세 규칙은 [`docs/conventions/git.md`](docs/conventions/git.md)를 따른다.

커밋 형식:

```text
<type>(<scope>): <한국어 명사형 제목> (TEL-123)

왜 변경했는지 설명하는 본문
```

허용 타입은 `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `study`,
`revert`다. 에이전트가 만든 브랜치는 `codex/<type>/<issue>-topic` 형식도 허용한다.

`v3`는 운영 자동 배포 브랜치다. 문서 전용 예외 외에는 직접 push하지 않고 PR을 사용한다.

## 문서 동기화 규칙

| 변경            | 함께 갱신할 항목                                  |
| --------------- | ------------------------------------------------- |
| 환경변수        | `.env.example`, `telepathy-front/.env.example`    |
| API·Socket 계약 | `shared/`, 관련 문서와 테스트                     |
| DB 스키마       | `supabase/migrations/`, 생성 타입, migration 문서 |
| 아키텍처 결정   | `docs/adr/`                                       |
| 배포 절차       | `docs/runbooks/`                                  |
| 현재 단계 변경  | `docs/project/status.md`                          |

코드의 실제 동작과 기술 규칙은 저장소가 기준이다. Linear는 이슈 상태와 업무 우선순위의 기준이며,
중요한 결정은 ADR 또는 프로젝트 상태 문서에도 남긴다.

## 자주 발생하는 실수

- `vite preview`에는 API 프록시가 없으므로 현재 통합 운영 동작 확인에 사용하지 않는다.
- Supabase에서 null 비교는 `.eq()`가 아니라 `.is()`를 사용한다.
- Tailwind arbitrary value 내부에 공백을 넣거나 클래스명을 동적으로 조합하지 않는다.
- `env.ts`는 서버 진입점의 최상단에서 import한다.
- `shared/` 변경은 서버와 프론트 타입체크를 모두 요구한다.
- 현재 상대 `/api`와 `window.location.origin` 의존성은 Capacitor 전환 전에 제거해야 한다.
