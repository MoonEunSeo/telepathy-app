# TypeScript 마이그레이션 규약

telepathy-app을 JS→TS로 **점진 이행**하는 동안 지키는 규칙. 배치 변환은 이 문서를 기준으로 진행한다.

## 1. 디렉터리 구조

```
telepathy-app/
├── shared/                 # client↔server 공유 계약 타입 (⚠️ 타입 전용, 런타임 코드 0)
│   ├── socketEvents.ts     #   소켓 이벤트 맵 + 페이로드
│   ├── api.ts              #   REST 요청/응답 DTO
│   └── index.ts            #   배럴
├── server/
│   └── src/types/          # 서버 내부 타입 (DB row, 도메인, express.d.ts 등)
└── client/
    └── src/types/          # 클라이언트 UI 전용 타입 (필요 시 생성)
```

- **공유 계약(client↔server 둘 다 쓰는 것)** → `shared/`. 소켓 이벤트, API DTO가 핵심.
- **한쪽 전용** → 각 사이드 `src/types/`.
- **한 파일에서만** 쓰는 타입 → 해당 파일 안에 co-locate. **2개 이상 공유될 때만** `types/`로 추출.

## 2. `shared/` 사용 규칙 (중요)

- `shared/`는 **`interface`/`type`만** — 런타임 값(함수·상수·클래스) 금지.
- 양쪽 모두 **반드시 `import type`** 으로 가져온다 → 컴파일 시 완전 제거되어 tsx·Vite가 런타임에 resolve할 필요가 없다.
- 경로는 **`@shared/*` 별칭** 사용 (상대경로 `../../../` 금지).
  ```ts
  import type { ChatMessage } from '@shared/socketEvents';
  import type { PaymentVerifyRequest } from '@shared/api';
  ```
- 별칭 설정처: `server/tsconfig.json`·`client/tsconfig.json`의 `paths`, `client/vite.config.js`의 `resolve.alias`.

## 3. 파일 · 네이밍

- 확장자: **`.ts`** = 로직, **`.tsx`** = JSX 포함, **`.d.ts`** = 전역/ambient 선언만(`express.d.ts`, `vite-env.d.ts`).
- **마이그레이션 중 파일명 변경 금지 — 확장자만 교체.** (리스크·diff 최소화. 예: `Verify_mvp.jsx`→`Verify_mvp.tsx` 그대로)
- 기존 네이밍 유지: 라우트 `*.routes.ts`, 컴포넌트 PascalCase, 훅 `useXxx`.

## 4. 타입 스타일 (정책: **실용적 균형**)

- 객체·props는 `interface`, 유니온·별칭은 `type`.
- 컴포넌트 props는 `XxxProps` 인터페이스로 파일 내 정의.
- **외부 경계는 "실제 쓰는 필드만" 타입 지정 + 경계에서 캐스팅.** Supabase DB·외부 API(PortOne 등) 응답 전체를 모델링하지 않는다.
  - 요청 body: `req.body as XxxRequest`
  - 외부 API 응답: `axios.get<XxxResponse>(...)` 또는 지역 `interface`
- `any` 대신 **`unknown` + 내로잉** 우선. 불가피한 캐스팅엔 `// TODO(types)` 주석.
- 응답 객체는 필요 시 `satisfies XxxResponse`로 계약만 검증(타입은 안 바꿈).

## 5. 서버 인터롭 규칙 (점진 이행 중 CJS/ESM 혼재)

- 아직 `.js`인 파일이 `const x = require('...')`로 부르는 **단일값 export 모듈**(config·미들웨어)은 **`export =`** 사용. `export default`면 런타임에 `{ default: x }`가 되어 깨진다.
- named export(`export function`, `export const`)는 그대로 OK (require 구조분해와 호환).
- 전면 TS화 완료 후 `export =` → `export default`로 일괄 정리 가능.
- ⚠️ `server/src/config/chat.socket.js`가 `require('./supabase.js')`로 **명시적 `.js` 확장자** 사용 → `supabase.js`를 `.ts`로 바꿀 때 이 require도 함께 수정.

## 6. 툴체인

| | 서버 | 클라이언트 |
|---|---|---|
| module/resolution | `nodenext` | `bundler` |
| 런타임 | **tsx** (`npm start`/`dev`) | Vite |
| strict | ✅ | ✅ |
| allowJs / checkJs | true / **false** | true / **false** |

- `checkJs:false` → 아직 `.js`인 파일은 타입체크에서 제외(점진 이행). 변환한 `.ts`만 검사.
- 빌드(`vite build`)는 타입체크를 하지 않음 → 반쪽 이행이 빌드를 막지 않도록 분리. 타입 검증은 아래 명령으로 별도 실행.

## 7. 검증 명령 (프로젝트 루트)

```bash
npm run typecheck                 # 서버 타입체크
npm --prefix client run typecheck # 클라 타입체크
npm --prefix client run build     # 클라 빌드
npm run dev                       # 서버 실행(tsx watch, .env 필요)
```

## 8. 배치 변환 순서

1. **서버 우선**(결제·인증 등 리스크 높은 코드부터) → 배치마다 `npm run typecheck`
2. 그다음 **클라이언트**(pages/components/contexts/hooks/utils)
3. 각 배치 후 typecheck(+클라는 build) 그린 확인 → 커밋
