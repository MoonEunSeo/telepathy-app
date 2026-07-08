import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Comment, CommentsResponse, CommentCreateRequest } from "../types";

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
  const [text, setText] = useState("");

  const [remainingTime, setRemainingTime] = useState<RemainingTime>(getRemainingTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(getRemainingTime());
    }, 1000); // 1초마다 갱신
    return () => clearInterval(interval);
  }, []);

  // 댓글 불러오기
  const fetchComments = async () => {
    const res = await fetch("/api/comments");
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
      username: username || "guest_user", // ✅ fallback
      nickname: nickname || null, // 서버에서 랜덤 닉네임 부여
      content: text,
    };

    console.log("🚀 댓글 전송 데이터:", payload);

    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setText("");
    fetchComments();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content letter-style">
        {/* 편지 영역 */}
        <h1 className="title">Telepathy</h1>
        <h2>마음이 통하는 연결, 텔레파시</h2>
        <p>
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

        <strong> Telepathy 시작까지 남은 시간</strong>⏳ {remainingTime.hours} :{" "}
        {remainingTime.minutes} : {remainingTime.seconds}
        <br />
        <br />

        {/* 댓글창 */}
        <div className="comments">
          <h3>익명 댓글</h3>
          <form onSubmit={handleSubmit}>
            <input
              value={text}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
              placeholder="댓글을 입력하세요..."
            />
            <button type="submit">작성</button>
          </form>
          <ul>
            {comments.slice(0, 3).map((c) => (
              <li key={c.id}>
                <strong>{c.nickname}</strong>: {c.content}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
