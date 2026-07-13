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

// ReportModal onSubmit({ reasons, extra }) 콜백 인자 모양.
// TODO: ReportModal 실제 onSubmit 시그니처 확인 (reasons: string[], extra: string 가정).
interface ReportSubmitValues {
  reasons: string[];
  extra: string;
}

// 구 .chat-message (+ .self / .other) — renderMessages 반복
const msgBase =
  'max-w-[65%] py-2.5 px-3.5 rounded-[18px] text-[15px] leading-[1.5] whitespace-pre-wrap break-words box-border';
const msgSelf = 'self-end [background:var(--chat-self-bg)] text-[var(--chat-accent-text)] rounded-br-[6px]';
const msgOther = 'self-start [background:var(--chat-other-bg)] text-[var(--chat-text)] rounded-bl-[6px]';
// 구 .exit-button (헤더 아이콘)
const exitBtn =
  '[background:var(--chat-exit-bg)] border-none text-[var(--chat-exit-text)] cursor-pointer py-1.5 px-2.5 [transition:all_0.2s] hover:text-[var(--color-danger-accent)]';
// 구 .exit-button-text.confirm / .cancel (나가기 확인 모달)
const endedBtnBase = 'py-2.5 px-[18px] border-none rounded-full cursor-pointer [transition:all_0.2s] text-[16px]';
const endedBtnConfirm = `${endedBtnBase} [background:var(--ended-confirm-bg)] text-[var(--ended-btn-text)] hover:[background:var(--ended-confirm-bg-hover)]`;
const endedBtnCancel = `${endedBtnBase} [background:var(--ended-cancel-bg)] text-[var(--ended-cancel-text)] hover:[background:var(--ended-cancel-bg-hover)]`;
// 구 .typing-dots span
const dot = 'w-1.5 h-1.5 mx-[3px] [background-color:var(--chat-dots)] rounded-full animate-[chat-blink_1.4s_infinite_both]';

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
        className={`${msgBase} ${msg.senderId === myId ? msgSelf : msgOther}`}
      >
        {msg.message}
      </div>
    ));

  return (
    <div data-page="chatpage">
      {/* 🎃 할로윈 모드용 페이지 식별자 ([data-page="chatpage"] + ::before 오버레이가 halloween.css 에 존재) */}
      {/* 구 .chat-container */}
      <div className="flex flex-col h-screen w-full bg-[var(--chat-container-bg)] [font-family:'Gowun_Dodum',sans-serif]">
        {/* 🔹 채팅 헤더 — 구 .chat-header */}
        <div className="flex justify-between items-center p-4 font-bold text-[18px] bg-[var(--chat-panel-bg)] text-[var(--chat-text)] [border-bottom:1px_solid_var(--chat-border)] sticky top-0 z-20">
          {/* 구 .chat-title (모듈 미정의 → 무스타일) */}
          <div>채팅방 ({word})</div>
          {/* 구 .chat-header-icons */}
          <div className="flex items-center gap-2">
            <button className={exitBtn} onClick={() => setShowReportModal(true)} title="신고하기">
              <AlertTriangle size={22} />
            </button>
            <button className={exitBtn} onClick={() => setShowExitConfirm(true)}>
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* 🔹 메시지 영역 — 구 .chat-messages */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-2.5 mt-2.5 text-[var(--chat-text)] animate-[chat-fade-in_0.3s_ease]">
          {/* 구 .chat-info-banner (모듈 미정의 → 무스타일) */}
          <div>
            <strong>{partnerNickname}님과 같은 단어를 떠올렸어요!</strong>
            <br />
            즐거운 대화 되세요.
          </div>
          {renderMessages()}
          {isTyping && (
            <div className={`${msgBase} ${msgOther}`}>
              {/* 구 .chat-typing-indicator(미정의) + .typing-dots */}
              <div className="flex justify-center items-center">
                <span className={dot}></span>
                <span className={`${dot} [animation-delay:0.2s]`}></span>
                <span className={`${dot} [animation-delay:0.4s]`}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 🔹 입력 영역 — 구 .chat-input-container */}
        <div className="flex py-3 px-4 [border-top:1px_solid_var(--chat-border)] bg-[var(--chat-panel-bg)]">
          <input
            className="flex-1 py-3 px-3.5 [background:var(--chat-input-bg)] text-[var(--chat-input-text)] [border:1px_solid_var(--chat-input-border)] rounded-[24px] outline-none text-[14px] [transition:border_0.2s] focus:[border-color:var(--color-text-subtle)] disabled:[background-color:var(--color-border-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="메시지를 입력하세요."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={chatEnded}
          />
          {/* 구 .chat-send-button */}
          <button
            className="ml-2 py-3 px-[18px] [background:var(--chat-accent-bg)] text-[var(--chat-accent-text)] border-none rounded-[24px] cursor-pointer font-bold text-[14px] [transition:background_0.2s] hover:[background-color:var(--color-accent-hover)] disabled:[background-color:var(--color-border-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSendMessage}
            disabled={chatEnded}
          >
            전송
          </button>
        </div>

        {/* 🔹 나가기 확인 모달 — 구 .modal-overlay(스코프) / .chat-ended-modal */}
        {showExitConfirm && (
          <div className="fixed inset-0 flex justify-center items-center [background:var(--modal-overlay-bg)] [backdrop-filter:blur(4px)] z-[1000]">
            <div className="[background:var(--ended-modal-bg)] text-[var(--ended-modal-text)] [border:1px_solid_var(--ended-modal-border)] rounded-[20px] py-6 px-8 [box-shadow:var(--ended-modal-shadow)] text-center w-[300px] animate-[chat-fade-in-up_0.25s_ease-out]">
              <p className="mb-10 text-[var(--ended-modal-text)] text-[18px] font-semibold p-5">정말 나가시겠어요?</p>
              {/* 구 .modal-buttons */}
              <div className="flex justify-center gap-3">
                <button className={endedBtnConfirm} onClick={handleExitChat}>
                  네, 나갈래요
                </button>
                <button className={endedBtnCancel} onClick={() => setShowExitConfirm(false)}>
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

        {/* 🔹 상대방 종료 알림 — 구 .chat-ended-overlay / .chat-ended-banner */}
        {chatEnded && (
          <div className="fixed inset-0 [background:var(--modal-overlay-bg)] [backdrop-filter:blur(6px)] flex justify-center items-center z-[2000] animate-[chat-fade-in-overlay_0.3s_ease-out]">
            <div className="[background:var(--ended-modal-bg)] text-[var(--ended-modal-text)] [border:1px_solid_var(--ended-modal-border)] rounded-[20px] py-7 px-9 [box-shadow:var(--ended-modal-shadow)] text-center w-[250px] animate-[chat-fade-in-up-modal_0.3s_ease-out] [font-family:'Gowun_Dodum',sans-serif]">
              <p className="mb-7 text-[var(--ended-modal-text)] text-[18px] font-semibold">상대방이 대화를 종료했어요.</p>
              {/* 구 .chat-ended-banner .exit-button-text (배너 전용 오버라이드) */}
              <button
                className="py-2.5 px-[22px] border-none rounded-full cursor-pointer text-[15px] [background:var(--ended-accent-bg)] text-[var(--ended-btn-text)] [transition:background_0.2s_ease,transform_0.1s_ease] hover:[background:var(--ended-accent-bg-hover)] hover:-translate-y-px"
                onClick={handleExitChat}
              >
                나가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
