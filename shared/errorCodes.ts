// 서버가 내려주는 오류 코드의 단일 출처 (계획안 §35 ApiError.error.code)
//
// 프론트는 한글 message 가 아니라 이 코드로 분기한다.
// 문구를 다듬어도 동작이 바뀌지 않게 하기 위한 분리다.
//
// 코드와 메시지는 1:1 이다 — 코드가 메시지보다 더 많은 사실을 알려주지 않는다.
// 예: 로그인 실패는 아이디 부재·비밀번호 불일치·잠금·정지가 전부 INVALID_CREDENTIALS 다.
// 여기서 세분하면 "아이디 존재 여부를 흘리지 않는다" 는 기존 설계가 깨진다.
//
// shared/ 는 타입 전용이라 런타임 배열이 아니라 유니온으로 둔다.
export type ErrorCode =
  // ── 공통 ────────────────────────────────────────────────
  | 'VALIDATION_FAILED'
  | 'INTERNAL_ERROR'
  | 'SERVER_MISCONFIGURED'
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
  // ── 계정 복구 ───────────────────────────────────────────
  | 'RECOVERY_NOT_VERIFIED'
  // ── 휴대폰 인증 ─────────────────────────────────────────
  | 'TOO_MANY_REQUESTS'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'SMS_SEND_FAILED'
  | 'VERIFICATION_MISMATCH';
