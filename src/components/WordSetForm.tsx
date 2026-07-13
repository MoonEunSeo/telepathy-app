// ✅ WordSetForm.tsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import type { ChangeEvent, CompositionEvent, KeyboardEvent } from "react";
import type { CurrentUser, SpPaymentUpdateRefundResponse } from "../types";

const API_BASE = import.meta.env.VITE_REALSITE;

const KOREAN_WORD_REGEX = /^[가-힣]{1,6}$/;
const BANK_REGEX = /^[가-힣A-Za-z\s]{2,20}$/;
const ACCOUNT_REGEX = /^\d{4,20}$/;

// 구 warm-input 계열 (단어 입력 / 환불계좌 입력 / 은행 select / 저장 버튼)
const wordInput =
  "w-[320px] h-[42px] bg-[var(--color-warm-input-bg)] [border:1.6px_solid_var(--color-warm-input-border)] rounded-[8px] py-2.5 px-3.5 text-[15px] text-[var(--color-warm-input-text)] [font-family:'Gowun_Dodum',sans-serif] outline-none [transition:all_0.2s_ease] box-border focus:[border-color:var(--color-warm-input-border-focus)] focus:bg-[var(--color-warm-input-bg-focus)]";
// 구 .refund-section .wordset-input (+.refund-input) 병합값
const accountInput =
  "flex-1 min-w-[150px] h-[42px] bg-[var(--color-warm-input-bg)] [border:1.6px_solid_var(--color-warm-input-border)] rounded-[8px] px-3 text-[15px] text-[var(--color-warm-input-text)] [font-family:'Gowun_Dodum',sans-serif] outline-none [transition:all_0.2s_ease] box-border focus:[border-color:var(--color-warm-input-border-focus)] focus:bg-[var(--color-warm-input-bg-focus)]";
const bankSelect =
  "pl-1 flex-[0_0_110px] h-[42px] bg-[var(--color-warm-input-bg)] [border:1.6px_solid_var(--color-warm-input-border)] rounded-[8px] text-[14px] text-[var(--color-warm-input-text)] [font-family:'Gowun_Dodum',sans-serif] text-center cursor-pointer [transition:all_0.2s_ease] box-border leading-[42px] hover:[border-color:var(--color-warm-input-border-focus)] hover:bg-[var(--color-warm-input-bg-focus)] hover:[box-shadow:0_1px_4px_rgba(0,0,0,0.08)] focus:[border-color:var(--color-warm-input-border-focus)] focus:bg-[var(--color-warm-input-bg-focus)] focus:[box-shadow:0_1px_4px_rgba(0,0,0,0.08)] [&_option]:text-[14px] [&_option]:py-1.5 [&_option]:px-2 [&_option]:text-[var(--color-text-warm)] [&_option]:bg-[#fffefb] max-[480px]:w-full";
const saveBtn =
  "bg-[#ffb347] text-white border-none py-2.5 px-[30px] rounded-full text-[16px] [font-family:'Gowun_Dodum'] cursor-pointer [transition:background-color_0.2s_ease,transform_0.15s_ease] hover:bg-[#ffa726] hover:scale-105 disabled:bg-[#e0c6a1] disabled:cursor-not-allowed disabled:scale-100";
// 구 .word-inputs
const wordInputs = "flex flex-col items-center gap-[14px] mb-[30px]";

export default function WordSetForm({ currentUser }: WordSetFormProps) {
  const navigate = useNavigate();

  const [, setIsComposing] = useState(false);
  const [words, setWords] = useState<string[]>(["", "", "", ""]);
  const [refundBank, setRefundBank] = useState("");
  const [refundAccount, setRefundAccount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ 유효성 검사 함수
  const validateField = (key: string, value: string): string => {
    switch (key) {
      case "word":
        return KOREAN_WORD_REGEX.test(value)
          ? ""
          : "한글 1~6자만 입력 가능합니다.";
      case "bank":
        return BANK_REGEX.test(value)
          ? ""
          : "은행명은 한글/영문 2~20자만 허용됩니다.";
      case "account":
        return ACCOUNT_REGEX.test(value)
          ? ""
          : "계좌번호는 숫자만 (4~20자리) 입력하세요.";
      default:
        return "";
    }
  };

  // ✅ 단어 입력 처리
  const handleWordInputChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    setWords((prev) => {
      const updated = [...prev];
      updated[i] = e.target.value;
      return updated;
    });
    setErrors((prev) => ({ ...prev, [`w${i}`]: "" }));
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (
    i: number,
    e: CompositionEvent<HTMLInputElement>
  ) => {
    setIsComposing(false);
    const input = (e.target as HTMLInputElement).value;
    const onlyKorean = input.replace(/[^가-힣]/g, "").slice(0, 6);
    setWords((prev) => {
      const updated = [...prev];
      updated[i] = onlyKorean;
      return updated;
    });
    setErrors((prev) => ({
      ...prev,
      [`w${i}`]: validateField("word", onlyKorean),
    }));
  };

  const handleAccountChange = (v: string) => {
    const filtered = v.replace(/\D/g, "").slice(0, 20);
    setRefundAccount(filtered);
    setErrors((p) => ({ ...p, account: validateField("account", filtered) }));
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
    if (!isFormValid) return alert("입력값을 다시 확인해주세요.");

    try {
      const res = await axios.post<SpPaymentUpdateRefundResponse>(
        `${API_BASE}/api/sp_payments/update-refund`,
        {
          user_id: currentUser.id,
          refund_bank: refundBank,
          refund_account: refundAccount,
          wordset: words,
        },
        { withCredentials: true }
      );

      if (res.data?.ok) {
        alert("감사합니다! 24시간 안에 반영될거예요 😎");
        navigate("/likes");
      } else {
        alert("⚠️ 저장 실패: " + (res.data?.message || "알 수 없는 이유"));
      }
    } catch (err) {
      console.error("저장 중 오류:", err);
      alert("저장 중 오류가 발생했습니다 😢");
    }
  };

  // ✅ UI (구 .wordset-section 은 미정의 → 무스타일 래퍼)
  return (
    <div>
      <h3>✨ 단어세트를 만들어볼까요?</h3>
      {/* 단어 입력 구역 — 구 .word-inputs */}
      <div className={wordInputs}>
        {words.map((w, i) => (
          <div key={i} className="mb-3">
            <input
              type="text"
              className={wordInput}
              placeholder={`단어 ${i + 1} (한글 1~6자)`}
              value={w}
              onChange={(e) => handleWordInputChange(i, e)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={(e) => handleCompositionEnd(i, e)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && e.preventDefault()
              }
            />
            {errors[`w${i}`] && (
              <p className="text-red-500 text-xs mt-1">{errors[`w${i}`]}</p>
            )}
          </div>
        ))}
      </div>

      {/* 환불 계좌 입력 구역 */}
      <h3>💸 환불계좌 정보</h3>
      <div className={wordInputs}>
          {/* 구 .refund-section */}
          <div className="flex justify-center items-stretch gap-2 w-full max-w-[320px] max-[480px]:flex-col max-[480px]:gap-2 max-[480px]:max-w-[260px]">
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

        <div className="text-[red] text-[12px]">
          {errors.bank || errors.account || ""}
        </div>

        <button
          className={saveBtn}
          onClick={handleSave}
          disabled={!isFormValid}
          title={!isFormValid ? "입력값을 확인해주세요" : "저장하기"}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

interface WordSetFormProps {
  currentUser: CurrentUser;
}
