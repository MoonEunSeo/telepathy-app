import type { ButtonHTMLAttributes } from 'react';

/**
 * 성별 토글 버튼 (design-system primitive)
 * -----------------------------------------------------------------
 * 구 전역 클래스 .toggle-button / .toggle-button.active 를 대체.
 * 색·구조는 --toggle-* 토큰을 소비 → 테마 자동 반영. (구 halloween.css 의
 * `[data-page="verify-mvp"] .toggle-button` 클래스 훅을 tokens.css 스코프
 * 토큰으로 이관 → 마지막 시즌테마 클래스 훅 제거)
 *
 * - active: 선택 상태 (선택/비선택은 프로퍼티를 완전히 분리 → 우선순위 충돌 없음)
 * - onClick / style / 기타 button 속성은 passthrough
 */
interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

// 두 상태 공통 (구조 + 테마 불변 프로퍼티)
const BASE =
  "cursor-pointer box-border text-[16px] [font-family:'Gowun_Dodum'] " +
  'h-[var(--toggle-height)] rounded-[var(--toggle-radius)] ' +
  '[border-width:1px] [border-style:solid] ' +
  '[box-shadow:var(--toggle-shadow)] [transition:var(--toggle-transition)]';

// 비선택 / 선택 — 상호배타라 background/border-color/color/transform 충돌 없음
const OFF =
  '[background:var(--toggle-bg)] [border-color:var(--toggle-border)] [color:var(--toggle-text)]';
const ON =
  '[background:var(--toggle-selected-bg)] [border-color:var(--toggle-selected-border)] ' +
  '[color:var(--toggle-selected-text)] [transform:var(--toggle-selected-transform)]';

export default function ToggleButton({
  active = false,
  className = '',
  ...props
}: ToggleButtonProps) {
  return <button className={`${BASE} ${active ? ON : OFF} ${className}`.trim()} {...props} />;
}
