// 도메인 엔티티 타입 모음
// 원본 JS 앱(client/src)의 실제 사용처(res.json() 소비, localStorage, socket payload)를
// 읽고 추론한 "공유 도메인" 타입들. 컴포넌트/페이지 migration에서 재사용한다.

// ─────────────────────────────────────────────────────────────
// 공통 식별자
// 서버가 내려주는 DB id(user_id/id) 및 roomId는 프론트에서 number/string이
// 혼재되어 다뤄진다(`data.user_id || data.id`, URL 문자열 보간, JSON body 등).
// 프론트 관점에서 확정 불가하므로 string | number 로 둔다.
export type Id = string | number;
// ⚠️ 예외: roomId는 서버가 uuidv4()로 생성 → 항상 문자열이므로 `string`으로 둔다(Id 아님).

// ─────────────────────────────────────────────────────────────
// 사용자 / 프로필
// MainPage: profile = { userId: data.user_id||data.id||data.userId, username, nickname }
// LikePage / WordSetPage: currentUser = { id, nickname, username }
// → 앱 내부에서 정규화해 쓰는 "현재 사용자" 모양.
export interface UserProfile {
  userId: Id;
  username: string;
  nickname: string | null; // 닉네임 미설정 시 null (`!data.nickname` 체크)
}

// LikePage/WordSetPage 에서 쓰는 정규화 형태(키가 `id`). 결제/단어세트 API에 사용.
export interface CurrentUser {
  id: Id;
  username: string;
  nickname: string | null;
}

// ─────────────────────────────────────────────────────────────
// 채팅
// ChatPage handleSendMessage 의 msgData 및 소켓 chatMessage payload 모양.
// (수신 렌더링은 senderId, message 만 사용하지만 송신 시 아래 필드를 모두 실어 보냄)
export interface ChatMessage {
  roomId: string;
  senderId: Id;
  senderUsername?: string; // legacy useSocket 훅 경로에는 없음 → optional
  senderNickname: string;
  receiverId?: Id;
  receiverUsername?: string;
  receiverNickname?: string;
  word: string;
  message: string;
  timestamp: number; // Date.now()
}

// 소켓 receiverInfo 이벤트 payload (legacy useSocket 훅)
export interface ReceiverInfo {
  receiverId: Id;
  receiverNickname: string;
}

// localStorage 'chatInfo' — MainPage 의 socket 'matched' 핸들러에서 저장하는 객체.
export interface ChatInfo {
  roomId: string;
  word: string;
  round: number;
  myId: Id;
  myUsername: string;
  myNickname: string;
  partnerId: Id;
  partnerUsername: string;
  partnerNickname: string;
}

// localStorage 'feedbackInfo' — ChatPage 는 chatInfo 를 그대로 복사해 저장한다.
// (MainPage 는 myId/myUsername/myNickname/partner*/word 만 읽음 → ChatInfo 로 충분)
export type FeedbackInfo = ChatInfo;

// ─────────────────────────────────────────────────────────────
// 매칭 세션 (WordSessionContext state 와 동일 모양)
// 저장값이라 대부분 null 가능. round/startTime 은 숫자, isActive 는 boolean.
export interface MatchSession {
  myId: Id | null;
  myUsername: string | null;
  myNickname: string | null;
  word: string | null;
  round: number | null;
  roomId: string | null;
  partnerId: Id | null;
  partnerUsername: string | null;
  partnerNickname: string | null;
  isActive: boolean;
  startTime: number | null;
}

// 소켓 'matched' 이벤트 payload (서버→클라)
export interface MatchedPayload {
  roomId: string;
  word: string;
  round: number;
  senderId: Id;
  senderUsername: string;
  senderNickname: string;
  receiverId: Id;
  receiverUsername: string;
  receiverNickname: string;
}

