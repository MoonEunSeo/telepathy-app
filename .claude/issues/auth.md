# auth — 신원·인증·계정

> 리니어 요약본. **다르면 리니어가 맞다.** 갱신 2026-08-05
> 원본: TEL-15(부모) · TEL-16(인계 본체) · TEL-21 · TEL-27 · TEL-28 · TEL-30 · TEL-17 · TEL-13 · TEL-7

---

## 1. 지금 상태 (TEL-16 / 2026-08-04)

| 범위 | 상태 |
|---|---|
| 로그인 수직 슬라이스 · 실패 카운터 원자화(RPC) | ✅ PR #2 |
| 회원가입 — `actors`+`users`+`user_credentials` 3테이블 RPC (`signup_user`) | ✅ PR #3 #6 |
| 비밀번호 변경·재설정 | ✅ PR #12 |
| 휴대폰 인증 챌린지 — 메모리 `Map` → DB | ✅ PR #13 |
| PortOne 제거 (본인인증·PG 결제) | ✅ PR #14 |
| 공통 응답 규약 `ApiSuccess`/`ApiError` | ✅ PR #19 (TEL-27) |
| 회원 탈퇴 — `actors.status='DELETED'` | ✅ PR #20 (TEL-28) |
| 게스트 발급·전환 | ❌ TEL-30 미착수 — **가장 무겁다** |
| 마운트 전환 (`verify-mvp` 제거) | ❌ TEL-21 |

**`modules/auth`·`modules/phone` 은 완성됐는데 `app.ts` 에 마운트돼 있지 않다.**
운영 DB 에 V2 스키마(`user_credentials`)가 없어 연결하면 즉시 깨지기 때문. 미마운트라 배포해도 영향 0, 롤백은 디렉터리 삭제로 끝난다.

그 결과 **회원가입·비밀번호 재설정이 운영에서 항상 `PHONE_NOT_VERIFIED` 로 실패한다** — 레거시 `verify-mvp` 가 인증번호를 메모리에 두고 검증 성공을 DB 에 안 남기기 때문. TEL-21 이 되어야 실제로 동작한다.

---

## 2. 착수 전 반드시 확인 (TEL-16 §3 / 2026-08-04)

1. **`.env` 커넥션은 하나다.** `config/supabase.v2.ts` 는 `config/supabase.ts` **와 같은 인스턴스에 타입만 씌운 것**이라 두 계층이 항상 같은 DB 를 본다. v2-dev 를 보면 레거시가 깨지고 운영을 보면 V2 가 깨진다 — **둘을 동시에 만족시키는 설정이 없다.** 새 모듈을 미마운트로 두고 service 직접 호출 스크립트로 검증하는 이유가 이것이다.
2. **QA 는 `testuser` / `test1234!` 로만.** v2-dev 는 `password_hash` 1,192행이 **전부 33자로 마스킹**돼 있다(정상 bcrypt 60자). `bcrypt.compare` 가 무조건 `false` → **실회원 계정은 코드가 멀쩡해도 401.** 게다가 실패마다 `failed_attempt_count` 가 올라가 5회면 5분 잠기고 dev 데이터가 오염된다.
3. **타입체크만으로는 부족하다.** 타입체크를 통과하는데 동작이 틀린 상태가 세 번 나왔다 — `bcrypt.compare` 블록 소실(아무 비밀번호나 로그인됨) · `.eq()` 컬럼명 미수정 · `maxAge` 오타(세션 쿠키로 전락). 셋 다 검증 스크립트가 잡았다. **항목마다 스크립트를 남긴다.**
4. **`scripts/backfill/` 커밋 금지.** `dump/v2-data.sql`(13MB)에 실제 전화번호 1,192건·실명 23건·대화 8,003건이 있다. 저장소는 PUBLIC.
5. 전화번호도 마스킹돼 있다(`010-77af-cbd3`, 16진수). **운영의 실제 형식을 v2-dev 에서 유추할 수 없다.**

### 검증 스크립트

```bash
V2_TEST_PASSWORD=... npx tsx scripts/check-login-flow.ts    # 7항목
npx tsx scripts/check-signup-flow.ts                        # 6항목
npx tsx scripts/check-password-flow.ts                      # 7항목
npx tsx scripts/check-phone-flow.ts                         # 8항목 (문자 발송 안 함)
npx tsx scripts/check-withdraw-flow.ts                      # 12항목
npx tsx scripts/check-envelope.ts                           # 22항목 (DB 안 씀)
```

---

## 3. V2 에서 바뀌는 것 (TEL-15 §4)

