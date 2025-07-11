/*
import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useParams } from 'react-router-dom';
import './ChatPage.css';

export default function ChatPage() {
  const { roomId, senderId, senderNickname, receiverId, receiverNickname, word } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

let typingTimeout = useRef(null);

const handleTyping = (e) => {
  setMessage(e.target.value);
  socketRef.current.emit('typing');

  if (typingTimeout.current) {
    clearTimeout(typingTimeout.current);
  }
  typingTimeout.current = setTimeout(() => {
    socketRef.current.emit('stopTyping');
  }, 1000);
};


  useEffect(() => {
    const socket = io('http://localhost:5000', {
      query: {
        roomId,
        senderId,
        senderNickname,
        receiverId,
        receiverNickname,
        word,
      },
    });

    socketRef.current = socket;

    socket.on('chatMessage', (data) => {
      console.log('💬 받은 chatMessage:', data);

      // 중복 방지: 내쪽에서 emit한 message가 다시 올 경우 senderId로 구분
      if (data.senderId !== senderId) {
        setMessages((prevMessages) => [...prevMessages, data]);
      }
    });

    socket.on('typing', () => {
      setIsTyping(true);
    });
    
    socket.on('stopTyping', () => {
      setIsTyping(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, senderId, senderNickname, receiverId, receiverNickname, word]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const msgData = {
      roomId,
      senderId,
      senderNickname,
      receiverId,
      receiverNickname,
      word,
      message,
    };

    socketRef.current.emit('chatMessage', msgData);
    socketRef.current.emit('stopTyping'); // 추가

    setMessages((prevMessages) => [...prevMessages, msgData]);
    setMessage('');

    // 내쪽에서는 바로 추가 (중복방지 코드 있으므로 문제없음)
    setMessages((prevMessages) => [...prevMessages, msgData]);
    setMessage('');
  };

  const renderMessages = () => {
    const rendered = [];
    let lastDate = '';

    // 날짜 구분용 (timestamp 없으면 new Date()로 임시 처리)
    messages.forEach((msg, index) => {
      const date = new Date(msg.timestamp || Date.now()).toLocaleDateString();

      if (date !== lastDate) {
        rendered.push(
          <div key={`date-${index}`} className="chat-date-divider">
            {date}
          </div>
        );
        lastDate = date;
      }

      rendered.push(
        <div
          key={index}
          className={`chat-message ${msg.senderId === senderId ? 'self' : 'other'}`}
        >
          {msg.message}
          {msg.senderId === senderId && (
            <div className="chat-read-indicator">읽음</div>
          )}
        </div>
      );

    });

    return rendered;
  };

  return (
    <div className="chat-container">
      <div className="chat-header">채팅방 ({word})</div>
      <div className="chat-header-title">채팅방 ({word})</div>
  <div className="chat-header-subtitle">상대방: {receiverNickname}</div>
  {isTyping && <div className="chat-typing-indicator">상대방이 입력 중...</div>}

      <div className="chat-messages">
        <div className="chat-info-banner">
          방금 <strong>{receiverNickname}</strong>님과 같은 단어를 떠올렸어요!<br />
          여기서 만나다니, 운명인가요?
        </div>

        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          className="chat-input"
          placeholder="메시지를 입력하세요."
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
        />
        <button className="chat-send-button" onClick={handleSendMessage}>
          전송
        </button>
      </div>
    </div>
  );
}*/

