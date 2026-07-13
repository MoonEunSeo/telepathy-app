// 📦 src/components/ReportModal.tsx

import { useState } from 'react';
import type { ChangeEvent } from 'react';

// ReportModal 이 onSubmit 으로 부모에게 전달하는 값.
// (부모 ChatPage 가 여기에 reporterId/reportedId/roomId 를 더해 ReportPayload 로 전송)
export interface ReportSubmitValue {
  reasons: string[];
  extra: string;
}

interface ReportModalProps {
  onClose: () => void;
  onSubmit: (value: ReportSubmitValue) => void;
}

const ReportModal = ({ onClose, onSubmit }: ReportModalProps) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0 && !extra.trim()) {
      alert('신고 사유를 선택하거나 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    // ✅ 부모에게 값 전달
    onSubmit({ reasons: selectedReasons, extra });
    setLoading(false);
  };

  const reasonsList = [
    '광고, 홍보 메시지를 계속 보내요.',
    '비난, 괴롭힘, 욕설을 했어요.',
    '위협적인 말을 했어요.',
    '성적인 발언 및 행위를 했어요.',
    '기타 (자유기술)',
  ];

  return (
    <div className="modal-overlay">
      {/* 구 .report-modal */}
      <div className="[background:var(--report-modal-bg)] text-[var(--report-modal-text)] [border:1px_solid_var(--report-modal-border)] p-6 rounded-[16px] w-[90%] max-w-[360px] [font-family:'Gowun_Dodum',sans-serif] [box-shadow:var(--report-modal-shadow)]">
        {/* 구 .report-modal h1 (judson-title 훅) */}
        <h1 className="[font-family:'Judson',serif] text-[28px] font-semibold mt-0 mb-6 text-[var(--report-title-color)] tracking-[0.5px]">Telepathy</h1>
        <p>상대방의 어떤 점이 불편하셨나요?</p>
        <ul>
          {reasonsList.map((reason) => (
            <li key={reason}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedReasons.includes(reason)}
                  onChange={() => toggleReason(reason)}
                />
                {reason}
              </label>
            </li>
          ))}
        </ul>
        {/* 구 .report-modal textarea */}
        <textarea
          className="w-full min-h-[90px] resize-none p-2.5 [background:var(--report-input-bg)] text-[var(--report-input-text)] [border:1px_solid_var(--report-input-border)] rounded-[8px] mt-2 [font-family:inherit] text-[14px] placeholder:text-[var(--report-input-placeholder)]"
          placeholder="이 내용은 운영팀만 열람 가능하며, 신고자는 익명으로 처리됩니다"
          value={extra}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setExtra(e.target.value)}
          maxLength={200}
        />
        {/* 구 .report-buttons (취소=first, 제출=last) */}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="py-2 px-[18px] rounded-full border-none cursor-pointer text-[14px] [background:var(--report-cancel-bg)] text-[var(--report-cancel-text)]">취소</button>
          <button onClick={handleSubmit} disabled={loading} className="py-2 px-[18px] rounded-full border-none cursor-pointer text-[14px] [background:var(--report-submit-bg)] text-[var(--report-submit-text)]">
            {loading ? '제출 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
