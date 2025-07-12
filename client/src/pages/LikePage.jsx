/*import React from 'react';
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

      <p className="like-account">계좌 : 100-121-028199 (케이뱅크)</p>

      <button className="like-button">광고 보기</button>
    </div>
  );
}
*/

import React, { useEffect } from 'react';
import './LikePage.css';

export default function LikePage() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense 로딩 에러:', e);
    }
  }, []);

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

      <p className="like-account">계좌 : 100-121-028199 (케이뱅크)</p> 

      {/* 👉 광고 삽입 */}
      <ins className="adsbygoogle"
           style={{ display: 'block', margin: '20px 0' }}
           data-ad-client="ca-pub-9633518507670143"
           data-ad-slot="1490398761"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
}