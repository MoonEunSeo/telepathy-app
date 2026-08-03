# 알려진 이슈 / 이월 과제

## 운영에서 지금 깨져 있는 것

### `/api/payments/verify` → 500 — **의도된 상태다**

배포된 코드가 `grant_megaphone_payment` 를 호출하는데 **운영 DB 에 그 함수가 없다.**
PR #9 가 머지되며 2026-08-03 배포됐고, 함수는 v2-dev 에만 만들어져 있었다.

레거시 함수를 운영에 넣지 않기로 했다. 확성기 재고는 V2 에서
`users.megaphone_count` 카운터가 아니라 `user_item_ledger` 원장으로 바뀌고
(`migration-plan.md` — "잔액 직접 저장 금지"), 전환 시 `payments.routes.ts` 와
이 함수를 함께 걷어낸다. **지금 넣으면 전환 때 버리는 작업이 된다.**

운영이 서비스 중이 아니라 방치한다. 되살려야 하면 아래를 운영 SQL 에디터에
붙여넣으면 즉시 정상화된다 — 코드 변경은 필요 없다.

```
supabase/migrations/20260729_grant_megaphone_payment.sql
```

> 대체 구현은 `20260803070550_v2_item_purchase_and_consume.sql` 에 있고
> v2-dev 에서 실측 검증됐다 (구매·중복·사용·부족·금액불일치 5케이스).

---

## 이월 과제

- `/api/password/reset`에 본인인증(OTP) 게이팅 없음 → 계정탈취 위험
  - 아이디만 알면 임의 계정의 비밀번호를 바꿀 수 있다. 인증 미들웨어도, 쿠키 확인도 없다.
    앞단 `/check-user` 가 아이디 존재 여부를 그대로 알려주어 **두 번의 요청으로 끝난다**
  - TEL-15 §2.1 에서 `phone_verification_challenges`(`ACCOUNT_RECOVERY`) 기반으로 교체 중.
    다만 **챌린지를 발급하는 코드가 아직 없어**(`verify.routes.ts` 는 PortOne 결과를
    클라이언트에 돌려줄 뿐이다) 인증 챌린지 슬라이스가 선행돼야 한다
- 온라인 사용자 수 소스 이원화 (`index.ts` 수동 카운터 vs `chat.socket`의 `io.engine.clientsCount`)
- `telepathy_sessions_queue`에 `role` 컬럼이 없어 게스트 판별을 `username === user_id`로
  **간접 추론**하고 있다 → `actors` 구조 도입 시 해소
- `word_history`는 게스트 FK 문제로 `partner_id`를 null로 두는 임시방편 사용 중
- `MainPage`의 `setInterval(syncFromServer, 1000)` — 1초 폴링(분당 60요청)
- `client/`(레거시)는 `@shared` 경로 불일치로 tsc가 깨진다 (빌드는 type-only라 통과)
