# ADR-001: 프론트·백엔드 배포 단위 분리

## 상태

수락됨 — 2026-08-22

## 맥락

현재 Express가 API, Socket.IO, `telepathy-front/dist` 정적 파일을 함께 제공한다. 이 구조는 단순하지만
프론트 CDN 배포, 독립 롤백, Capacitor 번들, 백엔드 수평 확장을 어렵게 한다.

## 결정

- React/Vite 소스는 유지하되 웹 정적 산출물과 API 서버를 독립 배포한다.
- 웹은 Cloudflare Pages, API/Socket.IO는 `api.telepathy.my`에서 제공한다.
- 백엔드는 AWS Lightsail의 Docker 컨테이너로 시작한다.
- Supabase PostgreSQL은 유지한다.
- 프론트의 API와 Socket 주소는 중앙 환경 설정으로 관리한다.

## 결과

- 프론트 배포는 백엔드 프로세스와 무관해진다.
- CORS, 인증, Socket URL을 명시적으로 설계해야 한다.
- 웹과 앱은 같은 소스를 사용하지만 각각 별도 릴리스 수명을 갖는다.

## 대안

- 통합 Express 유지: 가장 단순하지만 모바일·CDN·수평 확장 목표와 맞지 않아 제외했다.
- Next.js 전환: 현재 Vite 자산과 기능을 크게 다시 작성해야 하므로 제외했다.

## 검증 기준

- 웹 빌드가 Express 정적 서빙 없이 동작한다.
- API와 Socket.IO가 `api.telepathy.my`에서 HTTPS/WSS로 연결된다.
- 웹·서버를 서로 독립적으로 배포하고 롤백할 수 있다.
