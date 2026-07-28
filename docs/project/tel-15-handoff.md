# TEL-15 작업 인계 — 앱 계층 V2 이행 1차

> **이 문서의 용도**
> 다른 PC·새 세션에서 TEL-15를 이어받기 위한 자족 문서다.
> 이 문서 하나만 읽으면 배경·현재 위치·다음 할 일이 파악되도록 썼다.
>
> 원본 이슈: [TEL-15](https://linear.app/newtelepathy/issue/TEL-15)
> 작성 시점: 2026-07-28 · **코드 작성 착수 전**

---

## 0. 새 세션에서 시작하는 법

```bash
git fetch origin
git switch feat/tel-15-auth-module   # 없으면: git switch -c feat/tel-15-auth-module origin/v3
npm i zod                            # 아직 설치 안 됨
```

그리고 Claude에게 이렇게 말하면 된다.

> `docs/project/tel-15-handoff.md` 읽고 §5부터 이어서 진행해줘

### ⚠️ 사용자 작업 방식

**코드는 사용자가 직접 타이핑한다.** Claude가 파일을 대신 수정하지 않는다.
"설명 + 전체 소스코드"를 제시하면 사용자가 따라 치면서 이해하는 방식이다.

---

## 1. 한눈에 보는 현재 상태

| 항목 | 상태 |
|---|---|
| 브랜치 | `feat/tel-15-auth-module` (미생성 가능) |
| zod 설치 | ❌ 미설치 |
| 파일 8개 작성 | ❌ **하나도 안 씀** |
| `app.ts` 마운트 | ❌ 하지 않는다 (의도된 것 — §5.9) |
| 운영 영향 | **0** — 미마운트 상태라 배포해도 아무 일 없음 |

선행 조건은 이미 충족돼 있다.

- ✅ `server/src/config/supabase.ts` — service_role 키 단일화 완료 (커밋 `7da7362`, 배포됨)
- ✅ v2-dev DB 53테이블 + RLS 활성 + `anon` 권한 회수 완료
- ✅ Render Build Filters — `docs/**`·`*.md` 는 배포를 트리거하지 않음

---

## 2. 배경 — 왜 계층을 나누는가

현재 로그인 하나에 **여섯 가지 관심사가 한 함수**에 있다 (`server/src/routes/auth.routes.ts:99`).

> 입력 검증 · HTTP 응답 · DB 접근 · 비밀번호 검증 · 토큰 발급 · 쿠키 설정

이 때문에 구체적으로 이런 게 안 된다.

| 문제 | 지금 |
|---|---|
| **DB 교체** | 스키마가 바뀌면 라우트 전체를 고쳐야 함 — 지금 겪는 상황이 정확히 이것 |
| **테스트** | 로그인 규칙만 시험하려 해도 Express `req`/`res` 를 가짜로 만들어야 함 |
| **재사용** | 소켓에서 같은 인증을 쓰려면 복붙 외에 방법 없음 |
| **에러 처리** | 라우트마다 `try/catch` + `res.status(500)` 을 손으로 반복 |

계층이 있으면 V2 전환 시 **Repository 만 교체**하면 되고 Service·Controller 는 그대로다.

```
요청 → route → validate → controller → service → repository → DB
              (형식)      (HTTP)      (규칙)     (질의)
```

| 계층 | 하는 일 | **하면 안 되는 일** |
|---|---|---|
| `route` | URL과 핸들러 연결 | 로직 |
| `validate` | 입력 형식 검사 | 비즈니스 판단 |
| `controller` | `req` 에서 꺼내고 `res` 로 내보냄 | DB 접근·규칙 판단 |
| `service` | **비즈니스 규칙** | `req`/`res` 를 앎 |
| `repository` | Supabase 질의 | 규칙 판단 |

**핵심 규칙은 하나다. `service` 는 Express 를 몰라야 한다.** 그래야 소켓·크론·테스트 어디서나 호출된다.

### zod 를 쓰는 이유

지금 코드의 이 줄이 문제다.

```ts
const { username, password } = req.body as LoginRequest;
```

`as` 는 **컴파일 타임에만 존재**하고 빌드되면 사라진다. 런타임엔 아무 검사도 없다.

```js
// 이렇게 보내도 통과한다
{ "username": { "$ne": null }, "password": 12345 }
```

zod 는 **실제로 검사하는 코드**를 만들고, 그 스키마에서 **타입을 역산**한다.

```ts
type LoginInput = z.infer<typeof loginSchema>;
```

타입과 검사가 한 곳에서 나오므로 **어긋날 수 없다.** `as` 는 선언과 실제 데이터가 따로 놀 수 있었다.

검증이 비어 있는 지점은 현재 **약 34곳**(HTTP 27 + 소켓 7)이다.

---

## 3. V2 스키마 실측 (2026-07-28, `telepathy-v2-dev`)

프로젝트 ID: `gczftwqeulqzedcirqrr`

### 인증 3테이블

```
user_credentials.user_id ──FK──> users.actor_id ──FK──> actors.id
```

**`user_credentials.user_id` 는 곧 `actors.id` 다.** 1:1 이며 PK 이기도 하다.

| 테이블 | 컬럼 |
|---|---|
| `actors` | `id`(PK, uuid, `gen_random_uuid()`) · `actor_type`(NN) · **`status`**(NN, 기본 `'ACTIVE'`) · `merged_into_actor_id` · `created_at` · `deleted_at` · `legacy_user_id` · `legacy_guest_id` |
| `users` | **`actor_id`**(PK→`actors.id`) · `phone`(NN, UQ) · `nickname`(NN, UQ) · `gender` · `birthdate` · `real_name` · **`last_login_at`** · `created_at` |
| `user_credentials` | **`user_id`**(PK→`users.actor_id`) · **`username`**(NN, **UQ**) · `password_hash`(NN) · `password_algorithm`(NN, 기본 `'bcrypt'`) · `failed_attempt_count`(NN, 기본 `0`) · `locked_until` · `password_changed_at` · `created_at` |

### 레거시와 달라지는 것

| 항목 | 레거시 | V2 |
|---|---|---|
| 신원 식별자 | `users.id` (회원만) | **`actors.id`** (회원·게스트 공통) |
| 로그인 정보 | `users.username`·`password_hash` | **`user_credentials`** 로 분리 |
| 계정 상태 | `users.is_deleted` | **`actors.status`** (ACTIVE/SUSPENDED/DELETED/MERGED) |
| 최근 로그인 | `users.last_login` | `users.last_login_at` |
| 확성기 잔액 | `users.megaphone_count` | `user_item_ledger` 합계 |

> **JWT 페이로드의 `user_id` 값이 `users.id` 에서 `actors.id` 로 바뀐다.**
> 페이로드 *형태* 는 유지해 기존 `server/src/middleware/auth.ts` 와 호환시킨다.

### 나중에 쓸 인접 테이블

| 테이블 | 컬럼 | 쓰이는 곳 |
|---|---|---|
| `nickname_histories` | `id` · `actor_id` · `nickname` · `started_at` · `ended_at` · `change_reason`(기본 `'USER_CHANGE'`) | 닉네임 변경 |
| `guest_profiles` | `actor_id` · `guest_token_hash` · `nickname` · `last_seen_at` · `expires_at` | 게스트 (**0행**) |
| `phone_verification_challenges` | — | 회원가입 본인확인 |
| `user_item_ledger` | `user_id` · `item_type` · `quantity_delta` · `reason_type` · `reference_type` · `reference_id` | 확성기 잔액 |

---

## 4. 환경 사실 (설계에 영향을 준 것)

| 사실 | 영향 |
|---|---|
| **Express 5** | async 핸들러의 예외가 에러 미들웨어로 자동 전달 → 라우트에 `try/catch` 불필요 |
| **CJS** (`package.json` 에 `type` 없음) | import 에 `.js` 확장자 불필요 |
| `@types/jsonwebtoken` **9.0.10** | `expiresIn` 이 `` `${60}d` `` 같은 템플릿 리터럴을 **거부**함 → 리터럴 상수를 써야 함 |
| 프론트가 `data.message` 를 **그대로 표시** (`LoginPage.tsx:51`) | 서버 메시지 문구를 바꿔도 안전 |
| `supabase.ts` 가 `export =` | `import supabase from '../../config/supabase'` 로 부른다 |
| 생성 타입 없음 | Supabase 응답이 `any` → **경계에서 직접 방어해야 함** |

---

## 5. 1단계 — 로그인 수직 슬라이스 (파일 8개)

목표 구조.

```
server/src/
├─ errors/AppError.ts            도메인 오류
├─ middleware/
│  ├─ validate.ts                공통 zod 검증
│  └─ errorHandler.ts            오류 → 응답 변환
└─ modules/auth/
   ├─ auth.schema.ts             zod 스키마 + z.infer
   ├─ auth.repository.ts         DB 접근 (V2 테이블)
   ├─ auth.service.ts            비즈니스 규칙
   ├─ auth.controller.ts         HTTP·쿠키
   └─ auth.route.ts              URL 연결
```

기존 `server/src/routes/` 는 **이번 범위에서 건드리지 않는다.**

---

### 5.1 `server/src/errors/AppError.ts`

에러에 HTTP 상태 코드를 실어 보내기 위한 클래스. 이게 있어야 service 가 `res` 를 몰라도 "이건 401이다"를 표현할 수 있다.

```ts
// server/src/errors/AppError.ts

/**
 * HTTP 상태 코드를 담은 에러.
 *
 * service·repository 는 Express 를 모르므로 res.status() 를 쓸 수 없다.
 * 대신 이 에러를 던지면 errorHandler 가 상태 코드로 변환한다.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

### 5.2 `server/src/middleware/errorHandler.ts`

던져진 에러를 응답으로 바꾸는 **유일한 지점**.

```ts
// server/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * 인자가 4개여야 Express 가 에러 핸들러로 인식한다.
 * _next 를 쓰지 않아도 지우면 안 되는 이유다.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }

  // 의도하지 않은 에러 — 내부 사정을 밖으로 노출하지 않는다
  console.error('❌ 처리되지 않은 오류:', err);
  res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
}
```

> **Express 5라서 가능한 것**: async 핸들러에서 던진 에러가 자동으로 여기까지 온다.
> Express 4였다면 라우트마다 `try/catch` 로 감싸 `next(err)` 를 직접 불러야 했다.
> 그래서 아래 controller 에 `try/catch` 가 하나도 없다.

---

### 5.3 `server/src/middleware/validate.ts`

스키마를 받아 **검증 미들웨어를 만들어 주는** 함수.

```ts
// server/src/middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/AppError';

