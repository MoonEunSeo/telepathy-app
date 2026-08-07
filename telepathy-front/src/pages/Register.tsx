import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type { CheckUsernameResponse } from '../types';
import { setStorage } from '../types';
import Button from '../components/ui/Button';
import AuthInput from '../components/ui/AuthInput';
import TextLink from '../components/ui/TextLink';
import FieldMessage from '../components/ui/FieldMessage';
import { validatePassword } from '../utils/validatePassword';

interface RegisterForm {
  username: string;
  password: string;
}

export default function Register() {
  // 중복 검사 결과는 폼 값이 아니라 "서버에 물어본 결과" -> state로 남는다.
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    mode: 'onBlur',
    defaultValues: { username: '', password: '' },
  });

  // ✅ 중복검사
  const checkUsername = async () => {
    const username = getValues('username'); // 리렌더없이 현재 값만 읽는다.
    if (!username) {
      setError('username', { message: '아이디를 입력해주세요.' });
      return;
    }

    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = (await response.json()) as CheckUsernameResponse;

      if (!data.success) throw new Error(data.message || '중복 확인 실패');
      setIsAvailable(data.isAvailable);
      // 결과를 즉시 errors에 반영
      // validate는 blur·submit 때만 돌기 때문
      if (data.isAvailable) clearErrors('username');
      else setError('username', { message: '이미 사용 중인 아이디입니다.' });
    } catch (error) {
      console.error('❌ 중복검사 오류:', error);
      setIsAvailable(null);
      setError('username', { message: '서버와의 연결에 실패했습니다.' });
    }
  };

  const onSubmit = ({ username, password }: RegisterForm) => {
    // 로컬 스토리지에 아이디 / 패스워드 저장 후 본인인증으로 이동
    setStorage('username', username);
    setStorage('password', password);
    navigate('/verify-mvp');
  };

  return (
    <div data-page="register">
      {/* 🎃 할로윈 모드용 페이지 식별자 */}
      <div className="halloween:gap-[3px] halloween:w-full flex min-h-[calc(100dvh-72px)] flex-col items-center justify-start pt-[10vh] pb-24">
        {/* 구 .login-subtitle — 감성 리드카피 */}
        <p className="text-center [font-family:'Gowun_Batang'] text-[18px] text-[var(--auth-lead-color)]">
          바로 지금,
          <br />
          우리는 같은 단어를 떠올렸어요
        </p>
        {/* 구 .login-title — 세리프 */}
        <h1 className="mt-[10px] mb-6 [font-family:'Judson','Gowun_Dodum',serif] text-[34px] font-bold text-[var(--login-title-color)] [text-shadow:var(--login-title-shadow)] min-[1025px]:text-[38px]">
          회원가입
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center">
          {/* 입력 영역 고정 높이(입력 2행 = 128px) — 폼 간 제출 버튼 위치 통일 */}
          <div className="flex min-h-[128px] w-full flex-col items-center">
            {/* 구 .id-check-row — 아이디 입력(flex) + 중복검사(사각 보조) 같은 높이 정렬 */}
            <div className="mb-[10px] flex w-[300px] items-center gap-[10px]">
              <AuthInput
                className="mb-0! min-w-0 flex-1"
                placeholder="아이디"
                autoComplete="username"
                {...register('username', {
                  required: '아이디를 입력해주세요.',
                  // 아이디가 바뀌면 이전 중복검사 결과는 무효
                  // 규칙 객체 안에 넣어야 register의 onChange를 덮지 않는다.
                  onChange: () => {
                    setIsAvailable(null);
                    clearErrors('username');
                  },
                  validate: () => {
                    if (isAvailable === false) return '이미 사용 중인 아이디입니다.';
                    return isAvailable === true || '아이디 중복 검사를 완료해주세요.';
                  },
                })}
              />
              {/* form 안이므로 type='button 필수
              없으면 중복검사가 폼을 제출한다.
              */}
              <Button type="button" variant="check" onClick={checkUsername}>
                중복검사
              </Button>
            </div>
            {/* 구 .result-message — 에러가 있으면 에러만, 없고 검사 통과면 성공만. 항상 하나만 표시 */}
            {errors.username ? (
              <FieldMessage message={errors.username.message} />
            ) : (
              isAvailable === true && (
                <FieldMessage state="success" message="이 아이디는 사용 가능합니다." />
              )
            )}
            <AuthInput
              placeholder="비밀번호"
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: '비밀번호를 입력해주세요.',
                // 공용 검증으로 3개 페이지 규칙 통일 (8자 + 영문/숫자/특수문자 2종)
                validate: validatePassword,
              })}
            />

            <FieldMessage message={errors.password?.message} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            가입하기
          </Button>
        </form>

        {/* 구 .terms-footer (인라인 #888 → --color-text-muted 토큰) */}
        <p className="halloween:absolute halloween:bottom-[10px] halloween:left-1/2 halloween:-translate-x-1/2 halloween:text-[13px] halloween:leading-[1.4] halloween:w-full halloween:opacity-90 mt-[60px] text-center text-[14px] text-[var(--color-text-muted)]">
          By clicking continue,
          <br />
          you agree to our <TextLink>Terms of Service</TextLink> and{' '}
          <TextLink>Privacy Policy</TextLink>
        </p>
      </div>
    </div>
  );
}
