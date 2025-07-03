import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const navigate = useNavigate();

  const handleChangePassword = async () => {
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      setModalMessage('새 비밀번호를 다시 확인해주세요.');
      return;
    }

    const res = await fetch('/api/password/change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // 로그인된 사용자
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();

    if (data.success) {
      setModalMessage('비밀번호가 변경되었습니다.');
    } else {
      setModalMessage(data.message || '비밀번호 변경 실패');
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">비밀번호 변경</h1>
      <input
        className="auth-input"
        type="password"
        placeholder="현재 비밀번호"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <input
        className="auth-input"
        type="password"
        placeholder="새 비밀번호"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <input
        className="auth-input"
        type="password"
        placeholder="비밀번호 확인"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <button className="login-button" onClick={handleChangePassword}>
        변경하기
      </button>

      {modalMessage && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <p>{modalMessage}</p>
            <button
              className="login-button"
              onClick={() => {
                setModalMessage('');
                if (modalMessage.includes('변경되었습니다')) navigate('/main');
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
