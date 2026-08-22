// Socket.IO 타입 이벤트 맵
// 원본: src/config/socket.js (io(...) 인스턴스), src/pages/ChatPage.jsx,
//        src/pages/MainPage.jsx, src/components/MegaphoneToast.jsx 의 emit/on 호출부.

// ⚠️ AppSocket(socket.io-client 의존)은 클라 전용이라 shared에서 제외.
import type {
  Id,
  ChatMessage,
  ReceiverInfo,
  MatchedPayload,
  JoinMatchPayload,
  MegaphoneSendPayload,
  MegaphoneShowPayload,
  MegaphoneFailedPayload,
  GameEvent,
} from './domain';

// 서버 → 클라이언트 (socket.on)
export interface ServerToClientEvents {
  chatMessage: (data: ChatMessage) => void;
  receiverInfo: (info: ReceiverInfo) => void; // legacy useSocket 훅
  typing: () => void; // payload 없음
  stopTyping: () => void; // payload 없음
  chatEnded: () => void; // payload 없음
  chatEndedByReport: () => void; // payload 없음
  onlineCount: (count: number) => void;
  matched: (data: MatchedPayload) => void;
  'match:failed': (payload: {
    code: 'MATCHING_IN_PROGRESS' | 'MATCHING_UNAVAILABLE' | 'PERSIST_FAILED' | 'ROUND_CLOSED';
    retryable: boolean;
  }) => void;
  'megaphone:show': (payload: MegaphoneShowPayload) => void;
  'megaphone:failed': (payload: MegaphoneFailedPayload) => void;
  'game:event': (e: GameEvent) => void;
  // 라운드 경계(15초)마다 서버가 전송 → 클라는 단어셋 교체 + 15초 카운트 리셋 (폴링 대체)
  'round:change': (payload: { round: number }) => void;
}

// 클라이언트 → 서버 (socket.emit)
export interface ClientToServerEvents {
  chatMessage: (msgData: ChatMessage) => void;
  typing: (payload: { roomId: string }) => void;
  stopTyping: (payload: { roomId: string }) => void;
  // ChatPage: { userId, roomId } / legacy useSocket: { roomId } → userId optional
  leaveRoom: (payload: { roomId: string; userId?: Id }) => void;
  getOnlineCount: () => void; // payload 없음
  join_match: (payload: JoinMatchPayload) => void;
  'match:resume': (payload: { roomId: string }, ack: (response: { ok: boolean }) => void) => void;
  'megaphone:send': (payload: MegaphoneSendPayload) => void;
  'game:event': (e: GameEvent) => void;
}
