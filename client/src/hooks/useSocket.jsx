// src/hooks/useSocket.jsx
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://telepathy-app.onrender.com'
    : 'http://localhost:5000';


const useSocket = ({ roomId, senderId, senderNickname, word, onChatEnded }) => {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [receiverInfo, setReceiverInfo] = useState({ receiverId: '', receiverNickname: '' });
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      query: { roomId, senderId, senderNickname, word },
    });
    socketRef.current = socket;

    socket.on('chatMessage', (data) => {
      setMessages((prev) => [...prev, data]); // 수신 기반으로만 추가
    });

    socket.on('receiverInfo', (info) => {
      setReceiverInfo(info);
    });

    socket.on('typing', () => setIsTyping(true));
    socket.on('stopTyping', () => setIsTyping(false));

    socket.on('chatEnded', () => {
      onChatEnded();
    });

    return () => {
      socket.disconnect();
    };
  }, []); // ✅ mount 시 1회만 실행

  const sendMessage = (msgData) => {
    if (socketRef.current) {
      socketRef.current.emit('chatMessage', msgData);
      // ❌ setMessages 제거: 서버 수신 시만 반영
    }
  };

  const sendTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('typing');
      clearTimeout(socketRef.current.typingTimeout);
      socketRef.current.typingTimeout = setTimeout(() => {
        socketRef.current.emit('stopTyping');
      }, 1000);
    }
  };

  const sendLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { roomId });
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