| 항목 | 레거시 | V2 |
|---|---|---|
| 신원 식별자 | `users.id` (회원만) | **`actors.id` (회원·게스트 공통)** |
| 로그인 정보 | `users.username`·`password_hash` | `user_credentials` 로 분리 |
| 계정 상태 | `users.is_deleted` | `actors.status` (ACTIVE/SUSPENDED/DELETED/MERGED) |
| 최근 로그인 | `users.last_login` | `users.last_login_at` |
| 확성기 잔액 | `users.megaphone_count` | `user_item_ledger` 합계 |

JWT 페이로드의 `user_id` **값**이 `users.id` → `actors.id` 로 바뀐다. **페이로드 형태는 유지**해 기존 `middleware/auth.ts` 와 호환시킨다.

---

## 4. 확정된 결정

### 전화번호 인증은 자체 SMS (2026-08-04 확정)
Solapi. PortOne 은 본인인증·PG 결제 양쪽에서 제거했다(PR #14). PG 결제는 §27.1 대로 범위 밖(실적 0건), 확성기 구매는 **계좌이체 웹훅**으로 복구한다 → [payment.md](payment.md)

### 탈퇴 = `users` 물리 삭제 + `actors` 상태 전이 (TEL-28 / 2026-08-04)
```
지워짐   users            전화번호·실명·생년월일
        user_credentials  FK CASCADE 로 함께 (로그인 정보)
남음    actors            status='DELETED' · deleted_at
        nickname_histories · match_attempts · chat_* · orders · user_item_ledger
```
- `actors` 를 남기는 게 핵심. 활동 이력 4종이 `actors` 를 **RESTRICT** 로 참조해 DB 가 애초에 actor 삭제를 막는다.
- **로그인 차단을 따로 처리하지 않는다** — 자격증명이 CASCADE 로 사라져 `findLoginCredential` 이 null 을 주고 그 경로가 이미 401.
- `actors` UPDATE 와 `users` DELETE 가 한 트랜잭션이어야 해 **RPC(`withdraw_user`)** 로 간다. 나뉘면 프로필만 사라지고 상태는 ACTIVE 인 계정이 생긴다.
- **재가입은 열어 둔다** — `users` 를 지우면 `phone` UNIQUE 가 풀린다. 탈퇴 화면 문구와 일관되므로 프론트 수정 없음.
- **대신 정지 중에는 탈퇴할 수 없다** (`403 WITHDRAW_SUSPENDED`). 전화번호가 사라지면 정지자가 탈퇴→재가입으로 제재를 우회한다. `SUSPENDED` 로 바꾸는 코드는 아직 없지만(신고·제재 도메인 소관) 구멍을 미리 막아 둔 것.

### 로그인 실패는 4곳 전부 `INVALID_CREDENTIALS` (TEL-27)
아이디 부재·비밀번호 불일치·잠금·정지를 구분해 흘리지 않는다. 잠금도 걸되 **응답은 동일** — 사용자는 왜 안 되는지 모른다(§8.4 와의 충돌은 미해결, 문자 알림 등 별도 통로 필요).

### 4xx 는 로그를 남기지 않는다 (TEL-27)
남기면 잘못된 비밀번호 입력 같은 일상적 실패가 오류 로그를 채워 진짜 장애가 묻힌다.

---

## 5. 함정

### 이미 운영에 열려 있는 취약점
- **비밀번호 찾기에 인증 단계가 아예 없다** (TEL-21 / 2026-08-04 발견). `FindPassword.tsx` 는 아이디 입력 → 존재 확인 → 새 비밀번호로 끝난다. SMS 인증이 없다. 즉 레거시 `/api/password/reset` 은 **아무나 남의 비밀번호를 바꿀 수 있다.** V2 `reset_password` RPC 는 `ACCOUNT_RECOVERY` 챌린지를 요구하므로 **프론트에 인증 화면을 새로 만들어야 한다** — 형식만 맞춰서 되는 일이 아니다.
- `POST /api/password/check-user` 가 `{ exists: true }` 로 **아이디 존재 여부를 그대로 노출한다.** RPC 는 일부러 숨기는데 프론트 1단계가 다 알려준다.

### 인증한 사람 = 제출하는 사람인지 확인 못 한다 (TEL-16 §7.1)
검증 성공 시 아무것도 안 돌려줘서, 서버가 아는 건 *"이 계정 번호가 최근 인증됐다"* 뿐. 유효 3분 안에 같은 아이디로 재설정을 던지면 **제3자가 피해자가 연 창에 끼어든다.** → 챌린지 id 를 검증 응답에 실어 재설정 요청에 함께 받는다. `reset_password` RPC 에 인자 추가 필요. **발급 경로가 id 를 내려줘야 해서 TEL-21 과 같이 처리한다.**

### 게스트 (TEL-30)
- **전환은 INSERT 가 아니라 UPDATE 다.** 기존 GUEST actor 를 USER 로 바꿔야 게스트 활동(매칭·채팅)이 회원 계정에 이어진다. `signup_user` 와 로직이 갈리므로 **별도 함수로 뺀다.**
- **`actors_legacy_type_match` CHECK** — `actor_type='USER'` 면 `legacy_guest_id` 가 **NULL 이어야 한다.** 타입만 바꾸고 컬럼을 두면 CHECK 에 걸린다.
- **`legacy_actor_map` 의 GUEST 587행이 존재하지 않는 actor 를 가리킨다.** 게스트 이관을 돌렸다 되돌린 흔적. 그대로 두면 게스트 조회가 유령 actor 를 만난다. **착수 전 정리 또는 재실행.**
- cutover 는 게스트를 이관하지 않는다(`07-guest.sql` 은 신규 설계). **전환 전후로 데이터가 이어질 게 없다 — 신규 기능으로 취급.**
- 게스트 토큰 TTL·재발급 정책을 회원과 다르게 둘지 정해야 한다.

### 기타
- **`findActiveChallenge` 만 앱 시계를 쓴다** (TEL-16 §7.4). 나머지는 DB `now()`. 검증 중 **두 시계가 0.7초 어긋나는 것을 실측했다.** 최종 확정(`mark_challenge_verified`)이 DB 시계로 다시 검사해 동작은 안전하지만 RPC 로 옮겨 통일하는 게 낫다.
- **닉네임 엔트로피 8,000가지** (동물 8 × 숫자 1000)인데 `users.nickname` 이 UNIQUE. 기존 자동닉 n명이면 첫 시도 실패율 `n/8000`. 지금은 service 가 최대 5회 재시도로 막는다(실패 시 RPC 전체 롤백이라 안전). 근본 해결은 엔트로피 증가.
- **전화번호 정규화 미결** (TEL-16 §4.3). `signupSchema.phone` 이 하이픈을 있어도 없어도 통과시키는데 `users.phone` 이 UNIQUE → `010-1234-5678` 과 `01012345678` 이 다른 행이 되어 **같은 사람이 두 번 가입할 수 있다.** 운영 DB 를 보고 정한 뒤 `.transform()` 으로 정규화해야 한다.
- **Argon2id 전환은 순서가 있다** (TEL-16 §7.2). §8.2 는 신규 비밀번호를 Argon2id 로 요구하지만 지금은 전부 bcrypt. **로그인이 argon2id 를 검증할 수 있게 되는 것이 먼저다** — 순서를 어기면 비밀번호를 바꾼 사용자가 *토큰은 유효한데 로그인만 안 되는* 상태가 된다. 세 곳(로그인 검증·변경·재설정)을 함께 바꾼다.
- **비밀번호를 바꿔도 기존 세션이 안 죽는다** (§8.4 미충족). JWT 가 무상태·60일이라 탈취된 쿠키가 그대로 유효하다. JWT cutover 와 같은 뿌리.
- **JWT cutover 전략 미결** (TEL-16 §4.1). 배포된 쿠키의 JWT 에 레거시 `users.id` 가 들어 있고 TTL 60일. V2 전환 후 서명 검증은 통과하는데 조회가 전부 miss 된다. `decodeToken` 은 DB 를 안 보는 순수 decode 라 번역 지점이 없다. **실측: `actors.id` 가 레거시 `users.id` 를 재사용한 경우 0건.** 선택지 ①`JWT_SECRET` 회전(전원 재로그인) ②버전 claim 추가 ③`actors.legacy_user_id` 번역 경로. **③이 가능한 건 그 컬럼이 남아 있기 때문 — 지우면 ① 외에 방법이 없어진다.**

---

## 6. 신원 검증 원칙 (TEL-7 §4) — 중복 기재

> - **"나는 누구인가"(userId·senderId·reporterId)는 서버가 토큰에서 도출한다**
> - "누구에 대해 말하는가"(partnerId·reportedId)는 클라이언트가 전달할 수 있다
> - 돈이 걸린 값(가격·수량)은 서버가 소유한다
> - 중복 방지는 애플리케이션 조회가 아니라 **DB 제약**으로 판정한다
> - 신원을 못 믿겠으면 검증을 포기하지 말고, **모두에게 검증 가능한 신원을 발급한다**

TEL-7 이 한 것: JWT 검증 일원화(8곳 → `authMiddleware`, 인증 실패 401 통일) · 소켓 `io.use` 인증 필수화 · **게스트 세션 토큰 발급**(`role:'guest'`, `requireMember`/`requireSession` 분할) · imp_uid 리플레이 차단 · 무인증 웹훅 제거.

- 소켓은 모듈 로드 시 즉시 연결되는데 게스트 토큰은 MainPage useEffect 에서 발급된다 → `autoConnect:false` + `ensureSession()` 후 수동 connect 로 **"신원 준비 → 연결" 순서를 코드로 강제**했다. 순서를 바꾸면 신규 방문자의 첫 연결이 매번 실패한다.
- **닉네임 변경 시 소켓 재연결이 필요하다** — `io.use` 는 연결 시 1회만 실행된다.
- **DB 저장(insert)과 중계(emit)는 별개 경로다.** 저장만 고치면 기록은 깨끗해도 상대 화면에는 위조된 이름이 뜬다.
- ⚠️ **결함 발견 시 고치기 전에 배포본 `v2` 를 먼저 대조할 것.** `git merge-base v2 ts-migration` 이 비어 있어 두 계보에 공통 조상이 없다. 소켓 JWT·신고 인증·확성기 TOCTOU 는 2026-04 에 v2 에서 이미 고쳐져 있었다.

---

## 7. 쿠키 정책 (TEL-17)

**✅ 코드는 완결. 리니어 이슈 상태만 낡았다** (2026-08-05 확인).
TEL-17 이슈는 `Backlog` 인데 TEL-16 §6 은 "완결" 이라 적혀 있어 어긋나 보였다. `git branch --merged origin/v3` 로 확인하니 **`fix/tel-17-cookie-policy`·`refactor/unify-cookie-options` 가 둘 다 v3 에 머지돼 있다.** TEL-16 쪽이 맞다. **리니어에서 TEL-17 을 Done 으로 옮길 것.**

배경(재발 방지용으로 남긴다):
- `register.routes.ts:68` 만 `secure: false` 고정 + 인라인. 나머지 3곳은 `buildCookieOptions` 공용. 토큰 수명 **60일**.
- `sameSite:'none'` 은 **필요하지 않다** — 프론트 API 호출이 전부 상대 경로다(절대 URL 은 소켓 하나). 레거시 `client/` 가 다른 도메인에 배포되던 시절의 흔적. `lax` 로 되돌리면 CSRF 방어가 한 겹 돌아온다.
- ! `none` 을 유지하더라도 `secure:false` 는 고쳐야 한다. **`SameSite=None` 은 `Secure` 를 요구**해서 둘이 함께 있으면 브라우저가 쿠키를 아예 거부한다.

---

## 8. 미해결 보안 — 중복 기재 ([common.md](common.md) 에도 있음)

- **TEL-13 JWT 원문 평문 로그** (Urgent). `match.routes.ts:28` `console.log('📥 /end token:', token)`. `/api/match/end` 는 채팅 종료마다 호출 → **세션이 끝날 때마다 유효한 JWT 가 Render 로그에 한 건씩 쌓인다.** 로그 열람 권한만 있으면 누구 계정으로든 로그인 상태를 재현할 수 있다. 저장소 전체 `console.log` 40건/11파일 정리와 함께. → [matching.md](matching.md)
- **TEL-12 RLS 전 테이블 비활성** (Urgent). 운영 14개·v2-dev 52개. `anon` 키만으로 `users` 1,191행(전화번호·해시)과 대화 8,222행을 읽고 **수정**할 수 있다. → [common.md](common.md)
- **service_role 키 교체 필요** — 작업 중 키 일부가 대화에 노출됐다. Supabase 회전 → Render 환경변수 교체 → 재배포. 선행 배포는 완료돼 있어 지금 바로 가능.

---

## 9. 마운트 전환(TEL-21) 시 함께 할 것

| 대상 | 처리 |
|---|---|
| `app.ts` | `modules/auth`·`modules/phone` 마운트, 레거시 `auth`·`register`·`password`·`verify-mvp` 해제 |
| `Verify_mvp.tsx` | `/api/phone/send`·`/api/phone/verify` 로 전환 후 삭제 |
| `app.set('trust proxy', 1)` | **선행 필수** — 없으면 `req.ip` 가 Render 프록시 IP 하나로 와서 **IP 발송 제한이 서비스 전체 한도가 된다** |

- `IP_HASH_SECRET` 은 `.env`·Render 양쪽에 이미 설정돼 있다(2026-08-04). 없으면 `hashClientIp` 가 던진다.
- `PORTONE_API_KEY`·`PORTONE_API_SECRET` 는 미사용 — 제거 가능.
- **`modules/auth` 에 없는 레거시 엔드포인트 5개**: `GET /api/auth/check`(App.tsx) · `POST /api/auth/check-username`(Register) · `POST /api/auth/logout`(MyPage) · `POST /api/password/check-user`(FindPassword) → 이 4개는 TEL-21 에서 만든다. `POST /api/auth/guest`·`PATCH /api/auth/guest/nickname` 는 **TEL-30 소관** — 게스트가 끝나야 `auth.routes.ts` 를 완전히 지울 수 있다.
- **로그인이 죽으면 전부 죽는다.** 마운트 전환은 되돌리기 쉬운 커밋으로 나눈다.