/**
 * 스키마로 req.body 를 검사하는 미들웨어를 생성한다.
 *
 * 통과하면 req.body 를 "파싱된 값" 으로 교체한다.
 * trim 등 스키마의 변환이 이후 계층에 반영되게 하기 위함이다.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // 첫 번째 문제만 알린다 — 전부 나열하면 공격자에게 스키마를 알려주는 셈
      const message = result.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.';
      next(new AppError(400, message));
      return;
    }

    req.body = result.data;
    next();
  };
}
```

`safeParse` 는 예외를 던지지 않고 `{ success, data }` 또는 `{ success, error }` 를 돌려준다.
`result.error.issues` 는 zod v3·v4 양쪽에서 동작한다 (`flatten()` 은 v4에서 비권장).

---

### 5.4 `server/src/modules/auth/auth.schema.ts`

```ts
// server/src/modules/auth/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string({ message: '아이디를 입력해주세요.' })
    .trim()
    .min(1, '아이디를 입력해주세요.')
    .max(20, '아이디가 너무 깁니다.'),
  password: z
    .string({ message: '비밀번호를 입력해주세요.' })
    .min(1, '비밀번호를 입력해주세요.')
    // bcrypt 는 72바이트를 넘는 입력을 잘라낸다. 길이 제한이 없으면
    // 아주 긴 문자열로 해시 비용을 유발하는 DoS 경로가 된다.
    .max(72, '비밀번호가 너무 깁니다.'),
});

// 스키마에서 타입을 뽑는다 → 타입과 검사 규칙이 어긋날 수 없다
export type LoginInput = z.infer<typeof loginSchema>;
```

`z.string()` 이 문자열이 아닌 값을 거부한다. 앞서 예로 든 `{ "$ne": null }` 이 여기서 막힌다.

---

### 5.5 `server/src/modules/auth/auth.repository.ts`

**DB 질의만** 한다. 판단하지 않는다.

```ts
// server/src/modules/auth/auth.repository.ts
import supabase from '../../config/supabase';
import { AppError } from '../../errors/AppError';

export interface LoginCredential {
  userId: string; // = actors.id (JWT 의 user_id 가 이 값이 된다)
  passwordHash: string;
  passwordAlgorithm: string;
  failedAttemptCount: number;
  lockedUntil: string | null;
  actorStatus: string;
}

export async function findLoginCredential(username: string): Promise<LoginCredential | null> {
  // user_credentials → users → actors 로 FK 가 이어져 있어 중첩 조회가 된다.
  // !inner 는 "연결된 행이 없으면 결과에서 제외" — 고아 자격증명을 걸러낸다.
  const { data, error } = await supabase
    .from('user_credentials')
    .select(
      `user_id, password_hash, password_algorithm, failed_attempt_count, locked_until,
       users!inner ( actors!inner ( status ) )`,
    )
    .eq('username', username)
    .maybeSingle();

  // ⚠️ Supabase 는 DB 오류를 예외가 아니라 error 필드로 준다.
  //    확인하지 않으면 data 가 null 이 되어 "없는 사용자" 로 둔갑한다.
  if (error) {
    console.error('❌ 자격증명 조회 실패:', error.message);
    throw new AppError(500, '서버 오류가 발생했습니다.');
  }
  if (!data) return null;

  // ⚠️ 생성 타입이 없어 data 는 any 다. 경계에서 우리가 형태를 고정한다.
  const row = data as {
    user_id: string;
    password_hash: string;
    password_algorithm: string;
    failed_attempt_count: number;
    locked_until: string | null;
    users: { actors: { status: string } };
  };

  return {
    userId: row.user_id,
    passwordHash: row.password_hash,
    passwordAlgorithm: row.password_algorithm,
    failedAttemptCount: row.failed_attempt_count,
    lockedUntil: row.locked_until,
    actorStatus: row.users.actors.status,
  };
}

/**
 * 로그인 실패 기록.
 *
 * 🚧 임시 구현 — 읽은 값에 +1 하는 방식이라 동시 요청에서 카운트가 어긋난다.
 *    원자적 UPDATE 또는 RPC 로 교체해야 한다 (§7 남은 작업 1번).
 */
