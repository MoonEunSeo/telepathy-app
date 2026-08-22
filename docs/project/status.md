# 프로젝트 현재 상태

- 최종 갱신: 2026-08-22
- 저장소 기본 브랜치: `main`
- 마지막 문서상 운영 배포: Render에서 Express가 API·Socket.IO·Vite 정적 파일을 함께 제공
- 운영 연결 주의: 원격 `v3` 브랜치가 삭제되어 Render의 실제 배포 브랜치와 현재 서비스 상태를 재확인해야 함
- 현재 데이터베이스: Supabase PostgreSQL
- 현재 단계: 에이전트 개발 환경 완료, 웹·API 런타임 분리 설계 완료

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

## 다음 구현 순서

1. 프론트 API/Socket 주소 중앙화
2. 직접 fetch·axios·중복 Socket 클라이언트 이전
3. Express 정적 서빙 의존 제거와 백엔드 Docker 이미지 작성
4. Redis 연결과 Socket.IO Redis Streams Adapter 도입
5. presence·60초 재접속 상태 이전
6. 매칭 대기열의 원자적 Redis 처리
7. Cloudflare Pages·Lightsail CI/CD
8. Capacitor Android와 앱 전용 인증

## 아직 구현되지 않은 항목

- Dockerfile과 Docker Compose
- Redis 런타임 연결
- Cloudflare Pages 배포
- Lightsail 인스턴스와 배포 파이프라인
- Capacitor Android 프로젝트
- 앱용 Bearer/refresh 인증
- API 다중 인스턴스

## 진실 공급원

- 코드의 실제 동작과 기술 규칙: 이 저장소
- 이슈 상태와 업무 우선순위: Linear
- 중요한 기술 결정: `docs/adr/`
- 외부 결정이 코드에 영향을 주면 같은 작업에서 ADR 또는 이 문서에 반영한다.
