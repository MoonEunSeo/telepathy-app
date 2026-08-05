# report — 신고·피드백

> 리니어 요약본. **다르면 리니어가 맞다.** 갱신 2026-08-05
> 원본: TEL-24(2-4) · TEL-7 · TEL-11

---

## 1. 문제 — 신고 사유가 한글 문장 배열이다

`reported_reports.reasons` 가 `text[]` 이고 **UI 문구가 그대로 들어간다.** 문구를 고치면 **과거 신고의 사유가 달라지고**, 집계도 문자열 매칭에 의존한다.

```
reported_reports.reasons (text[])  →  reports + report_reason_items
                                       ↳ report_reason_codes 를 참조
emotion_feedback (321행)           →  session_feedback
```

| 엔드포인트 | 레거시 | V2 |
|---|---|---|
| `POST /api/report` | `reported_reports` | `reports` + `report_reason_items` |
| `POST /api/feedback/add` | `emotion_feedback` | `session_feedback` |

**관리자 RPC 2건도 대상이다** — 운영 DB 에 `get_pending_reports`·`get_report_details` 가 있고 **레거시 테이블을 직접 읽는다.** V2 구조로 다시 쓴다.

---

## 2. 착수 전 확인

### `session_feedback.emotion` 의 CHECK 에 한글 UI 문구가 박혀 있다
`report_reason_codes` 가 선언한 **"코드 분리" 원칙과 자기모순**이다. 신고는 코드로 가는데 피드백은 문구가 제약에 남는 셈. **이 항목에서 같이 정리할지 판단한다** — 바꾸려면 마이그레이션이 필요하다.
(같은 문제가 `users.gender` 에도 있다. `'남성'|'여성'` 이라 UI 문구를 바꾸려면 마이그레이션.)

### 사유 매핑은 레이블 문자열로 한다
cutover `04-report-feedback.sql` 이 `unnest(reasons)` 를 **레이블 기준**으로 `report_reason_codes` 에 붙이고 있다. **앱도 같은 매핑을 써야 이관 데이터와 어긋나지 않는다.**

---

## 3. 레거시 피드백은 세션과 1:1 이 아니다

cutover 리허설에서 `session_feedback` 이 **319 → 471행으로 부풀었다.** 레거시 한 행이 여러 세션에 매칭됐기 때문. 2단계 `distinct` 로 259행에 수렴시켰다.

> **앱에서 세션을 특정할 때 같은 함정을 밟지 않도록 한다.**

관련: `emotion_feedback.created_at` 이 **303건 중 266건(88%) NULL**. 감정 피드백 6건은 세션 식별자가 없어 (참여자+단어)로 추론했으나 매칭 실패 — **폐기할지 별도 보관할지 미결**(TEL-11 판단 필요 #2).

---

## 4. 운영 데이터에 테스트 데이터가 섞여 있다 (TEL-11)

- `room_id` 가 `testroom`, `fake-1784456916` 인 신고 2건
- **인코딩이 깨진 신고 사유 2건** (`?????׽?Ʈ`)
- 사유가 비어 있는 신고 1건

---

## 5. 인증·인가 (TEL-7) — 중복 기재

**TEL-7 §3.10 에서 `report`·`feedback` 에 `requireSession` 을 적용했다** (게스트 통과, 신원은 검증). `reporterId`·`userId` 를 body 대신 **토큰에서 도출**하고, **자기 자신 신고를 차단**했다(§21 제약).

> 원칙 — "나는 누구인가"(reporterId)는 **서버가 토큰에서 도출**한다. "누구에 대해 말하는가"(reportedId)는 클라이언트가 전달할 수 있다.

**⚠️ 아직 남은 것 — 인가(authorization) 검증이 없다.** 신고·피드백에서 **"내가 그 roomId 에 실제로 있었나"를 확인하지 않는다.** 신원 위조는 막혔으나 **무고한 신고는 가능**하다. §21 의 세션 참여자 제약으로 다룰 항목이며, 자동 정지 기능이 없는 현재는 실익이 낮아 보류 중.

DB 는 이미 **"그 방에 없던 사람의 신고·피드백"을 막도록** 설계돼 있다(TEL-11 차단검증 56건 중 일부). V2 전환 시 이 제약이 작동한다.

관련: 회원 닉네임이 토큰에 없어 feedback 에서 payload 를 쓰고 있다 — `actors` 재설계 시 정리.

---

## 6. 제재는 아직 코드가 없다

`actors.status` 를 `SUSPENDED` 로 바꾸는 코드는 **아직 없다** (신고·제재 도메인 소관, §20.4). 다만 탈퇴는 이미 `SUSPENDED` 를 막아 뒀다(`403 WITHDRAW_SUSPENDED`) — 그 기능이 붙었을 때 **정지자가 탈퇴→재가입으로 제재를 우회하는 구멍이 열려 있지 않도록** 미리 막은 것. → [auth.md](auth.md)

---

## 7. 완료 조건

1. `report.routes.ts`·`feedback.routes.ts` 삭제, `modules/report` 수직 슬라이스 완성
2. 신고 저장 시 사유가 **코드로** 남는다. `report_reason_items` 행 수 = 선택한 사유 개수
3. 관리자 RPC 2건이 V2 테이블을 읽는다
4. `scripts/check-report-flow.ts` 추가
