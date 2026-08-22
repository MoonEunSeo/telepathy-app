# Redis presence·재접속 리뷰

## 확인 항목

- `onlineCount` 생성원을 presence store 하나로 통합
- Redis 장애 시 잘못된 카운트를 emit하지 않음
- heartbeat 주기가 TTL보다 짧은지 환경변수 경계에서 검증
- recovery에서도 인증 미들웨어를 다시 실행
- 재접속 가능 단절에서만 `chatEnded`를 60초 유예
- scheduler 종료 시 heartbeat·만료 타이머 정리

## 검증 결과

- 메모리 presence의 고유 사용자·heartbeat·TTL 단위 테스트
- presence 환경변수 기본값·범위·상호 관계 테스트
- 서버·프론트 strict 타입 검사

## 남은 검증

현재 작업 PC에는 Docker/Redis가 없어 실 Redis 2인스턴스 presence·room recovery는
Docker 환경에서 실행해야 한다. 프로세스 재시작을 넘는 `chatEnded` deadline claim은 후속 작업이다.
