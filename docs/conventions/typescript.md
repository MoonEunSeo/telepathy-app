# TypeScript 규약


## `shared/` 사용 규칙

```
shared/
├─ domain.ts        도메인 모델 (WordHistoryItem, ChatInfo …)
├─ socketEvents.ts  소켓 이벤트 맵 + 페이로드
├─ api.ts           REST 요청/응답 DTO
├─ errorCodes.ts    서버 오류 코드 유니온 (ApiError.error.code 의 단일 출처)
├─ seo.ts           경로별 메타 테이블 — 유일한 런타임 모듈 (아래 예외)
└─ index.ts         배럴 (seo.ts 는 넣지 않는다)
```

- **원칙은 `interface`/`type`만** — 런타임 값(함수·상수·클래스)을 두지 않는다.
- 원칙을 따르는 모듈은 양쪽 모두 **`import type`** 으로 가져온다 → 컴파일 시 제거되어 tsx·Vite가 resolve할 필요 없음.
- 경로는 **`@shared/*` 별칭** (상대경로 `../../../` 금지).
  ```ts
  import type { WordHistoryItem } from '@shared/domain';
  ```
- 별칭 설정처: `server/tsconfig.json`·`telepathy-front/tsconfig.app.json`의 `paths`,
  `telepathy-front/vite.config.ts`의 `resolve.alias`.
- 프론트는 `src/types/index.ts` 배럴이 `@shared`를 재노출 + 로컬 타입(`AppSocket`, `storage`) 추가.

### ⚠️ 예외 — `seo.ts` 는 값으로 import 한다

경로별 메타(`ROUTE_META`)와 `normalizePath()`는 **값**이라 유니온으로 표현할 수 없다.
그런데 서버(메타 주입·404 판정)와 프론트(탭 제목)가 **같은 경로 목록**을 봐야 한다.
한쪽에 두고 복사하면 라우트를 추가할 때 어긋나고, 어긋나면 새 페이지가 404 로 나간다.

```ts
import { ROUTE_META, normalizePath } from '@shared/seo';   // import type 이 아니다
```

- tsx(`nodenext`)와 Vite 모두 `@shared/*` 별칭을 **런타임에도** resolve 한다 (양쪽 실측 확인).
- **`shared/index.ts` 배럴에 넣지 않는다.** 배럴은 `export *` 라, 타입만 쓰는 곳까지 런타임 모듈을 끌어온다.
- 새 런타임 모듈을 만들기 전에 유니온으로 되는지 먼저 따진다. 되면 유니온이 낫다 —
  `errorCodes.ts` 가 그 예다.

> `domain.ts` 의 `MEGAPHONE_SKUS` 도 `export const` 지만 **import 하는 곳이 없다.**
> PortOne 제거(`ce67ba0`) 때 소비자가 사라진 잔여물이라 위 예외에 해당하지 않는다.

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

