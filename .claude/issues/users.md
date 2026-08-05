# users — 닉네임·프로필

> 리니어 요약본. **다르면 리니어가 맞다.** 갱신 2026-08-05
> 원본: TEL-29(PR #21) · TEL-26 · TEL-16

---

## 1. 닉네임은 2테이블이다 (TEL-29 / 2026-08-04)

지금 이름은 `users.nickname`, 언제 어떤 이름이었는지는 `nickname_histories`. 이름을 바꿀 때 서버가 할 일은 **셋**이다.

1. `users.nickname` 갱신
2. 열린 이력(`ended_at IS NULL`) 닫기
3. 새 줄 열기

**레거시는 ①만 하고 ②③의 실패를 의도적으로 삼켰다.** `nickname.routes.ts:47` 원문:

```
console.warn('[닉네임 삽입 오류 - 무시]', insertError); // 절대 throw 하지 않음
```

②③이 실패하면 이력은 `고양이1(끝 비어 있음)` 인데 실제 이름은 `강아지2` 다. 운영자가 신고를 조사할 때 **"이 사람이 그때 뭐라고 불렸나"** 를 확인할 수 없다(§10).

### 실측 (v2-dev, 회원 1,192명)

| | |
|---|---|
| 이력이 아예 없음 | **34명** |
| 열린 이력이 `users.nickname` 과 다름 | **60명** |
| 열린 이력이 2개 이상 | **0명** |

마지막 줄이 중요하다 — **깨진 게 줄이 겹친 게 아니라 없거나 틀린 것**이라 제약을 바로 걸 수 있었다.

---

## 2. 한 것 — 세 가지

### ① `change_nickname` RPC 한 트랜잭션
하나라도 실패하면 전부 취소. `signup_user` 와 같은 방식. `now()` 가 트랜잭션 시작 시각이라 **닫은 `ended_at` 과 새 `started_at` 이 마이크로초까지 정확히 같다** — 이력이 시간축에서 끊기지 않는다.

### ② DB 가 판정하게 — 부분 UNIQUE 인덱스
```
nickname_histories (actor_id) where ended_at is null
```
코드가 실수해도 DB 가 거부한다. 위반 0건이라 바로 걸 수 있었다.

### ③ 깨진 94건 복구
진실은 `users.nickname` 이다(§10). 하지만 **언제 바뀌었는지는 기록이 없다** — 그 INSERT 가 실패했던 것이라 그렇다.

어긋난 열린 이력을 **닫고 현재 닉네임으로 새로 연다.** 과거 이름이 보존되고 `change_reason='SYSTEM'` 이 "복구된 행" 을 표시한다. **덮어쓰기를 택하지 않은 이유는 그러면 과거 이름이 영구히 사라지기 때문.**

> ⚠️ `supabase/cutover/02-identity.sql` **에도 같은 로직을 넣었다.** 이관 SQL 이 레거시 이력을 그대로 베껴 오므로, v2-dev 만 고치면 운영 전환 때 같은 상태가 다시 만들어진다.

---

## 3. 결정·규칙

- `change_reason` CHECK: `SIGNUP_AUTO` / `USER_CHANGE` / `ADMIN_CHANGE` / `SYSTEM`. 사용자 변경은 `USER_CHANGE`.
- **중복 닉네임이 500 이었다.** `users.nickname` 이 UNIQUE 인데 레거시는 UPDATE 실패를 그대로 throw 해 "서버 오류" 로 응답했다. 사용자는 이름이 겹친 건지 서버가 고장난 건지 알 수 없었다. → **409 `NICKNAME_TAKEN`**
- **새 입력 규칙: 최소 2자·공백 금지 추가** (레거시는 20자 상한만). 1자 이름과 공백 조합(`고 양이` vs `고양이`)은 눈으로 구분되지 않아 **사칭에 쓰기 쉽다.** 금칙어 필터는 범위 밖.
- **닉네임 엔트로피 8,000가지** (동물 8 × 숫자 1000)인데 UNIQUE. service 가 최대 5회 재시도로 막는다(실패 시 RPC 전체 롤백이라 안전). 근본 해결은 엔트로피 증가.

---

## 4. ⚠️ 마운트 교체 시 프론트를 함께 고쳐야 한다

`/profile` 이 **처음으로 응답 모양이 바뀌는 엔드포인트**다.

```
레거시  { success, userId, username, nickname }        ← 최상위
V2      { success: true, data: { actorId, username, nickname } }
```

프론트 4곳(`useProfile.ts` · `MainPage` · `Verify_mvp` · `WordSetPage`)이 최상위에서 읽는다. **미마운트라 지금 프론트를 고치면 오히려 레거시와 어긋난다.**

덤으로 `data.user_id || data.id || data.userId` 3중 방어도 그때 사라진다 — 확인해 보니 **서버가 준 적 있는 것은 `userId` 하나뿐이다.**

---

## 5. 이월된 것

- `nickname.routes.ts` **삭제 → TEL-26 으로 이월.** 미마운트 상태라 지금 지울 수 없다. → [content.md](content.md)
- `GET /api/user/me` 는 세션 확인 경로라 프론트 대부분이 의존한다. 깨지면 **로그인이 된 채로 앱이 빈 화면**이 된다. `actors.status` 를 함께 내려줘 탈퇴(`DELETED`)·병합(`MERGED`) 계정을 프론트가 구분할 수 있게 한다. → [content.md](content.md)

---

## 6. 검증 — 18항목 통과 (`scripts/check-nickname-flow.ts`)

| | |
|---|---|
| ①② | `users.nickname` 갱신 · 닫힌 `ended_at` = 새 `started_at` (마이크로초 일치) |
| ③ | 연속 2회 변경 → 이력 3건, 열린 것 정확히 1개 |
| ④ | 남이 쓰는 이름 → 409 `NICKNAME_TAKEN` |
| ⑤ | 같은 이름으로 변경 → 이력이 늘지 않는다 |
| ⑥ | **직접 INSERT 로도 인덱스가 막는다** (23505) |
| ⑦ | 탈퇴한 계정 → 401 |
| ⑧ | 프로필 `actorId`·`username`·`nickname` |

복구 SQL 적용 후 v2-dev 불변식 위반 **0건**, 복구된 행 **94건**(34+60 일치).
