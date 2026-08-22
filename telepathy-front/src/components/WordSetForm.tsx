// ✅ WordSetForm.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAxios } from '../lib/axiosClient';
import type { ChangeEvent, CompositionEvent, KeyboardEvent } from 'react';
import type { SpPaymentUpdateRefundResponse } from '../types';

const KOREAN_WORD_REGEX = /^[가-힣]{1,6}$/;
const BANK_REGEX = /^[가-힣A-Za-z\s]{2,20}$/;
const ACCOUNT_REGEX = /^\d{4,20}$/;

// 구 warm-input 계열 (단어 입력 / 환불계좌 입력 / 은행 select / 저장 버튼) — 리디자인: radius-md·h48
const wordInput =
  "flex-1 min-w-0 h-[48px] bg-[var(--color-warm-input-bg)] [border:1.6px_solid_var(--color-warm-input-border)] rounded-[var(--radius-md)] px-3.5 text-[15px] text-[var(--color-warm-input-text)] [font-family:'Gowun_Dodum',sans-serif] outline-none [transition:all_0.2s_ease] box-border focus:[border-color:var(--color-warm-input-border-focus)] focus:bg-[var(--color-warm-input-bg-focus)]";
// 구 .refund-section .wordset-input (+.refund-input) 병합값
const accountInput =
  "flex-1 min-w-[150px] h-[48px] bg-[var(--color-warm-input-bg)] [border:1.6px_solid_var(--color-warm-input-border)] rounded-[var(--radius-md)] px-3.5 text-[15px] text-[var(--color-warm-input-text)] [font-family:'Gowun_Dodum',sans-serif] outline-none [transition:all_0.2s_ease] box-border focus:[border-color:var(--color-warm-input-border-focus)] focus:bg-[var(--color-warm-input-bg-focus)]";
const bankSelect =
  "pl-1 flex-[0_0_110px] h-[48px] bg-[var(--color-warm-input-bg)] [border:1.6px_solid_var(--color-warm-input-border)] rounded-[var(--radius-md)] text-[14px] text-[var(--color-warm-input-text)] [font-family:'Gowun_Dodum',sans-serif] text-center cursor-pointer [transition:all_0.2s_ease] box-border leading-[48px] hover:[border-color:var(--color-warm-input-border-focus)] hover:bg-[var(--color-warm-input-bg-focus)] hover:[box-shadow:0_1px_4px_rgba(0,0,0,0.08)] focus:[border-color:var(--color-warm-input-border-focus)] focus:bg-[var(--color-warm-input-bg-focus)] focus:[box-shadow:0_1px_4px_rgba(0,0,0,0.08)] [&_option]:text-[14px] [&_option]:py-1.5 [&_option]:px-2 [&_option]:text-[var(--color-text-warm)] [&_option]:bg-[#fffefb] max-[480px]:w-full";
const saveBtn =
  "w-full h-[52px] [background:var(--color-accent)] text-[var(--color-on-accent)] border-none rounded-[var(--radius-pill)] text-[16px] font-bold [font-family:'Gowun_Dodum'] cursor-pointer [transition:opacity_0.2s_ease] hover:opacity-90 disabled:[background:var(--btn-disabled-bg)] disabled:text-[var(--btn-disabled-text)] disabled:cursor-not-allowed";
// 구 .word-inputs
const wordInputs = 'flex flex-col gap-3';

