import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useModal } from '../contexts/ModalContext';
import ModalPolicy from '../components/ModalPolicy';
import { useNavigate } from 'react-router-dom';
import type { LoginResponse } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import Modal from '../components/ui/Modal';

export default function LoginPage() {
  const { isOpen } = useModal();
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

      const data = (await res.json()) as LoginResponse;

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

          <AuthInput
            placeholder="아이디"
            value={username}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          />
          <AuthInput
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
          <Button type="submit" onClick={handleLogin}>
            로그인 하기
          </Button>

          <div className="or-divider">or</div>

          {/* 회원가입 */}
          <p className="auth-footer-question">
            계정이 없으신가요?{' '}
            <span className="bold-link" onClick={() => navigate('/register')}>
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
            <Modal>
              <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px' }}>
                {modalMessage}
              </p>
              <Button onClick={() => setModalMessage('')}>
                확인
              </Button>
            </Modal>
          )}
        </div>
      </div>
    </>
  );
}
