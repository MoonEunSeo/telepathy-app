# 프로젝트 현재 상태

- 최종 갱신: 2026-08-23
- 저장소 기본 브랜치: `main`
- 마지막 문서상 운영 배포: Render에서 Express가 API·Socket.IO·Vite 정적 파일을 함께 제공
- 운영 연결 주의: 원격 `v3` 브랜치가 삭제되어 Render의 실제 배포 브랜치와 현재 서비스 상태를 재확인해야 함
- 현재 데이터베이스: Supabase PostgreSQL
- 현재 단계: V2 멱등 매칭 확정 RPC 소스 구성, Redis 이행 플래그 기본 OFF

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
- `REDIS_ENABLED` 전환 플래그와 Redis URL·연결·stream 설정 검증
- node-redis 연결 수명주기와 Socket.IO Redis Streams Adapter 연결
- Redis 상태를 반영하는 `/readyz` 200/503 및 종료 신호 처리
- Redis sorted set 기반 고유 사용자 presence와 TTL·heartbeat 집계
- 60초 Socket.IO connection state recovery와 room 복구 후 지연 종료
- 프론트 랜덤 접속자 수 보정 제거 및 Redis 집계값 표시
- 라운드별 Redis ZSET·Hash·Lua 기반 원자적 매칭 후보 선점
- 중복 요청을 차단하는 reservation·commit tombstone과 90초 TTL
- Streams Adapter 분산 `socketsJoin`·socket-id room 이벤트 전송
- PostgreSQL 멤버십 검증 후 room을 복구하는 `match:resume` ACK
- `REDIS_MATCHING_ENABLED` 별도 이행 플래그와 Redis 장애 시 레거시 큐 폴백 차단
- `commit_match()`로 V2 세션·멤버 2건·매칭 시도 2건을 하나의 트랜잭션에 멱등 확정
- 동일 `match_id` replay·fingerprint 충돌·롤백·RPC 권한을 검증하는 V2 SQL 통합 시나리오
- DB 조회·멱등 commit·Redis 확정/보류/격리를 분리한 schema-neutral RESERVED 재조정 코어
- DB timeout에서 예약을 유지하고 fingerprint 충돌만 격리하는 장애 회귀 테스트
- V2 매칭 활성 시만 JWT 세션 ID를 `actors.id`로 해석하는 소켓 신원 경계
- 레거시 회원 ID 변환·게스트 actor/profile 생성을 멱등 처리하는 `resolve_session_actor()`

## 다음 구현 순서

1. V2 actor 신원 호환·채팅 종료 전이와 Redis lease/fencing 재조정 adapter
2. 검증 DB에 `commit_match()` 적용 후 멱등·동시성 SQL 통합 테스트
3. 실 Redis 2인스턴스 동시 매칭·room 복구 통합 테스트
4. 경로별 정적 프리렌더와 Cloudflare Pages 배포
5. reverse proxy·GHCR·Lightsail CI/CD
6. Capacitor Android와 앱 전용 인증

## 아직 구현되지 않은 항목

- Cloudflare Pages 배포
- Lightsail 인스턴스와 배포 파이프라인
- Capacitor Android 프로젝트
- 앱용 Bearer/refresh 인증
- API 다중 인스턴스
- 운영 reverse proxy와 Redis 인증
- API 2개 인스턴스 간 Socket broadcast 통합 검증
- `commit_match()` 검증 DB 적용·서버 포트 연결·Redis RESERVED 재조정
- Redis 기반 rate limit·스케줄러 분산 조정
- 프로세스 재시작을 견디는 Redis 기반 채팅 종료 deadline claim

## 진실 공급원

- 코드의 실제 동작과 기술 규칙: 이 저장소
- 이슈 상태와 업무 우선순위: Linear
- 중요한 기술 결정: `docs/adr/`
- 외부 결정이 코드에 영향을 주면 같은 작업에서 ADR 또는 이 문서에 반영한다.
