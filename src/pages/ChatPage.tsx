import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { socket } from '../config/socket';
import ReportModal from '../components/ReportModal';
import { useWordSession } from '../contexts/WordSessionContext';
import { getStorage, setStorage, removeStorage } from '../types';
import type { ChatMessage, ReportResponse } from '../types';
import styles from '../themes/pages/ChatPage.module.css';

// ReportModal onSubmit({ reasons, extra }) 콜백 인자 모양.
// TODO: ReportModal 실제 onSubmit 시그니처 확인 (reasons: string[], extra: string 가정).
interface ReportSubmitValues {
  reasons: string[];
  extra: string;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const session = useWordSession();
  const {
    word,
    roomId, // ✅ 반드시 유지
    myId,
    myUsername,
    myNickname,
    partnerId,
    partnerUsername,
    partnerNickname,
    endSession,
  } = session;

  // 원본은 useWordSession()에서 isSessionActive를 구조분해했으나 컨텍스트가 제공하지 않아
  // 항상 undefined였다. 원래 가드 동작(early-return 미발동)을 보존하기 위해 안전하게 접근한다.
  // TODO: 컨텍스트에 isSessionActive 필드 추가 여부 확인 (현재는 isActive만 존재).
  const isSessionActive = (session as { isSessionActive?: boolean }).isSessionActive;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatEnded, setChatEnded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ✅ 채팅방 입장 검증
  useEffect(() => {
    if (isSessionActive === false) return;
    if (!roomId || !partnerId) {
      alert('필수 정보가 누락되어 있어 채팅방에 입장할 수 없습니다.');
      navigate('/main');
    }
  }, [isSessionActive, roomId, partnerId, navigate]);

