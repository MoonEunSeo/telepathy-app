import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import ModalPolicy from '../components/ModalPolicy';
import { useNavigate } from 'react-router-dom';
import { authCheckKey } from '../hooks/useAuthCheck';
import type { LoginResponse } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import FieldMessage from '../components/ui/FieldMessage';
import TextLink from '../components/ui/TextLink';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { isOpen } = useModal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    mode: 'onSubmit',
    defaultValues: { username: '', password: '' },
  });

  // ✅ 로그인 요청
  const onSubmit = async ({ username, password }: LoginForm) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = (await res.json()) as LoginResponse;

      if (data.success) {
        // 로그인으로 인증 상태 변경 → 캐시 무효화 후 이동
        queryClient.invalidateQueries({ queryKey: authCheckKey });
        navigate('/');
      } else {
        // 어느 필드 잘못인지 서버가 특정해주지 않으므로 폼 전체 (root) 에러
        setError('root', { message: data.message || '로그인에 실패했습니다.' });
      }
    } catch {
      setError('root', { message: '서버 오류로 로그인에 실패했습니다.' });
    }
  };

  return (
    <>
      <div>
        <div className="halloween:gap-[3px] halloween:w-full flex min-h-[calc(100dvh-72px)] flex-col items-center justify-start pt-[10vh] pb-24">
          {/* 구 .login-subtitle — 감성 리드카피 */}
          <p className="text-center [font-family:'Gowun_Batang'] text-[18px] text-[var(--auth-lead-color)]">
            바로 지금,
            <br />
            우리는 같은 단어를 떠올렸어요
          </p>
          {/* 구 .login-title — 세리프 */}
          <h1 className="mt-[10px] mb-6 [font-family:'Judson','Gowun_Dodum',serif] text-[34px] font-bold text-[var(--login-title-color)] [text-shadow:var(--login-title-shadow)] min-[1025px]:text-[38px]">
            로그인
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center">
            {/* 입력 영역 고정 높이(입력 2행 = 128px) — 폼 간 제출 버튼 위치 통일 */}
            <div className="flex min-h-[128px] w-full flex-col items-center">
              <AuthInput
                placeholder="아이디"
                autoComplete="username"
                {...register('username', { required: '아이디를 입력해주세요.' })}
              />
              <FieldMessage message={errors.username?.message} />
              {/* 서버가 돌려준 실패 사유 - 다음 제출 때 RHF가 자동으로 지운다 */}
              <AuthInput
                type="password"
                placeholder="비밀번호"
                autoComplete="current-password"
                {...register('password', { required: '비밀번호를 입력해주세요.' })}
              />
              <FieldMessage message={errors.password?.message} />
              <FieldMessage message={errors.root?.message} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중...' : '로그인 하기'}
            </Button>
          </form>

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
        </div>
      </div>
    </>
  );
}
