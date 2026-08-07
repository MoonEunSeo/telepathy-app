// 게스트가 매칭(대화) 종료 후 메인으로 돌아왔을 때 뜨는 회원 로그인 권유 모달.
// "세션당 1회" 노출 제어는 호출부(MainPage)가 sessionStorage 로 담당한다.
interface GuestLoginModalProps {
  onLogin: () => void; // '로그인하러 가기' → /login
  onClose: () => void; // '계속 둘러보기' → 닫기
}

export default function GuestLoginModal({ onLogin, onClose }: GuestLoginModalProps) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center [backdrop-filter:blur(6px)] [background:var(--modal-overlay-bg)]">
      <div className="w-[300px] animate-[chat-fade-in-up-modal_0.3s_ease-out] rounded-[20px] px-8 py-7 text-center [font-family:'Gowun_Dodum',sans-serif] [background:var(--color-surface)] [box-shadow:var(--shadow-md)]">
        <h2 className="mb-1 [font-family:'Judson','Gowun_Dodum',serif] text-[1.7rem] font-bold text-[var(--color-text)]">
          Telepathy
        </h2>
        <p className="mt-3 mb-6 text-[0.95rem] leading-[1.6] text-[var(--color-text-secondary)]">
          방금 나눈 대화가 사라지기 전에,
          <br />
          회원으로 로그인하면 단어 기록과
          <br />
          즐겨찾기를 남길 수 있어요.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onLogin}
            className="cursor-pointer rounded-full border-none px-[22px] py-3 text-[15px] font-semibold text-[var(--ended-btn-text)] [background:var(--ended-accent-bg)] [transition:background_0.2s_ease,transform_0.1s_ease] hover:-translate-y-px hover:[background:var(--ended-accent-bg-hover)]"
          >
            로그인하러 가기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent py-1 text-[13px] text-[var(--color-text-secondary)] hover:underline"
          >
            계속 둘러보기
          </button>
        </div>
      </div>
    </div>
  );
}
