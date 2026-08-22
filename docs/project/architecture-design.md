# 설계: 웹·API 분리와 Redis·Capacitor 확장 아키텍처

- 작성일: 2026-08-22
- 상태: 확정
- 기준 문서: `AGENTS.md`, `docs/adr/001~003`, `docs/project/status.md`
- 범위: 아키텍처와 전환 순서
- 제외: 이번 설계 단계에서 클라우드 리소스 생성과 애플리케이션 코드 구현

## 현재 구조 분석

### 장점

- React/Vite, Express/Socket.IO, Supabase의 책임이 코드 디렉터리 수준에서는 구분돼 있다.
- REST와 Socket 이벤트 타입을 `shared/`에서 함께 사용한다.
- HttpOnly 쿠키 인증을 HTTP와 Socket.IO가 같은 `decodeToken`으로 검증한다.
- 15초 라운드, 매칭, 채팅의 기존 동작이 운영 데이터와 함께 검증돼 있다.

### 개선 필요

- 운영 Express가 API·Socket.IO·Vite 정적 파일·SEO HTML 생성을 모두 담당한다.
- 프론트에 상대 `/api` 호출이 분산되어 있고 `fetch`와 `axios`가 혼재한다.
- Socket.IO 클라이언트가 `config/socket.ts`와 `hooks/useSocket.tsx`에서 각각 생성되며 운영 주소도 다르다.
- CORS origin이 서버 두 파일에 하드코딩돼 있다.
- 쿠키 정책은 같은 origin을 전제로 설명되어 있고 Capacitor용 Bearer 인증 경계가 없다.
- 접속자 수와 소켓 방 상태가 단일 Node 프로세스 메모리에 있다.
- Express의 동적 SEO 메타와 404 판정이 정적 Pages 전환 시 사라질 수 있다.
- 현재 원격 저장소에서 과거 운영 브랜치 `v3`가 삭제된 상태이므로 실제 Render 배포 연결을 재확인해야 한다.

## 아키텍처 설계

### 전체 구조

```text
사용자
  ├─ 웹: https://telepathy.my
  │      └─ Cloudflare Pages (Vite 정적 산출물 + 경로별 프리렌더 HTML)
  └─ 앱: Capacitor 로컬 번들
            │
            ├─ HTTPS REST
            └─ WSS Socket.IO
                  ▼
        https://api.telepathy.my
        Lightsail 인스턴스
          └─ Docker Compose
              ├─ reverse-proxy (TLS, access log, rate limit 보조)
              ├─ api (Express + Socket.IO)
              └─ redis (외부 포트 비공개)
                    │
                    └─ Supabase PostgreSQL (영속 원본)
```

초기 비용과 운영 복잡도를 낮추기 위해 AWS Lightsail **인스턴스 한 대**에 API와 Redis를 함께 둔다.
Lightsail Container Service나 EC2 Auto Scaling은 트래픽과 가용성 요구가 생긴 뒤 검토한다.

### 배포 단위

| 단위 | 산출물                   | 배포                     | 롤백                     |
| ---- | ------------------------ | ------------------------ | ------------------------ |
| 웹   | `telepathy-front/dist`   | Cloudflare Pages         | 직전 Pages deployment    |
| API  | Linux/amd64 Docker image | GHCR → Lightsail Compose | 직전 immutable image tag |
| 앱   | Android AAB/APK          | Capacitor 로컬 번들      | 스토어 staged rollout    |
| DB   | Supabase migration       | 별도 승인 단계           | forward fix 우선         |

API 이미지 태그는 `sha-<git-sha>`를 기준으로 하고 `latest`를 배포 기준으로 사용하지 않는다.

### 프론트 런타임 경계

```text
UI/Hook
  -> apiClient
      -> apiFetch 또는 axiosInstance
          -> runtimeConfig.apiBaseUrl
          -> authTransport
  -> socketClient
      -> runtimeConfig.socketUrl
      -> authTransport
```

목표 파일:

```text
telepathy-front/src/
├─ config/
│  ├─ runtime.ts          VITE_API_BASE_URL, VITE_SOCKET_URL 검증
│  └─ target.ts           web | native 판별
├─ lib/
│  ├─ apiClient.ts        fetch 공통 래퍼
│  ├─ axiosClient.ts      기존 axios 이행용 인스턴스
│  └─ authTransport.ts    웹 쿠키 / 앱 Bearer 전략
└─ config/socket.ts       유일한 Socket.IO 인스턴스 팩토리
```

환경별 값:

| 환경      | API                            | Socket                     | 인증           |
| --------- | ------------------------------ | -------------------------- | -------------- |
| 로컬 웹   | Vite proxy의 `/api`            | `http://localhost:5000`    | 쿠키           |
| 운영 웹   | `https://api.telepathy.my/api` | `https://api.telepathy.my` | 쿠키           |
| Capacitor | `https://api.telepathy.my/api` | `https://api.telepathy.my` | Bearer/refresh |

- 환경변수 누락 시 운영 빌드를 실패시킨다.
- 신규 코드에서 직접 `fetch('/api/...')`, 전역 `axios`, `window.location.origin`을 사용하지 않는다.
- 기존 호출은 기능별로 옮기되 최종적으로 검색 결과가 0건이어야 한다.
- `useSocket.tsx`의 별도 `io()` 생성을 제거하고 중앙 Socket 클라이언트를 사용한다.

### 서버 구조

```text
server/
├─ bootstrap/
│  ├─ http.ts             HTTP 서버 수명주기
│  ├─ socket.ts           Socket.IO 구성
│  └─ redis.ts            Redis 연결·종료·상태
├─ config/
│  └─ env.ts              Zod 기반 환경변수 검증
├─ app.ts                 API 미들웨어와 라우트만
└─ legacy-web.ts          전환 기간에만 정적 서빙, 제거 조건 명시
```

- `SERVE_WEB_STATIC=true`를 현재 Render 호환용 임시 플래그로 둔다.
- Lightsail에서는 `SERVE_WEB_STATIC=false`로 실행한다.
- `/healthz`는 프로세스 liveness만, `/readyz`는 Redis와 필수 설정 readiness를 반환한다.
- CORS는 `WEB_ORIGINS` 환경변수의 정확한 origin 목록에서 생성하고 REST와 Socket.IO가 공유한다.
- 프록시 뒤 실제 IP 처리를 위해 신뢰 가능한 hop 수로 `trust proxy`를 설정한다.
- 종료 시 신규 연결을 중단하고 HTTP, Socket.IO, Redis 연결을 순서대로 닫는다.

### 인증

공통 사용자 해석 함수는 전달 수단만 분리한다.

```text
웹 HTTP      token HttpOnly cookie ─┐
웹 Socket    Cookie header ─────────┼─> verifySessionToken -> SessionUser
앱 HTTP      Authorization Bearer ──┤
앱 Socket    handshake.auth.token ──┘
```

