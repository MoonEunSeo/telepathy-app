import type { InputHTMLAttributes } from 'react';

/**
 * 공유 입력창 (design-system primitive)
 * -----------------------------------------------------------------
 * 기존 전역 클래스 .auth-input / .birth-input / .verify-input 를
 * 대체하는 단일 출처(SSOT) 컴포넌트.
 *
 * - 테두리/배경/글자/placeholder 는 --auth-input-* 토큰 소비 → 테마 자동 반영
 * - variant 로 크기/여백/focus 차이만 분리
 * - value/onChange/placeholder/type/style 등 나머지 input 속성은 passthrough
 */
type InputVariant = 'auth' | 'birth' | 'verify';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
}

// 토큰 기반 테두리/배경/글자 + placeholder + 공통 리셋 — 모든 variant 공유
const BASE =
  'box-border text-[16px] rounded-[6px] ' +
  '[border:1px_solid_var(--auth-input-border)] [background:var(--auth-input-bg)] [color:var(--auth-input-text)] ' +
  'placeholder:text-[var(--auth-input-placeholder)]';

const VARIANT: Record<InputVariant, string> = {
  // 구 .auth-input — 너비/여백 + 부드러운 전환 + focus 스타일
  auth:
    'w-[300px] p-3 mb-3 leading-[1.2] [transition:all_0.25s_ease] ' +
    'focus:outline-none focus:[border-color:var(--auth-input-focus-border)] focus:[box-shadow:var(--auth-input-focus-shadow)]',
  // 구 .birth-input — padding/margin만 (성별 입력 행에서 flex 로 배치)
  birth: 'p-3 mb-2.5 leading-[1.2]',
  // 구 .verify-input — outline 제거만 (크기는 호출부 inline style)
  verify: 'outline-none',
};

export default function AuthInput({ variant = 'auth', className = '', ...props }: AuthInputProps) {
  return <input className={`${BASE} ${VARIANT[variant]} ${className}`.trim()} {...props} />;
}
