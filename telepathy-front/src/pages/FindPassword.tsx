import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type { PasswordCheckUserResponse, PasswordResetResponse } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import FieldError from '../components/ui/FieldError';

interface IdForm {
  username: string;
}
interface ResetForm {
  newPassword: string;
  confirmPassword: string;
}

// 인증 페이지 공통 텍스트(구 .login-subtitle / .login-title) — 이 파일에서 3~4회 반복되어 상수화.
// title 은 상단 여백을 제외(사용처마다 mt-* 로 지정 → 충돌 없음)
const subtitle =
  "[font-family:'Gowun_Batang'] text-[18px] text-center text-[var(--auth-lead-color)]";
const title =
  "[font-family:'Judson',serif] text-[34px] min-[1025px]:text-[38px] font-bold mb-6 text-[var(--login-title-color)] [text-shadow:var(--login-title-shadow)]";

export default function FindPassword() {
  const [step, setStep] = useState<number>(1); // 1: 아이디 입력, 2: 실패, 3: 재설정, 4: 완료
  // 폼 A를 통과해 "존재가 확인된" 아이디 -> 폼 B 제출에 필요하다.
  const [confirmedUsername, setConfirmedUsername] = useState<string>('');
  const navigate = useNavigate();

  // 폼 A: 아이디 확인
  const idForm = useForm<IdForm>({ defaultValues: { username: '' } });

  // 폼 B: 비밀번호 재설정
  const resetForm = useForm<ResetForm>({
    mode: 'onBlur',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onCheckId = async ({ username }: IdForm) => {
    try {
      const res = await fetch('/api/password/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = (await res.json()) as PasswordCheckUserResponse;

      if (data.exists) {
        setConfirmedUsername(username); // 확정된 아이디를 폼 B로 넘긴다.
        setStep(3);
      } else {
        setStep(2);
      }
    } catch {
      idForm.setError('root', { message: '서버와의 연결에 실패했습니다.' });
    }
  };

  const onResetPassword = async ({ newPassword }: ResetForm) => {
    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: confirmedUsername, password: newPassword }),
      });
      const data = (await res.json()) as PasswordResetResponse;

      if (data.success) setStep(4);
      else
        resetForm.setError('root', { message: data.message || '비밀번호 재설정에 실패했습니다.' });
    } catch {
      resetForm.setError('root', { message: '서버와의 연결에 실패했습니다.' });
    }
  };

  // step 1 2는 안내문만 다르고 입력 UI가 같다 -> 한 함수로 묶는다.
  const renderIdStep = (lead: React.ReactNode, showBack: boolean) => (
    <>
      <p className={subtitle}>{lead}</p>
      <h1 className={`${title} mt-[10px]`}>비밀번호 찾기</h1>
      <form onSubmit={idForm.handleSubmit(onCheckId)} className="flex flex-col items-center">
        <AuthInput
          placeholder="아이디"
          autoComplete="username"
          {...idForm.register('username', { required: '아이디를 입력해주세요.' })}
        />
        <FieldError message={idForm.formState.errors.username?.message} />
        <FieldError message={idForm.formState.errors.root?.message} />

        {showBack && (
          <div className="flex gap-[8px]">
            <Button type="button" onClick={() => navigate(-1)}>
              돌아가기
            </Button>
          </div>
        )}
        <div className="flex gap-[8px]">
          <Button type="submit" disabled={idForm.formState.isSubmitting}>
            {showBack ? '재확인' : '확인'}
          </Button>
        </div>
      </form>
    </>
  );

  return (
    /* 구 .login-container — 리디자인: 세로 중앙 정렬 */
    <div className="halloween:gap-[3px] halloween:w-full flex min-h-[100dvh] flex-col items-center justify-center py-10">
      {step === 1 &&
        renderIdStep(
          <>
            다시 연결될 수 있도록
            <br />
            도와드릴게요 :)
          </>,
          false,
        )}

      {step === 2 &&
        renderIdStep(
          <>
            앗, 해당 아이디로
            <br />
            연결된 기록이 없어요... ;(
          </>,
          true,
        )}

      {step === 3 && (
        <>
          <p className={subtitle}>
            다시 연결될 수 있도록
            <br />
            도와드릴게요 :)
          </p>
          <h1 className={`${title} mt-[10px]`}>비밀번호 재설정</h1>
          <form
            onSubmit={resetForm.handleSubmit(onResetPassword)}
            className="flex flex-col items-center"
          >
            <AuthInput
              placeholder="새 비밀번호"
              type="password"
              autoComplete="new-password"
              {...resetForm.register('newPassword', {
                required: '새 비밀번호를 입력해주세요.',
                minLength: { value: 6, message: '비밀번호는 6자 이상이어야 합니다.' },
              })}
            />
            <FieldError message={resetForm.formState.errors.newPassword?.message} />

            <AuthInput
              placeholder="비밀번호 확인"
              type="password"
              autoComplete="new-password"
              {...resetForm.register('confirmPassword', {
                required: '비밀번호를 한 번 더 입력해주세요.',
                validate: (value, values) =>
                  value === values.newPassword || '비밀번호가 일치하지 않습니다.',
              })}
            />
            <FieldError message={resetForm.formState.errors.confirmPassword?.message} />
            <FieldError message={resetForm.formState.errors.root?.message} />

            <Button type="submit" disabled={resetForm.formState.isSubmitting}>
              확인
            </Button>
          </form>
        </>
      )}

      {step === 4 && (
        <>
          <h1 className={`${title} mt-[80px]`}>Telepathy</h1>
          <p className="mt-6 text-center">비밀번호가 재설정 되었습니다.</p>
          <Button className="mt-6" onClick={() => navigate('/login')}>
            로그인 하기
          </Button>
        </>
      )}
    </div>
  );
}
