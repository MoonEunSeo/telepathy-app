# Redis Streams Adapter 도입 진행 상태

- [x] 공식 Adapter·node-redis 동작 확인
- [x] Redis 환경변수 검증
- [x] Redis 연결·재연결·종료 수명주기
- [x] Socket.IO Redis Streams Adapter
- [x] Redis 연동 `/readyz` 200/503
- [x] 비활성·연결 실패 smoke test
- [x] 관련 단위·HTTP 테스트
- [x] 개발·배포·롤백 문서 갱신
- [ ] Docker 환경의 실제 Redis 연결 검증
- [ ] API 2개 인스턴스 broadcast 통합 테스트
- [ ] Redis presence와 60초 connection state recovery
