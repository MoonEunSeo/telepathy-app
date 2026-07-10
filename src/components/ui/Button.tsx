import type { ButtonHTMLAttributes } from 'react';

/**
 * 공유 액션 버튼 (design-system primitive)
 * -----------------------------------------------------------------
 * 기존 전역 클래스 .login-button / .agree-button / .next-button /
 * .check-button 를 대체하는 단일 출처(SSOT) 컴포넌트.
 *
 * - 색·애니메이션은 --btn-* 토큰을 소비 → 테마(할로윈) 자동 반영
 *   (background 쇼트핸드로 할로윈 그라디언트까지 대응)
 * - 크기/모양 차이만 variant 로 분리
 * - style / onClick / type 등 나머지 button 속성은 그대로 전달(passthrough)
 */
type ButtonVariant = 'block' | 'inline' | 'check';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// 테마 토큰(색/애니메이션) + 공통 리셋 — 모든 variant 공유
const BASE =
  'cursor-pointer border-none box-border leading-[1.2] ' +
  '[background:var(--btn-bg)] [color:var(--btn-text)] [animation:var(--btn-animation)]';

// 각 variant = 기존 클래스의 크기/모양만 옮긴 것 (색/애니메이션은 BASE 공유)
const VARIANT: Record<ButtonVariant, string> = {
  block: 'w-[300px] p-3 text-[16px] rounded-[6px]', //            ← 구 .login-button
  inline: 'h-12 px-5 py-3 mx-[5px] my-2.5 text-[15px] rounded-[4px]', // ← 구 .agree-button / .next-button
  check: 'h-12 p-3 text-[18px] rounded-[6px] whitespace-nowrap', //   ← 구 .check-button
};

export default function Button({ variant = 'block', className = '', ...props }: ButtonProps) {
  return <button className={`${BASE} ${VARIANT[variant]} ${className}`.trim()} {...props} />;
}
