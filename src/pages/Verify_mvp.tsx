import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStorage, setStorage } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import Modal from '../components/ui/Modal';
import type {
  VerifyMvpSendResponse,
  VerifyMvpCheckResponse,
  RegisterResponse,
  ProfileResponse,
} from '../types';

export default function Verify_mvp() {
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(180);
  const [timerActive, setTimerActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timerActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timerActive, timeLeft]);

  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatBirthdate = (yyyymmdd: string) => {
    const yyyy = yyyymmdd.slice(0, 4);
    const mm = yyyymmdd.slice(4, 6);
    const dd = yyyymmdd.slice(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  };

  const showError = (message: string) => {
    setModalMessage(message);
    setShowModal(true);
  };

  const handleSendCode = async () => {
    if (!phone) return showError('전화번호를 입력해주세요.');
    try {
      const res = await fetch('/api/verify-mvp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as VerifyMvpSendResponse;
      if (data.success) {
        setCodeSent(true);
        setTimeLeft(180);
        setTimerActive(true);
      } else {
        showError(data.message || '인증번호 전송에 실패했습니다.');
      }
    } catch {
      showError('서버 요청 중 오류가 발생했습니다.');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) return showError('인증번호를 입력해주세요.');

    try {
      const res = await fetch('/api/verify-mvp/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: verificationCode }),
      });
      const data = (await res.json()) as VerifyMvpCheckResponse;

      if (!data.success) {
        showError(data.message || '인증번호가 올바르지 않습니다.');
        return;
      }

      // 인증 성공 → 회원가입 API 호출
      const username = getStorage('username');
      const password = getStorage('password');
      const registerRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          phone,
          gender,
          birthdate: formatBirthdate(birthdate),
        }),
      });
      const registerData = (await registerRes.json()) as RegisterResponse;

      if (registerData.success) {
        // JWT 발급 후 닉네임 확인
        try {
          const profileRes = await fetch('/api/nickname/profile', { credentials: 'include' });
          const profileData = (await profileRes.json()) as ProfileResponse;
          if (profileData.success && !profileData.nickname) {
            setStorage('needNicknameSetup', 'true');
          }
        } catch (err) {
          console.error('닉네임 확인 실패:', err);
        }

        navigate('/main');
      } else {
        showError(registerData.message || '회원가입에 실패했습니다.');
      }
    } catch {
      showError('서버 오류로 인증에 실패했습니다.');
    }
  };

  return (
    <div data-page="verify-mvp">
      {/* 🎃 할로윈 모드용 페이지 식별자 */}
    <div className="login-container">
      <h2 className="login-title">본인인증</h2>

      {/* 생년월일 + 성별 입력 */}
      <div style={{ display: 'flex', width: '100%', maxWidth: '350px', gap: '8px', marginBottom: '12px' }}>
        <AuthInput
          variant="birth"
          placeholder="생년월일 8자리"
          maxLength={8}
          value={birthdate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBirthdate(e.target.value.replace(/\D/g, ''))}
          style={{ flex: 3 }}
        />
        <button
          className={`toggle-button ${gender === '남성' ? 'active' : ''}`}
          onClick={() => setGender('남성')}
          style={{ flex: 1 }}
        >
          남성
        </button>
        <button
          className={`toggle-button ${gender === '여성' ? 'active' : ''}`}
          onClick={() => setGender('여성')}
          style={{ flex: 1 }}
        >
          여성
        </button>
      </div>

      {gender && birthdate.length === 8 && (
        <>
          <AuthInput
            placeholder="전화번호를 입력하세요"
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          />

          {!codeSent ? (
            <Button onClick={handleSendCode}>
              본인인증하기
            </Button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <AuthInput
                    variant="verify"
                    placeholder="인증번호 6자리"
                    value={verificationCode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
                    style={{ width: '100%', height: '45px', paddingRight: '60px' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-75%)',
                      color: '#999',
                      fontSize: '14px',
                    }}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>

                <Button variant="check" style={{ height: '45px', flexShrink: 0 }} onClick={handleSendCode}>
                  재생성
                </Button>
              </div>

              <Button style={{ marginTop: '16px' }} onClick={handleVerifyCode}>
                본인인증하기
              </Button>
            </>
          )}
        </>
      )}

      {showModal && (
        <Modal>
          <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px' }}>{modalMessage}</p>
          <Button onClick={() => setShowModal(false)}>확인</Button>
        </Modal>
      )}
   </div></div>
  );
}
