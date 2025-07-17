import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function IntentToggle() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // ✅ 버튼 클릭 이벤트
  const handleSpecialConnect = () => {
    navigate('/game-room'); // 생각의 그물 게임 페이지
  };

  const handleLightConnect = () => {
    setShowModal(true);
  };

  const startLightConnection = async () => {
    try {
      const res = await fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent: 'light_connection' }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        navigate(`/chat/${data.roomId}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="intent-toggle-wrapper">
      {/* ✅ 색다른 방식 버튼 */}
      <button
        className="intent-button"
        style={{ backgroundColor: '#ffe6e6' }}
        onClick={handleSpecialConnect}
      >
        색다른 방식으로 연결되고 싶어요
      </button>

      {/* ✅ 가볍게 연결 버튼 */}
      <button
        className="intent-button"
        style={{ backgroundColor: '#e4f1ff' }}
        onClick={handleLightConnect}
      >
        가볍게 연결되고 싶어요
      </button>

      {/* ✅ 팝업 모달 */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <p style={{ marginBottom: '20px', fontSize: '16px' }}>
              자유로운 소통이 가능하지만
              로그는 저장되지 않습니다.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                className="agree-button"
                onClick={startLightConnection}
                style={{ marginRight: '10px' }}
              >
                확인
              </button>
              <button
                className="next-button"
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}