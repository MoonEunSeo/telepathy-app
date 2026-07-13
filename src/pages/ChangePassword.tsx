import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PasswordChangeResponse } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import Modal from '../components/ui/Modal';

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

    const data = (await res.json()) as PasswordChangeResponse;

    if (data.success) {
      setModalMessage('비밀번호가 변경되었습니다.');
    } else {
      setModalMessage(data.message || '비밀번호 변경 실패');
    }
  };

  return (
    /* 구 .login-container */
    <div className="flex flex-col items-center mt-[100px] halloween:gap-[3px] halloween:w-full">
      {/* 구 .login-title */}
      <h1 className="[font-family:'Gowun_Dodum'] text-[32px] mt-[10px] mb-5 text-[var(--login-title-color)] [text-shadow:var(--login-title-shadow)]">
        비밀번호 변경
      </h1>
      <AuthInput
        type="password"
        placeholder="현재 비밀번호"
        value={currentPassword}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
      />
      <AuthInput
        type="password"
        placeholder="새 비밀번호"
        value={newPassword}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
      />
      <AuthInput
        type="password"
        placeholder="비밀번호 확인"
        value={confirmPassword}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
      />
      <Button onClick={handleChangePassword}>
        변경하기
      </Button>

      {modalMessage && (
        <Modal>
          <p>{modalMessage}</p>
          <Button
            onClick={() => {
              setModalMessage('');
              if (modalMessage.includes('변경되었습니다')) navigate('/main');
            }}
          >
            확인
          </Button>
        </Modal>
      )}
    </div>
  );
}
