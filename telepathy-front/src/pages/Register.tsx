import { useState } from 'react';
import type { ChangeEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import type { CheckUsernameResponse } from '../types';
import { setStorage } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import Modal from '../components/ui/Modal';
import TextLink from '../components/ui/TextLink';

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
      setModalMessage(
        '비밀번호는 8자 이상이며, 영문/숫자/특수문자 중 2가지 이상을 포함해야 합니다.',
      );
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
          회원가입
        </h1>

        {/* 구 .id-check-row — 아이디 입력(flex) + 중복검사(사각 보조) 같은 높이 정렬 */}
        <div className="mb-[10px] flex w-[300px] items-center gap-[10px]">
          <AuthInput
            className="min-w-0 flex-1"
            placeholder="아이디"
            value={username}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          />
          <Button variant="check" onClick={checkUsername}>
            중복검사
          </Button>
        </div>

        {isAvailable !== null && (
          /* 구 .result-message (.error) */
          <p
            className={`mt-[6px] mb-[10px] w-[300px] p-0 text-left text-[14px] ${isAvailable ? 'text-[var(--color-link)]' : 'text-[var(--color-danger)]'}`}
          >
            {isAvailable ? '이 아이디는 사용 가능합니다.' : '이미 사용 중인 아이디입니다.'}
          </p>
        )}

        <AuthInput
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />

        <Button className="mt-4" onClick={handleRegister}>
          가입하기
        </Button>

        {/* 구 .terms-footer (인라인 #888 → --color-text-muted 토큰) */}
        <p className="halloween:absolute halloween:bottom-[10px] halloween:left-1/2 halloween:-translate-x-1/2 halloween:text-[13px] halloween:leading-[1.4] halloween:w-full halloween:opacity-90 mt-[60px] text-center text-[14px] text-[var(--color-text-muted)]">
          By clicking continue,
          <br />
          you agree to our <TextLink>Terms of Service</TextLink> and{' '}
          <TextLink>Privacy Policy</TextLink>
        </p>

        {showModal && (
          <Modal>
            <p className="[font-family:'Gowun_Dodum'] text-[16px]">{modalMessage}</p>
            <Button className="mt-4" onClick={() => setShowModal(false)}>
              확인
            </Button>
          </Modal>
        )}
      </div>
    </div>
  );
}
