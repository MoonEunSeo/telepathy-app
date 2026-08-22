# Redis 원자적 매칭 대기열 리뷰

## 확인 항목

- Redis 매칭·레거시 DB 큐 요청별 폴백 금지
- Lua의 후보 선점·재선택·중복 reservation 원자성
- 클라이언트 round·신원 payload 미신뢰
- PostgreSQL waiting 상태 가드 및 부분 실패 보상
- DB 핵심 상태 확정 후에만 room join·`matched` 수행
- Adapter 분산 room join과 DB 검증 `match:resume`
- 라운드 종료·disconnect 시 대기 후보 정리

## 검증 결과

- 메모리 계약으로 A-B 성사·C 대기 동시성 테스트
- 중복 replay·단어 재선택·socket generation·TTL 테스트
- 이행 플래그·Redis 필수 조건·TTL 환경변수 테스트
- 서버·프론트 strict 타입 검사

## 남은 검증

현재 작업 PC에는 Docker/Redis가 없어 Lua와 2인스턴스 socket 통합 테스트는
Docker 환경에서 실행해야 한다. PostgreSQL 두 행 확정도 아직 단일 RPC 트랜잭션이
아니므로 운영 플래그는 RPC·RESERVED 재조정 구현 후에 활성화한다.
