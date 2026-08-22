# 현재 아키텍처

> 기술스택은 [tech-stack.md](tech-stack.md), 코딩 규약은 [conventions-ts.md](typescript.md) 참조.
> 웹·API 분리와 Redis·Capacitor 목표 구조는 [상세 설계](../project/architecture-design.md) 참조.

## 전체 구성

```
[브라우저] ──HTTP /api──▶ [Express 5 + TS]  ──▶ [Supabase PostgreSQL]
    │                          │
    └────Socket.IO─────────────┘
```

- 프론트는 **Vite로 빌드 → `telepathy-front/dist`를 Express가 정적 서빙**한다.
  즉 운영에서는 **API와 웹이 같은 오리진(:5000)** 이다.
- 개발 중에는 Vite dev(5179)가 `/api`를 `:5000`으로 프록시한다.
  `vite preview`에는 프록시 설정이 없어 API 호출이 실패하므로, prod 동작 확인은 `npm start` → `localhost:5000`.

## 디렉터리

```
telepathy-app/
├─ server/
│  ├─ index.ts              진입점 — HTTP + Socket.IO 서버, io.use 인증
│  ├─ app.ts                Express 앱 — CORS·미들웨어·라우트 마운트·정적 서빙
│  ├─ env.ts                .env 로더 (⚠️ 반드시 최상단 import)
│  └─ src/
│     ├─ routes/            *.routes.ts — 도메인별 REST
│     ├─ middleware/        auth.ts(decodeToken/requireMember/requireSession), validateRefund.ts
│     ├─ config/            supabase.ts(싱글턴), chat.socket.ts(매칭·채팅 핸들러)
│     └─ utils/             round.ts(15초 라운드), flush.ts, badwords.ts, logger.ts …
├─ telepathy-front/         현 활성 프론트 (React 19 + Vite + TS)
│  └─ src/
│     ├─ pages/ components/ contexts/ hooks/ games/ utils/
│     ├─ config/socket.ts   소켓 싱글턴 (autoConnect: false)
│     ├─ themes/base/tokens.css   디자인 토큰 SSOT
│     └─ types/             @shared 재노출 + 프론트 전용 타입
├─ shared/                  공유 계약 타입 (타입 전용, 런타임 코드 0)
└─ docs/                    성능 베이스라인 등
```

**UI/디자인 작업은 `telepathy-front`.** 저장소에 별도 레거시 프론트 디렉터리는 없다.

## 인증 구조

JWT를 **`token` 쿠키**(HttpOnly)에 담아 회원·게스트가 **같은 쿠키를 공유**한다.
구분은 페이로드의 `role` 필드로 한다.

```ts
// 회원   jwt.sign({ user_id, username, role: 'member' })
// 게스트 jwt.sign({ user_id, nickname, role: 'guest' })
```

`server/src/middleware/auth.ts`가 단일 해석 지점이다.

| 함수                 | 용도                                                     |
| -------------------- | -------------------------------------------------------- |
| `decodeToken(token)` | 검증 + `SessionUser` 반환. 실패는 예외가 아닌 **`null`** |
| `requireMember`      | 회원 전용 (마이페이지·결제·확성기)                       |
| `requireSession`     | 회원 + 게스트 (신고·피드백)                              |

- **HTTP와 Socket.IO가 `decodeToken`을 공유**한다 (`server/index.ts`의 `io.use`).
- ⚠️ **`role` 없는 구 토큰은 `member`로 간주**(하위 호환). 게스트 토큰 발급·재발급 시
  `role: 'guest'`를 빠뜨리면 게스트가 회원으로 오인된다.
- ⚠️ 게스트는 **`users` 테이블에 행이 없다** → FK 제약이 걸린 컬럼에 게스트 id를 넣을 수 없다.

## 매칭·채팅 (Socket.IO)

```
15초 라운드(round.ts: Math.floor(now/15000))
  → client emit 'join_match' { nickname, word, round }
  → 서버: telepathy_sessions_queue 에 waiting 등록
  → 같은 word+round 의 다른 waiting 조회
  → 있으면 매칭 성사 (나중에 join 한 쪽 핸들러에서 실행)
      · 양쪽 status='matched', room_id 부여
      · telepathy_sessions_log 기록
      · word_history 기록 (회원만)
      · 양쪽 socket.join(roomId) 후 'matched' emit
```

**매칭 블록은 두 번째 참가자의 핸들러에서 한 번만 실행된다.** 이 컨텍스트에서
`me`는 나중에 들어온 쪽, `partner`는 큐에서 조회한 먼저 들어온 쪽이다.

## 디자인 시스템

`telepathy-front/src/themes/base/tokens.css`가 **단일 진실 공급원(SSOT)**.

- 기본 테마 = `:root` 토큰. 시즌 테마는 `body.halloween-mode{…}` 형태의 토큰 재정의.
- 컴포넌트는 `var(--token)`만 소비 → Tailwind arbitrary value로 사용.
  `className="bg-[var(--color-surface)]"`
- `src/index.css`의 `@theme inline`이 토큰을 Tailwind 유틸리티로 브리지한다 (`bg-surface` 등).
- **일회성 장식값**(그라디언트·마스킹테이프 등)은 토큰화하지 않고 컴포넌트에 리터럴로 둔다.
