import type { HTMLAttributes, Ref } from 'react';

/**
 * 공유 모달 셸 (design-system primitive)
 * -----------------------------------------------------------------
 * 반복되던 `<div className="modal-backdrop"><div className="modal-content">…`
 * 2겹 셸을 하나로 통합한 컴포넌트.
 *
 * ⚠️ 스타일은 기존 전역 클래스(.modal-backdrop/.modal-content)를 그대로
 *    소비한다. .modal-content 는 MyPage 의 :global(.modal-content) 규칙,
 *    ClosedModal.css, MainPage 등 여러 곳이 공유하는 스타일 훅이라 클래스명을
 *    유지해야 하기 때문 (Tailwind 전환은 그 얽힘 정리 후 이 컴포넌트 내부만
 *    바꾸면 됨).
 *
 * - className: modal-content 에 추가 클래스 (예: 'letter-style')
 * - ref: modal-content 로 전달 (ModalPolicy 의 click-outside 감지용, React 19)
 * - style / 기타 div 속성은 modal-content 로 passthrough
 */
interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export default function Modal({ children, className = '', ref, ...rest }: ModalProps) {
  return (
    <div className="modal-backdrop">
      <div className={`modal-content ${className}`.trim()} ref={ref} {...rest}>
        {children}
      </div>
    </div>
  );
}