/*
import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';
import { LogOut } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';

export default function ChatPage() {
  const navigate = useNavigate();
  const {
    roomId,
    senderId,
    senderNickname,
    receiverId: paramReceiverId,
    receiverNickname: paramReceiverNickname,
    word
  } = useParams();

  const [receiverId, setReceiverId] = useState(paramReceiverId || '');
  const [receiverNickname, setReceiverNickname] = useState(paramReceiverNickname || '');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  const { endSession } = useWordSession();
  const [chatEnded, setChatEnded] = useState(false); // 종료 플래그

  // ✅ 소켓 연결 및 이벤트 핸들링
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      query: { roomId, senderId, senderNickname, word },
    });

    socketRef.current = socket;

    socket.on('receiverInfo', ({ receiverId, receiverNickname }) => {
      setReceiverId(receiverId);
      setReceiverNickname(receiverNickname);
    });

    socket.on('chatMessage', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('typing', () => setIsTyping(true));
    socket.on('stopTyping', () => setIsTyping(false));

    socket.on('forceDisconnect', () => {
      console.log('📴 서버에서 연결 종료 지시');
      socket.disconnect();
      navigate('/main');
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, senderId, senderNickname, word, navigate]);

  // ✅ 채팅 전송
  const handleSendMessage = () => {
    if (!message.trim()) return;

    const msgData = {
      roomId,
      senderId,
      senderNickname,
      receiverId,
      receiverNickname,
      word,
      message,
      timestamp: Date.now(),
    };

    socketRef.current.emit('chatMessage', msgData);
    socketRef.current.emit('stopTyping');
    setMessages((prev) => [...prev, msgData]);
    setMessage('');
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socketRef.current.emit('typing');
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current.emit('stopTyping');
    }, 1000);
  };

  // ✅ 세션 종료 및 나가기
  const handleExit = async () => {
    try {
      await fetch('http://localhost:5000/api/match/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word }),
      });

      socketRef.current.emit('leaveRoom', { roomId });
    } catch (err) {
      console.error('❌ 세션 종료 오류:', err);
    } finally {
      endSession();
      navigate('/main');
    }
  };

  
useEffect(() => {
  // 서버에서 종료 알림 받으면 종료 모달 상태 설정
  socketRef.current.on('chatEnded', () => {
    setChatEnded(true);
  });

  return () => {
    socketRef.current.off('chatEnded');
  };
}, []);


useEffect(() => {
  const checkSessionStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/match/session-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word, userId: senderId }),
      });

      const data = await res.json();

      if (!data.active) {
        // ✅ 세션이 이미 종료된 경우
        navigate('/main');
      }
    } catch (err) {
      console.error('세션 상태 확인 실패:', err);
      // 네트워크 에러 발생 시에도 안전하게 메인으로
      navigate('/main');
    }
  };

  checkSessionStatus();
}, [word, senderId, navigate]);


  // ✅ 스크롤 아래로 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ 메시지 렌더링
  const renderMessages = () => {
    const rendered = [];
    let lastDate = '';

    messages.forEach((msg, idx) => {
      const date = new Date(msg.timestamp).toLocaleDateString();
      if (date !== lastDate) {
        rendered.push(<div key={`date-${idx}`} className="chat-date-divider">{date}</div>);
        lastDate = date;
      }

      rendered.push(
        <div key={idx} className={`chat-message ${msg.senderId === senderId ? 'self' : 'other'}`}>
          {msg.message}
        </div>
      );
    });

    if (isTyping) {
      rendered.push(
        <div key="typing-indicator" className="chat-message other">
          <div className="chat-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      );
    }

    return rendered;
  };

  return (
    <div className="chat-container" style={{ position: 'relative' }}> {}
      <div className="chat-header">
        채팅방 ({word})
        <button className="exit-button" onClick={handleExit}><LogOut size={20} /></button>
      </div>
  
      <div className="chat-messages">
        <div className="chat-info-banner">
          <strong>방금 {receiverNickname || '(상대방 로딩중)'}님과<br />같은 단어를 떠올렸어요!</strong><br />
          <br />여기서 만나다니,<br />운명인가요?
        </div>
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          className="chat-input"
          placeholder="메시지를 입력하세요."
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={chatEnded}
        />
        <button
          className="chat-send-button"
          onClick={handleSendMessage}
          disabled={chatEnded}
        >
          전송
        </button>
      </div>
      {chatEnded && (
        <div className="chat-ended-modal">
          <p>상대방이 <br/> 대화를 종료했어요.</p>
          <button className="exit-button-text" onClick={handleExit}>나가기</button>
        </div>
      )}
    </div>
  );

}*/
/*
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';
import { LogOut } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';
import useSocket from '../hooks/useSocket';

export default function ChatPage() {
  const navigate = useNavigate();
  const {
    roomId,
    senderId: rawSenderId,
    senderNickname: rawSenderNickname,
    receiverId: rawReceiverId,
    receiverNickname: rawReceiverNickname,
    word,
  } = useParams();

  const { endSession } = useWordSession();
  const [message, setMessage] = useState('');
  const [chatEnded, setChatEnded] = useState(false);
  const [isReadyToChat, setIsReadyToChat] = useState(false);
  const messagesEndRef = useRef(null);

  const isMeSender = rawSenderId === rawSenderId; // 항상 true
  const myId = isMeSender ? rawSenderId : rawReceiverId;
  const myNickname = isMeSender ? rawSenderNickname : rawReceiverNickname;
  const theirId = isMeSender ? rawReceiverId : rawSenderId;
  const theirNickname = isMeSender ? rawReceiverNickname : rawSenderNickname;

  const {
    messages,
    receiverInfo,
    isTyping,
    sendMessage,
    sendTyping,
    sendLeave,
  } = useSocket({
    roomId,
    senderId: myId,
    senderNickname: myNickname,
    word,
    onChatEnded: () => setChatEnded(true),
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/match/session-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ word, userId: myId }),
        });
        const data = await res.json();
        if (!data.active) navigate('/main');
      } catch {
        navigate('/main');
      }
    };
    checkSession();
  }, [word, myId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (receiverInfo?.receiverId === theirId) {
      setIsReadyToChat(true);
    }
  }, [receiverInfo, theirId]);

  const handleExitChat = async () => {
    try {
      await fetch('/api/match/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word }),
      });
      sendLeave();
    } catch (err) {
      console.error('❌ 세션 종료 오류:', err);
    } finally {
      endSession();
      navigate('/main');
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !isReadyToChat) return;
    const msgData = {
      roomId,
      senderId: myId,
      senderNickname: myNickname,
      receiverId: receiverInfo.receiverId,
      receiverNickname: receiverInfo.receiverNickname,
      word,
      message,
      timestamp: Date.now(),
    };
    sendMessage(msgData);
    setMessage('');
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    sendTyping();
  };

  const renderMessages = () => {
    const rendered = [];
    let lastDate = '';

    messages.forEach((msg, idx) => {
      const date = new Date(msg.timestamp).toLocaleDateString();
      if (date !== lastDate) {
        rendered.push(<div key={`date-${idx}`} className="chat-date-divider">{date}</div>);
        lastDate = date;
      }
      rendered.push(
        <div key={idx} className={`chat-message ${msg.senderId === myId ? 'self' : 'other'}`}>
          {msg.message}
        </div>
      );
    });

    if (isTyping) {
      rendered.push(
        <div key="typing-indicator" className="chat-message other">
          <div className="chat-typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      );
    }

    return rendered;
  };

  return (
    <div className="chat-container" style={{ position: 'relative' }}>
      <div className="chat-header">
        채팅방 ({word})
        <button className="exit-button" onClick={handleExitChat}><LogOut size={20} /></button>
      </div>

      <div className="chat-messages">
        <div className="chat-info-banner">
          <strong>방금 {receiverInfo?.receiverNickname || theirNickname || '(상대방 로딩중)'}님과<br />같은 단어를 떠올렸어요!</strong><br /><br />여기서 만나다니,<br />운명인가요?
        </div>
        {!isReadyToChat && (
          <div className="chat-wait-banner">상대방이 입장 중입니다...</div>
        )}
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          className="chat-input"
          placeholder="메시지를 입력하세요."
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={chatEnded || !isReadyToChat}
        />
        <button
          className="chat-send-button"
          onClick={handleSendMessage}
          disabled={chatEnded || !isReadyToChat}
        >
          전송
        </button>
      </div>

      {chatEnded && (
        <div className="chat-ended-modal">
          <p>상대방이 <br /> 대화를 종료했어요.</p>
          <button className="exit-button-text" onClick={handleExitChat}>나가기</button>
        </div>
      )}
    </div>
  );
}*/
/*
 
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';
import { LogOut } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';
import useSocket from '../hooks/useSocket';

export default function ChatPage() {
  const navigate = useNavigate();
  const { word, roomId, senderId, senderNickname, receiverId, receiverNickname } = useParams();
  const { endSession } = useWordSession();

  const [message, setMessage] = useState('');
  const [chatEnded, setChatEnded] = useState(false);
  const messagesEndRef = useRef(null);

  const {
    messages,
    receiverInfo,
    isTyping,
    sendMessage,
    sendTyping,
    sendLeave,
  } = useSocket({
    roomId,
    senderId,
    senderNickname,
    word,
    onChatEnded: () => setChatEnded(true),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // 최초 접속 시 세션 상태 확인
    const checkSession = async () => {
      try {
        const res = await fetch('/api/match/session-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ word, userId: senderId }),
        });
        const data = await res.json();
        if (!data.active) navigate('/main');
      } catch (err) {
        console.error('❌ 세션 확인 실패', err);
        navigate('/main');
      }
    };
    checkSession();
  }, [navigate, word, senderId]);

  const handleExitChat = async () => {
    try {
      await fetch('/api/match/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word }),
      });
      sendLeave();
    } catch (err) {
      console.error('❌ 세션 종료 오류:', err);
    } finally {
      endSession();
      navigate('/main');
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || chatEnded) return;
    sendMessage({
      roomId,
      senderId,
      senderNickname,
      receiverId: receiverInfo.receiverId,
      receiverNickname: receiverInfo.receiverNickname,
      word,
      message,
      timestamp: Date.now(),
    });
    setMessage('');
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    sendTyping();
  };

  const renderMessages = () =>
    messages.map((msg, idx) => (
      <div key={idx} className={`chat-message ${msg.senderId === senderId ? 'self' : 'other'}`}>
        {msg.message}
      </div>
    )).concat(
      isTyping && (
        <div key="typing-indicator" className="chat-message other">
          <div className="chat-typing-indicator"><span></span><span></span><span></span></div>
        </div>
      )
    );

  return (
    <div className="chat-container" style={{ position: 'relative' }}>
      <div className="chat-header">
        채팅방 ({word})
        <button className="exit-button" onClick={handleExitChat}><LogOut size={20} /></button>
      </div>

      <div className="chat-messages">
        <div className="chat-info-banner">
          <strong>방금 {receiverInfo?.receiverNickname || receiverNickname || '(상대방 로딩중)'}님과<br />같은 단어를 떠올렸어요!</strong><br /><br />여기서 만나다니,<br />운명인가요?
        </div>
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          className="chat-input"
          placeholder="메시지를 입력하세요."
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={chatEnded}
        />
        <button
          className="chat-send-button"
          onClick={handleSendMessage}
          disabled={chatEnded}
        >
          전송
        </button>
      </div>

      {chatEnded && (
        <div className="chat-ended-modal">
          <p>상대방이 <br /> 대화를 종료했어요.</p>
          <button className="exit-button-text" onClick={handleExitChat}>나가기</button>
        </div>
      )}
    </div>
  );
}
*/// 📦 ChatPage.jsx (튜닝 클라이언트 버전)
// 📁 ChatPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './ChatPage.css';

