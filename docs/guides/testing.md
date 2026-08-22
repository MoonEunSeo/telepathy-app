# 테스트 가이드

## 현재 기반

- 단위 테스트: Vitest
- HTTP 통합 테스트 도구: Supertest
- 프론트 컴포넌트와 E2E 기반은 후속 단계에서 추가한다.

## 명령

```bash
npm test
npm run test:watch
npx vitest run server/tests/round.test.ts
```

## 작성 기준

- 버그 수정은 실패를 재현하는 테스트를 먼저 추가한다.
- 시간 의존 로직은 fake timer 또는 주입 가능한 clock을 사용한다.
- Supabase·SMS·결제 API를 단위 테스트에서 실제 호출하지 않는다.
- 외부 경계는 정상 입력, 잘못된 입력, 외부 실패를 각각 검증한다.
- 테스트 이름은 기대 동작을 한국어 문장으로 작성한다.
- 테스트 간 전역 상태를 공유하지 않고 각 테스트에서 복구한다.

## 우선 확대 순서

1. 인증과 토큰 검증
2. 매칭 원자성과 라운드 경계
3. 결제·웹훅 멱등성
4. Socket 재접속과 다중 인스턴스
5. React 핵심 사용자 흐름
6. Playwright 웹·Android 주요 경로
