import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertTriangle, ChevronLeft, Send } from 'lucide-react';
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
const msgSelf =
  'self-end [background:var(--chat-self-bg)] text-[var(--chat-accent-text)] rounded-br-[6px]';
const msgOther =
  'self-start [background:var(--chat-other-bg)] text-[var(--chat-text)] rounded-bl-[6px]';
// 말풍선 시간 표기 (오전/오후 h:mm)
const formatTime = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  h = h % 12 || 12;
  return `${ampm} ${h}:${String(m).padStart(2, '0')}`;
};
// 구 .exit-button-text.confirm / .cancel (나가기 확인 모달)
const endedBtnBase =
  'py-2.5 px-[18px] border-none rounded-full cursor-pointer [transition:all_0.2s] text-[16px]';
const endedBtnConfirm = `${endedBtnBase} [background:var(--ended-confirm-bg)] text-[var(--ended-btn-text)] hover:[background:var(--ended-confirm-bg-hover)]`;
const endedBtnCancel = `${endedBtnBase} [background:var(--ended-cancel-bg)] text-[var(--ended-cancel-text)] hover:[background:var(--ended-cancel-bg-hover)]`;
// 구 .typing-dots span
const dot =
  'w-1.5 h-1.5 mx-[3px] [background-color:var(--chat-dots)] rounded-full animate-[chat-blink_1.4s_infinite_both]';

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
    const handleChatMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
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
      // socket.disconnect();
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
    messages.map((msg, idx) => {
      const mine = msg.senderId === myId;
      return (
        <div key={idx} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
          <div className={`${msgBase} ${mine ? msgSelf : msgOther}`}>{msg.message}</div>
          {msg.timestamp ? (
            <span className="mt-1 px-1 text-[11px] text-[var(--chat-time-color)]">
              {formatTime(msg.timestamp)}
            </span>
          ) : null}
        </div>
      );
    });

  return (
    <div data-page="chatpage">
      {/* 🎃 할로윈 모드용 페이지 식별자 ([data-page="chatpage"] + ::before 오버레이가 halloween.css 에 존재) */}
      {/* 구 .chat-container */}
      <div className="flex h-screen w-full flex-col bg-[var(--chat-container-bg)] [font-family:'Gowun_Dodum',sans-serif]">
        {/* 🔹 채팅 헤더 — 리디자인: 뒤로가기 + 상대 닉네임 + 단어 배지 + 신고/나가기 */}
        <div className="sticky top-0 z-20 flex items-center justify-between bg-[var(--chat-panel-bg)] px-3 py-3 text-[var(--chat-text)] [border-bottom:1px_solid_var(--chat-border)]">
          {/* 뒤로가기 */}
          <button
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--chat-text)] hover:bg-[var(--color-surface-muted)]"
            onClick={() => setShowExitConfirm(true)}
            title="나가기"
          >
            <ChevronLeft size={22} />
          </button>
          {/* 상대 닉네임 + 단어 배지 */}
          <div className="flex min-w-0 flex-col items-center leading-tight">
            <span className="max-w-[180px] truncate text-[16px] font-bold text-[var(--color-text-strong)]">
              {partnerNickname}
            </span>
            <span className="mt-0.5 rounded-[var(--radius-pill)] bg-[var(--stat-chip-bg)] px-2 py-0.5 text-[11.5px] text-[var(--chat-system-text)]">
              함께 떠올린 단어 · {word}
            </span>
          </div>
          {/* 신고(중립) / 나가기(danger) */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--chat-exit-text)] hover:bg-[var(--color-surface-muted)]"
              onClick={() => setShowReportModal(true)}
              title="신고하기"
            >
              <AlertTriangle size={19} />
            </button>
            <button
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-danger)] hover:bg-[var(--color-surface-muted)]"
              onClick={() => setShowExitConfirm(true)}
              title="나가기"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>

        {/* 🔹 메시지 영역 — 구 .chat-messages */}
        <div className="mt-2.5 flex flex-1 animate-[chat-fade-in_0.3s_ease] flex-col gap-2.5 overflow-y-auto p-5 text-[var(--chat-text)]">
          {/* 시스템 안내 — 중앙 칩 */}
          <div className="my-1 max-w-[85%] self-center rounded-[var(--radius-md)] bg-[var(--chat-system-bg)] px-3.5 py-2 text-center text-[13px] text-[var(--chat-system-text)]">
            <strong className="font-semibold">{partnerNickname}</strong>님과 같은 단어를 떠올렸어요!
            즐거운 대화 되세요.
          </div>
          {renderMessages()}
          {isTyping && (
            <div className={`${msgBase} ${msgOther}`}>
              {/* 구 .chat-typing-indicator(미정의) + .typing-dots */}
              <div className="flex items-center justify-center">
                <span className={dot}></span>
                <span className={`${dot} [animation-delay:0.2s]`}></span>
                <span className={`${dot} [animation-delay:0.4s]`}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 🔹 입력 영역 — 리디자인: pill 입력 + 원형 전송 버튼 */}
        <div className="flex items-center gap-2 bg-[var(--chat-panel-bg)] px-4 py-3 [border-top:1px_solid_var(--chat-border)]">
          <input
            className="h-[46px] flex-1 rounded-[var(--radius-pill)] px-4 text-[14px] text-[var(--chat-input-text)] outline-none [background:var(--chat-input-bg)] [border:1px_solid_var(--chat-input-border)] [transition:border_0.2s] focus:[border-color:var(--color-text-subtle)] disabled:cursor-not-allowed disabled:[background-color:var(--color-border-subtle)] disabled:opacity-60"
            placeholder="메시지를 입력하세요."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={chatEnded}
          />
          {/* 원형 전송 버튼 (종이비행기) */}
          <button
            className="flex h-[46px] w-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-[var(--color-on-accent)] [background:var(--chat-send-bg)] [transition:opacity_0.2s] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={handleSendMessage}
            disabled={chatEnded}
            title="전송"
          >
            <Send size={18} />
          </button>
        </div>

        {/* 🔹 나가기 확인 모달 — 구 .modal-overlay(스코프) / .chat-ended-modal */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center [backdrop-filter:blur(4px)] [background:var(--modal-overlay-bg)]">
            <div className="w-[300px] animate-[chat-fade-in-up_0.25s_ease-out] rounded-[20px] px-8 py-6 text-center text-[var(--ended-modal-text)] [box-shadow:var(--ended-modal-shadow)] [background:var(--ended-modal-bg)] [border:1px_solid_var(--ended-modal-border)]">
              <p className="mb-10 p-5 text-[18px] font-semibold text-[var(--ended-modal-text)]">
                정말 나가시겠어요?
              </p>
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
          <ReportModal onClose={() => setShowReportModal(false)} onSubmit={handleSubmitReport} />
        )}

        {/* 🔹 상대방 종료 알림 — 구 .chat-ended-overlay / .chat-ended-banner */}
        {chatEnded && (
          <div className="fixed inset-0 z-[2000] flex animate-[chat-fade-in-overlay_0.3s_ease-out] items-center justify-center [backdrop-filter:blur(6px)] [background:var(--modal-overlay-bg)]">
            <div className="w-[250px] animate-[chat-fade-in-up-modal_0.3s_ease-out] rounded-[20px] px-9 py-7 text-center [font-family:'Gowun_Dodum',sans-serif] text-[var(--ended-modal-text)] [box-shadow:var(--ended-modal-shadow)] [background:var(--ended-modal-bg)] [border:1px_solid_var(--ended-modal-border)]">
              <p className="mb-7 text-[18px] font-semibold text-[var(--ended-modal-text)]">
                상대방이 대화를 종료했어요.
              </p>
              {/* 구 .chat-ended-banner .exit-button-text (배너 전용 오버라이드) */}
              <button
                className="cursor-pointer rounded-full border-none px-[22px] py-2.5 text-[15px] text-[var(--ended-btn-text)] [background:var(--ended-accent-bg)] [transition:background_0.2s_ease,transform_0.1s_ease] hover:-translate-y-px hover:[background:var(--ended-accent-bg-hover)]"
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