const socket = io('/', { transports: ['websocket'] });

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, nickname, word } = location.state || {};

  useEffect(() => {
    if (!userId || !nickname || !word) {
      alert('유효하지 않은 접근입니다.');
      navigate('/main');
      return;
    }

    socket.emit('joinRoom', { userId, nickname, word });

    socket.on('startChat', ({ users, roomId }) => {
      console.log('💬 채팅 시작');
    });

    socket.on('receiveMessage', ({ message, sender }) => {
      setMessages(prev => [...prev, { message, sender }]);
    });

    socket.on('typing', () => setPartnerTyping(true));
    socket.on('stopTyping', () => setPartnerTyping(false));
    socket.on('userLeft', () => {
      alert('상대방이 대화를 종료했습니다.');
      navigate('/main');
    });

    return () => {
      socket.emit('leaveRoom');
      socket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    const messageObj = { message: input, sender: nickname };
    socket.emit('sendMessage', { roomId: `room-${word}`, ...messageObj });
    setMessages(prev => [...prev, messageObj]);
    setInput('');
    socket.emit('stopTyping', { roomId: `room-${word}` });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>{word}</div>
        <button className="exit-button" onClick={() => navigate('/main')}>나가기</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.sender === nickname ? 'self' : 'other'}`}>
            {msg.message}
          </div>
        ))}
        {partnerTyping && (
          <div className="chat-typing-indicator">
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            socket.emit('typing', { roomId: `room-${word}`, userId });
            if (!e.target.value) socket.emit('stopTyping', { roomId: `room-${word}`, userId });
          }}
          placeholder="메시지를 입력하세요..."
        />
        <button className="chat-send-button" onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
}

export default ChatPage;