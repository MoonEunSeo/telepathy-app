// src/hooks/useChat.js
import { useEffect, useState } from 'react';
import socket from './socketInstance';

const useChat = ({ roomId, senderId, nickname, onChatEnded }) => {
  const [messages, setMessages] = useState([]);
  const [receiverInfo, setReceiverInfo] = useState(null);

  useEffect(() => {
    if (!roomId || !senderId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinRoom', { roomId, senderId, nickname });

    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('receiverInfo', (info) => setReceiverInfo(info));

    socket.on('chatEnded', onChatEnded);

    return () => {
      socket.emit('leaveRoom', { roomId });
      socket.off('chatMessage');
      socket.off('receiverInfo');
      socket.off('chatEnded');
    };
  }, [roomId, senderId, nickname, onChatEnded]);

  const sendMessage = (message) => {
    socket.emit('sendMessage', { roomId, senderId, message });
  };

  return { messages, receiverInfo, sendMessage };
};

export default useChat;
