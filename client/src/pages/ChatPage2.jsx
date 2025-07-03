import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';
import { LogOut } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';
import useSocket from '../hooks/useSocket';

export default function ChatPage2() {
  const navigate = useNavigate();
  const {
    roomId,
    myId,
    myNickname,
    partnerId,
    partnerNickname,
    word,
  } = useParams();

  const { endSession } = useWordSession();
  const [message, setMessage] = useState('');
  const [chatEnded, setChatEnded] = useState(false);
  const [isReadyToChat, setIsReadyToChat] = useState(false);
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
    senderId: myId,
    senderNickname: myNickname,
    word,
    onChatEnded: () => setChatEnded(true),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (receiverInfo?.receiverId === partnerId) {
      setIsReadyToChat(true);
    }
  }, [receiverInfo, partnerId]);

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
      receiverId: partnerId,
      receiverNickname: partnerNickname,
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
          <strong>{partnerNickname || '(상대방 로딩중)'}님과<br />연결되었습니다!</strong>
          <br /><br />즐거운 대화를 나눠보세요 🎉
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
