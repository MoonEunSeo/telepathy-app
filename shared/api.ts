// REST API 요청/응답 타입
// 프론트가 실제로 소비하는 필드(res.json() / axios res.data 접근) 기준으로 정의했다.
// 확정 불가한 부분은 best-effort + `// TODO: 백엔드 응답 확인` 로 남긴다.

import type {
  Id,
  Comment,
  Feedback,
  ReportPayload,
  Wordset,
  WordHistoryItem,
} from './domain';
import type { ErrorCode } from './errorCodes';

// 계약을 쓰는 쪽이 '@shared/api' 하나만 보면 되도록 다시 내보낸다.
export type { ErrorCode };

// ─────────────────────────────────────────────────────────────
// 공통 — 레거시
// 아직 전환하지 않은 라우트 14개가 { success, message? } 형태를 반환한다.
// 새 코드는 아래 ApiSuccess/ApiError 를 쓴다.
export interface ApiResult {
  success: boolean;
  message?: string;
}

// ─────────────────────────────────────────────────────────────
// 공통 응답 규약 — 계획안 §35
//
// 최상위 message 는 §35 에 없는 과도기 필드다.
// 레거시 프론트가 data.message 를 읽고 있어 지금 빼면 화면이 한꺼번에 깨진다.
// 각 화면이 error.message 로 옮겨가면 제거한다 (TEL-26 완료 조건).

export interface ApiSuccess<T> {
  success: true;
  data: T;
  /** @deprecated 과도기 필드. §35 에는 없다 */
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    // 이 오류 한 건을 서버 로그에서 찾기 위한 값. middleware/requestId 가 발급한다.
    requestId: string;
  };
  /** @deprecated 과도기 필드. error.message 로 대체된다 */
  message?: string;
}

// success 가 리터럴 타입이라 `if (res.success)` 로 좁혀진다.
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────
// V2 modules/auth 응답
//
// 아래 LoginResponse·RegisterResponse·Password*Response 와 이름이 겹치지 않게 둔다.
// 그쪽은 레거시 라우트가 성공·실패 양쪽에 쓰고 있어(ApiResult 는 success: boolean)
// §35 형태로 바꾸면 레거시가 컴파일되지 않는다.
//
// 레거시 라우트가 사라지면(TEL-21) 짧은 이름을 이쪽이 물려받는다.
//
// 토큰은 쿠키로 나가므로 본문 페이로드가 없다. data: null 은 "돌려줄 게 없다" 를
// 명시한 것이다 — 필드를 생략하면 ApiSuccess<T> 의 data 필수 계약이 무너진다.
export type AuthLoginResponse = ApiSuccess<null>;
export type AuthRegisterResponse = ApiSuccess<null>;
export type AuthPasswordChangeResponse = ApiSuccess<null>;
export type AuthPasswordResetResponse = ApiSuccess<null>;

// ─────────────────────────────────────────────────────────────
// auth
// GET /api/auth/check (App.jsx: data.loggedIn)
export interface AuthCheckResponse {
  loggedIn: boolean;
  role?: 'member' | 'guest';
}

// POST /api/auth/login (LoginPage)
export interface LoginRequest {
  username: string;
  password: string;
}
export type LoginResponse = ApiResult; // data.success / data.message

// POST /api/auth/logout (MyPage) — res.ok 만 확인, body 미파싱
// TODO: 백엔드 응답 확인 — 실제 본문 스키마 미관찰
export type LogoutResponse = ApiResult;

// POST /api/auth/withdraw (MyPage: res.ok && data.success, data.message)
export type WithdrawResponse = ApiResult;

// POST /api/auth/check-username (Register)
export interface CheckUsernameRequest {
  username: string;
}
export interface CheckUsernameResponse {
  success: boolean;
  isAvailable: boolean;
  message?: string;
}