// 소켓 'join_match' emit payload (클라→서버)
export interface JoinMatchPayload {
  userId: Id;
  username: string;
  nickname: string; // (b) 매칭 전 닉네임 게이팅 → join 시점엔 항상 non-null
  word: string;
  round: number;
}

// ─────────────────────────────────────────────────────────────
// 단어 기록 / 단어세트
// /api/word-history 항목 (MyWords: item.word, item.partner_nickname, item.connected_at)
export interface WordHistoryItem {
  word: string;
  partner_nickname: string;
  connected_at: string; // ISO 날짜 문자열 (new Date(item.connected_at))
  // TODO: 백엔드 응답 확인 — id, user_nickname 등 추가 필드 가능성(프론트 미사용)
}

// /api/wordsets/mine/:id 항목 (LikePage: set.words?.join(", "))
export interface Wordset {
  words?: string[]; // 관찰된 유일한 필드 (optional chaining 으로 접근)
  // TODO: 백엔드 응답 확인 — id, status, created_at 등은 프론트에서 미사용
}

// ─────────────────────────────────────────────────────────────
// 감정 피드백
export type Emotion = '기뻐요' | '괜찮아요' | '슬퍼요' | '행복해요' | '화나요';

// /api/feedback/add 요청 본문 (MainPage handleSubmitFeedback)
export interface Feedback {
  userId: Id;
  userUsername: string;
  userNickname: string;
  partnerId: Id;
  partnerUsername: string;
  partnerNickname: string;
  word: string;
  emotion: Emotion;
}

// ─────────────────────────────────────────────────────────────
// 신고
// ReportModal onSubmit({ reasons, extra }) → ChatPage 가 아래 형태로 /api/report 전송
export interface ReportPayload {
  reporterId: Id;
  reportedId: Id;
  roomId: string;
  reasons: string[]; // 선택된 신고 사유 목록
  extraMessage: string; // 자유 기술(extra)
}

// ─────────────────────────────────────────────────────────────
// 댓글 (ClosedModal)
// GET /api/comments 항목: c.id, c.nickname, c.content 사용
export interface Comment {
  id: Id;
  nickname: string;
  content: string;
  // TODO: 백엔드 응답 확인 — created_at, username 등 추가 필드 가능성
}

// ─────────────────────────────────────────────────────────────
// 확성기(Megaphone)
// 구매 SKU 문자열 (MegaphoneInputModal / MainPage skuTable)
export type MegaphoneSku = 'megaphone_1' | 'megaphone_5' | 'megaphone_10';

// 소켓 'megaphone:show' payload (서버→클라)
export interface MegaphoneShowPayload {
  nickname: string;
  message: string;
}

// 소켓 'megaphone:failed' payload (서버→클라)
export interface MegaphoneFailedPayload {
  message: string;
}

// 소켓 'megaphone:send' emit payload (클라→서버)
export interface MegaphoneSendPayload {
  userId: Id;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// PortOne v1 (아임포트) window.IMP — MainPage 확성기 카드결제 경로에서 사용.
// 설치된 @types 가 없어 여기서 최소 필드만 정의한다.
// 결제 콜백 응답 (rsp.success / rsp.imp_uid / rsp.merchant_uid 관찰됨)
export interface ImpPayResponse {
  success: boolean;
  imp_uid: string;
  merchant_uid: string;
  // TODO: 백엔드/SDK 확인 — error_code, error_msg 등 기타 아임포트 필드
  [key: string]: unknown;
}

// IMP.request_pay 파라미터 (MainPage handleMegaphoneSend)
export interface ImpRequestPayParams {
  pg: string;
  pay_method: string;
  merchant_uid: string;
  name: string;
  amount: number;
  buyer_email?: string;
  buyer_name?: string;
}

// 웹소켓 기반 미니 게임
export interface GameEvent {
  gameId: string;
  type: string; // 'invite'
  roomId: string;
  senderId: Id;
  payload?: unknown; // 게임별 자유 속성
}
