# TEL-15 진행 상태 — 앱 계층 V2 이행

> **인계 문서의 본체는 [TEL-16](https://linear.app/newtelepathy/issue/TEL-16) 이다.**
> 이 파일은 저장소에서 찾아올 사람을 위한 포인터이며, 완료 범위만 기록한다.
> 갱신 시점: 2026-07-29

---

## 왜 Linear 로 옮겼나

원래 이 파일에 배경·스키마 실측·타이핑용 소스코드·남은 작업이 전부 들어 있었다(649줄).
같은 내용이 TEL-16 에도 생기면서 **둘이 서로 다른 말을 하기 시작했다.**

이 파일은 *"§5.4 작성 중, repository·service·controller·route 미작성"* 으로 남아 있었으나,
실제로는 로그인·회원가입이 모두 끝난 상태였다. 하루 만에 벌어진 일이다.

**진행 상태는 한 곳에서만 관리한다.** 이슈와 함께 움직이고 어느 PC 에서나 열리는 Linear 가
그 자리로 적합하다. 저장소에는 *"어디를 보라"* 와 *"무엇이 끝났나"* 만 남긴다.

> 규약·측정처럼 **코드와 함께 버전 관리돼야 하는 문서**는 계속 `docs/` 에 둔다.
> 옮기는 것은 **진행 상태**뿐이다. [CLAUDE.md](../../CLAUDE.md) 문서 표 참조.

---

## 완료된 범위

| 항목 | 상태 | PR |
|---|---|---|
| 공통 기반 — `AppError` · `validate` · `errorHandler` | ✅ | [#2](https://github.com/MoonEunSeo/telepathy-app/pull/2) |
| **로그인** 수직 슬라이스 (8파일) | ✅ | [#2](https://github.com/MoonEunSeo/telepathy-app/pull/2) |
| 생성 타입 도입 — `as unknown as` 캐스트 제거 | ✅ | [#2](https://github.com/MoonEunSeo/telepathy-app/pull/2) |
| 로그인 실패 카운터 원자화 (RPC) | ✅ | [#2](https://github.com/MoonEunSeo/telepathy-app/pull/2) |
| `user_id` → `actor_id` 컬럼명 통일 | ✅ | [#2](https://github.com/MoonEunSeo/telepathy-app/pull/2) |
| **회원가입** — 4테이블 트랜잭션 RPC | ✅ | [#3](https://github.com/MoonEunSeo/telepathy-app/pull/3) · [#6](https://github.com/MoonEunSeo/telepathy-app/pull/6) |
| 비밀번호 변경·재설정 | ❌ | |
| 회원 탈퇴 — `actors.status` 기반 | ❌ | |
| 닉네임 변경 — `users` + `nickname_histories` | ❌ | |
| 게스트 발급·전환 | ❌ | |
| `ApiSuccess<T>` / `ApiError` 공통 응답 규약 | ❌ | |

**`app.ts` 에 마운트하지 않았다.** 운영 DB 에 V2 스키마(`user_credentials`)가 없어 연결하면
즉시 깨진다. 미마운트라 배포해도 영향이 없고, 롤백은 `modules/auth/` 삭제로 끝난다.

---

## 이어서 하려면

```bash
git fetch origin && git switch v3 && git pull
npm i
```

그리고 Claude 에게 — **"TEL-16 읽고 이어서 진행해줘"**

### 확인 스크립트

두 슬라이스 모두 동작 검증 스크립트가 있다. v2-dev 를 향해 실제로 돌려본다.

```bash
V2_TEST_PASSWORD=... npx tsx scripts/check-login-flow.ts
npx tsx scripts/check-signup-flow.ts
```

QA 계정 비밀번호는 저장소가 PUBLIC 이라 TEL-16 에 적어 두었다.

> **타입체크만으로는 부족하다.** 작업 중 세 번, 타입체크를 통과하는데 동작이 틀린 상태가
> 나왔다 — 인증 블록 소실 · `.eq()` 컬럼명 미수정 · `maxAge` 오타.
> 셋 다 이 스크립트에서 잡혔다.

---

## 관련

- [TEL-15](https://linear.app/newtelepathy/issue/TEL-15) — 원본 이슈 (범위·완료 조건)
- [TEL-16](https://linear.app/newtelepathy/issue/TEL-16) — **인계 문서 본체** (V2 스키마 실측·환경·결정 필요 사항)
- [TEL-11](https://linear.app/newtelepathy/issue/TEL-11) — DB 정규화. 이 작업의 선행
- [마이그레이션 현황](../../supabase/migrations/README.md) — DB 11건 vs 저장소 4건