- 웹은 `telepathy.my` → `api.telepathy.my` 요청에 `credentials: include`를 사용한다.
- 쿠키는 API host-only, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`를 유지한다.
- 상태 변경 요청은 허용 origin 검증을 추가하고 앱 Bearer 요청에는 CSRF 검사를 적용하지 않는다.
- 인증이 필요한 Pages preview는 임의 `pages.dev` 대신 같은 site의 별도 preview 도메인을 사용한다.
- 앱 access token은 짧게 유지하고 refresh token은 Android Keystore/iOS Keychain 기반 저장소에 둔다.
- Socket connection state recovery에서도 인증 미들웨어를 생략하지 않는다.

### Redis 상태 관리

키 접두사:

```text
telepathy:{environment}:{domain}:{identifier}
```

| 상태                  | 자료구조          | 수명/제한                     | PostgreSQL 기록         |
| --------------------- | ----------------- | ----------------------------- | ----------------------- |
| Socket adapter stream | Redis Stream      | `maxLen` 제한                 | 없음                    |
| 복구 세션             | Adapter key/value | 60초                          | 없음                    |
| presence              | Sorted Set        | heartbeat + 만료 score        | 없음                    |
| 매칭 대기열           | Sorted Set/Hash   | 라운드 종료 + 여유 TTL        | 성사 결과만 기록        |
| rate limit            | String counter    | 정책별 TTL                    | 보안 이벤트만 선택 기록 |
| scheduler lock        | String NX         | 작업 시간보다 짧은 TTL + 갱신 | 작업 결과는 기존 DB     |

- Redis는 외부 인터넷에 노출하지 않고 Docker 내부 네트워크에서만 접근한다.
- 비밀번호, ACL과 메모리 상한을 설정한다.
- 현재 규모에서는 영속화(AOF/RDB)를 요구하지 않는다. 재시작 시 상태를 재생성한다.
- 매칭은 Lua script로 후보 선택·제거를 원자적으로 수행한다.
- Redis 장애 시 회원·조회 API는 유지하되 신규 매칭과 복구는 명시적 `503`/이벤트로 실패시킨다.
- `REDIS_ENABLED`, `REDIS_MATCHING_ENABLED` 플래그로 Adapter/매칭 이행을 분리한다.

### Socket.IO

- Redis Streams Adapter를 사용한다.
- connection state recovery는 60초, `skipMiddlewares: false`로 설정한다.
- 기존 `transports: ['websocket']`는 1차 전환에서 유지한다.
- 다중 API 인스턴스로 확장할 때는 로드밸런서의 sticky session 지원을 별도로 검증한다.
- `onlineUsers` 정수 증감 대신 TTL presence 집계를 사용해 프로세스 비정상 종료에도 수렴하게 한다.
- 복구 실패 시 클라이언트는 사용자 세션·방·라운드 상태를 REST/Socket 이벤트로 다시 동기화한다.

### SEO와 정적 라우팅

Express의 `renderIndexHtml()`을 제거하기 전에 빌드 단계 프리렌더로 대체한다.

```text
shared/seo.ts ROUTE_META
  -> build script
      ├─ 각 공개 경로의 index.html 생성
      ├─ title/description/canonical/OG 삽입
      ├─ /main -> / 301 규칙 생성
      └─ 404.html 생성
