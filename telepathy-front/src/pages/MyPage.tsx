import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useWordSession } from '../contexts/WordSessionContext';
import { useProfile } from '../hooks/useProfile';
import { useWordHistory } from '../hooks/useWordHistory';
import profileImage from '../assets/profile_image.png';
import Modal from '../components/ui/Modal';
import type { Id, MegaphoneCountResponse, WithdrawResponse } from '../types';

// 구 .login-button1 (모달 버튼, :global(.modal-content) 오버라이드 반영 = flex 1 1 45%/max140/pad10·0)
const modalBtn =
  '[background:var(--color-accent)] text-[var(--color-on-accent)] border-none rounded-[6px] text-[14px] cursor-pointer [transition:background-color_0.3s] flex-[1_1_45%] max-w-[140px] py-2.5 px-0 text-center hover:[background-color:#333]';
// 구 .login-button1.cancel
const modalBtnCancel =
  '[background:var(--color-neutral-hover)] [color:var(--color-text)] border-none rounded-[6px] text-[14px] cursor-pointer [transition:background-color_0.3s] flex-[1_1_45%] max-w-[140px] py-2.5 px-0 text-center hover:[background-color:#d0d0d0]';

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

  // S1: profile 은 공용 캐시(useProfile)에서 받는다 — 화면 전환 시 재요청 없음
  const { data: profileData } = useProfile();
  useEffect(() => {
    // 기존 동작 유지: 닉네임이 있을 때만 표시 상태에 반영
    if (profileData?.profile?.nickname) {
      setNickname(profileData.profile.nickname);
      setUsername(profileData.profile.username);
      setUserId(profileData.profile.userId);
    }
  }, [profileData]);

  // S1: 단어 개수도 공용 캐시(useWordHistory)에서 받는다 — MyWords 와 요청 공유
  const { data: wordHistory } = useWordHistory();
  useEffect(() => {
    setWordCount(wordHistory?.length ?? 0);
  }, [wordHistory]);

  useEffect(() => {
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

    // ✅ megaphone-count 만 직접 fetch (profile·word-history 는 공용 훅으로 이관)
    fetchMegaphoneCount();
  }, []);

  const handleNavigateWords = () => {
    console.log('Go to Words Page');
    navigate('/mywords');
  };

  const handlePaymentInquiry = () => {
    window.open('https://forms.gle/8w9meqD1YnP9qjnM8', '_blank');
  };

  const handleOpenFAQ = () => {
    window.open('https://jet-koi-be0.notion.site/28efb29d9d4680739120e18eb77eb511', '_blank');
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
        navigate('/');
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
        className="box-border flex min-h-[80vh] flex-col items-center justify-start bg-[var(--color-bg)] px-4 pt-5 pb-20 text-center text-[var(--color-text)] max-[480px]:px-3 max-[480px]:pt-2.5 max-[480px]:pb-[60px]"
      >
        {/* 리디자인: 중앙 컬럼 (좌측 정렬 콘텐츠) */}
        <div className="mx-auto w-full max-w-[460px] text-left">
          {isActive && word && (
            /* 구 .mypage-current-word — 세션 배너 */
            <div className="mb-4 w-full rounded-[var(--radius-pill)] bg-[var(--color-accent)] py-2 text-center text-[14px] text-[var(--color-on-accent)]">
              지금 연결 중인 단어 · {word}
            </div>
          )}

          {/* 앱바 워드마크 */}
          <div className="pt-2 pb-4 text-center">
            <span className="[font-family:'Judson',serif] text-[22px] font-bold text-[var(--main-title-color)] min-[1025px]:text-[24px]">
              Telepathy
            </span>
          </div>

          {/* 아이덴티티 블록 */}
          <div className="mb-8 flex flex-col items-center gap-2.5">
            <img
              className="h-[88px] w-[88px] rounded-full object-cover [box-shadow:0_0_0_4px_var(--avatar-ring)] min-[1025px]:h-24 min-[1025px]:w-24"
              src={profileImage}
              alt="프로필"
            />
            <div className="text-center">
              <div className="[font-family:'Gowun_Batang',sans-serif] text-[20px] leading-tight font-bold text-[var(--color-text-strong)] min-[1025px]:text-[22px]">
                {nickname || '닉네임 로딩중...'}
              </div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
                @{username || '...'}
              </div>
            </div>
          </div>

          {/* 내 정보 */}
          <p className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-[var(--section-label-color)] uppercase">
            내 정보
          </p>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--stat-chip-bg)] py-4 text-center [border:1px_solid_var(--color-border-subtle)]">
              <div className="[font-family:'Judson',serif] text-[26px] leading-none font-bold text-[var(--main-title-color)]">
                {wordCount}
              </div>
              <div className="mt-1.5 text-[12.5px] text-[var(--color-text-muted)]">
                텔레파시 횟수
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--stat-chip-bg)] py-4 text-center [border:1px_solid_var(--color-border-subtle)]">
              <div className="[font-family:'Judson',serif] text-[26px] leading-none font-bold text-[var(--main-title-color)]">
                {megaphoneCount}
              </div>
              <div className="mt-1.5 text-[12.5px] text-[var(--color-text-muted)]">보유 확성기</div>
            </div>
          </div>
          {/* 구 .mypage-button-full → 행 버튼 + chevron */}
          <button
            onClick={handleNavigateWords}
            className="mb-8 flex w-full cursor-pointer items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3.5 text-[14.5px] text-[var(--color-text)] [box-shadow:var(--card-shadow)] [border:1px_solid_var(--word-btn-border)] hover:bg-[var(--color-surface-muted)]"
          >
            <span>누군가와 함께 떠올린 단어</span>
            <ChevronRight size={18} className="shrink-0 text-[var(--row-arrow)]" />
          </button>

          {/* 계정 */}
          <p className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-[var(--section-label-color)] uppercase">
            계정
          </p>
          <div className="mb-8 cursor-pointer overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] [box-shadow:var(--card-shadow)] [border:1px_solid_var(--word-btn-border)]">
            {[
              { label: '결제 문의', onClick: handlePaymentInquiry },
              { label: '자주 묻는 질문', onClick: handleOpenFAQ },
              { label: '비밀번호 변경', onClick: handleChangePassword },
            ].map((row) => (
              <button
                key={row.label}
                onClick={row.onClick}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent px-4 py-3.5 text-[14.5px] text-[var(--color-text)] [border-bottom:1px_solid_var(--color-border-subtle)] hover:bg-[var(--color-surface-muted)]"
              >
                <span>{row.label}</span>
                <ChevronRight size={18} className="shrink-0 text-[var(--row-arrow)]" />
              </button>
            ))}
            <button
              onClick={handleChangeLogout}
              className="flex w-full cursor-pointer items-center justify-between bg-transparent px-4 py-3.5 text-[14.5px] text-[var(--color-text-secondary)]"
            >
              <span>로그아웃</span>
              <LogOut size={17} className="shrink-0 text-[var(--row-arrow)]" />
            </button>
          </div>

          {/* 회원탈퇴 */}
          <div className="text-center">
            <button
              onClick={handleWithdraw}
              className="cursor-pointer border-none bg-transparent [font-family:'Gowun_Dodum',sans-serif] text-[13.5px] text-[var(--color-danger)] underline"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </main>

      {/* 미지원기능모달 */}
      {showNotSupportedModal && (
        <Modal>
          <p className="[font-family:'Gowun_Dodum'] text-[16px]">아직 지원하지 않는 기능이에요!</p>
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
          <p className="[font-family:'Gowun_Dodum'] text-[16px]">{withdrawMessage}</p>
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
