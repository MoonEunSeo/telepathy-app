# 프론트엔드 작업 규칙

이 파일은 `telepathy-front/` 범위에 적용되며 루트 [`AGENTS.md`](../AGENTS.md)를 보완한다.

## 책임과 구조

- `src/pages/`: 라우트 단위 화면
- `src/components/`: 재사용 UI와 도메인 컴포넌트
- `src/hooks/`: 재사용 상태·서버 연동 훅
- `src/config/`: API/Socket 클라이언트 설정
- `src/themes/base/tokens.css`: 디자인 토큰 단일 진실 공급원
- `src/types/`: 프론트 전용 타입과 공유 계약 재노출

## React·데이터 규칙

- 서버 상태는 TanStack Query를 사용하고 임의의 전역 캐시를 만들지 않는다.
- mutation 성공 시 관련 query key를 명시적으로 무효화한다.
- Effect 의존성 경고를 무시하지 않는다. 의도를 코드 구조로 표현한다.
- 컴포넌트는 표현과 도메인 흐름을 분리하고, 큰 페이지 로직은 훅/컴포넌트로 추출한다.
- 외부 응답은 `unknown`에서 검증하며 `res.json() as Type`을 신규 추가하지 않는다.

## UI 규칙

- 색상·간격·그림자 등 반복 값은 기존 CSS 변수를 우선 사용한다.
- Tailwind 클래스는 완성된 리터럴로 작성하고 arbitrary value 내부에 공백을 넣지 않는다.
- 접근 가능한 버튼·레이블·키보드 탐색을 유지한다.
- 모바일 safe area, 키보드, 뒤로가기, 앱 수명주기를 고려한다.

## Capacitor 목표 규칙

- 운영 앱은 Vite 빌드 산출물을 번들에 포함한다. 원격 `server.url` 로딩에 의존하지 않는다.
- API와 Socket 주소는 중앙 설정과 환경변수에서 읽는다.
- `window.location.origin`과 상대 `/api`를 운영 API 주소로 간주하지 않는다.
- 웹은 HttpOnly 쿠키, 앱은 안전한 저장소 기반 Bearer/refresh 인증을 사용하도록 분리한다.
- 앱 토큰을 `localStorage`에 저장하지 않는다.

## 검증

```bash
npm run typecheck:front
npm run lint
npm run build
```

UI 변경은 최소한 모바일 너비와 데스크톱 너비에서 확인한다.
