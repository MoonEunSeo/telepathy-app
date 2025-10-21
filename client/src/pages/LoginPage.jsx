import React, { useState, useEffect } from 'react';
import { useModal } from '../contexts/ModalContext';
import ModalPolicy from '../components/ModalPolicy';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { isOpen, setIsOpen } = useModal();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [modalMessage, setModalMessage] = useState('');


  // ✅ 로그인 요청
  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        navigate('/main');
      } else {
        setModalMessage(data.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setModalMessage('서버 오류로 로그인에 실패했습니다.');
    }
  };

  return (
    <>
      {/* ✅ 로그인 페이지 본문 */}
      <div className="login-page">
        <div className="login-container">
          <p className="login-subtitle">
            바로 지금,<br />
            우리는 같은 단어를 떠올렸어요
          </p>
          <h1 className="login-title">로그인</h1>

          <input
            className="auth-input"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="login-button" type="submit" onClick={handleLogin}>
            로그인 하기
          </button>

          <div className="or-divider">or</div>

          {/* 회원가입 */}
          <p className="auth-footer-question">
            계정이 없으신가요?{' '}
            <span className="bold-link" onClick={() => setIsOpen(true)}>
              회원가입
            </span>
          </p>

          {/* 비밀번호 찾기 */}
          <p className="auth-footer-question">
            비밀번호를 잊으셨나요?{' '}
            <span
              className="bold-link"
              onClick={() => navigate('/findpassword')}
            >
              비밀번호 찾기
            </span>
          </p>

          {/* 하단 약관 */}
          <p className="terms-footer">
            By clicking continue,<br />
            you agree to our{' '}
            <span className="bold-link">Terms of Service</span> and{' '}
            <span className="bold-link">Privacy Policy</span>
          </p>

          {isOpen && <ModalPolicy />}

          {modalMessage && (
            <div className="modal-backdrop">
              <div className="modal-content">
                <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px' }}>
                  {modalMessage}
                </p>
                <button
                  className="login-button"
                  onClick={() => setModalMessage('')}
                >
                  확인
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
