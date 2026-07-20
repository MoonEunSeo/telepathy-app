# 알려진 이슈 / 이월 과제


- `/api/password/reset`에 본인인증(OTP) 게이팅 없음 → 계정탈취 위험
- 온라인 사용자 수 소스 이원화 (`index.ts` 수동 카운터 vs `chat.socket`의 `io.engine.clientsCount`)
- `telepathy_sessions_queue`에 `role` 컬럼이 없어 게스트 판별을 `username === user_id`로
  **간접 추론**하고 있다 → `actors` 구조 도입 시 해소
- `word_history`는 게스트 FK 문제로 `partner_id`를 null로 두는 임시방편 사용 중
- `MainPage`의 `setInterval(syncFromServer, 1000)` — 1초 폴링(분당 60요청)
- `client/`(레거시)는 `@shared` 경로 불일치로 tsc가 깨진다 (빌드는 type-only라 통과)
