# Redis Streams Adapter 도입 설계

- `REDIS_ENABLED=false`가 기존 Render 호환 기본값이며 활성화 시 Redis URL이 필수다.
- 최초 Redis 연결 실패는 시작 실패로 처리하고, 연결 후 장애는 재연결하면서 `/readyz`를 503으로 전환한다.
- Streams Adapter에는 공식 사용법대로 Redis 클라이언트 하나만 전달한다.
- Redis 장애 중 메모리 Adapter로 동적 교체하지 않아 다중 인스턴스 split-brain을 방지한다.
- `/healthz`는 Redis와 무관하게 200, `/readyz`는 `client.isReady`를 반영한다.
- 종료 순서는 scheduler 정지, Socket.IO/Adapter 종료, Redis 연결 종료다.
- 현재 `disconnecting`의 즉시 종료 동작 때문에 connection state recovery는 다음 presence 단계까지 비활성화한다.
