// src/hooks/useSocket.jsx
/*import { useEffect, useRef, useState } from 'react';
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
    //  socket.disconnect(); <-sendleave에서 해버림
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
  
      // ✅ 상대방에게 메시지 보낼 시간 확보 후 disconnect
      setTimeout(() => {
        socketRef.current.disconnect();
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

export default useSocket;*/

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

    // 핸들러 정의 (정리 가능하도록 변수화)
    const handleMessage = (data) => setMessages((prev) => [...prev, data]);
    const handleReceiverInfo = (info) => setReceiverInfo(info);
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

  const sendMessage = (msgData) => {
    if (socketRef.current) {
      socketRef.current.emit('chatMessage', msgData);
      // ❌ 직접 setMessages 하지 않음 (수신 이벤트에 의해 반영)
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

      // ✅ 상대방에게 메시지를 보내고 일정 시간 후 disconnect
      setTimeout(() => {
        socketRef.current.disconnect();
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