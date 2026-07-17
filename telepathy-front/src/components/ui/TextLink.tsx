import type { HTMLAttributes } from 'react';

/**
 * 인라인 텍스트 링크 (design-system primitive)
 * -----------------------------------------------------------------
 * 구 전역 클래스 .bold-link 를 대체하는 단일 출처(SSOT) 컴포넌트.
 * 색은 --bold-link-* 토큰을 소비 → 테마(할로윈) 자동 반영.
 * onClick / 기타 span 속성은 passthrough.
 */
const BASE =
  'font-bold underline cursor-pointer ' +
  'text-[var(--bold-link-color)] transition-colors duration-200 ' +
  'hover:text-[var(--bold-link-hover-color)]';

export default function TextLink({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`${BASE} ${className}`.trim()} {...props} />;
}
