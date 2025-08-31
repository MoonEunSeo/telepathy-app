import React, { useEffect, useState } from 'react';
import './ClosedModal.css';

// 👉 유저 수 상태 컴포넌트
function UserStatus() {
  const [userCount, setUserCount] = useState(0);
  const MAX_USERS = 1500;

  const fetchUserCount = async () => {
    const res = await fetch('/api/users/count');
    const data = await res.json();
    setUserCount(data.userCount);
  };

  useEffect(() => {
    fetchUserCount();
    const interval = setInterval(fetchUserCount, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="user-status">
      <p>현재 유저수: {userCount} / {MAX_USERS}</p>
      <div className="progress-bar">
        <div
          className="progress"
          style={{ width: `${(userCount / MAX_USERS) * 100}%` }}
        />
      </div>
    </div>
  );
}

// 👉 메인 모달
export default function ClosedModal({ onClose, username, nickname }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  // 댓글 불러오기
  const fetchComments = async () => {
    const res = await fetch('/api/comments');
    const data = await res.json();
    setComments(data);
  };

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 10000);
    return () => clearInterval(interval);
  }, []);

  // 댓글 작성
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const payload = {
      username: username || 'guest_user', // ✅ fallback
      nickname: nickname || null,         // 서버에서 랜덤 닉네임 부여
      content: text,
    };

    console.log("🚀 댓글 전송 데이터:", payload);

    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setText('');
    fetchComments();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content letter-style">
        {/* 편지 영역 */}
        <h2>📩 텔레파시 드림</h2>
        <p>
          정말 너무 죄송합니다.<br/>
          현재 유저 수가 적어 매칭이 원활하지 않습니다.<br/>
          <strong>저녁 8시 ~ 새벽 2시</strong>에만 접속이 가능하도록 운영 중이에요.<br/>
          8시에 와주시면 정말 감사하겠습니다.<br/>
          유저가 많아지면 24시간 개방하겠습니다.<br/><br/>
          사용자와 함께 성장하는 텔레파시가 되겠습니다.<br/>
          (구구절절… 진짜 열심히 만들었는데… 사람이 너무 없어서…<br/>
          너무 슬퍼요 ㅠㅠ 흑흑…)
        </p>

        {/* ✅ 유저 수 현황 컴포넌트 */}
        <UserStatus />

        {/* 댓글창 */}
        <div className="comments">
          <h3>익명 댓글</h3>
          <form onSubmit={handleSubmit}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
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

        <button className="close-btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
