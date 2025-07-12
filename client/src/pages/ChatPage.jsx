import React, { useEffect, useRef, useState, useCallback  } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatPage.css';
import { LogOut, AlertTriangle } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';
import useSocket from '../hooks/useSocket';
import ReportModal from '../components/ReportModal';
import { toast } from 'react-toastify';


export default function ChatPage() {
  const navigate = useNavigate();
  const { endSession } = useWordSession();
  const [message, setMessage] = useState('');
  const [chatEnded, setChatEnded] = useState(false);
  const [isReadyToChat, setIsReadyToChat] = useState(false);
  const messagesEndRef = useRef(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingUnload, setPendingUnload] = useState(false);
  


  // ✅ localStorage에서 정보 로드
  const chatInfo = JSON.parse(localStorage.getItem('chatInfo'));
  if (!chatInfo || !chatInfo.roomId || !chatInfo.myId || !chatInfo.partnerId || !chatInfo.word) {
    alert('필수 정보가 누락되어 있어 채팅방에 입장할 수 없습니다.');
    navigate('/main');
    return null;
  }

  const { roomId, myId, myNickname, partnerId: theirId, partnerNickname: theirNickname, word } = chatInfo;

  console.log('chatInfo:', chatInfo);
  console.log('내 ID (myId):', myId);

  const {
    messages,
    receiverInfo,
    isTyping,
    sendMessage,
    sendTyping,
    sendLeave,
    socket,
  } = useSocket({
    roomId,
    senderId: myId,
    senderNickname: myNickname,
    word,
    onChatEnded: () => setChatEnded(true),
  });
  
  //신고처리함수
  const handleSubmitReport = async ({ reasons, extra }) => {
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reporterId: myId,
          reportedId: theirId,
          roomId: roomId,
          reasons,
          extraMessage: extra,
        }),
      });
  
      const data = await response.json();
      if (data.success) {
        toast.success('신고가 접수되었습니다.'); // ✅ 먼저 토스트 띄움
        setShowReportModal(false); // ✅ 모달 닫기
  
        // ✅ 1초 후에 채팅방 나가기
        setTimeout(() => {
          handleExitChat(); // ← 네가 원래 쓰던 함수
        }, 3000);
  
      } else {
        toast.error(data.message || '신고 실패');
      }
    } catch (err) {
      toast.error('서버 오류 발생');
    }
  };

 // ChatPage.jsx useEffect 안에서 Chat history저장
 useEffect(() => {
  const saveHistory = async () => {
    try {
      if (!theirId || !word) {
        console.warn('❌ 저장 불가: partnerId 또는 word 없음', chatInfo);
        return;
      }

      const res = await fetch('/api/word-history/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          partnerId: theirId,
          word,
          userNickname: myNickname,
          partnerNickname: theirNickname,
        }),
      });

      const data = await res.json();
      console.log('📦 히스토리 저장 응답:', data);

      console.log('히스토리 저장용:', {
        partnerId: theirId,
        word,
        userNickname: myNickname,
        partnerNickname: theirNickname,
      });
    } catch (err) {
      console.error('❌ 히스토리 저장 실패:', err);
    }
  };

  saveHistory();
}, [theirId, word]); // ✅ chatInfo 아닌 실제 필요한 변수 기준으로


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

    //뒤로가기 닫기
    /*useEffect(() => {
      const handlePopState = (e) => {
        console.log('[POPSTATE] 뒤로가기 감지됨');
        // 히스토리 되돌림 차단
        window.history.pushState(null, '', window.location.pathname);
        setShowExitConfirm(true);
      };
    
      // 진입 시 현재 위치를 history에 추가해서 pushState로 막을 수 있게 함
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
    
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }, []);*/

    
    useEffect(() => {
      // 🔙 뒤로가기 감지 → 커스텀 모달
      const handlePopState = (e) => {
        console.log('[POPSTATE] 뒤로가기 감지됨');
        window.history.pushState(null, '', window.location.pathname); // 뒤로가기 무효화
        setShowExitConfirm(true); // 감성 모달 오픈
      };
    
      // 🔄 새로고침 / 창닫기 → 브라우저 기본 모달
      const handleBeforeUnload = (e) => {
        console.log('[BEFOREUNLOAD] 새로고침 또는 창닫기 감지됨');
        e.preventDefault();
        e.returnValue = ''; // 브라우저 기본 확인창 표시
      };
    
      // 진입 시 현재 위치를 history에 추가해서 popstate 차단 가능하게
      window.history.pushState(null, '', window.location.pathname);
    
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
    
      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, []);

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
          <div className="chat-title">채팅방 ({word})</div>
          <div className="chat-header-icons">
            <button className="exit-button" onClick={() => setShowReportModal(true)} title="신고하기">
              <AlertTriangle size={22} />
            </button>
            <button className="exit-button" onClick={handleExitChat}>
              <LogOut size={20} />
            </button>
          </div>
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

      {showExitConfirm && (
  <div className="chat-ended-modal">
    <p>정말 나가시겠어요?</p>
    <button
      className="exit-button-text"
      onClick={() => {
        setShowExitConfirm(false);
        handleExitChat(); // ✅ 나가기 로직 실행
      }}
    >
      네, 나갈래요
    </button>
    <button className="exit-button-text" onClick={() => setShowExitConfirm(false)}>
      아니요
    </button>
  </div>
)}

      {showReportModal && (
            <ReportModal
      onClose={() => setShowReportModal(false)}
      onSubmit={handleSubmitReport}
      roomId={roomId}
      reportedId={theirId}
      reporterId={myId} // ✅ 이거 꼭 넣어야 함!
    />
    )}

      {chatEnded && (
        <div className="chat-ended-modal">
          <p>상대방이 <br /> 대화를 종료했어요.</p>
          <button className="exit-button-text" onClick={handleExitChat}>나가기</button>
        </div>
      )}
    </div>
  );
};