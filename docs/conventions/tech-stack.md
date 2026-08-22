# 기술스택

| 영역             | 사용                                                      |
| ---------------- | --------------------------------------------------------- |
| 서버             | Node.js + **Express 5** + TypeScript, 런타임 **tsx**      |
| DB               | Supabase PostgreSQL (`@supabase/supabase-js`)             |
| 실시간           | Socket.IO 4                                               |
| 인증             | `jsonwebtoken` + `cookie-parser`, 해시 `bcrypt`           |
| 결제             | 계좌이체 + 은행 알림 웹훅 (PG 는 계획안 §27.1 로 범위 밖) |
| 문자             | `solapi` (휴대폰 인증 OTP)                                |
| 스케줄           | `node-cron`                                               |
| 프론트           | **React 19** + Vite + TS, `react-router-dom` 7            |
| 스타일           | **Tailwind v4** + CSS 변수 토큰 (preflight 미로드)        |
| 아이콘           | `lucide-react`                                            |
| 알림 UI          | `react-toastify`                                          |
| 린트/포맷        | `oxlint`, `prettier`(+`prettier-plugin-tailwindcss`)      |
| 검증             | Zod 4                                                     |
| 단위·통합 테스트 | Vitest + Supertest (최소 기반부터 확장)                   |
| 품질 게이트      | Oxlint + Prettier + Husky + lint-staged + commitlint      |

**향후 도입 예정**: React Testing Library, Playwright(E2E), Capacitor(Android/iOS), Redis.
**도입하지 않는 것**: Next.js, NestJS, React Native, GraphQL, ORM 전환 → [migration-plan.md](../project/migration-plan.md) 참조.

## Tailwind v4 주의점

- **preflight(전역 리셋)를 일부러 로드하지 않는다.** 기존 외관 보존이 목적.
  → `h1`/`p` 등의 UA 기본 여백이 살아 있으므로 **명시적으로 `m-0`·`mt-1` 등을 지정**한다.
  → `<input>`은 폰트를 상속하지 않으므로 `text-[12px]` 등을 직접 준다.
- **arbitrary value 안에 공백을 쓰면 안 된다.** 공백은 `_`로 바꾸거나 제거한다.
  ```
  ❌ bg-[linear-gradient(140deg, #f0c58f, #de87b2)]   // 클래스가 쪼개져 CSS 미생성
  ✅ bg-[linear-gradient(140deg,#f0c58f,#de87b2)]
  ```
- 클래스를 **동적으로 조합하지 않는다.** Tailwind는 소스에 있는 **완성된 문자열**만 스캔한다.
  색상 배열 등은 전체 클래스명을 리터럴로 나열할 것.