// POST /api/register (Verify_mvp)
export interface RegisterRequest {
  username: string | null; // localStorage 에서 읽어옴 → null 가능
  password: string | null;
  phone: string;
  gender: string; // '남성' | '여성' (UI 토글)
  birthdate: string; // 'YYYY-MM-DD' (formatBirthdate)
}
export type RegisterResponse = ApiResult;

// ─────────────────────────────────────────────────────────────
// password
// POST /api/password/change (ChangePassword)
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}
export type PasswordChangeResponse = ApiResult;

// POST /api/password/check-user (FindPassword: data.exists)
export interface PasswordCheckUserRequest {
  username: string;
}
export interface PasswordCheckUserResponse {
  exists: boolean;
}

// POST /api/password/reset (FindPassword)
export interface PasswordResetRequest {
  username: string;
  password: string;
}
export type PasswordResetResponse = ApiResult;

// ─────────────────────────────────────────────────────────────
// verify-mvp (휴대폰 SMS 인증)
// PortOne 본인인증(/api/verify)은 제거했다 — 도달 경로가 없었고,
// 전화번호 인증은 자체 SMS 로 확정됐다 (계획안 §11).
// POST /api/verify-mvp/send (Verify_mvp)
export interface VerifyMvpSendRequest {
  phone: string;
}
export type VerifyMvpSendResponse = ApiResult;

// POST /api/verify-mvp/check (Verify_mvp)
export interface VerifyMvpCheckRequest {
  phone: string;
  code: string;
}
export type VerifyMvpCheckResponse = ApiResult;

// ─────────────────────────────────────────────────────────────
// phone (휴대폰 인증 — V2. verify-mvp 를 대체한다)
// 인증번호를 서버 메모리가 아니라 phone_verification_challenges 에 둔다.

// DB 의 CHECK 제약과 같은 값이다 (phone_verification_challenges_purpose_check)
export type PhoneVerificationPurpose = 'SIGNUP' | 'ACCOUNT_RECOVERY' | 'PHONE_CHANGE';

// POST /api/phone/send
export interface PhoneSendRequest {
  phone: string;
  purpose: PhoneVerificationPurpose;
}
export type PhoneSendResponse = ApiSuccess<null>; // V2 modules/phone

// POST /api/phone/verify
export interface PhoneVerifyRequest {
  phone: string;
  purpose: PhoneVerificationPurpose;
  code: string;
}
// TEL-21 에서 ApiSuccess<{ challengeId: string }> 이 된다.
// 인증한 사람과 재설정을 요청한 사람이 같은지 확인할 수단이 지금은 없다 (TEL-16 §7.1).
export type PhoneVerifyResponse = ApiSuccess<null>;

// ─────────────────────────────────────────────────────────────
// POST /api/match/end (ChatPage: { roomId } / legacy: { word }) — 응답 미파싱
export interface MatchEndRequest {
  roomId?: string;
  word?: string;
}
// TODO: 백엔드 응답 확인 — 프론트가 응답 본문을 사용하지 않음
export type MatchEndResponse = ApiResult;

// POST /api/match/session-status (ChatPage: data.active)
export interface MatchSessionStatusRequest {
  word: string;
  userId: Id;
}
export interface MatchSessionStatusResponse {
  active: boolean;
}

// GET /api/match/current-round (MainPage: data.round, data.remaining)
export interface MatchCurrentRoundResponse {
  round: number;
  remaining: number;
}

// ─────────────────────────────────────────────────────────────
// nickname / profile
// GET /api/nickname/profile
// 서버가 user_id | id | userId 중 하나로 내려줌 (MainPage: data.user_id||data.id||data.userId)
export interface ProfileResponse {
  success: boolean;
  user_id?: Id;
  id?: Id;
  userId?: Id;
  username: string;
  nickname: string | null;
}

// POST /api/nickname/set-nickname (MainPage)
export interface SetNicknameRequest {
  nickname: string;
}
export type SetNicknameResponse = ApiResult;

// ─────────────────────────────────────────────────────────────
// word-history
// GET /api/word-history (MyPage/MyWords: data.history 배열)
export interface WordHistoryResponse {
  history: WordHistoryItem[];
}