```

- Cloudflare Pages의 무조건적인 `/* /index.html 200` rewrite는 사용하지 않는다.
- 알려진 공개 라우트는 실제 HTML 파일로 만들고 미등록 경로는 `404.html`로 응답한다.
- 인증 후 화면은 `noindex` 정책을 유지한다.
- 기존 경로별 메타, canonical, soft-404 방지가 전환 성공 기준이다.

### CI/CD

PR:

```text
format -> lint -> typecheck -> unit/integration test -> web build -> api image build
```

merge 후:

```text
웹 변경 -> Cloudflare Pages preview/production
서버 변경 -> GHCR sha image -> SSH deploy -> /readyz -> smoke test
```

- GitHub Environment를 `preview`, `production`으로 분리한다.
- production은 승인과 concurrency lock을 둔다.
- 배포 스크립트는 새 이미지를 pull한 뒤 health check 성공 시에만 이전 컨테이너를 정리한다.
- 실패 시 이전 SHA로 Compose 변수를 되돌린다.

## 데이터 흐름

### 웹 로그인

```text
Pages 웹 -> API login (CORS + credentials)
         -> API host-only HttpOnly cookie 발급
         -> 이후 REST/Socket 요청에 쿠키 포함
```

### 앱 로그인

```text
Capacitor 번들 -> API login
              -> access + rotating refresh token
              -> refresh token은 secure storage
              -> REST Authorization / Socket handshake auth
```

### 매칭

```text
join_match -> 인증 사용자/round/word 검증
           -> Redis Lua 원자 매칭
           -> 미성사: TTL queue
           -> 성사: Socket room join + PostgreSQL 결과 기록
           -> 기록 실패: 매칭 취소 이벤트와 보상 처리
```

## 트레이드오프

| 선택                         | 장점                                      | 단점                      | 대안                                     |
| ---------------------------- | ----------------------------------------- | ------------------------- | ---------------------------------------- |
| Lightsail 인스턴스 + Compose | 저비용, Docker/Redis 운영 경험, 제어 단순 | 단일 장애 지점, 직접 패치 | ECS/Fargate, Lightsail Container Service |
| Redis 동거                   | 추가 서비스 비용 없음, 낮은 지연          | 인스턴스 장애와 함께 손실 | Upstash/ElastiCache                      |
| 웹 쿠키·앱 Bearer 분리       | 각 플랫폼 보안 모델에 적합                | 서버 인증 경로 2개        | `SameSite=None` 쿠키 통일                |
| Pages 정적 프리렌더          | CDN·SEO·404 유지                          | 빌드 스크립트 필요        | SSR/Next.js 전환                         |
| 단계적 정적 서빙 토글        | 무중단 검증·빠른 롤백                     | 과도기 코드 존재          | 즉시 완전 분리                           |

## 리스크와 완화 방안

- **DNS 전환 중 로그인 세션 단절**
  - 완화: API host와 쿠키 정책을 먼저 배포하고 Pages preview에서 실제 로그인 검증
- **Pages 전환 후 SEO/404 회귀**
  - 완화: 경로별 HTML과 404를 빌드 테스트하고 배포 전 `curl` smoke test
- **Redis 단일 장애**
  - 완화: 휘발 상태만 저장, 메모리 상한, 재시작 정책, 기능별 명시적 degrade
- **Socket 다중 인스턴스 오해**
  - 완화: 1차는 단일 API 인스턴스, 2개 인스턴스 부하 테스트 후에만 scale 증가
- **모바일 구버전 API 호환**
  - 완화: Capacitor 공개 전 `/api/v1` 계약, 최소 앱 버전 헤더와 deprecation 기간 정의
- **운영 브랜치 문서 불일치**
  - 완화: Render/GitHub 실제 연결을 확인해 배포 runbook의 branch SSOT를 먼저 수정

## 성공 기준

- [ ] 프론트에 직접 상대 `/api` 호출과 중복 Socket `io()` 생성이 없다.
- [ ] 운영 웹과 API를 서로 독립적으로 배포·롤백한다.
- [ ] Pages에서 공개 경로 메타와 알 수 없는 경로 404가 유지된다.
- [ ] API 이미지에는 프론트 산출물이 포함되지 않는다.
- [ ] Redis 장애 시 영속 데이터 손실 없이 명시적으로 기능이 저하된다.
- [ ] API 인스턴스 2개에서 broadcast, presence, 60초 복구가 일치한다.
- [ ] 웹 쿠키 인증과 Android Bearer/refresh 인증 회귀 테스트가 통과한다.
- [ ] 이미지 SHA 기반 배포와 이전 SHA 롤백이 자동화된다.

## 프로토타입 계획

UI 변경이 없는 인프라·런타임 아키텍처이므로 별도 UI 프로토타입을 만들지 않는다.

## 구현 순서

1. 프론트 `runtimeConfig`, API/axios 클라이언트, 단일 Socket 팩토리 도입
2. 직접 `fetch`/`axios`/별도 `io()` 호출을 중앙 클라이언트로 이전
3. 환경변수 검증, 공통 CORS origin, 정적 서빙 토글과 `/readyz` 도입
4. 경로별 정적 프리렌더와 Cloudflare Pages preview 구축
5. 백엔드 전용 Dockerfile, Compose, reverse proxy, GHCR CI 구축
6. Lightsail 단일 인스턴스에 preview API 배포 후 웹/API 분리 smoke test
7. Redis 연결, Streams Adapter, 60초 recovery, TTL presence 도입
8. Lua 기반 매칭 대기열을 feature flag로 전환
9. DNS를 Pages/API로 전환하고 Render 정적 서빙을 일정 기간 롤백 경로로 유지
10. Capacitor Android 프로젝트와 앱용 Bearer/refresh 인증 도입

## 공식 근거

- Socket.IO Redis Streams Adapter: https://socket.io/docs/v4/redis-streams-adapter/
- Socket.IO connection state recovery: https://socket.io/docs/v4/connection-state-recovery
- Cloudflare Pages serving behavior: https://developers.cloudflare.com/pages/configuration/serving-pages/
- Cloudflare Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- Capacitor configuration: https://capacitorjs.com/docs/config
- AWS Lightsail containers: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-container-services.html
