# 서버 작업 규칙

이 파일은 `server/` 범위에 적용되며 루트 [`AGENTS.md`](../AGENTS.md)를 보완한다.

## 구조

- `index.ts`: HTTP/Socket.IO 부트스트랩과 프로세스 수명
- `app.ts`: Express 미들웨어, 라우트, 현재 정적 서빙
- `env.ts`: 환경변수 로드; 진입점 최상단 import
- `src/modules/`: 목표 계층형 도메인 모듈
- `src/routes/`: 마이그레이션 전 레거시 라우트
- `src/config/`: 외부 클라이언트와 Socket 설정
- `src/utils/`: 도메인에 종속되지 않는 작은 유틸리티

## 의존성 방향

```text
Route -> Controller -> Validation -> Service -> Repository
```

- 신규 기능은 가능한 경우 `src/modules/<domain>/`에 둔다.
- Controller는 Express 객체와 도메인 호출 사이의 변환만 담당한다.
- Service는 Express와 Supabase SDK 타입에 의존하지 않는 것을 목표로 한다.
- Repository 외부에서 신규 Supabase 쿼리를 추가하지 않는다.
- 여러 테이블의 원자적 변경은 Supabase RPC/PostgreSQL 함수로 처리한다.

## 입력·오류 처리

- `req.body`, `req.query`, 외부 웹훅은 `unknown`에서 시작해 Zod/타입 가드로 검증한다.
- Supabase의 `error`를 확인하지 않은 채 `data`를 사용하지 않는다.
- 공개 오류는 공통 API 오류 계약을 따르고 내부 오류·비밀값을 노출하지 않는다.
- catch 변수는 `instanceof Error`로 좁힌다.

## Socket.IO와 Redis 목표

- Socket 이벤트 타입은 `shared/socketEvents.ts`가 기준이다.
- 프로세스 메모리에만 사용자 전체 상태를 두지 않는다.
- Redis에는 presence, 재접속, 매칭 대기열처럼 TTL로 재생성 가능한 상태만 둔다.
- 채팅 로그, 결제, 신고, 매칭 결과의 영속 원본은 PostgreSQL이다.
- 다중 인스턴스 배포 전 Redis Streams Adapter와 재접속 테스트를 통과해야 한다.

## 검증

```bash
npm run typecheck:server
npm run lint
npm test
```

버그 수정은 `server/**/*.test.ts`에 재현 테스트를 추가한다.