export async function updateFailedAttempt(
  userId: string,
  count: number,
  lockedUntil: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('user_credentials')
    .update({ failed_attempt_count: count, locked_until: lockedUntil })
    .eq('user_id', userId);

  // 기록에 실패해도 로그인 실패 응답은 그대로 내보낸다
  if (error) console.error('❌ 실패 횟수 기록 실패:', error.message);
}

/** 로그인 성공 — 실패 카운터 초기화 + 최근 로그인 시각 갱신 */
export async function markLoginSuccess(userId: string): Promise<void> {
  // ⚠️ 두 테이블을 각각 갱신한다. 트랜잭션이 아니므로 한쪽만 반영될 수 있다.
  //    로그인 자체를 막을 정도는 아니라 로그만 남긴다.
  const { error: credErr } = await supabase
    .from('user_credentials')
    .update({ failed_attempt_count: 0, locked_until: null })
    .eq('user_id', userId);
  if (credErr) console.error('❌ 실패 카운터 초기화 실패:', credErr.message);

  const { error: userErr } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('actor_id', userId);
  if (userErr) console.error('❌ 최근 로그인 갱신 실패:', userErr.message);
}
```

> **"없음(null)" 과 "조회 실패(error)" 를 구분하는 게 핵심이다.**
> 기존 코드는 `if (error || !user)` 로 둘을 합쳐 401을 반환했다 — DB가 죽어도 사용자에겐 "아이디가 없다" 고 답하던 셈이다.

---

### 5.6 `server/src/modules/auth/auth.service.ts`

**비즈니스 규칙.** `req` 도 `res` 도 등장하지 않는다.

```ts
// server/src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';
import * as authRepository from './auth.repository';
import type { LoginInput } from './auth.schema';

