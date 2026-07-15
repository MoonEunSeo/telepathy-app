import { useState } from 'react';
import type { ChangeEvent, CompositionEvent } from 'react';

interface NicknameModalProps {
  onClose?: () => void;
  onSave: (nickname: string) => void;
}

// 구 .nickname-modal-title / -primary-btn (양쪽 스텝에서 반복)
const modalTitle = 'mt-5 mb-3';
const primaryBtn =
  'bg-[#3a3020] text-white py-2.5 px-4 rounded-[8px] text-[16px] cursor-pointer border-none hover:bg-[#2e2415]';

export default function NicknameModal({ onSave }: NicknameModalProps) {
  const [nickname, setNickname] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value); // ✅ 필터링 없이 그대로
  };

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    const input = e.currentTarget.value;
    const filtered = input.replace(/[^가-힣a-zA-Z0-9]/g, ''); // ✅ 한글, 영어, 숫자 허용
    setNickname(filtered.slice(0, 20));
  };

  const handleFirstNext = () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    setConfirmStep(true);
  };

  const handleConfirm = () => {
    localStorage.setItem('nickname', nickname);
    onSave(nickname);
  };

  return (
    /* 구 .nickname-modal-backdrop */
    <div className="fixed top-0 left-0 z-[9999] flex h-full w-full items-center justify-center bg-[rgba(0,0,0,0.6)]">
      {/* 구 .nickname-modal-content */}
      <div className="w-[90%] max-w-[360px] rounded-[16px] bg-[var(--color-surface)] p-6 text-center [font-family:'Gowun_Dodum',sans-serif]">
        {!confirmStep ? (
          <>
            <h2 className={modalTitle}>닉네임을 입력해주세요</h2>
            <input
              type="text"
              value={nickname}
              onChange={handleInputChange}
              onCompositionEnd={handleCompositionEnd}
              placeholder="닉네임 (최대 20자, 한글/영문/숫자)"
              className="mt-2.5 mb-[30px] w-[90%] rounded-[8px] p-2.5 text-[16px] [border:1px_solid_var(--color-border-strong)]"
            />
            <button onClick={handleFirstNext} className={primaryBtn}>
              다음
            </button>
          </>
        ) : (
          <>
            <h2 className={modalTitle}>
              당신의 닉네임은 <br />
              <span className="text-[#e5625e]">{nickname}</span> 입니다.
            </h2>
            <p className="mb-4 text-[14px] text-[var(--color-text-secondary)]">
              입력하신 닉네임은 <strong>1달간 유지</strong>돼요!
              <br />이 닉네임으로 진행할까요?
            </p>
            <button onClick={handleConfirm} className={primaryBtn}>
              네, 이 닉네임으로 할게요
            </button>
            <br />
            <button
              onClick={() => setConfirmStep(false)}
              className="mt-2.5 mb-3 cursor-pointer rounded-[8px] bg-[var(--color-surface-muted)] px-3 py-2 text-[14px] text-[var(--color-text)] [border:1px_solid_var(--color-border-strong)] hover:bg-[#e9e9e9]"
            >
              다시 입력할게요
            </button>
          </>
        )}
      </div>
    </div>
  );
}
