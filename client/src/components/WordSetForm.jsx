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

// WordSetForm.jsx (변경/추가 부분)
import { useState, useMemo } from "react";
import axios from "axios";
const API_BASE = import.meta.env.VITE_REALSITE;

const KOREAN_WORD_REGEX = /^[가-힣]{1,6}$/; // 한글만, 1~6자
const BANK_REGEX = /^[가-힣A-Za-z\s]{2,20}$/; // 은행명: 한글/영문/공백 2~20자
const ACCOUNT_REGEX = /^\d{4,20}$/; // 계좌번호: 숫자만 4~20자리 (원하면 min 줄일 수 있음)

export default function WordSetForm({ currentUser }) {
  const [words, setWords] = useState(["", "", "", ""]);
  const [refundBank, setRefundBank] = useState("");
  const [refundAccount, setRefundAccount] = useState("");
  const [errors, setErrors] = useState({});

  const validateField = (key, value) => {
    switch (key) {
      case "word":
        return KOREAN_WORD_REGEX.test(value) ? "" : "한글 1~6자만 입력 가능합니다.";
      case "bank":
        return BANK_REGEX.test(value) ? "" : "은행명은 한글/영문 2~20자만 허용됩니다.";
      case "account":
        return ACCOUNT_REGEX.test(value) ? "" : "계좌번호는 숫자만 (4~20자리) 입력하세요.";
      default:
        return "";
    }
  };

  const handleWordChange = (i, v) => {
    // 강제 자르기: 한글 외 문자 제거 + 6자까지
    const filtered = v.replace(/[^가-힣]/g, "").slice(0, 6);
    const newWords = [...words];
    newWords[i] = filtered;
    setWords(newWords);

    setErrors(prev => ({ ...prev, [`w${i}`]: validateField("word", filtered) }));
  };

  const handleBankChange = (v) => {
    // 은행명에서 특수문자 제거(허용 문자만 남김)
    const filtered = v.replace(/[^가-힣A-Za-z\s]/g, "").slice(0, 20);
    setRefundBank(filtered);
    setErrors(prev => ({ ...prev, bank: validateField("bank", filtered) }));
  };

  const handleAccountChange = (v) => {
    // 숫자만 필터 + 20자리 제한
    const filtered = v.replace(/\D/g, "").slice(0, 20);
    setRefundAccount(filtered);
    setErrors(prev => ({ ...prev, account: validateField("account", filtered) }));
  };

  const isFormValid = useMemo(() => {
    // 단어들 중 하나라도 비어있거나 에러가 있으면 false
    const wordsValid = words.every(w => KOREAN_WORD_REGEX.test(w));
    const bankValid = BANK_REGEX.test(refundBank);
    const accValid = ACCOUNT_REGEX.test(refundAccount);
    return wordsValid && bankValid && accValid;
  }, [words, refundBank, refundAccount]);

  const handleSave = async () => {
    // 추가 프론트 재검증(서버는 최종 보호)
    if (!isFormValid) {
      alert("입력값을 다시 확인해주세요.");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/sp_payments/update-refund`, {
        user_id: currentUser.id,
        refund_bank: refundBank,
        refund_account: refundAccount,
        wordset: words,
      }, { withCredentials: true });

      if (res.data?.ok) {
        alert("저장되었습니다 🌷");
        // 확인 누르면 LikePage로 이동시키려면 window.location or useNavigate 사용
        //window.location.href = "/likes";
        navigate('/likes');
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
      <div className="word-inputs">
        {words.map((w, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <input
              type="text"
              value={w}
              placeholder={`단어 ${i + 1} (한글 1~6자)`}
              onChange={(e) => handleWordChange(i, e.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={(e) => {
                setComposing(false);
                handleWordChange(i, e.target.value);
              }}
            />
            <div style={{ color: "red", fontSize: 12 }}>
              {errors[`w${i}`] || ""}
            </div>
          </div>
        ))}
      </div>

      <div className="account-section">
        <h3>💸 환불계좌 정보</h3>
        <div className="account-inputs">
          <input
            type="text"
            placeholder="은행명 (예: 국민)"
            value={refundBank}
            onChange={(e) => handleBankChange(e.target.value)}
          />
          <input
            type="text"
            placeholder="계좌번호 (숫자만)"
            value={refundAccount}
            onChange={(e) => handleAccountChange(e.target.value)}
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