// ⚠️ 리터럴이어야 한다. `${60}d` 같은 템플릿 리터럴은 string 으로 넓어져
//    @types/jsonwebtoken 의 expiresIn 타입을 만족하지 못한다.
const TOKEN_TTL = '60d';
const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 60;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;

// 아이디 존재 여부를 흘리지 않도록 실패는 전부 같은 문구다 (TEL-15 §4)
const INVALID_CREDENTIAL = '아이디 또는 비밀번호가 올바르지 않습니다.';

export interface LoginResult {
  token: string;
  maxAgeMs: number;
}

export async function login({ username, password }: LoginInput): Promise<LoginResult> {
  const credential = await authRepository.findLoginCredential(username);
  if (!credential) throw new AppError(401, INVALID_CREDENTIAL);

  // 잠금은 해시 대조보다 먼저 본다 — 잠긴 계정에 bcrypt 비용을 쓰지 않는다
  if (credential.lockedUntil && new Date(credential.lockedUntil) > new Date()) {
    throw new AppError(401, INVALID_CREDENTIAL);
  }

  // 정지·탈퇴 계정 차단 (actors.status)
  if (credential.actorStatus !== 'ACTIVE') {
    throw new AppError(401, INVALID_CREDENTIAL);
  }

  // 알고리즘 분기 자리만 만들어 둔다. Argon2id 는 §8.2 별도 진행
  if (credential.passwordAlgorithm !== 'bcrypt') {
    throw new AppError(500, '지원하지 않는 인증 방식입니다.');
  }

  const matched = await bcrypt.compare(password, credential.passwordHash);
  if (!matched) {
    const next = credential.failedAttemptCount + 1;
    const shouldLock = next >= MAX_FAILED_ATTEMPTS;
    await authRepository.updateFailedAttempt(
      credential.userId,
      shouldLock ? 0 : next,
      shouldLock ? new Date(Date.now() + LOCK_DURATION_MS).toISOString() : null,
    );
    throw new AppError(401, INVALID_CREDENTIAL);
  }

  await authRepository.markLoginSuccess(credential.userId);

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError(500, '서버 설정 오류가 발생했습니다.');

  // ⚠️ user_id 가 users.id 에서 actors.id 로 바뀐다.
  //    페이로드 형태는 유지해 기존 middleware/auth.ts 와 호환시킨다.
  const token = jwt.sign({ user_id: credential.userId, username, role: 'member' }, secret, {
    expiresIn: TOKEN_TTL,
  });

  return { token, maxAgeMs: TOKEN_MAX_AGE_MS };
}
```

---

### 5.7 `server/src/modules/auth/auth.controller.ts`

**HTTP 관심사만.** 쿠키와 상태 코드가 여기 산다.

```ts
// server/src/modules/auth/auth.controller.ts
import type { Request, Response } from 'express';
import type { LoginResponse } from '@shared/api';
import * as authService from './auth.service';
import type { LoginInput } from './auth.schema';

