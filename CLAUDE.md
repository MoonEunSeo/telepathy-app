# CLAUDE.md

telepathy — 같은 단어를 떠올린 사람끼리 익명으로 대화하는 서비스.

## 구조

```
telepathy-app/
├─ server/           Express 5 + TypeScript (tsx 로 직접 실행)
├─ telepathy-front/  React + Vite + TS — 현 활성 프론트
├─ client/           레거시 프론트 (telepathy-front 로 대체됨)
├─ shared/           client↔server 공유 계약 타입 (@shared/*, 타입 전용)
└─ docs/             성능 베이스라인 등 문서
```

- **UI/디자인 작업은 `telepathy-front`** — `client/`는 레거시다.
- `telepathy-front`는 예전에 중첩 git repo였으나 **2026-07-20 일반 디렉터리로 전환**됐다.
  이제 프론트·서버를 이 저장소에서 함께 커밋한다. 옛 원격 `jhs7942/telepathy-front`에는 push하지 않는다.
- 서버가 `telepathy-front/dist`를 정적 서빙한다 → **prod 확인은 `localhost:5000`**.

## 명령어

```bash
npm run build        # 프론트 프로덕션 빌드
npm start            # 서버 실행 (빌드된 프론트 + API 서빙) → localhost:5000
npm run dev          # 서버 tsx watch
npm run typecheck    # 서버 타입체크

cd telepathy-front && npm run dev   # 프론트 dev (5179, /api → :5000 프록시)
cd telepathy-front && npx tsc -b    # 프론트 타입체크
```

> `vite preview`는 프록시 설정이 없어 `/api` 호출이 실패한다. prod 동작 확인은 `npm start` 쪽을 쓸 것.

---

## ⚠️ 마이그레이션 계획 (TEL-6) — 작업 전 확인

> 원본: [TEL-6 텔레파시 기술스택 마이그레이션 2차 최종 계획안](https://linear.app/newtelepathy/issue/TEL-6/텔레파시-기술스택-마이그레이션-2차-최종-계획안) (Linear)
> 아래는 **2026-07-20 시점 요약**이다. 최신·상세는 Linear를 확인할 것.

3개월 내 DB 정규화 + 웹/Android(Capacitor) 공통 구조 구축이 목표.
**기존 테이블 상당수가 신규 구조로 대체되므로, 기능을 추가하기 전에 그 테이블의 운명을 확인한다.**

### 테이블 → 신규 구조 매핑

| 기존 | 신규 | 비고 |
|---|---|---|
| `users` | `actors` + `users` + `user_credentials` | 인증정보 분리 |
| `telepathy_sessions_queue` | `match_attempts` | |
| `telepathy_sessions_log` | `match_attempts` + `chat_sessions` | |
| `chat_logs` | `chat_sessions` + `chat_session_members` + `chat_messages` | |
| `reported_reports` | `reports` + `report_reason_items` | `reasons ARRAY` 제거 |
| `emotion_feedback` | `session_feedback` | |
| `comments` | `announcements` + `announcement_comments` | |
| `balance_game_logs` | `balance_games` + `balance_game_choices` | |
| **`word_history`** | **대응 테이블 없음** | `chat_sessions` **검증용 보조자료**로만 사용 |
| `users.megaphone_count` | `user_item_ledger` | 잔액 직접 저장 금지 |
| `megaphone_logs` | 이전 안 함 | Legacy Archive |

**⚠️ `word_history` 주의**: MyWords(단어장)가 이 테이블을 쓰고 `is_favorite`/`memo` 컬럼과
PATCH API를 얹어둔 상태다. 계획안에서는 보조자료로 축소되므로, 마이그레이션 시
`chat_sessions` 계열로 재구성이 필요하다. 계획안 7장 기능범위에 단어장 언급이 없어 **PM 확인 필요**.

### 게스트 = `actors` 구조로 통합 예정

회원·게스트가 `actors` 테이블의 공통 식별자를 갖고, 게스트→회원 전환 시 기록을 승계한다.
현재는 게스트가 `users`에 행이 없어 FK 제약에 걸리는 문제가 있고,
`word_history` 저장 시 `partner_id`를 null로 두는 **임시방편**을 쓰고 있다 → `actors` 도입 시 해소.

### 확정 스택 / 도입 금지

- **확정**: Zod(검증), **Vitest**(+Supertest/RTL), Playwright(E2E), Capacitor(Android),
  CSS Variables + Design Tokens, Feature Flag, Supabase SQL Migration
- **이번에 도입하지 않음**: Next.js, NestJS, React Native, GraphQL, 마이크로서비스,
  Kafka, ORM 전환, Supabase 외 별도 SQL
  → 이 목록에 없는 라이브러리(TanStack Query 등)는 금지 대상이 아니다.

### 제거 예정 기능

- **유료 단어 세트** (`wordset_text` 등) — 신규 상품 구조에서 제외. 여기에 기능 추가하지 말 것.

### 신규 예정

AI 트렌드 단어 추천(관리자 승인 필수), 신고 처리 결과 알림, 공유 시 60초 재접속,
하루 무료 매칭 5회 + 추가 매칭권 결제, 시즌 테마

### 공통 DB 규칙

- 신규 주요 ID는 **UUID**, 시간은 **`timestamptz`(UTC 저장, 표시·일일계산은 KST)**
- 사용자·세션·결제 관계에 **FK 필수**, 물리삭제보다 `deleted_at`/`status`/익명화
- 서버 모듈 구조: `Route → Controller → Validation(Zod) → Service → Repository`

---

## 관련 문서

- [CONVENTIONS.md](CONVENTIONS.md) — TS 마이그레이션 규약 (`shared/` 사용법, `export =` 인터롭, 툴체인)
- [docs/perf-baseline.md](docs/perf-baseline.md) — 최적화 전 성능 베이스라인 (S1/S4 측정 완료)
