# Redis Streams Adapter 도입 계획

## 목표

Redis 연결 수명주기와 readiness를 서버 부트스트랩에 통합하고 Socket.IO broadcast 경계를
Redis Streams Adapter로 전환한다.

## 단계

1. 공식 Adapter와 node-redis 동작 확인
2. Redis 환경변수 검증과 연결 수명주기 구현
3. Socket.IO Adapter·readiness·graceful shutdown 통합
4. 장애·비활성 모드 테스트와 문서 동기화
5. 전체 저장소 검증