const isProd = process.env.NODE_ENV === 'production';

function buildCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true, // JS 에서 못 읽음 → XSS 로 토큰 탈취 방지
    secure: isProd, // HTTPS 에서만 전송
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    maxAge: maxAgeMs,
    path: '/',
  };
}

export async function login(req: Request, res: Response): Promise<void> {
  // req.body 는 any 다. LoginInput 을 믿을 수 있는 근거는 타입이 아니라
  // 앞단의 validateBody(loginSchema) 가 런타임에 검사했다는 사실이다.
  const input: LoginInput = req.body;

  const { token, maxAgeMs } = await authService.login(input);

  res.cookie('token', token, buildCookieOptions(maxAgeMs));
  res.status(200).json({ success: true, message: '로그인 성공' } satisfies LoginResponse);
}
```

`try/catch` 가 없다. service 가 던진 `AppError` 를 Express 5 가 `errorHandler` 로 넘긴다.

---

### 5.8 `server/src/modules/auth/auth.route.ts`

```ts
// server/src/modules/auth/auth.route.ts
import express from 'express';
import { validateBody } from '../../middleware/validate';
import { errorHandler } from '../../middleware/errorHandler';
import { loginSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);

// ⚠️ 임시 — 앱 전역 에러 핸들러가 아직 없어 이 라우터에만 붙인다.
//    모듈이 늘어나면 app.ts 맨 끝으로 옮긴다.
router.use(errorHandler);