  // ✅ 소켓 이벤트
  useEffect(() => {
    const handleChatMessage = (msg: ChatMessage) =>
      setMessages((prev) => [...prev, msg]);
    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    const handleChatEnded = () => {
      if (!chatEnded) {
        // 이미 종료 상태면 무시
        setChatEnded(true);
      }
    };

    const handleChatEndedByReport = () => setChatEnded(true);

    socket.on('chatMessage', handleChatMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('chatEnded', handleChatEnded);
    socket.on('chatEndedByReport', handleChatEndedByReport);

    return () => {
      socket.off('chatMessage', handleChatMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('chatEnded', handleChatEnded);
      socket.off('chatEndedByReport', handleChatEndedByReport);
    };
  }, [roomId, myId]);

  // ✅ 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ 세션 종료 공통 함수 (ChatPage.jsx)
  const endCurrentSession = async () => {
    try {
      await fetch('/api/match/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomId }), // word/round ❌ → roomId만 보내기
      });

      socket.emit('leaveRoom', { userId: myId!, roomId: roomId! }); // 상대방 알림용
      socket.disconnect();
    } catch (err) {
      console.error('❌ 세션 종료 오류:', err);
    } finally {
      endSession();
      navigate('/main');
    }
  };

  // ✅ 뒤로가기 방지 + 새로고침 경고
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
      setShowExitConfirm(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  //✅ 신고 처리
  const handleSubmitReport = async ({ reasons, extra }: ReportSubmitValues) => {
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reporterId: myId,
          reportedId: partnerId, // theirId 대신 partnerId
          roomId,
          reasons,
          extraMessage: extra,
        }),
      });

      const data = (await response.json()) as ReportResponse;
      if (data.success) {
        toast.success('신고가 접수되었습니다.');
        setShowReportModal(false);
        setTimeout(() => {
          handleExitChat(); // 나가기 처리
        }, 2000);
      } else {
        toast.error(data.message || '신고 실패');
      }
    } catch (err) {
      toast.error('서버 오류 발생');
    }
  };

  // ✅ 메시지 전송
  const handleSendMessage = () => {
    if (!message.trim() || chatEnded) return;

    const msgData: ChatMessage = {
      roomId: roomId!,
      senderId: myId!,
      senderUsername: myUsername!,
      senderNickname: myNickname!,
      receiverId: partnerId!,
      receiverUsername: partnerUsername!,
      receiverNickname: partnerNickname!,
      word: word!,
      message,
      timestamp: Date.now(),
    };

    socket.emit('chatMessage', msgData);
    socket.emit('stopTyping', { roomId: roomId! });
    setMessage('');
  };

  const handleTyping = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    if (value.trim().length > 0) socket.emit('typing', { roomId: roomId! });
    else socket.emit('stopTyping', { roomId: roomId! });
  };

  const handleExitChat = async () => {
    const chatInfo = getStorage('chatInfo');

    if (chatInfo) {
      // 👉 MainPage에서 사용할 피드백 정보 저장
      setStorage('feedbackInfo', chatInfo);
    }

    try {
      // ✅ 서버 세션 종료 (DB 반영)
      await endCurrentSession();
    } catch (err) {
      console.error('세션 종료 실패:', err);
    }

    // ✅ 클라이언트 세션 정리
    removeStorage('chatInfo');

    // ✅ 메인으로 이동 → MainPage에서 피드백 모달 뜸
    navigate('/main');
  };

  // ✅ 메시지 렌더링
  const renderMessages = () =>
    messages.map((msg, idx) => (
      <div
        key={idx}
        className={`${styles['chat-message']} ${msg.senderId === myId ? styles.self : styles.other}`}
      >
        {msg.message}
      </div>
    ));

  return (
    <div data-page="chatpage">
      {/* 🎃 할로윈 모드용 페이지 식별자 */}
      <div className={styles['chat-container']}>
        {/* 🔹 채팅 헤더 */}
        <div className={styles['chat-header']}>
          <div className={styles['chat-title']}>채팅방 ({word})</div>
          <div className={styles['chat-header-icons']}>
            <button
              className={styles['exit-button']}
              onClick={() => setShowReportModal(true)}
              title="신고하기"
            >
              <AlertTriangle size={22} />
            </button>
            <button
              className={styles['exit-button']}
              onClick={() => setShowExitConfirm(true)}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* 🔹 메시지 영역 */}
        <div className={styles['chat-messages']}>
          <div className={styles['chat-info-banner']}>
            <strong>{partnerNickname}님과 같은 단어를 떠올렸어요!</strong>
            <br />
            즐거운 대화 되세요.
          </div>
          {renderMessages()}
          {isTyping && (
            <div className={`${styles['chat-message']} ${styles.other}`}>
              <div className={`${styles['chat-typing-indicator']} ${styles['typing-dots']}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 🔹 입력 영역 */}
        <div className={styles['chat-input-container']}>
          <input
            className={styles['chat-input']}
            placeholder="메시지를 입력하세요."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={chatEnded}
          />
          <button
            className={styles['chat-send-button']}
            onClick={handleSendMessage}
            disabled={chatEnded}
          >
            전송
          </button>
        </div>

        {/* 🔹 나가기 확인 모달 */}
        {showExitConfirm && (
          <div className={styles['modal-overlay']}>
            <div className={styles['chat-ended-modal']}>
              <p>정말 나가시겠어요?</p>
              <div className={styles['modal-buttons']}>
                <button
                  className={`${styles['exit-button-text']} ${styles.confirm}`}
                  onClick={handleExitChat}
                >
                  네, 나갈래요
                </button>
                <button
                  className={`${styles['exit-button-text']} ${styles.cancel}`}
                  onClick={() => setShowExitConfirm(false)}
                >
                  아니요
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔹 신고 모달 */}
        {showReportModal && (
          <ReportModal
            onClose={() => setShowReportModal(false)}
            onSubmit={handleSubmitReport}
          />
        )}

        {/* 🔹 상대방 종료 알림 */}
        {chatEnded && (
          <div className={styles['chat-ended-overlay']}>
            <div className={styles['chat-ended-banner']}>
              <p>상대방이 대화를 종료했어요.</p>
              <button className={styles['exit-button-text']} onClick={handleExitChat}>
                나가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
