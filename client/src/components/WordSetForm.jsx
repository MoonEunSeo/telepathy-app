/*import { useState } from "react";
import axios from "axios";
const API_BASE = "https://your-server-url.com";

export default function WordSetForm({ currentUser }) {
  const [words, setWords] = useState(["", "", "", ""]);
  const [refundBank, setRefundBank] = useState("");
  const [refundAccount, setRefundAccount] = useState("");

  const handleSave = async () => {
    await axios.post(`${API_BASE}/payment/update-refund`, {
      user_id: currentUser.id,
      refund_bank: refundBank,
      refund_account: refundAccount,
      wordset: words,
    });
    alert("저장되었습니다 🌷");
  };

  return (
    <div className="wordset">
      <h2>✨ 단어세트를 만들어볼까요?</h2>
      <div>
        {words.map((w, i) => (
          <input
            key={i}
            value={w}
            placeholder={`단어 ${i + 1}`}
            onChange={(e) => {
              const newWords = [...words];
              newWords[i] = e.target.value;
              setWords(newWords);
            }}
          />
        ))}
      </div>

      <h3>💸 환불계좌 정보</h3>
      <input
        placeholder="은행명"
        value={refundBank}
        onChange={(e) => setRefundBank(e.target.value)}
      />
      <input
        placeholder="계좌번호"
        value={refundAccount}
        onChange={(e) => setRefundAccount(e.target.value)}
      />

      <button onClick={handleSave}>저장하기</button>
    </div>
  );
}
*/

/*
import { useState } from "react";
import axios from "axios";
const API_BASE = import.meta.env.VITE_REALSITE;
import "./WordSetForm.css"

export default function WordSetForm({ currentUser }) {
  const [words, setWords] = useState(["", "", "", ""]);
  const [refundBank, setRefundBank] = useState("");
  const [refundAccount, setRefundAccount] = useState("");

  const handleSave = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/sp_payments/update-refund`, {
        user_id: currentUser.id,
        refund_bank: refundBank,
        refund_account: refundAccount,
        wordset: words,
      });
  
      // ✅ 서버 응답 검사
      if (res.data?.ok) {
        alert("저장되었습니다 🌷");
        navigate("/likes"); 
      } else {
        alert("⚠️ 저장에 실패했습니다: " + (res.data?.message || "알 수 없는 이유"));
        console.warn("서버 응답:", res.data);
      }
    } catch (err) {
      console.error("저장 중 오류:", err);
      alert("저장 중 오류가 발생했습니다 😢");
    }
  };

  return (
    <div className="wordset-section">
      <h2>✨ 단어세트를 만들어볼까요?</h2>

      //✅ 단어 입력 구역
      <div className="word-inputs">
        {words.map((w, i) => (
          <input
            key={i}
            type="text"
            value={w}
            placeholder={`단어 ${i + 1}`}
            onChange={(e) => {
              const newWords = [...words];
              newWords[i] = e.target.value;
              setWords(newWords);
            }}
          />
        ))}
      </div>

      // ✅ 환불계좌 입력 구역 
      <div className="account-section">
        <h3>💸 환불계좌 정보</h3>
        <div className="account-inputs">
          <input
            type="text"
            placeholder="은행명"
            value={refundBank}
            onChange={(e) => setRefundBank(e.target.value)}
          />
          <input
            type="text"
            placeholder="계좌번호"
            value={refundAccount}
            onChange={(e) => setRefundAccount(e.target.value)}
          />
        </div>

        <button className="save-button" onClick={handleSave}>
          저장하기
        </button>
      </div>
    </div>
  );
}
*/
// ✅ WordSetForm.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_REALSITE;

const KOREAN_WORD_REGEX = /^[가-힣]{1,6}$/;
const BANK_REGEX = /^[가-힣A-Za-z\s]{2,20}$/;
const ACCOUNT_REGEX = /^\d{4,20}$/;

export default function WordSetForm({ currentUser }) {
  const navigate = useNavigate();

  const [isComposing, setIsComposing] = useState(false);
  const [words, setWords] = useState(["", "", "", ""]);
  const [refundBank, setRefundBank] = useState("");
  const [refundAccount, setRefundAccount] = useState("");
  const [errors, setErrors] = useState({});

  // ✅ 유효성 검사 함수
  const validateField = (key, value) => {
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

  // ✅ 단어 입력 처리 (SearchBox 스타일 iOS 대응)
  const handleWordInputChange = (i, e) => {
    setWords((prev) => {
      const updated = [...prev];
      updated[i] = e.target.value;
      return updated;
    });
    setErrors((prev) => ({ ...prev, [`w${i}`]: "" }));
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (i, e) => {
    setIsComposing(false);
    const input = e.target.value;
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

  // ✅ 은행 입력 (iOS 대응)
  const [isBankComposing, setIsBankComposing] = useState(false);

  const handleBankChange = (e) => {
    if (isBankComposing) return;
    const filtered = e.target.value.replace(/[^가-힣A-Za-z\s]/g, "").slice(0, 20);
    setRefundBank(filtered);
    setErrors((p) => ({ ...p, bank: validateField("bank", filtered) }));
  };

  const handleBankCompositionStart = () => setIsBankComposing(true);
  const handleBankCompositionEnd = (e) => {
    setIsBankComposing(false);
    const filtered = e.target.value.replace(/[^가-힣A-Za-z\s]/g, "").slice(0, 20);
    setRefundBank(filtered);
    setErrors((p) => ({ ...p, bank: validateField("bank", filtered) }));
  };

  const handleAccountChange = (v) => {
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
      const res = await axios.post(
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
        alert("저장되었습니다 🌷");
        navigate("/likes");
      } else {
        alert("⚠️ 저장 실패: " + (res.data?.message || "알 수 없는 이유"));
      }
    } catch (err) {
      console.error("저장 중 오류:", err);
      alert("저장 중 오류가 발생했습니다 😢");
    }
  };

  // ✅ UI
  return (
    <div className="wordset-section">
      <h2>✨ 단어세트를 만들어볼까요?</h2>

      {/* 단어 입력 구역 */}
      <div className="word-inputs">
        {words.map((w, i) => (
          <div key={i} className="mb-3 search-box">
            <input
              type="text"
              className="search-input"
              placeholder={`단어 ${i + 1} (한글 1~6자)`}
              value={w}
              onChange={(e) => handleWordInputChange(i, e)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={(e) => handleCompositionEnd(i, e)}
              onKeyDown={(e) =>
                e.key === "Enter" && e.preventDefault()
              }
            />
            {errors[`w${i}`] && (
              <p className="text-red-500 text-xs mt-1">
                {errors[`w${i}`]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 환불 계좌 입력 구역 */}
      <div className="account-section">
        <h3>💸 환불계좌 정보</h3>
        <div className="account-inputs">
            <input
            type="text"
            className="account-input"
            placeholder="은행명 (예: 국민)"
            value={refundBank}
            onChange={handleBankChange}
            onCompositionStart={handleBankCompositionStart}
            onCompositionEnd={handleBankCompositionEnd}
            inputMode="text"
            lang="ko"
            autoCapitalize="off"
            autoCorrect="off"
          />
            <input
             type="text"
             className="account-input"
             placeholder="계좌번호 (숫자만)"
             value={refundAccount}
             onChange={(e) => handleAccountChange(e.target.value)}
             inputMode="numeric"
             pattern="\d*"
             autoComplete="off"
           />
        </div>
        <div style={{ color: "red", fontSize: 12 }}>
          {errors.bank || errors.account || ""}
        </div>

        <button
          className="save-button"
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