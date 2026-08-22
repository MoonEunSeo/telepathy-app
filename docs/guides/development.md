# 개발 가이드

## 요구 환경

- Node.js `24.15.0`
- npm `11.x`
- Supabase 개발 프로젝트 또는 필요한 테스트 자격 증명

## 최초 설정

```bash
npm run setup
```

`.env.example`을 복사해 루트 `.env`를 만들고 서버 값을 입력한다. 프론트는
`telepathy-front/.env.example`을 복사해 `telepathy-front/.env`를 만든다. 실제 `.env`는 커밋하지 않는다.

## 개발 서버

터미널 1:

```bash
npm run dev:server
```

터미널 2:

```bash
npm run dev:front
```

프론트 개발 서버는 `/api`를 `localhost:5000`으로 프록시한다.
운영 통합 배포의 공개 URL 기본값은 `telepathy-front/.env.production`에 있으며,
Cloudflare Pages 분리 시 배포 환경의 `VITE_API_BASE_URL`과 `VITE_SOCKET_URL`로 덮어쓴다.

서버는 `WEB_ORIGINS`의 쉼표 구분 출처를 REST와 Socket.IO에 함께 적용한다.
현재 Render 호환 기본값은 `SERVE_WEB_STATIC=true`이며 API 전용 실행은 `false`로 설정한다.
reverse proxy 뒤에서 실행할 때만 실제 프록시 hop 수를 `TRUST_PROXY_HOPS`에 지정한다.

## 로컬 컨테이너

Docker가 설치된 환경에서 백엔드와 Redis 기반을 함께 실행한다.

```bash
docker compose config
docker compose build api
docker compose up -d
curl http://localhost:5000/healthz
curl http://localhost:5000/readyz
docker compose down
```

- API 이미지는 `server/`, `shared/`, 런타임 의존성만 포함하며 프론트 빌드를 포함하지 않는다.
- API 포트는 로컬 루프백에만 바인딩하고 Redis 포트는 호스트에 공개하지 않는다.
- 현재 Redis 컨테이너는 후속 연결 작업을 위한 기반이다. 서버 상태·Socket.IO·매칭은 아직 Redis를 사용하지 않는다.
- `compose.yml`은 로컬 검증용이다. 운영 전 reverse proxy, TLS, Redis 인증과 GHCR 이미지 태그를 추가한다.

## 작업 루프

1. `docs/project/status.md`와 범위별 `AGENTS.md`를 읽는다.
2. 관련 도메인 문서와 기존 테스트를 확인한다.
3. 최소 변경으로 구현하고 관련 테스트를 추가한다.
4. 빠른 타입체크·테스트를 실행한다.
5. 커밋 전 `npm run verify`를 실행한다.
6. 환경변수·계약·DB·배포 변경이면 연결 문서를 함께 갱신한다.

## 흔한 문제

- `vite preview`에는 API 프록시가 없다.
- `shared/` 변경 후에는 서버와 프론트 양쪽 타입체크가 필요하다.
- Git hook이 설치되지 않았다면 `npm run prepare`를 실행한다.
- lockfile 변경 없이 `package.json`만 수정하지 않는다.
