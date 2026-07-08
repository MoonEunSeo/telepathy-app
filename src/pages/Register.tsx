import { useState } from 'react';
import type { ChangeEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import type { CheckUsernameResponse } from '../types';
import { setStorage } from '../types';

export default function Register() {
  const [username, setUsername] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const navigate = useNavigate();

  // ✅ 중복검사
  const checkUsername = async () => {
    if (!username) {
      setModalMessage('아이디를 입력해주세요.');
      setShowModal(true);
      return;
    }

    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = (await response.json()) as CheckUsernameResponse;

      if (data.success) {
        setIsAvailable(data.isAvailable);
        if (data.isAvailable) {
          setModalMessage('사용 가능한 아이디입니다.');
        } else {
          setModalMessage('이미 사용 중인 아이디입니다.');
        }
        setShowModal(true);
      } else {
        throw new Error(data.message || '중복 확인 실패');
      }
    } catch (error) {
      console.error('❌ 중복검사 오류:', error);
      setModalMessage('서버와의 연결에 실패했습니다.');
      setShowModal(true);
    }
  };

  // ✅ 비밀번호 유효성 검사
  const validatePassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const comboCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
    return hasMinLength && comboCount >= 2;
  };

  // ✅ 가입버튼 클릭
  const handleRegister = () => {
    if (!username || !password) {
      setModalMessage('모든 정보를 입력해주세요.');
      setShowModal(true);
      return;
    }

    if (!validatePassword(password)) {
      setModalMessage('비밀번호는 8자 이상이며, 영문/숫자/특수문자 중 2가지 이상을 포함해야 합니다.');
      setShowModal(true);
      return;
    }

    if (isAvailable !== true) {
      setModalMessage('아이디 중복 검사를 완료해주세요.');
      setShowModal(true);
      return;
    }

    // 로컬스토리지에 아이디/패스워드 저장 후 본인인증으로 이동
    setStorage('username', username);
    setStorage('password', password);
    navigate('/verify-mvp');
  };

  return (
    <div data-page="register">
      {/* 🎃 할로윈 모드용 페이지 식별자 */}
    <div className="login-container">
      <p className="login-subtitle">바로 지금,<br />우리는 같은 단어를 떠올렸어요</p>
      <h1 className="login-title">회원가입</h1>

      <div className="id-check-row">
        <input
          className="auth-input"
          placeholder="아이디"
          value={username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
        />
        <button className="check-button" onClick={checkUsername}>중복검사</button>
      </div>

      {isAvailable !== null && (
        <p className={`result-message ${isAvailable ? '' : 'error'}`}>
          {isAvailable ? '이 아이디는 사용 가능합니다.' : '이미 사용 중인 아이디입니다.'}
        </p>
      )}

      <input
        className="auth-input"
        placeholder="비밀번호"
        type="password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
      />

      <button className="login-button" style={{ marginTop: '16px' }} onClick={handleRegister}>
        가입하기
      </button>

      <p style={{ marginTop: '60px', fontSize: '14px', color: '#888', textAlign: 'center' }}>
        By clicking continue,<br />
        you agree to our <span className="bold-link">Terms of Service</span> and <span className="bold-link">Privacy Policy</span>
      </p>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px' }}>{modalMessage}</p>
            <button className="login-button" style={{ marginTop: '16px' }} onClick={() => setShowModal(false)}>확인</button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
