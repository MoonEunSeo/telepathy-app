// REST API 요청/응답 타입
// 프론트가 실제로 소비하는 필드(res.json() / axios res.data 접근) 기준으로 정의했다.
// 확정 불가한 부분은 best-effort + `// TODO: 백엔드 응답 확인` 로 남긴다.

import type {
  Id,
  Comment,
  Feedback,
  MegaphoneSku,
  ReportPayload,
  Wordset,
  WordHistoryItem,
} from './domain';

// ─────────────────────────────────────────────────────────────
// 공통
// 다수 엔드포인트가 { success, message? } 형태를 반환한다.
export interface ApiResult {
  success: boolean;
  message?: string;
}

// ─────────────────────────────────────────────────────────────
// auth
// GET /api/auth/check (App.jsx: data.loggedIn)
export interface AuthCheckResponse {
  loggedIn: boolean;
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
// verify (본인인증)
// POST /api/verify/prepare (Verify: data.identityVerificationId)
export interface VerifyPrepareResponse {
  identityVerificationId: string;
}

// POST /api/verify/confirm (VerifyCallback: data.user.name / VerifyComplete: data.user)
export interface VerifyConfirmRequest {
  identityVerificationId?: string; // VerifyCallback 경로
  imp_uid?: string; // VerifyComplete 경로
}
export interface VerifyConfirmResponse {
  success: boolean;
  user?: {
    name: string;
    // TODO: 백엔드 응답 확인 — 인증 사용자 기타 필드(phone, birthdate 등)
    [key: string]: unknown;
  };
  message?: string;
}

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
// match
// POST /api/match/start (MainPage: { word } / IntentToggle: { intent })
export interface MatchStartRequest {
  word?: string;
  intent?: string; // 예: 'light_connection'
}
export interface MatchStartResponse extends ApiResult {
  roomId?: string; // IntentToggle: data.roomId 로 채팅방 이동
}

// POST /api/match/check (legacy MainPage) — matched 시에만 나머지 필드 존재
export interface MatchCheckRequest {
  word: string;
}
export interface MatchCheckResponse {
  matched: boolean;
  roomId?: string;
  senderId?: Id;
  senderUsername?: string;
  senderNickname?: string;
  receiverId?: Id;
  receiverUsername?: string;
  receiverNickname?: string;
}

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
// payments (아임포트/포트원 결제 검증)
// POST /api/payments/verify — 두 경로의 요청 필드가 다름
//  · MainPage 확성기 카드결제: { imp_uid, merchant_uid, item }
//  · utils/requestPayment.js: { imp_uid, userId, count, amount }
export interface PaymentsVerifyRequest {
  imp_uid: string;
  merchant_uid?: string;
  item?: MegaphoneSku | string;
  userId?: Id;
  count?: number;
  amount?: number;
}
export type PaymentsVerifyResponse = ApiResult;

// ─────────────────────────────────────────────────────────────
// sp_payments (단어세트 계좌이체 결제)
// POST /api/sp_payments/create (LikePage) — 응답 미파싱
export interface SpPaymentCreateRequest {
  user_id: Id;
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
