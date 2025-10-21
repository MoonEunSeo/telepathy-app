/*import React, { useState } from 'react';
import './NicknameModal.css';

export default function NicknameModal({ onClose, onSave }) {
  const [nickname, setNickname] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const handleInputChange = (e) => {
    const input = e.target.value;
    if (isComposing) {
      setNickname(input);
      return;
    }

    const filtered = input.replace(/[^가-힣0-9]/g, '');
    if (filtered.length <= 20) {
      setNickname(filtered);
    } else {
      setNickname(filtered.slice(0, 20));
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    const input = e.target.value;
    const filtered = input.replace(/[^가-힣0-9]/g, '');
    if (filtered.length <= 20) {
      setNickname(filtered);
    } else {
      setNickname(filtered.slice(0, 20));
    }
  };

  const handleFirstNext = () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    setConfirmStep(true);
  };

  const handleConfirm = () => {
    localStorage.setItem('nickname', nickname);
    onSave(nickname);
  };

  return (
    <div className="nickname-modal-backdrop">
      <div className="nickname-modal-content">
        {!confirmStep ? (
          <>
            <h2 className="nickname-modal-title">닉네임을 입력해주세요</h2>
            <input
              type="text"
              value={nickname}
              onChange={handleInputChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder="닉네임 (최대 20자, 한글+숫자)"
              className="nickname-modal-input"
            />
            <button
              onClick={handleFirstNext}
              className="nickname-modal-primary-btn"
            >
              다음
            </button>
          </>
        ) : (
          <>
            <h2 className="nickname-modal-title">
              당신의 닉네임은 <br />
              <span className="nickname-highlight">{nickname}</span> 입니다.
            </h2>
            <p className="nickname-modal-desc">
              입력하신 닉네임은 <strong>1달간 유지</strong>돼요!<br />
              이 닉네임으로 진행할까요?
            </p>
            <button
              onClick={handleConfirm}
              className="nickname-modal-primary-btn"
            >
              네, 이 닉네임으로 할게요
            </button>
            <br />
            <button
              onClick={() => setConfirmStep(false)}
              className="nickname-modal-secondary-btn"
            >
              다시 입력할게요
            </button>
          </>
        )}
      </div>
    </div>
  );
}
*/

import React, { useState } from 'react';

export default function NicknameModal({ onClose, onSave }) {
  const [nickname, setNickname] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);

  const handleInputChange = (e) => {
    setNickname(e.target.value); // ✅ 필터링 없이 그대로
  };

  const handleCompositionEnd = (e) => {
    const input = e.target.value;
    const filtered = input.replace(/[^가-힣a-zA-Z0-9]/g, ''); // ✅ 한글, 영어, 숫자 허용
    setNickname(filtered.slice(0, 20));
  };

  const handleFirstNext = () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    setConfirmStep(true);
  };

  const handleConfirm = () => {
    localStorage.setItem('nickname', nickname);
    onSave(nickname);
  };

  return (
    <div className="nickname-modal-backdrop">
      <div className="nickname-modal-content">
        {!confirmStep ? (
          <>
            <h2 className="nickname-modal-title">닉네임을 입력해주세요</h2>
            <input
              type="text"
              value={nickname}
              onChange={handleInputChange}
              onCompositionEnd={handleCompositionEnd}
              placeholder="닉네임 (최대 20자, 한글/영문/숫자)"
              className="nickname-modal-input"
            />
            <button
              onClick={handleFirstNext}
              className="nickname-modal-primary-btn"
            >
              다음
            </button>
          </>
        ) : (
          <>
            <h2 className="nickname-modal-title">
              당신의 닉네임은 <br />
              <span className="nickname-highlight">{nickname}</span> 입니다.
            </h2>
            <p className="nickname-modal-desc">
              입력하신 닉네임은 <strong>1달간 유지</strong>돼요!<br />
              이 닉네임으로 진행할까요?
            </p>
            <button
              onClick={handleConfirm}
              className="nickname-modal-primary-btn"
            >
              네, 이 닉네임으로 할게요
            </button>
            <br />
            <button
              onClick={() => setConfirmStep(false)}
              className="nickname-modal-secondary-btn"
            >
              다시 입력할게요
            </button>
          </>
        )}
      </div>
    </div>
  );
}