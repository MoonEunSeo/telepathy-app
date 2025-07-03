import React from 'react';
import './LikePage.css';

export default function LikePage() {
  return (
    <div className="like-container">
      <h1 className="like-title">
        <span style={{ color: '#d18f92' }}>Tele</span>
        <span style={{ color: '#3a3020' }}>pathy</span>
      </h1>

      <p className="like-description">
        텔레파시는 오직<br />
        개인 서버비만으로 운영되고 있어요.
      </p>
      <p className="like-description">
        텔레파시의 서비스가 마음에 드셨다면<br />
        아래의 계좌로 후원해주세요
      </p>

      <p className="like-account">계좌 : 021944-2949923-20 (힘듦은행)</p>

      <button className="like-button">광고 보기</button>
    </div>
  );
}
