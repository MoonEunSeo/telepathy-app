import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';
import profileImage from '../assets/profile_image.png';
import Modal from '../components/ui/Modal';
import type {
  Id,
  ProfileResponse,
  WordHistoryResponse,
  MegaphoneCountResponse,
  WithdrawResponse,
} from '../types';

// 구 .login-button1 (모달 버튼, :global(.modal-content) 오버라이드 반영 = flex 1 1 45%/max140/pad10·0)
const modalBtn =
  "[background:var(--color-accent)] text-[var(--color-on-accent)] border-none rounded-[6px] text-[14px] cursor-pointer [transition:background-color_0.3s] flex-[1_1_45%] max-w-[140px] py-2.5 px-0 text-center hover:[background-color:#333]";
// 구 .login-button1.cancel
const modalBtnCancel =
  "[background:var(--color-neutral-hover)] [color:var(--color-text)] border-none rounded-[6px] text-[14px] cursor-pointer [transition:background-color_0.3s] flex-[1_1_45%] max-w-[140px] py-2.5 px-0 text-center hover:[background-color:#d0d0d0]";

const MyPage = () => {
  const [nickname, setNickname] = useState('');
  const [, setUserId] = useState<Id>('');
  const [username, setUsername] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showNotSupportedModal, setShowNotSupportedModal] = useState(false);
  const [megaphoneCount, setMegaphoneCount] = useState(0);


  const navigate = useNavigate();
  // 원본은 isSessionActive(없는 필드)를 참조 — isActive로 정정
  const { isActive, word } = useWordSession();
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/nickname/profile', { credentials: 'include' });
        const data = (await res.json()) as ProfileResponse;
        if (data.success && data.nickname) {
          setNickname(data.nickname);
          setUsername(data.username);
          setUserId(data.userId as Id);
        }
      } catch (err) {
        console.error('❌ 프로필 fetch 오류:', err);
      }
    };

    const fetchWordCount = async () => {
      try {
        const res = await fetch('/api/word-history', { credentials: 'include' });
        const data = (await res.json()) as WordHistoryResponse;
        if (Array.isArray(data.history)) {
          setWordCount(data.history.length);
        } else {
          setWordCount(0);
        }
      } catch (err) {
        console.error('❌ 단어 기록 불러오기 실패:', err);
        setWordCount(0);
      }
    };

    const fetchMegaphoneCount = async () => {
      try {
        const res = await fetch('/api/user/megaphone-count', { credentials: 'include' });
        const data = (await res.json()) as MegaphoneCountResponse;
        if (data.success) {
          setMegaphoneCount(data.count);
        } else {
          setMegaphoneCount(0);
        }
      } catch (err) {
        console.error('❌ megaphone-count fetch 오류:', err);
        setMegaphoneCount(0);
      }
    };

    // ✅ 세 가지 API 병렬 실행
    fetchProfile();
    fetchWordCount();
    fetchMegaphoneCount();
  }, []);


  const handleNavigateWords = () => {
    console.log('Go to Words Page');
    navigate('/mywords');
  };

  const handlePaymentInquiry = () => {
    window.open("https://forms.gle/8w9meqD1YnP9qjnM8", "_blank");
  };

  const handleOpenFAQ = () => {
    window.open("https://jet-koi-be0.notion.site/28efb29d9d4680739120e18eb77eb511", "_blank");
  };

  const handleChangePassword = () => {
    navigate('/changepassword');
  };

  const handleChangeLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        console.log('✅ 로그아웃 성공');
        navigate('/login');
      } else {
        console.warn('⚠️ 로그아웃 실패');
      }
    } catch (err) {
      console.error('❌ 로그아웃 중 오류 발생:', err);
    }
  };

  const handleWithdraw = () => {
    setWithdrawMessage('정말로 회원을 탈퇴하시겠습니까? 탈퇴 후 정보는 복구되지 않습니다.');
    setShowWithdrawModal(true);
  };

  const confirmWithdraw = async () => {
    try {
      const res = await fetch('/api/auth/withdraw', {
        method: 'POST',
        credentials: 'include',
      });

      const data = (await res.json()) as WithdrawResponse;

      if (res.ok && data.success) {
        alert('회원탈퇴가 완료되었습니다.');
        navigate('/register');
      } else {
        alert(`회원탈퇴 실패: ${data.message || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('❌ 탈퇴 요청 실패:', err);
      alert('회원탈퇴 중 오류가 발생했습니다.');
    } finally {
      setShowWithdrawModal(false);
    }
  };

  return (
    <>
      {/* data-page="mypage" 유지 → halloween.css 의 [data-page="mypage"] 테마-제외 리셋이 계속 작동 */}
      <main
        data-page="mypage"
        className="flex flex-col items-center justify-start min-h-[80vh] bg-[var(--color-bg)] text-[var(--color-text)] pt-5 px-4 pb-20 box-border text-center max-[480px]:pt-2.5 max-[480px]:px-3 max-[480px]:pb-[60px]"
      >
        {/* 리디자인: 중앙 컬럼 (좌측 정렬 콘텐츠) */}
        <div className="w-full max-w-[460px] mx-auto text-left">
          {isActive && word && (
            /* 구 .mypage-current-word — 세션 배너 */
            <div className="w-full text-center text-[14px] text-[var(--color-on-accent)] bg-[var(--color-accent)] py-2 mb-4 rounded-[var(--radius-pill)]">
              지금 연결 중인 단어 · {word}
            </div>
          )}

          {/* 앱바 워드마크 */}
          <div className="text-center pt-2 pb-4">
            <span className="[font-family:'Judson',serif] text-[22px] min-[1025px]:text-[24px] font-bold text-[var(--main-title-color)]">
              Telepathy
            </span>
          </div>

          {/* 아이덴티티 블록 */}
          <div className="flex flex-col items-center gap-2.5 mb-8">
            <img
              className="w-[88px] h-[88px] min-[1025px]:w-24 min-[1025px]:h-24 rounded-full object-cover [box-shadow:0_0_0_4px_var(--avatar-ring)]"
              src={profileImage}
              alt="프로필"
            />
            <div className="text-center">
              <div className="[font-family:'Gowun_Batang',sans-serif] font-bold text-[20px] min-[1025px]:text-[22px] text-[var(--color-text-strong)] leading-tight">
                {nickname || '닉네임 로딩중...'}
              </div>
              <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">@{username || '...'}</div>
            </div>
          </div>

          {/* 내 정보 */}
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--section-label-color)] mb-2.5">내 정보</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[var(--stat-chip-bg)] [border:1px_solid_var(--color-border-subtle)] rounded-[var(--radius-md)] py-4 text-center">
              <div className="[font-family:'Judson',serif] text-[26px] font-bold text-[var(--main-title-color)] leading-none">{wordCount}</div>
              <div className="text-[12.5px] text-[var(--color-text-muted)] mt-1.5">텔레파시 횟수</div>
            </div>
            <div className="bg-[var(--stat-chip-bg)] [border:1px_solid_var(--color-border-subtle)] rounded-[var(--radius-md)] py-4 text-center">
              <div className="[font-family:'Judson',serif] text-[26px] font-bold text-[var(--main-title-color)] leading-none">{megaphoneCount}</div>
              <div className="text-[12.5px] text-[var(--color-text-muted)] mt-1.5">보유 확성기</div>
            </div>
          </div>
          {/* 구 .mypage-button-full → 행 버튼 + chevron */}
          <button
            onClick={handleNavigateWords}
            className="w-full flex items-center justify-between bg-[var(--color-surface)] [border:1px_solid_var(--word-btn-border)] rounded-[var(--radius-md)] [box-shadow:var(--card-shadow)] py-3.5 px-4 text-[14.5px] text-[var(--color-text)] cursor-pointer mb-8 hover:bg-[var(--color-surface-muted)]"
          >
            <span>누군가와 함께 떠올린 단어</span>
            <ChevronRight size={18} className="text-[var(--row-arrow)] shrink-0" />
          </button>

          {/* 계정 */}
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--section-label-color)] mb-2.5">계정</p>
          <div className="bg-[var(--color-surface)] [border:1px_solid_var(--word-btn-border)] rounded-[var(--radius-md)] [box-shadow:var(--card-shadow)] overflow-hidden mb-8 cursor-pointer mb-8 hover:bg-[var(--color-surface-muted)]">
            {[
              { label: '결제 문의', onClick: handlePaymentInquiry },
              { label: '자주 묻는 질문', onClick: handleOpenFAQ },
              { label: '비밀번호 변경', onClick: handleChangePassword },
            ].map((row) => (
              <button
                key={row.label}
                onClick={row.onClick}
                className="w-full flex items-center justify-between py-3.5 px-4 text-[14.5px] text-[var(--color-text)] bg-transparent [border-bottom:1px_solid_var(--color-border-subtle)] cursor-pointer hover:bg-[var(--color-surface-muted)]"
              >
                <span>{row.label}</span>
                <ChevronRight size={18} className="text-[var(--row-arrow)] shrink-0" />
              </button>
            ))}
            <button
              onClick={handleChangeLogout}
              className="w-full flex items-center justify-between py-3.5 px-4 text-[14.5px] text-[var(--color-text-secondary)] bg-transparent cursor-pointer hover:bg-[var(--color-surface-muted)]"
            >
              <span>로그아웃</span>
              <LogOut size={17} className="text-[var(--row-arrow)] shrink-0" />
            </button>
          </div>

          {/* 회원탈퇴 */}
          <div className="text-center">
            <button
              onClick={handleWithdraw}
              className="[font-family:'Gowun_Dodum',sans-serif] text-[var(--color-danger)] text-[13.5px] underline bg-transparent border-none cursor-pointer"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </main>

      {/* 미지원기능모달 */}
      {showNotSupportedModal && (
        <Modal>
          <p className="[font-family:'Gowun_Dodum'] text-[16px]">
            아직 지원하지 않는 기능이에요!
          </p>
          <div className="mt-4">
            <button className={modalBtn} onClick={() => setShowNotSupportedModal(false)}>
              확인
            </button>
          </div>
        </Modal>
      )}

      {/* 탈퇴 모달 */}
      {showWithdrawModal && (
        <Modal>
          <p className="[font-family:'Gowun_Dodum'] text-[16px]">
            {withdrawMessage}
          </p>
          <div className="mt-4">
            <button className={modalBtn} onClick={confirmWithdraw}>
              탈퇴하기
            </button>
            <button className={modalBtnCancel} onClick={() => setShowWithdrawModal(false)}>
              취소
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default MyPage;
