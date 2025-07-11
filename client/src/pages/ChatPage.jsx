import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatPage.css';
import { LogOut } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';
import useSocket from '../hooks/useSocket';

export default function ChatPage() {
  const navigate = useNavigate();
  const { endSession } = useWordSession();
  const [message, setMessage] = useState('');
  const [chatEnded, setChatEnded] = useState(false);
  const [isReadyToChat, setIsReadyToChat] = useState(false);
  const messagesEndRef = useRef(null);

  // ✅ localStorage에서 정보 로드
  const chatInfo = JSON.parse(localStorage.getItem('chatInfo'));
  if (!chatInfo || !chatInfo.roomId || !chatInfo.myId || !chatInfo.partnerId || !chatInfo.word) {
    alert('필수 정보가 누락되어 있어 채팅방에 입장할 수 없습니다.');
    navigate('/main');
    return null;
  }

  const { roomId, myId, myNickname, partnerId: theirId, partnerNickname: theirNickname, word } = chatInfo;

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
          <div className="chat-typing-indicator typing-dots">
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
}
