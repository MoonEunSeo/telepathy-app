// Socket.IO 타입 이벤트 맵
// 원본: src/config/socket.js (io(...) 인스턴스), src/pages/ChatPage.jsx,
//        src/pages/MainPage.jsx, src/components/MegaphoneToast.jsx 의 emit/on 호출부.

import type { Socket } from 'socket.io-client';
import type {
  Id,
  ChatMessage,
  ReceiverInfo,
  MatchedPayload,
  JoinMatchPayload,
  MegaphoneSendPayload,
  MegaphoneShowPayload,
  MegaphoneFailedPayload,
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
  'megaphone:show': (payload: MegaphoneShowPayload) => void;
  'megaphone:failed': (payload: MegaphoneFailedPayload) => void;
}

// 클라이언트 → 서버 (socket.emit)
export interface ClientToServerEvents {
  chatMessage: (msgData: ChatMessage) => void;
  typing: (payload: { roomId: Id }) => void;
  stopTyping: (payload: { roomId: Id }) => void;
  // ChatPage: { userId, roomId } / legacy useSocket: { roomId } → userId optional
  leaveRoom: (payload: { roomId: Id; userId?: Id }) => void;
  'megaphone:send': (payload: MegaphoneSendPayload) => void;
  getOnlineCount: () => void; // payload 없음
  join_match: (payload: JoinMatchPayload) => void;
}

// config/socket.ts 에서 만들 io 인스턴스에 적용할 타입
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
