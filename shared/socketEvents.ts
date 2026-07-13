// shared/socketEvents.ts
// client ↔ server 소켓 계약 (단일 출처). ⚠️ 런타임 코드 없음 — 타입만.
// 양쪽에서 반드시 `import type` 으로 사용 (컴파일 시 제거되어 런타임 resolve 불필요).

export interface ChatMessage {
  roomId: string;
  senderId: string;
  senderNickname: string;
  receiverId: string;
  receiverNickname: string;
  word: string;
  message: string;
  timestamp: string | number;
}

export interface MatchedPayload {
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderNickname: string;
  receiverId: string;
  receiverUsername: string;
  receiverNickname: string;
  word: string;
  round: number;
}

export interface JoinMatchPayload {
  userId: string;
  username: string;
  nickname: string;
  word: string;
  round: number;
}

export interface MegaphoneShow {
  nickname: string;
  message: string;
}

export interface ReceiverInfo {
  receiverId: string;
  receiverNickname: string;
}

// 서버 → 클라이언트
export interface ServerToClientEvents {
  onlineCount: (count: number) => void;
  matched: (data: MatchedPayload) => void;
  chatMessage: (data: ChatMessage) => void;
  typing: () => void;
  stopTyping: () => void;
  chatEnded: () => void;
  receiverInfo: (data: ReceiverInfo) => void;
  'megaphone:show': (data: MegaphoneShow) => void;
  'megaphone:failed': (data: { message: string }) => void;
}

// 클라이언트 → 서버
export interface ClientToServerEvents {
  getOnlineCount: () => void;
  join_match: (data: JoinMatchPayload) => void;
  chatMessage: (data: ChatMessage) => void;
  typing: (data: { roomId: string }) => void;
  stopTyping: (data: { roomId: string }) => void;
  leaveRoom: (data: { roomId: string; userId: string }) => void;
  'megaphone:send': (data: { userId: string; message: string }) => void;
}
