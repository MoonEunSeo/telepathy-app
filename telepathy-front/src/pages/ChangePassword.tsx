import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type { PasswordChangeResponse } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import Modal from '../components/ui/Modal';
import FieldMessage from '../components/ui/FieldMessage';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePassword() {
  const [modalMessage, setModalMessage] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ mode: 'onBlur' });

  // handleSubmit이 검증을 통과시킨 뒤에만 호출한다 -> 여기선 값 검사 불필요
  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordForm) => {
    try {
      const res = await fetch('/api/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 로그인된 사용자
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as PasswordChangeResponse;
      setModalMessage(
        data.success ? '비밀번호가 변경되었습니다.' : data.message || '비밀번호 변경 실패',
      );
    } catch {
      setModalMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    /* 구 .login-container */
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="halloween:gap-[3px] halloween:w-full flex min-h-[100dvh] flex-col items-center justify-center py-10"
    >
      {/* 구 .login-title — 세리프 */}
      <h1 className="mt-[10px] mb-6 [font-family:'Judson',serif] text-[34px] font-bold text-[var(--login-title-color)] [text-shadow:var(--login-title-shadow)] min-[1025px]:text-[38px]">
        비밀번호 변경
      </h1>

      <AuthInput
        type="password"
        autoComplete="current-password"
        placeholder="현재 비밀번호"
        {...register('currentPassword', { required: '현재 비밀번호를 입력해주세요.' })}
      />
      <FieldMessage message={errors.currentPassword?.message} />

      <AuthInput
        type="password"
        autoComplete="new-password"
        placeholder="새 비밀번호"
        {...register('newPassword', {
          required: '새 비밀번호를 입력해주세요.',
          minLength: { value: 6, message: '비밀번호는 6자 이상이어야 합니다.' },
        })}
      />
      <FieldMessage message={errors.newPassword?.message} />

      <AuthInput
        type="password"
        autoComplete="new-password"
        placeholder="비밀번호 확인"
        {...register('confirmPassword', {
          required: '비밀번호를 한 번 더 입력해주세요.',
          // 두 번째 인자로 폼 전체 값이 들어온다 -> watch 없이 교차 검증 가능
          validate: (value, values) =>
            value === values.newPassword || '비밀번호가 일치하지 않습니다.',
        })}
      />
      <FieldMessage message={errors.confirmPassword?.message} />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '변경 중...' : '변경하기'}
      </Button>

      {modalMessage && (
        <Modal>
          <p>{modalMessage}</p>
          <Button
            type="button"
            onClick={() => {
              setModalMessage('');
              if (modalMessage.includes('변경되었습니다')) navigate('/main');
            }}
          >
            확인
          </Button>
        </Modal>
      )}
    </form>
  );
}
