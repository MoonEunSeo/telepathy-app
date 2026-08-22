# Redis presence·재접속 설계

- presence는 `user_id -> expiresAt`을 Redis sorted set으로 관리해 인스턴스 전체의 고유 사용자 수를 계산한다.
- 연결·heartbeat·disconnect 시 만료 시각을 갱신하고, 집계 전 만료 회원을 제거한다.
- Redis 비활성 모드는 같은 계약의 메모리 store를 사용해 현재 단일 인스턴스 운영을 유지한다.
- Socket.IO recovery는 60초, `skipMiddlewares=false`로 설정해 인증을 다시 검증한다.
- `disconnecting`에서 `chatEnded`를 즉시 보내지 않고 방 목록을 보관한다. 60초 후 해당 사용자가 방에
  복구되지 않은 경우에만 종료 이벤트를 보낸다.
- Redis 명령 실패 시 잘못된 0명·잘못된 채팅 종료를 방송하지 않고 readiness 복구를 기다린다.