export default function WordSetForm() {
  const navigate = useNavigate();

  const [, setIsComposing] = useState(false);
  const [words, setWords] = useState<string[]>(['', '', '', '']);
  const [refundBank, setRefundBank] = useState('');
  const [refundAccount, setRefundAccount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ 유효성 검사 함수
  const validateField = (key: string, value: string): string => {
    switch (key) {
      case 'word':
        return KOREAN_WORD_REGEX.test(value) ? '' : '한글 1~6자만 입력 가능합니다.';
      case 'bank':
        return BANK_REGEX.test(value) ? '' : '은행명은 한글/영문 2~20자만 허용됩니다.';
      case 'account':
        return ACCOUNT_REGEX.test(value) ? '' : '계좌번호는 숫자만 (4~20자리) 입력하세요.';
      default:
        return '';
    }
  };

  // ✅ 단어 입력 처리
  const handleWordInputChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    setWords((prev) => {
      const updated = [...prev];
      updated[i] = e.target.value;
      return updated;
    });
    setErrors((prev) => ({ ...prev, [`w${i}`]: '' }));
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (i: number, e: CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    const input = (e.target as HTMLInputElement).value;
    const onlyKorean = input.replace(/[^가-힣]/g, '').slice(0, 6);
    setWords((prev) => {
      const updated = [...prev];
      updated[i] = onlyKorean;
      return updated;
    });
    setErrors((prev) => ({
      ...prev,
      [`w${i}`]: validateField('word', onlyKorean),
    }));
  };

  const handleAccountChange = (v: string) => {
    const filtered = v.replace(/\D/g, '').slice(0, 20);
    setRefundAccount(filtered);
    setErrors((p) => ({ ...p, account: validateField('account', filtered) }));
  };

  // ✅ 전체 폼 유효성 검사
  const isFormValid = useMemo(() => {
    const wordsValid = words.every((w) => KOREAN_WORD_REGEX.test(w));
    const bankValid = BANK_REGEX.test(refundBank);
    const accValid = ACCOUNT_REGEX.test(refundAccount);
    return wordsValid && bankValid && accValid;
  }, [words, refundBank, refundAccount]);

  // ✅ 저장 처리
  const handleSave = async () => {
    if (!isFormValid) return alert('입력값을 다시 확인해주세요.');

    try {
      const res = await apiAxios.post<SpPaymentUpdateRefundResponse>(
        `/api/sp_payments/update-refund`,
        {
          refund_bank: refundBank,
          refund_account: refundAccount,
          wordset: words,
        },
        { withCredentials: true },
      );

      if (res.data?.ok) {
        alert('감사합니다! 24시간 안에 반영될거예요 😎');
        navigate('/likes');
      } else {
        alert('⚠️ 저장 실패: ' + (res.data?.message || '알 수 없는 이유'));
      }
    } catch (err) {
      console.error('저장 중 오류:', err);
      alert('저장 중 오류가 발생했습니다 😢');
    }
  };

  // ✅ UI — 리디자인: 번호 배지 + n/4 진행 + 오버라인 라벨 + accent pill 저장
  const filledCount = words.filter((w) => KOREAN_WORD_REGEX.test(w)).length;

  return (
    <div className="text-left">
      {/* 단어 입력 구역 */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--section-label-color)] uppercase">
          나의 단어 4개
        </p>
        <span className="[font-family:'Judson','Gowun_Dodum',serif] text-[15px] font-bold text-[var(--main-title-color)]">
          {filledCount}/4
        </span>
      </div>
      <div className={wordInputs}>
        {words.map((w, i) => (
          <div key={i}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--word-num-bg)] text-[13px] font-bold text-[var(--main-title-color)] [border:1px_solid_var(--color-warm-input-border)]">
                {i + 1}
              </span>
              <input
                type="text"
                className={wordInput}
                placeholder={`단어 ${i + 1} (한글 1~6자)`}
                value={w}
                onChange={(e) => handleWordInputChange(i, e)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={(e) => handleCompositionEnd(i, e)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                  e.key === 'Enter' && e.preventDefault()
                }
              />
            </div>
            {errors[`w${i}`] && (
              <p className="mt-1 pl-[38px] text-xs text-[var(--color-danger)]">{errors[`w${i}`]}</p>
            )}
          </div>
        ))}
      </div>

      {/* 구분선 */}
      <div className="my-6 [border-top:1px_solid_var(--color-border-subtle)]" />

      {/* 환불 계좌 입력 구역 */}
      <p className="mb-3 text-[11px] font-bold tracking-[0.12em] text-[var(--section-label-color)] uppercase">
        💸 환불 계좌 정보
      </p>
      <div className="mb-2 flex w-full items-stretch gap-2 max-[480px]:flex-col">
        <select
          className={bankSelect}
          value={refundBank}
          onChange={(e) => setRefundBank(e.target.value)}
        >
          <option value="">은행 선택</option>
          <option value="국민은행">국민은행</option>
          <option value="신한은행">신한은행</option>
          <option value="우리은행">우리은행</option>
          <option value="하나은행">하나은행</option>
          <option value="기업은행">기업은행</option>
          <option value="농협은행">농협은행</option>
          <option value="카카오뱅크">카카오뱅크</option>
          <option value="케이뱅크">케이뱅크</option>
          <option value="SC제일은행">SC제일은행</option>
          <option value="토스뱅크">토스뱅크</option>
          <option value="새마을금고">새마을금고</option>
          <option value="신협">신협</option>
        </select>
        <input
          type="text"
          className={accountInput}
          placeholder="계좌번호 (숫자만)"
          value={refundAccount}
          onChange={(e) => handleAccountChange(e.target.value)}
          inputMode="numeric"
          pattern="\d*"
          autoComplete="off"
        />
      </div>

      <div className="mb-4 min-h-[16px] text-[12px] text-[var(--color-danger-warm)]">
        {errors.bank || errors.account || ''}
      </div>

      {/* 저장 */}
      <button
        className={saveBtn}
        onClick={handleSave}
        disabled={!isFormValid}
        title={!isFormValid ? '입력값을 확인해주세요' : '저장하기'}
      >
        저장하기
      </button>
      {!isFormValid && (
        <p className="mt-2.5 text-center text-[12px] text-[var(--color-text-muted)]">
          단어 4개를 모두 입력하면 저장할 수 있어요
        </p>
      )}
    </div>
  );
}
