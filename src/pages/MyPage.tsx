import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

// 구 .mypage-container hr (구분선) — 3곳 반복
const hrCls =
  "border-x-0 border-b-0 [border-top:1px_solid_rgba(255,240,200,0.6)] w-full rounded-full my-3 shadow-[0_0_3px_rgba(255,200,120,0.3)] max-[480px]:my-2";

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
        {/* 구 .mypage-inner (스타일 없던 빈 래퍼) */}
        <div>
          {isActive && word && (
            /* 구 .mypage-current-word */
            <div className="w-full max-w-[350px] text-center text-[14px] text-white bg-[#f5c5c5] py-1.5 mb-3 rounded-[6px]">
              지금 연결 중인 단어 : {word}
            </div>
          )}

          {/* 구 .mypage-title */}
          <h1 className="[font-family:'Judson',serif] text-[42px] font-bold mt-[10px] mb-[15px] text-center max-[480px]:mt-1">
            Telepathy
          </h1>

          {/* 구 .mypage-profile-image */}
          <img
            className="block w-[120px] h-[120px] rounded-full object-cover mx-auto mb-[15px] border border-[rgba(255,255,255,0.4)] shadow-[0_0_6px_rgba(0,0,0,0.15)] max-[480px]:w-[90px] max-[480px]:h-[90px]"
            src={profileImage}
            alt="프로필"
          />

          {/* 구 .mypage-nickname */}
          <div className="[font-family:'Gowun_Batang',sans-serif] font-bold text-[22px] mb-[15px]">
            {nickname || '닉네임 로딩중...'}
          </div>

          {/* 구 .mypage-section */}
          <div className="w-full max-w-[360px] text-center mb-[15px] text-[14px] leading-[1.8]">
            <hr className={hrCls} />
            {/* 구 .mypage-section-title */}
            <p className="[font-family:'Gowun_Batang',sans-serif] font-bold mb-2 text-[18px] max-[480px]:mb-1">| 내 정보 |</p>
            {/* 구 .mypage-text */}
            <p className="mb-[15px] text-[14px]">ID: {username || '불러오는 중...'}</p>
            <p className="mb-[15px] text-[14px]">
              텔레파시 횟수 : {wordCount} 번 / 보유 확성기 : {megaphoneCount} 개
            </p>
            {/* 구 .mypage-button-full */}
            <button
              onClick={handleNavigateWords}
              className="mt-2 py-2.5 px-3.5 [border:1px_solid_var(--color-border-strong)] bg-[var(--color-surface)] rounded-[20px] text-[14px] cursor-pointer [transition:all_0.2s_ease] w-full max-w-[230px] hover:bg-[#fafafa] max-[480px]:mt-1.5 max-[480px]:py-2 max-[480px]:px-2.5"
            >
              {'>'} 누군가와 함께 떠올린 단어
            </button>
          </div>

          <hr className={hrCls} />
          {/* 구 .mypage-section */}
          <div className="w-full max-w-[360px] text-center mb-[15px] text-[14px] leading-[1.8]">
            <p className="[font-family:'Gowun_Batang',sans-serif] font-bold mb-2 text-[18px] max-[480px]:mb-1">| 계정 |</p>
            {/* 구 .mypage-button-group */}
            <div className="flex flex-col items-center gap-2.5 mt-4 w-full max-[480px]:gap-1.5 max-[480px]:mt-[15px]">
              {/* 구 .mypage-button (×4) */}
              <button onClick={handlePaymentInquiry} className="[font-family:'Gowun_Dodum',sans-serif] py-1.5 px-3 rounded-[6px] text-[14px] text-[var(--color-text)] bg-transparent border-none cursor-pointer [transition:color_0.2s_ease] hover:text-black">
                결제 문의
              </button>
              <button onClick={handleOpenFAQ} className="[font-family:'Gowun_Dodum',sans-serif] py-1.5 px-3 rounded-[6px] text-[14px] text-[var(--color-text)] bg-transparent border-none cursor-pointer [transition:color_0.2s_ease] hover:text-black">
                자주묻는질문
              </button>
              <button onClick={handleChangePassword} className="[font-family:'Gowun_Dodum',sans-serif] py-1.5 px-3 rounded-[6px] text-[14px] text-[var(--color-text)] bg-transparent border-none cursor-pointer [transition:color_0.2s_ease] hover:text-black">
                비밀번호 변경
              </button>
              <button onClick={handleChangeLogout} className="[font-family:'Gowun_Dodum',sans-serif] py-1.5 px-3 rounded-[6px] text-[14px] text-[var(--color-text)] bg-transparent border-none cursor-pointer [transition:color_0.2s_ease] hover:text-black">
                로그아웃
              </button>
            </div>
          </div>

          <hr className={hrCls} />
          {/* 구 .mypage-withdraw-button */}
          <button
            onClick={handleWithdraw}
            className="mt-5 [font-family:'Gowun_Dodum',sans-serif] text-[#d84f4f] font-bold text-[14px] underline bg-transparent border-none cursor-pointer max-[480px]:mt-3"
          >
            회원탈퇴
          </button>
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
