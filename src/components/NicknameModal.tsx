import { useState } from 'react';
import type { ChangeEvent, CompositionEvent } from 'react';
import styles from '../themes/base/NicknameModal.module.css';

interface NicknameModalProps {
  onClose?: () => void;
  onSave: (nickname: string) => void;
}

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
    <div className={styles['nickname-modal-backdrop']}>
      <div className={styles['nickname-modal-content']}>
        {!confirmStep ? (
          <>
            <h2 className={styles['nickname-modal-title']}>닉네임을 입력해주세요</h2>
            <input
              type="text"
              value={nickname}
              onChange={handleInputChange}
              onCompositionEnd={handleCompositionEnd}
              placeholder="닉네임 (최대 20자, 한글/영문/숫자)"
              className={styles['nickname-modal-input']}
            />
            <button
              onClick={handleFirstNext}
              className={styles['nickname-modal-primary-btn']}
            >
              다음
            </button>
          </>
        ) : (
          <>
            <h2 className={styles['nickname-modal-title']}>
              당신의 닉네임은 <br />
              <span className={styles['nickname-highlight']}>{nickname}</span> 입니다.
            </h2>
            <p className={styles['nickname-modal-desc']}>
              입력하신 닉네임은 <strong>1달간 유지</strong>돼요!<br />
              이 닉네임으로 진행할까요?
            </p>
            <button
              onClick={handleConfirm}
              className={styles['nickname-modal-primary-btn']}
            >
              네, 이 닉네임으로 할게요
            </button>
            <br />
            <button
              onClick={() => setConfirmStep(false)}
              className={styles['nickname-modal-secondary-btn']}
            >
              다시 입력할게요
            </button>
          </>
        )}
      </div>
    </div>
  );
}
