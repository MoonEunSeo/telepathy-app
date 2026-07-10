import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PasswordCheckUserResponse, PasswordResetResponse } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import Modal from '../components/ui/Modal';

export default function FindPassword() {
  const [step, setStep] = useState<number>(1); // 1: 아이디 입력, 2: 실패, 3: 재설정, 4: 완료
  const [username, setUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const navigate = useNavigate();

  const handleIdCheck = async () => {
    const res = await fetch('/api/password/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = (await res.json()) as PasswordCheckUserResponse;
    setStep(data.exists ? 3 : 2);
  };

  const handlePasswordReset = async () => {
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      setModalMessage('비밀번호를 다시 확인해주세요.');
      return;
    }

    const res = await fetch('/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: newPassword }),
    });

    const data = (await res.json()) as PasswordResetResponse;
    if (data.success) setStep(4);
    else setModalMessage(data.message || '비밀번호 재설정에 실패했습니다.');
  };

  return (
    <div className="login-container">
      {step === 1 && (
        <>
          <p className="login-subtitle">다시 연결될 수 있도록<br />도와드릴게요 :)</p>
          <h1 className="login-title">비밀번호 찾기</h1>
          <AuthInput placeholder="아이디" value={username} onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} />
          <Button onClick={handleIdCheck}>확인</Button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="login-subtitle">앗, 해당 아이디로<br />연결된 기록이 없어요... ;(</p>
          <h1 className="login-title">비밀번호 찾기</h1>
                <AuthInput
                placeholder="아이디"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => navigate(-1)}>돌아가기</Button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={handleIdCheck}>재확인</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="login-subtitle">다시 연결될 수 있도록<br />도와드릴게요 :)</p>
          <h1 className="login-title">비밀번호 재설정</h1>
          <AuthInput placeholder="새 비밀번호" type="password" value={newPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} />
          <AuthInput placeholder="비밀번호 확인" type="password" value={confirmPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} />
          <Button onClick={handlePasswordReset}>확인</Button>
        </>
      )}

      {step === 4 && (
        <>
          <h1 className="login-title" style={{ marginTop: '80px' }}>Telepathy</h1>
          <p style={{ textAlign: 'center', marginTop: '24px' }}>비밀번호가 재설정 되었습니다.</p>
          <Button style={{ marginTop: '24px' }} onClick={() => navigate('/login')}>로그인 하기</Button>
        </>
      )}

      {modalMessage && (
        <Modal>
          <p>{modalMessage}</p>
          <Button onClick={() => setModalMessage('')}>확인</Button>
        </Modal>
      )}
    </div>
  );
}
