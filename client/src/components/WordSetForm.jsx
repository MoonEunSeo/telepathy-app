import { useState } from "react";
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
