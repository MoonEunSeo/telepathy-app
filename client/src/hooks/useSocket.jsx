// src/hooks/useSocket.jsx
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://telepathy-app.onrender.com'
    : 'http://localhost:5000';

export default function useSocket({ roomId, senderId, senderNickname, word, onChatEnded }) {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [receiverInfo, setReceiverInfo] = useState({ receiverId: '', receiverNickname: '' });
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!roomId || !senderId) return;

    const socket = io(SOCKET_URL, {
      query: { roomId, senderId, senderNickname, word },
    });
    socketRef.current = socket;

    // 메시지 수신
    socket.on('chatMessage', (msg) => setMessages((prev) => [...prev, msg]));

    // 상대방 정보 수신
    socket.on('receiverInfo', (info) => setReceiverInfo(info));

    // 타이핑 표시
    socket.on('typing', () => setIsTyping(true));
    socket.on('stopTyping', () => setIsTyping(false));

    // 대화 종료 알림
    socket.on('chatEnded', () => onChatEnded?.());

    return () => {
      socket.emit('leaveRoom', { roomId });
      socket.disconnect();
    };
  }, [roomId, senderId, senderNickname, word, onChatEnded]);

  const sendMessage = (msgData) => {
    if (socketRef.current) socketRef.current.emit('chatMessage', msgData);
  };

  const sendTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing');
    clearTimeout(socketRef.current.typingTimeout);
    socketRef.current.typingTimeout = setTimeout(() => {
      socketRef.current.emit('stopTyping');
    }, 1000);
  };

  const sendLeave = () => {
    if (socketRef.current) socketRef.current.emit('leaveRoom', { roomId });
  };

  return {
    messages,
    receiverInfo,
    isTyping,
    sendMessage,
    sendTyping,
    sendLeave,
  };
}
