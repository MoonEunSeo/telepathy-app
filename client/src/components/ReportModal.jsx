// /src/components/ReportModal.jsx
import React, { useState } from 'react';

const ReportModal = ({ onClose, onSubmit, roomId, reportedId, reporterId }) => {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [extra, setExtra] = useState('');

  const toggleReason = (reason) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0 && !extra.trim()) return;

    // 이제 roomId와 reportedId를 포함해서 넘겨줌
    onSubmit({
        reasons: selectedReasons,
        extra,
        roomId,
        reportedId,
        reporterId, // ✅
      });
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
      <div className="report-modal">
        <h1 className="judson-title">Telepathy</h1>
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
        <textarea
          placeholder="이 내용은 운영팀만 열람 가능하며, 신고자는 익명으로 처리됩니다"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          maxLength={200}
        />
        <div className="report-buttons">
          <button onClick={onClose}>취소</button>
          <button onClick={handleSubmit}>제출하기</button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;