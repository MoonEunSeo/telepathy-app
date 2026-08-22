# 프로젝트 현재 상태

- 최종 갱신: 2026-08-23
- 저장소 기본 브랜치: `main`
- 마지막 문서상 운영 배포: Render에서 Express가 API·Socket.IO·Vite 정적 파일을 함께 제공
- 운영 연결 주의: 원격 `v3` 브랜치가 삭제되어 Render의 실제 배포 브랜치와 현재 서비스 상태를 재확인해야 함
- 현재 데이터베이스: Supabase PostgreSQL
- 현재 단계: 프론트·서버 런타임 경계와 로컬 컨테이너 기반 구성 완료

## 수락된 목표 구조

1. 프론트와 백엔드를 배포 단위로 분리한다.
2. 웹 프론트는 Cloudflare Pages, API/Socket 서버는 AWS Lightsail Docker로 운영한다.
3. Redis를 Socket.IO 재접속·presence·매칭 대기열·rate limit에 사용한다.
4. PostgreSQL은 영속 데이터의 단일 원본으로 유지한다.
5. 같은 React/Vite 소스를 Capacitor Android 빌드에 포함한다.
6. 초기 API/Redis는 Lightsail 단일 인스턴스의 Docker Compose로 운영한다.

관련 결정:

- [`../adr/001-frontend-backend-separation.md`](../adr/001-frontend-backend-separation.md)
- [`../adr/002-redis-state-boundary.md`](../adr/002-redis-state-boundary.md)
- [`../adr/003-capacitor-auth.md`](../adr/003-capacitor-auth.md)
- [`../adr/004-lightsail-runtime-topology.md`](../adr/004-lightsail-runtime-topology.md)
- [상세 설계](architecture-design.md)

## 완료된 구현

- `runtimeConfig`에서 API·Socket 주소와 web/native target 중앙 관리
- 모든 REST 호출을 `apiFetch` 또는 `apiAxios` 경계로 이전
- Socket.IO 인스턴스를 `config/socket.ts` 하나로 통합
- 운영 빌드 환경변수 검증과 URL·credentials 회귀 테스트 추가
- REST와 Socket.IO가 `WEB_ORIGINS` 허용 목록을 공유
- `SERVE_WEB_STATIC` 전환 플래그와 API 전용 JSON 404 동작 추가
- `/healthz` liveness와 `/readyz` readiness 엔드포인트 분리
- 백엔드 전용 `Dockerfile.server`와 API·Redis 로컬 `compose.yml` 추가

## 다음 구현 순서

1. Redis 연결과 Socket.IO Redis Streams Adapter 도입
2. presence·60초 재접속 상태 이전
3. 매칭 대기열의 원자적 Redis 처리
4. 경로별 정적 프리렌더와 Cloudflare Pages 배포
5. reverse proxy·GHCR·Lightsail CI/CD
6. Capacitor Android와 앱 전용 인증

## 아직 구현되지 않은 항목

- Redis 런타임 연결
- Cloudflare Pages 배포
- Lightsail 인스턴스와 배포 파이프라인
- Capacitor Android 프로젝트
- 앱용 Bearer/refresh 인증
- API 다중 인스턴스
- 운영 reverse proxy와 Redis 인증

## 진실 공급원

- 코드의 실제 동작과 기술 규칙: 이 저장소
- 이슈 상태와 업무 우선순위: Linear
- 중요한 기술 결정: `docs/adr/`
- 외부 결정이 코드에 영향을 주면 같은 작업에서 ADR 또는 이 문서에 반영한다.
