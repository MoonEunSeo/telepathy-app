import { useState } from 'react';
import type { ChangeEvent } from 'react';

interface MegaphoneInputModalProps {
  onClose: () => void;
  hasMegaphone: boolean;
  // 메시지 문자열을 전달한다. PortOne 제거 후 구매 SKU 를 보내는 경로는 없다.
  onSend: (value: string) => void;
}

// 구 .megaphone-modal :where(button) 베이스 / .purchase-options button / .close-btn
const megaBtn =
  '[background:var(--mega-purchase-bg)] text-[var(--mega-purchase-text)] border-none rounded-[12px] py-2.5 px-[18px] text-[14px] font-semibold m-1.5 cursor-pointer [transition:all_0.2s_ease] hover:[background:var(--mega-purchase-bg-hover)]';
const closeBtn =
  '[background:var(--mega-close-bg)] text-[var(--mega-close-text)] font-bold p-3 rounded-[10px] border-none w-full m-1.5 cursor-pointer [transition:all_0.2s_ease] hover:[background:var(--mega-close-bg-hover)]';

export default function MegaphoneInputModal({
  onClose,
  hasMegaphone,
  onSend,
}: MegaphoneInputModalProps) {
  const [message, setMessage] = useState<string>('');

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message); // 입력된 메시지 전달
  };

  return (
    /* 구 .megaphone-modal (static transform 는 keyframe 과 동일 property 사용) */
    <div className="fixed top-1/2 left-1/2 z-[1000] w-[360px] max-w-[90%] [transform:translate(-50%,-50%)] animate-[mega-fade-in_0.25s_ease-in-out] rounded-[16px] px-7 py-6 text-center text-[var(--mega-modal-text)] [box-shadow:var(--mega-modal-shadow)] [background:var(--mega-modal-bg)] [border:1px_solid_var(--mega-modal-border)]">
      {/* 구 .megaphone-modal h2 */}
      <h2 className="mb-3 flex items-center justify-center gap-1.5 text-[20px] font-bold">
        🔊 확성기
      </h2>

      {hasMegaphone ? (
        <>
          {/* 구 .megaphone-modal p */}
          <p className="mb-5 text-[14px] text-[var(--mega-desc-color)]">
            모든 접속자에게 전달할 메시지를 입력하세요. (최대 20자)
          </p>
          {/* 구 .megaphone-modal textarea */}
          <textarea
            className="box-border min-h-[80px] w-full resize-none rounded-[10px] p-2.5 [font-family:'Gowun_Dodum',sans-serif] text-[14px] text-[var(--mega-input-text)] [background:var(--mega-input-bg)] [border:1px_solid_var(--mega-input-border)]"
            placeholder="메시지를 입력하세요"
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
          />
          <button className={megaBtn} onClick={handleSend}>
            발사
          </button>
        </>
      ) : (
        <>
          <p className="mb-2 text-[14px] text-[var(--mega-desc-color)]">보유한 확성기가 없습니다.</p>
          {/* 카드결제(PortOne)를 걷어냈다. 계좌이체 웹훅 결제가 붙기 전까지 안내만 띄운다.
              구매 버튼을 지우지 않고 문구로 두는 이유 — 눌러서 500 이 나던 이전보다 낫고,
              결제가 붙으면 이 자리에 그대로 돌아온다. */}
          <p className="mb-5 text-[13px] text-[var(--mega-desc-color)] opacity-80">
            확성기 구매는 준비 중이에요. 조금만 기다려주세요 🙏
          </p>
        </>
      )}

      <button className={closeBtn} onClick={onClose}>
        닫기
      </button>
    </div>
  );
}