export default router;
```

---

### 5.9 마운트하지 않는 이유

**`server/app.ts` 를 건드리지 않는다.** 기존 `routes/auth.routes.ts` 가 계속 `/api/auth` 를 담당한다.

- 운영 DB 에 아직 V2 스키마가 없다 (`user_credentials` 부재) → 연결하면 즉시 깨진다
- 미마운트 상태이므로 **배포해도 영향 0**, 롤백은 파일 삭제로 끝난다
- 운영에 V2 스키마가 올라간 뒤 Feature Flag 로 전환한다 (TEL-6 §39 5단계)

> `app.ts:80` 의 `app.use('/api/auth/withdraw', withdrawRoutes)` 가
> `app.ts:71` 의 `/api/auth` **뒤에** 있다. 나중에 교체할 때 이 순서를 깨면 탈퇴가 죽는다.

---

## 6. 검증

```bash
npm run typecheck
```

통과하면 8개 파일이 서로 맞물린 것이다.
`npm run dev` 로 띄워도 **동작은 이전과 완전히 동일하다** — 새 라우터가 연결돼 있지 않으니까.

v2-dev 를 향한 실제 동작 확인은 임시 스크립트나 `.env` 전환이 필요하다 (§8 판단 필요 3번).

---

## 7. 남은 작업

로그인은 TEL-15 6개 항목 중 **1개**다.

| # | 작업 | 난이도 | 걸림돌 |
|---|---|---|---|
| 1 | **로그인 실패 카운터 원자화** | 중 | 지금은 읽고 +1 → 동시 요청에서 어긋남. **RPC 또는 원자적 UPDATE 필요** |
| 2 | **회원가입** | **상** | `actors`+`users`+`user_credentials` **3테이블 동시 쓰기.** supabase-js 에 트랜잭션 API 가 없어 **Postgres 함수로 작성해야 함** |
| 3 | 비밀번호 변경·재설정 | 중 | `password_changed_at` 갱신, 본인확인 경로 (`phone_verification_challenges`) |
| 4 | 회원 탈퇴 | 중 | `users.is_deleted` → `actors.status='DELETED'` 로 의미가 바뀜 |
| 5 | 닉네임 변경 | 중 | `users` + `nickname_histories` 2테이블 (이전 행 `ended_at` 마감 필요) |
| 6 | 게스트 발급·전환 | **상** | `guest_profiles` **0행** — 참조할 기존 구현 없이 새로 설계. TEL-7 의 `guest_token_hash` 와 연결 |
| 7 | `ApiSuccess<T>` / `ApiError` 공통 응답 규약 | 하 | TEL-6 §35. `shared/api.ts` 를 손봐야 함 |

**2번과 6번이 무겁다.** 특히 2번은 SQL 함수를 새로 써야 해서 지금까지와 성격이 다르다.

### 이 작업이 끝나야 자연히 해소되는 것

**레거시 라우트 11개가 각자 `createClient` 를 만든다.**
`auth`·`feedback`·`history`·`match`·`nickname`·`password`·`register`·`report`·`webhook`·`withdraw`.
모듈로 전환하면서 `config/supabase.ts` 싱글턴으로 수렴한다.

---

## 8. 판단이 필요한 사항

1. **잠금 알림 vs 아이디 비노출 (설계 충돌)**
   TEL-6 §8.4 는 5회 실패 시 잠금인데, "잠겼다" 고 알려주면 §4 의 "아이디 존재 여부 비노출" 이 깨진다.
   위 코드는 **잠금은 걸되 응답은 동일**하게 뒀다 — 사용자는 왜 안 되는지 모른다.
   문자 알림 등 별도 통로가 필요할 수 있다.

2. **운영 V2 스키마 적용 시점** — 이 코드를 실제로 연결하려면 선행돼야 한다 (TEL-11 남은 작업 A)

3. **v2-dev 접속 방법** — 로컬에서 v2-dev 를 향해 동작 확인하려면 `.env` 를 어떻게 전환할지 정해야 한다 (별도 `.env.v2`? 환경변수 override?)

4. **단어장(MyWords) 존폐** — TEL-11 판단 필요 #4. 신원 다음 모듈 범위에 영향

---

## 9. 이 작업 밖에서 대기 중인 것

| 작업 | 상태 | 비고 |
|---|---|---|
| **service_role 키 교체** | 선행 배포 완료 → **바로 가능** | 세션 중 키 일부가 대화에 노출됐다. Supabase 회전 → Render 환경변수 교체 → 재배포 |
| 확성기 구매 1회 테스트 | 키 교체 후 | 운영 RLS 켜기 전 마지막 관문 |
| 운영 RLS 적용 (TEL-12) | 위 둘 이후 + PM 합의 | v2-dev 는 이미 적용 완료 |
| 집 PC 의 TEL-11 산출물 push | 사용자 | 마이그레이션 SQL 이 어느 브랜치에도 없음 |
| 마이그레이션 2개를 `supabase/migrations/` 로 커밋 | 위 push 이후 | 저장소 5건 vs DB 7건 불일치 해소 |
| 미커밋 프론트 5파일 | 사용자 | 인증 페이지를 `BottomLayout` 안으로 이동 + 높이 보정 |

---

## 10. 참고

- [TEL-15](https://linear.app/newtelepathy/issue/TEL-15) — 이 작업의 원본 이슈
- [TEL-11](https://linear.app/newtelepathy/issue/TEL-11) — DB 정규화. 이 작업의 선행
- [TEL-6](https://linear.app/newtelepathy/issue/TEL-6) — 마이그레이션 2차 최종 계획안 (§5 §8 §9 §35 §47)
- [TEL-12](https://linear.app/newtelepathy/issue/TEL-12) — RLS. 서버는 `service_role` 이라 이 모듈에 영향 없음
- [Git 규약](../conventions/git.md) · [TypeScript 규약](../conventions/typescript.md) · [Supabase 규약](../conventions/supabase.md)
- [마이그레이션 계획 요약](migration-plan.md)