// POST /api/word-history/add (ChatPage) — 응답 미사용(로그만)
export interface WordHistoryAddRequest {
  partnerId: Id;
  word: string;
  userNickname: string;
  partnerNickname: string;
}
// TODO: 백엔드 응답 확인 — 프론트가 응답 필드를 사용하지 않음
export type WordHistoryAddResponse = ApiResult;

// PATCH /api/word-history/:id (MyWords: 즐겨찾기/메모 수정)
export interface WordHistoryUpdateRequest {
  isFavorite?: boolean;
  memo?: string;
}

export type WordHistoryUpdateResponse = ApiResult;

// ─────────────────────────────────────────────────────────────
// wordsets
// GET /api/wordsets/mine/:id (LikePage: res.data.success, res.data.wordsets 배열)
export interface WordsetsMineResponse {
  success: boolean;
  wordsets: Wordset[];
}

// ─────────────────────────────────────────────────────────────
// sp_payments (단어세트 계좌이체 결제)
// POST /api/sp_payments/create (LikePage) — 응답 미파싱
export interface SpPaymentCreateRequest {
  name: string; // 입금자 실명 또는 닉네임
  amount: number;
}
// TODO: 백엔드 응답 확인 — 프론트가 응답 본문을 사용하지 않음
export type SpPaymentCreateResponse = ApiResult;

// GET /api/sp_payments/status/:id (LikePage: res.data.status === 'paid')
export interface SpPaymentStatusResponse {
  status: string; // 'paid' 면 결제 완료. 그 외 pending 등 (프론트는 'paid'만 확인)
}

// POST /api/sp_payments/update-refund (WordSetForm: res.data.ok, res.data.message)
export interface SpPaymentUpdateRefundRequest {
  user_id: Id;
  refund_bank: string;
  refund_account: string;
  wordset: string[]; // 4개 단어
}
export interface SpPaymentUpdateRefundResponse {
  ok: boolean;
  message?: string;
}

// ─────────────────────────────────────────────────────────────
// user
// GET /api/user/:id (LikePage: res.data?.real_name)
export interface UserByIdResponse {
  real_name?: string;
  // TODO: 백엔드 응답 확인 — user 테이블 기타 컬럼(username, nickname 등)
  [key: string]: unknown;
}

// POST /api/user/update-realname (LikePage) — 응답 미파싱
export interface UpdateRealnameRequest {
  user_id: Id;
  real_name: string;
}
// TODO: 백엔드 응답 확인 — 프론트가 응답 본문을 사용하지 않음
export type UpdateRealnameResponse = ApiResult;

// GET /api/user/megaphone-count (MainPage/MyPage: data.success, data.count)
export interface MegaphoneCountResponse {
  success: boolean;
  count: number;
  message?: string;
}

// ─────────────────────────────────────────────────────────────
// report / feedback / comments / misc
// POST /api/report (ChatPage: data.success, data.message)
export type ReportRequest = ReportPayload;
export type ReportResponse = ApiResult;

// POST /api/feedback/add (MainPage: data.success, data.message)
export type FeedbackAddRequest = Feedback;
export type FeedbackAddResponse = ApiResult;

// GET /api/comments (ClosedModal: 배열을 그대로 setComments)
export type CommentsResponse = Comment[];

// POST /api/comments (ClosedModal) — 응답 미파싱
export interface CommentCreateRequest {
  username: string;
  nickname: string | null; // 서버에서 랜덤 닉네임 부여 가능 → null 허용
  content: string;
}
// TODO: 백엔드 응답 확인 — 프론트가 응답 본문을 사용하지 않음(작성 후 목록 재조회)
export type CommentCreateResponse = ApiResult;

// GET /api/users/count (ClosedModal: data.userCount)
export interface UsersCountResponse {
  userCount: number;
}

// GET /api/server-time (MainPage: data.isOpen, data.round, data.remaining)
export interface ServerTimeResponse {
  isOpen: boolean;
  round: number;
  remaining: number;
}
