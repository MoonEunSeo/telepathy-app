# 서버 배포 단위 분리 설계

- `server/src/config/runtime.ts`가 포트, 정적 제공 여부, proxy hop, 웹 origin을 검증한다.
- REST와 Socket.IO는 `createOriginDelegate()`를 공유해 허용 출처가 어긋나지 않게 한다.
- `createApp()`은 API 등록 함수를 주입받아 Supabase 자격 증명 없이도 HTTP 경계를 테스트할 수 있다.
- `SERVE_WEB_STATIC=false`이면 프론트 파일과 SPA fallback을 전혀 사용하지 않고 미등록 요청을 JSON 404로 종료한다.
- `/healthz`는 liveness, `/readyz`는 현재 프로세스 readiness만 나타낸다. Redis 연결 후 실제 검사로 확장한다.
- `Dockerfile.server`는 프론트를 제외하고 `server/`, `shared/`만 포함한다.
- 로컬 Compose의 Redis는 외부 포트를 공개하지 않으며 영속화하지 않는다.
