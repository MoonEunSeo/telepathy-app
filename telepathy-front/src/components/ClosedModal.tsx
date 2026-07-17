import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Comment, CommentsResponse, CommentCreateRequest } from '../types';

interface RemainingTime {
  hours: number;
  minutes: number;
  seconds: number;
}

function getRemainingTime(): RemainingTime {
  const now = new Date();

  // 오늘 20:00 KST
  const start = new Date(now);
  start.setHours(20, 0, 0, 0);

  // 내일 20:00 (이미 지났을 때 대비)
  if (now >= start) {
    start.setDate(start.getDate() + 1);
  }

  const diff = start.getTime() - now.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}

interface ClosedModalProps {
  onClose?: () => void;
  username?: string;
  nickname?: string | null;
}

// 👉 메인 모달
export default function ClosedModal({ username, nickname }: ClosedModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');

  const [remainingTime, setRemainingTime] = useState<RemainingTime>(getRemainingTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(getRemainingTime());
    }, 1000); // 1초마다 갱신
    return () => clearInterval(interval);
  }, []);

  // 댓글 불러오기
  const fetchComments = async () => {
    const res = await fetch('/api/comments');
    const data = (await res.json()) as CommentsResponse;
    setComments(data);
  };

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 10000);
    return () => clearInterval(interval);
  }, []);

  // 댓글 작성
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;

    const payload: CommentCreateRequest = {
      username: username || 'guest_user', // ✅ fallback
      nickname: nickname || null, // 서버에서 랜덤 닉네임 부여
      content: text,
    };

    console.log('🚀 댓글 전송 데이터:', payload);

    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setText('');
    fetchComments();
  };

  return (
    /* 구 .modal-overlay (ClosedModal.css 의도: overlay-strong) */
    <div className="fixed top-0 left-0 z-[999] flex h-full w-full items-center justify-center [background:var(--overlay-strong)]">
      {/* 구 .modal-content.letter-style (ClosedModal.css 의도: 편지 카드 480px) */}
      <div className="w-[90%] max-w-[480px] animate-[closed-fade-in-up_0.4s_ease] rounded-[20px] bg-[var(--color-surface)] p-8 text-center [font-family:'Gowun_Dodum',sans-serif] [box-shadow:var(--shadow-md)]">
        {/* 편지 영역 — 구 .title + .modal-content h1 */}
        <h1 className="mb-[-0.5rem] [font-family:'Judson',serif] text-[3rem] font-bold text-[var(--color-text)]">
          Telepathy
        </h1>
        <h2 className="mb-[0.8rem] text-[1.2rem] text-[var(--color-text)]">
          마음이 통하는 연결, 텔레파시
        </h2>
        <p className="mb-6 text-[0.95rem] leading-[1.6] text-[var(--color-text-secondary)]">
          <strong>Telepathy time coming soon</strong>
          <br />
          저녁 8시 ~ 새벽 2시
          <br />
          <br />
          텔레파시는 오직 정해진 시간에만 사용할 수 있습니다.
          <br />
          오늘 밤, 텔레파시가 통하는 친구를 만나보세요.
          <br />
        </p>
        <strong> Telepathy 시작까지 남은 시간</strong>⏳ {remainingTime.hours} :{' '}
        {remainingTime.minutes} : {remainingTime.seconds}
        <br />
        <br />
        {/* 댓글창 — 구 .comments */}
        <div className="mt-6 text-left">
          <h3 className="mb-2 text-base">익명 댓글</h3>
          <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
            <input
              value={text}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 rounded-[8px] p-[0.6rem] [border:1px_solid_var(--color-border)]"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-[8px] border-none bg-[#302864] px-4 py-[0.6rem] text-white [transition:background_0.2s] hover:bg-[#4634a7]"
            >
              작성
            </button>
          </form>
          <ul className="m-0 list-none p-0">
            {comments.slice(0, 3).map((c) => (
              <li key={c.id} className="mb-2 text-[0.9rem]">
                <strong>{c.nickname}</strong>: {c.content}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
