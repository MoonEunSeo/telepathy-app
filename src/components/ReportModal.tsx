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
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
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
      <div className="w-[100%] max-w-[360px] rounded-[16px] p-6 [font-family:'Gowun_Dodum',sans-serif] text-[var(--report-modal-text)] [box-shadow:var(--report-modal-shadow)] [background:var(--report-modal-bg)] [border:1px_solid_var(--report-modal-border)]">
        {/* 구 .report-modal h1 (judson-title 훅) */}
        <h1 className="mt-0 mb-6 [font-family:'Judson',serif] text-[28px] font-semibold tracking-[0.5px] text-[var(--report-title-color)]">
          Telepathy
        </h1>
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
          className="mt-2 min-h-[90px] w-full resize-none rounded-[8px] p-2.5 [font-family:inherit] text-[14px] text-[var(--report-input-text)] [background:var(--report-input-bg)] [border:1px_solid_var(--report-input-border)] placeholder:text-[var(--report-input-placeholder)]"
          placeholder="이 내용은 운영팀만 열람 가능하며, 신고자는 익명으로 처리됩니다"
          value={extra}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setExtra(e.target.value)}
          maxLength={200}
        />
        {/* 구 .report-buttons (취소=first, 제출=last) */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full border-none px-[18px] py-2 text-[14px] text-[var(--report-cancel-text)] [background:var(--report-cancel-bg)]"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="cursor-pointer rounded-full border-none px-[18px] py-2 text-[14px] text-[var(--report-submit-text)] [background:var(--report-submit-bg)]"
          >
            {loading ? '제출 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
