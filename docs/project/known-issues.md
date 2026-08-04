# 알려진 이슈 / 이월 과제

## 기능이 빠져 있는 것

### 확성기 구매 경로가 없다 — **의도된 상태다**

PortOne PG 결제를 걷어냈다. 근거 셋 —

- **PG 결제 실적 0건** (`legacy_payments` 0행 · 계좌이체 `legacy_sp_payments` 131행)
- 계획안 §27.1 — *"PG 결제는 이번 마이그레이션에서 제외, 우선순위는 계좌이체"*
- 걷어내기 전에도 이미 500 이었다 (`grant_megaphone_payment` 가 운영 DB 에 없었음)

구매 모달은 버튼 대신 **"준비 중" 안내**를 띄운다. 확성기 **사용**(발사)은 그대로 동작한다.

대체 작업은 계좌이체 웹훅 결제다 — 계획안 §28~30.

```
① 주문 생성   orders PENDING · payments PENDING · expected_depositor
② 사용자 이체
③ 웹훅 수신   payment_events (event_key UNIQUE 로 중복 알림 차단)
④ 대조·지급   payments PAID · orders PAID · user_item_ledger +N
```

웹훅 수신부(`webhook.routes.ts`)와 계좌이체 결제 생성(`sp_payments.routes.ts`)은
이미 있으나 **단어세트 전용이고 재화를 지급하지 않는다.** 지급 로직이 새로 필요하다.

> `20260803070550_v2_item_purchase_and_consume.sql` 의 `record_item_purchase` 는
> PG 전제(즉시 결제·즉시 지급)로 작성돼 **위 2단계에 맞지 않는다.** 재작성 대상이다.
> `item_balance`·`consume_item` 은 그대로 쓴다.

---

## 이월 과제

- `/api/password/reset`에 본인인증(OTP) 게이팅 없음 → 계정탈취 위험
  - 아이디만 알면 임의 계정의 비밀번호를 바꿀 수 있다. 인증 미들웨어도, 쿠키 확인도 없다.
    앞단 `/check-user` 가 아이디 존재 여부를 그대로 알려주어 **두 번의 요청으로 끝난다**
  - TEL-15 §2.1 에서 `phone_verification_challenges`(`ACCOUNT_RECOVERY`) 기반으로 교체 중.
    `modules/phone/` 이 챌린지를 DB 에 쓰지만 **아직 마운트되지 않았다.**
    레거시 `verify-mvp.routes.ts` 는 여전히 인증번호를 메모리 `Map` 에 담아
    검증 성공이 DB 에 남지 않는다 — 그 전환이 선행돼야 재설정이 실제로 동작한다
- 온라인 사용자 수 소스 이원화 (`index.ts` 수동 카운터 vs `chat.socket`의 `io.engine.clientsCount`)
- `telepathy_sessions_queue`에 `role` 컬럼이 없어 게스트 판별을 `username === user_id`로
  **간접 추론**하고 있다 → `actors` 구조 도입 시 해소
- `word_history`는 게스트 FK 문제로 `partner_id`를 null로 두는 임시방편 사용 중
- `MainPage`의 `setInterval(syncFromServer, 1000)` — 1초 폴링(분당 60요청)
- `client/`(레거시)는 `@shared` 경로 불일치로 tsc가 깨진다 (빌드는 type-only라 통과)
