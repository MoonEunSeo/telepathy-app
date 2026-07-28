# 마이그레이션 계획 요약 (TEL-6)

> 원본: [텔레파시 기술스택 마이그레이션 2차 최종 계획안](https://linear.app/newtelepathy/document/텔레파시-기술스택-마이그레이션-2차-최종-계획안-c739c0490194) (Linear 문서)
> 아래는 **2026-07-20 시점 요약**이다. 최신·상세는 Linear를 확인할 것.
>
> **2026-07-28 계획안에 현행 코드 실측 절이 추가됐다.** `🔍 현행 코드 실측` 표식이 붙은 절은
> PM 확정 스펙이 아니라 **개발자 관찰**이며, 코드가 바뀌면 갱신해야 한다.
> §4(데이터 규모·Spark/ES 기각) · §15.5(매칭 원자성) · §26(집계 이원화·수평 확장) ·
> §34(인덱스·RLS) · §43 10주차(부하테스트). 근거는
> [최적화 백로그](../perf/optimization-backlog.md) · [기술 도입 검토](tech-adoption-review.md).

3개월 내 DB 정규화 + 웹/Android(Capacitor) 공통 구조 구축이 목표.
**기존 테이블 상당수가 신규 구조로 대체되므로, 기능을 추가하기 전에 그 테이블의 운명을 확인한다.**

## 테이블 → 신규 구조 매핑

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

## 게스트 = `actors` 구조로 통합 예정

회원·게스트가 `actors` 테이블의 공통 식별자를 갖고, 게스트→회원 전환 시 기록을 승계한다.
현재는 게스트가 `users`에 행이 없어 FK 제약에 걸리는 문제가 있고,
`word_history` 저장 시 `partner_id`를 null로 두는 **임시방편**을 쓰고 있다 → `actors` 도입 시 해소.

## 확정 스택 / 도입 금지

- **확정**: Zod(검증), **Vitest**(+Supertest/RTL), Playwright(E2E), Capacitor(Android),
  CSS Variables + Design Tokens, Feature Flag, Supabase SQL Migration
- **이번에 도입하지 않음**: Next.js, NestJS, React Native, GraphQL, 마이크로서비스,
  Kafka, ORM 전환, Supabase 외 별도 SQL
  → 이 목록에 없는 라이브러리(TanStack Query 등)는 금지 대상이 아니다.

## 제거 예정 기능

- **유료 단어 세트** (`wordset_text` 등) — 신규 상품 구조에서 제외. 여기에 기능 추가하지 말 것.

## 신규 예정

AI 트렌드 단어 추천(관리자 승인 필수), 신고 처리 결과 알림, 공유 시 60초 재접속,
하루 무료 매칭 5회 + 추가 매칭권 결제, 시즌 테마

## 공통 DB 규칙

- 신규 주요 ID는 **UUID**, 시간은 **`timestamptz`(UTC 저장, 표시·일일계산은 KST)**
- 사용자·세션·결제 관계에 **FK 필수**, 물리삭제보다 `deleted_at`/`status`/익명화
- 서버 모듈 구조: `Route → Controller → Validation(Zod) → Service → Repository`

