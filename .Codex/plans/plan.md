# Redis presence·재접속 계획

## 목표

Redis에 고유 사용자 presence와 접속자 수를 공유하고, 일시적인 모바일 연결 끊김에
60초 복구 유예를 적용한다.

## 단계

1. TTL·heartbeat·키 설정과 presence store 계약 구현
2. Redis sorted set·단일 인스턴스 메모리 구현
3. Socket.IO connection state recovery와 지연 종료 통합
4. 설정·TTL·고유 사용자 집계 테스트
5. 문서 동기화와 전체 저장소 검증
