# TypeScript 규약


## `shared/` 사용 규칙

```
shared/
├─ domain.ts        도메인 모델 (WordHistoryItem, ChatInfo …)
├─ socketEvents.ts  소켓 이벤트 맵 + 페이로드
├─ api.ts           REST 요청/응답 DTO
└─ index.ts         배럴
```

- **`interface`/`type`만** — 런타임 값(함수·상수·클래스) 금지.
- 양쪽 모두 **`import type`** 으로 가져온다 → 컴파일 시 제거되어 tsx·Vite가 resolve할 필요 없음.
- 경로는 **`@shared/*` 별칭** (상대경로 `../../../` 금지).
  ```ts
  import type { WordHistoryItem } from '@shared/domain';
  ```
- 별칭 설정처: `server/tsconfig.json`·`telepathy-front/tsconfig.app.json`의 `paths`,
  `telepathy-front/vite.config.ts`의 `resolve.alias`.
- 프론트는 `src/types/index.ts` 배럴이 `@shared`를 재노출 + 로컬 타입(`AppSocket`, `storage`) 추가.

## 타입 스타일 (정책: 실용적 균형)

- 객체·props는 `interface`, 유니온·별칭은 `type`. 컴포넌트 props는 `XxxProps`.
- **외부 경계는 "실제 쓰는 필드만" 타입 지정 + 경계에서 캐스팅.**
  Supabase·외부 API 응답 전체를 모델링하지 않는다.
- `any` 대신 **`unknown` + 내로잉** 우선. 불가피하면 `// TODO(types)`.
- 응답 객체는 **`satisfies XxxResponse`** 로 계약을 검증한다(타입은 넓히지 않음).

### ⚠️ 타입은 런타임 보증이 아니다

`res.json()`은 `Promise<any>`이고 `as`는 **런타임 검사가 없다.**
서버가 계약을 어기면 `string` 타입 자리에 `null`이 그대로 들어온다.

```ts
const data = (await res.json()) as WordHistoryResponse;  // 무검사
```

→ 외부 경계에서 온 값은 **사용처에서 방어**한다. (`?? ''`, `?.trim() || '익명'`,
배열은 `Array.isArray()` 확인)

## 파일 · 네이밍

- `.ts` = 로직, `.tsx` = JSX, `.d.ts` = 전역 선언만.
- 라우트 `*.routes.ts`, 컴포넌트 PascalCase, 훅 `useXxx`.
- 마이그레이션 중에는 **파일명 변경 없이 확장자만 교체**(diff 최소화).

## 서버 인터롭 (CJS/ESM 혼재)

- `require()`로 불리는 **단일값 export 모듈**은 **`export =`** 사용.
  `export default`면 런타임에 `{ default: x }`가 되어 깨진다.
- named export는 그대로 OK.
- `module`/`moduleResolution`: 서버 `nodenext`, 프론트 `bundler`.
  (TS7이 `node10`을 제거해 `nodenext` 필수)
- `env.ts`는 **진입점 최상단에서 import** — ESM 호이스팅 때문에 순서가 깨지면 `.env`가 늦게 로드된다.

