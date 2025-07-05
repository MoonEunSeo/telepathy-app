import { useEffect, useState } from 'react';
import socket from './socketInstance';

const useSocket = ({ roomId, senderId, senderNickname, word, onChatEnded }) => {
  const [messages, setMessages] = useState([]);
  const [receiverInfo, setReceiverInfo] = useState({ receiverId: '', receiverNickname: '' });
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // 쿼리로 방 정보 전달 후 연결
    socket.io.opts.query = { roomId, senderId, senderNickname, word };
    socket.connect();

    socket.on('chatMessage', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('receiverInfo', (info) => {
      setReceiverInfo(info);
    });

    socket.on('typing', () => setIsTyping(true));
    socket.on('stopTyping', () => setIsTyping(false));
    socket.on('chatEnded', () => onChatEnded());

    return () => {
      socket.off('chatMessage');
      socket.off('receiverInfo');
      socket.off('typing');
      socket.off('stopTyping');
      socket.off('chatEnded');
      socket.disconnect();
    };
  }, [roomId, senderId, senderNickname, word, onChatEnded]); // ✅ 필요 의존성 추가

  const sendMessage = (msgData) => {
    socket.emit('chatMessage', msgData);
  };

  const sendTyping = () => {
    socket.emit('typing');
    clearTimeout(socket.typingTimeout);
    socket.typingTimeout = setTimeout(() => {
      socket.emit('stopTyping');
    }, 1000);
  };

  const sendLeave = () => {
    socket.emit('leaveRoom', { roomId });
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