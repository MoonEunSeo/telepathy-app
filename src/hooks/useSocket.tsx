// src/hooks/useSocket.tsx
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { AppSocket, ChatMessage, Id, ReceiverInfo } from '../types';

const SOCKET_URL = import.meta.env.PROD
  ? 'https://telepathy-app.onrender.com'
  : 'http://localhost:5000';

// 이 legacy 훅은 typing 디바운스 타이머를 소켓 인스턴스에 직접 붙여둔다.
type SocketWithTimeout = AppSocket & {
  typingTimeout?: ReturnType<typeof setTimeout>;
};

interface UseSocketParams {
  roomId: string; // roomId는 항상 uuid 문자열
  senderId: Id;
  senderNickname: string;
  word: string;
  onChatEnded: () => void;
}

const useSocket = ({ roomId, senderId, senderNickname, word, onChatEnded }: UseSocketParams) => {
  const socketRef = useRef<SocketWithTimeout | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [receiverInfo, setReceiverInfo] = useState<ReceiverInfo>({
    receiverId: '',
    receiverNickname: '',
  });
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      query: { roomId, senderId, senderNickname, word },
    }) as SocketWithTimeout;
    socketRef.current = socket;

    // 핸들러 정의 (정리 가능하도록 변수화)
    const handleMessage = (data: ChatMessage) => setMessages((prev) => [...prev, data]);
    const handleReceiverInfo = (info: ReceiverInfo) => setReceiverInfo(info);
    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);
    const handleChatEnded = () => onChatEnded();

    // 이벤트 등록
    socket.on('chatMessage', handleMessage);
    socket.on('receiverInfo', handleReceiverInfo);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('chatEnded', handleChatEnded);

    return () => {
      // 이벤트 해제 (중복 방지)
      socket.off('chatMessage', handleMessage);
      socket.off('receiverInfo', handleReceiverInfo);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('chatEnded', handleChatEnded);
      // disconnect는 sendLeave()에서 처리
    };
  }, []); // ✅ 최초 마운트 1회만 실행

  const sendMessage = (msgData: ChatMessage) => {
    if (socketRef.current) {
      socketRef.current.emit('chatMessage', msgData);
      // ❌ 직접 setMessages 하지 않음 (수신 이벤트에 의해 반영)
    }
  };

  const sendTyping = () => {
    if (socketRef.current) {
      // legacy 경로는 payload 없이 emit → 타입드 contract 우회를 위해 untyped Socket 캐스팅
      const socket = socketRef.current as Socket;
      socket.emit('typing');
      clearTimeout(socketRef.current.typingTimeout);
      socketRef.current.typingTimeout = setTimeout(() => {
        socket.emit('stopTyping');
      }, 1000);
    }
  };

  const sendLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { roomId });

      // ✅ 상대방에게 메시지를 보내고 일정 시간 후 disconnect
      setTimeout(() => {
        // socketRef.current?.disconnect();
      }, 200);
    }
  };

  return {
    messages,
    receiverInfo,
    isTyping,
    sendMessage,
    sendTyping,
    sendLeave,
  };
};

export default useSocket;
