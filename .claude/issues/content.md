# content — 댓글·단어장·회원 조회

> 리니어 요약본. **다르면 리니어가 맞다.** 갱신 2026-08-05
> 원본: TEL-26(2-6) · TEL-27 · TEL-11

**이 항목이 마지막 도메인이다.** 끝나면 `app.ts` 의 레거시 마운트가 0이 되고, `supabase/cutover/` 7단계를 **실행할 수 있는 상태**가 된다(실행은 별건).

---

## 1. 범위

| 엔드포인트 | 레거시 | V2 |
|---|---|---|
| `GET`·`POST /api/comments` | `comments` | `comments` |
| `GET`·`POST`·`PATCH /api/word-history` | `word_history` | `bookmarks` (단어장 존치 시) |
| `GET /api/user/count` | `users` | `users` |
| `GET /api/user/me` | `users` | `users` + `actors` |
| `POST /api/user/update-realname` | `users` | `users` |

`GET /api/user/megaphone-count` 는 **결제(TEL-25) 담당**이다 — 원장 합계로 바뀐다. → [payment.md](payment.md)

여기서 함께 지우는 것: `nickname.routes.ts`(TEL-29 에서 이월), `comment.routes.ts`, `history.routes.ts`, `user.routes.ts`.

---

## 2. 착수 전 결정 — 단어장(MyWords) 존폐

**TEL-11 판단 필요 #4 가 아직 미결이다.**

- 존치하면 `word_history` → `word_bookmarks` 로 옮긴다
- 폐지하면 `history.routes.ts`(117줄)와 프론트 화면을 함께 걷어낸다

**범위가 절반 달라지므로 착수 전에 정한다.**

판단 재료: 레거시 **18행**뿐이고 **즐겨찾기 0건 · 메모 1건**으로 실사용이 거의 없다. 폐기해도 손실이 사실상 없다.

> `word_bookmarks` 테이블 자리는 이미 마련돼 있다(TEL-11 마이그레이션 `v2_add_word_bookmarks_and_refund_account`). 만남 기록의 원본은 `chat_sessions`/`chat_session_members` 이므로 **닉네임·단어 텍스트를 중복 저장하지 않는다**(레거시는 `user_nickname`·`partner_nickname`·`word` 를 중복 보관했다). 부분 UNIQUE 2개 — 세션이 있으면 `(actor_id, session_id)`, 없으면 `(actor_id, word_id)`.

---

## 3. ⚠️ `/api/user/me` 는 인증의 일부다

세션 확인 경로라 **프론트 대부분이 의존한다. 여기가 깨지면 로그인이 된 채로 앱이 빈 화면이 된다.**

- `ApiSuccess<T>` 형식을 **프론트와 함께** 맞춘다
- **`actors.status` 를 함께 내려준다** — 탈퇴(`DELETED`)·병합(`MERGED`) 계정을 프론트가 구분할 수 있어야 한다
- TEL-7 §3.4 에서 `user/:id` → `/me` 로 바꿔 **남의 실명 조회를 차단**했다. 되돌리지 않는다.

---

## 4. 과도기 필드를 여기서 걷어낸다 (TEL-27 에서 이월)

PR #19 가 `ApiSuccess`·`ApiError` 에 **최상위 `message` 를 한시적으로 남겨 두었다.** 계획안 §35 에는 없는 필드다. 레거시 프론트가 `data.message` 를 읽고 있어 한꺼번에 빼면 화면이 깨지기 때문.

**지울 자리를 세 곳으로 모아 둔 것은 이 작업을 위해서다.** 컨트롤러마다 퍼져 있었으면 빠뜨린 곳이 남는다.

- `shared/api.ts` — `ApiSuccess.message`·`ApiError.message` (`@deprecated` 표시됨) 삭제
- `server/src/utils/respond.ts` — `sendOk` 의 `message` 인자 삭제
- `server/src/middleware/errorHandler.ts` — `build()` 의 최상위 `message` 삭제
- 프론트가 `data.message` 대신 `data.error.message` 를 읽는지 확인

> 이 제거 시점을 TEL-26 완료 조건에 박아 둔 이유 — **안 그러면 과도기 필드가 영구히 남는다.**

관련: `comment.routes.ts` 는 응답이 `{ error: "..." }` 형태였고, `GET /api/comments` 는 **배열을 그대로** 반환했다. 봉투로 수렴시킨다.

---

## 5. 레거시 이름을 물려받는다

TEL-27 에서 `LoginResponse`·`RegisterResponse` 등 **계약 타입을 레거시 라우트 14곳이 같이 쓰고 있어서** V2 는 `AuthLoginResponse` 같은 접두 이름을 썼다. 레거시 라우트가 사라지면 **짧은 이름을 물려받는다.**

---

## 6. 완료 조건

1. `comment.routes.ts`·`history.routes.ts`·`user.routes.ts` 삭제 또는 V2 모듈로 이전
2. **`server/app.ts` 에 마운트된 레거시 라우트가 0개다**
3. `src/routes/` 가 비거나, 남은 파일이 있다면 **그 이유가 문서화**돼 있다
4. `.env` 를 v2-dev 로 둔 채 **앱 전 기능이 브라우저에서 동작**한다
5. 서버·프론트 타입체크 통과
6. **과도기 필드 제거** (§4)
