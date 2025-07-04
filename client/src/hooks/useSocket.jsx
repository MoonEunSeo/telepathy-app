// 📦 src/hooks/useSocket.js


import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// 개발/배포 환경에 따라 소켓 서버 주소를 자동으로 선택
const SOCKET_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://telepathy-app.onrender.com' // Render 배포 후 실제 도메인으로 교체해줘
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
      setMessages((prev) => [...prev, data]);
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
