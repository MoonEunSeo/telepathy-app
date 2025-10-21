// 📦 src/components/MegaphoneModal.jsx
/*
import React, { useState } from "react";
import "./MegaphoneInputModal.css";

export default function MegaphoneModal({ onClose, onSend, hasMegaphone }) {
  const [message, setMessage] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🔊 확성기</h2>

        {!hasMegaphone ? (
          <>
            <p>확성기가 부족합니다. 충전해주세요.</p>
            <div className="purchase-options">
              <button onClick={() => onSend("megaphone_1")}>1회권</button>
              <button onClick={() => onSend("megaphone_5")}>5회권</button>
              <button onClick={() => onSend("megaphone_10")}>10회권</button>
            </div>
          </>
        ) : (
          <>
            <p>모든 접속자에게 전달할 메시지를 입력하세요. (최대 20자)</p>
            <input
              type="text"
              maxLength={20}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="메시지를 입력하세요"
            />
            <button
              onClick={() => {
                onSend(message);
                setMessage("");
              }}
              disabled={!message.trim()}
            >
              발사 🚀
            </button>
          </>
        )}

        <button className="close-btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}*/

import React, { useState } from "react";

export default function MegaphoneInputModal({ onClose, hasMegaphone, onSend }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message); // 입력된 메시지 전달
  };

  return (
    <div className="megaphone-modal">
        <h2>🔊 확성기</h2>

        {hasMegaphone ? (
          <>
          <p>모든 접속자에게 전달할 메시지를 입력하세요. (최대 20자)</p>
            <textarea
              placeholder="메시지를 입력하세요"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={handleSend}>발사</button>
          </>
        ) : (
          <>
            <p>보유한 확성기가 없습니다. 구매해주세요.</p>
            <div className="purchase-options">
              <button onClick={() => onSend("megaphone_1")}>1개 (₩500)</button>
              <button onClick={() => onSend("megaphone_5")}>5개 (₩2,000)</button>
              <button onClick={() => onSend("megaphone_10")}>10개 (₩3,500)</button>
            </div>
          </>
        )}

        <button className="close-btn" onClick={onClose}>
          닫기
        </button>
      </div>
  );
}
