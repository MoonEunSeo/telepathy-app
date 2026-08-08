// 서버가 내려주는 오류 코드의 단일 출처 (계획안 §35 ApiError.error.code)
//
// 프론트는 한글 message 가 아니라 이 코드로 분기한다.
// 문구를 다듬어도 동작이 바뀌지 않게 하기 위한 분리다.
//
// 코드와 메시지는 1:1 이다 — 코드가 메시지보다 더 많은 사실을 알려주지 않는다.
// 예: 로그인 실패는 아이디 부재·비밀번호 불일치·잠금·정지가 전부 INVALID_CREDENTIALS 다.
// 여기서 세분하면 "아이디 존재 여부를 흘리지 않는다" 는 기존 설계가 깨진다.
//
// 런타임 배열이 아니라 유니온으로 둔다 — 이 코드들은 타입 검사에만 쓰이고 목록을 순회할 일이 없다.
// shared/ 는 원칙적으로 타입 전용이고, 값이 꼭 필요한 예외는 seo.ts 하나다
// (docs/conventions/typescript.md § shared/ 사용 규칙).
export type ErrorCode =
  // ── 공통 ────────────────────────────────────────────────
  | 'VALIDATION_FAILED'
  | 'INTERNAL_ERROR'
  | 'SERVER_MISCONFIGURED'
  | 'NOT_FOUND'
  // ── 인증 ────────────────────────────────────────────────
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'CURRENT_PASSWORD_MISMATCH'
  | 'SAME_PASSWORD'
  | 'UNSUPPORTED_PASSWORD_ALGORITHM'
  // ── 가입 ────────────────────────────────────────────────
  | 'USERNAME_TAKEN'
  | 'PHONE_TAKEN'
  | 'NICKNAME_GENERATION_FAILED'
  | 'PHONE_NOT_VERIFIED'
  // ── 프로필 ──────────────────────────────────────────────
  // 사용자가 고른 이름이 이미 쓰이는 경우.
  // NICKNAME_GENERATION_FAILED(가입 시 서버가 지은 이름 충돌)와 의미가 다르다.
  | 'NICKNAME_TAKEN'
  // ── 계정 복구 ───────────────────────────────────────────
  | 'RECOVERY_NOT_VERIFIED'
  // ── 탈퇴 ────────────────────────────────────────────────
  | 'WITHDRAW_SUSPENDED'
  // ── 휴대폰 인증 ─────────────────────────────────────────
  | 'TOO_MANY_REQUESTS'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'SMS_SEND_FAILED'
  | 'VERIFICATION_MISMATCH';
