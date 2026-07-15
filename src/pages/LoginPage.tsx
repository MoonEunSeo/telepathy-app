import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useModal } from '../contexts/ModalContext';
import ModalPolicy from '../components/ModalPolicy';
import { useNavigate } from 'react-router-dom';
import type { LoginResponse } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import Modal from '../components/ui/Modal';
import TextLink from '../components/ui/TextLink';

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
        credentials: 'include',
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
      {/* ✅ 로그인 페이지 본문 (구 .login-page — 스타일 없던 빈 래퍼) */}
      <div>
        {/* 구 .login-container — 리디자인: 세로 중앙 정렬 */}
        <div className="halloween:gap-[3px] halloween:w-full flex min-h-[100dvh] flex-col items-center justify-center py-10">
          {/* 구 .login-subtitle — 감성 리드카피 */}
          <p className="text-center [font-family:'Gowun_Batang'] text-[18px] text-[var(--auth-lead-color)]">
            바로 지금,
            <br />
            우리는 같은 단어를 떠올렸어요
          </p>
          {/* 구 .login-title — 세리프 */}
          <h1 className="mt-[10px] mb-6 [font-family:'Judson',serif] text-[34px] font-bold text-[var(--login-title-color)] [text-shadow:var(--login-title-shadow)] min-[1025px]:text-[38px]">
            로그인
          </h1>

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

          {/* 구 .or-divider — 좌우 선은 ::before/::after 유틸(before:/after:)로 이관 */}
          <div className="relative my-6 flex h-5 w-full items-center justify-center text-center text-[14px] text-[var(--or-divider-color)] before:mx-3 before:block before:h-px before:max-w-[200px] before:flex-1 before:bg-[var(--color-border)] before:content-[''] after:mx-3 after:block after:h-px after:max-w-[200px] after:flex-1 after:bg-[var(--color-border)] after:content-['']">
            or
          </div>

          {/* 회원가입 — 구 .auth-footer-question */}
          <p className="mt-[10px] text-[14px] text-[var(--auth-footer-color)]">
            계정이 없으신가요? <TextLink onClick={() => navigate('/register')}>회원가입</TextLink>
          </p>

          {/* 비밀번호 찾기 — 구 .auth-footer-question */}
          <p className="mt-[10px] text-[14px] text-[var(--auth-footer-color)]">
            비밀번호를 잊으셨나요?{' '}
            <TextLink onClick={() => navigate('/findpassword')}>비밀번호 찾기</TextLink>
          </p>

          {/* 하단 약관 — 구 .terms-footer */}
          <p className="halloween:absolute halloween:bottom-[10px] halloween:left-1/2 halloween:-translate-x-1/2 halloween:text-[13px] halloween:leading-[1.4] halloween:w-full halloween:opacity-90 mt-[60px] text-center text-[14px] text-[var(--color-text-muted)]">
            By clicking continue,
            <br />
            you agree to our <TextLink>Terms of Service</TextLink> and{' '}
            <TextLink>Privacy Policy</TextLink>
          </p>

          {isOpen && <ModalPolicy />}

          {modalMessage && (
            <Modal>
              <p className="[font-family:'Gowun_Dodum'] text-[16px]">{modalMessage}</p>
              <Button onClick={() => setModalMessage('')}>확인</Button>
            </Modal>
          )}
        </div>
      </div>
    </>
  );
}
