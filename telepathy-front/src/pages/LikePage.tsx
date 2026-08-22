import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { apiAxios } from '../lib/axiosClient';
// ?no-inline — 4 kB 미만이면 Vite 가 base64 로 번들에 넣는데, 이 QR 은 두 곳에서 쓰여
// 인라인되면 메인 번들에 3.8 kB 가 중복으로 들어간다. 후원 화면에서만 필요하므로 별도 파일로 둔다.
import tossQr from '../assets/toss_qr.png?no-inline';

import { useProfile } from '../hooks/useProfile';
import type {
  CurrentUser,
  Wordset,
  WordsetsMineResponse,
  UserByIdResponse,
  SpPaymentStatusResponse,
} from '../types';

type PaymentStatus = 'idle' | 'pending' | 'checking' | 'paid' | 'expired';

// ── 구 LikePage.module.css → Tailwind 유틸 상수 ──────────────────────────
// 컨테이너(레이아웃 + 진입 페이드) — 구 .like-container(2정의 병합)
const likeContainer =
  "relative flex flex-col items-center justify-start pt-20 px-5 pb-[calc(100px_+_env(safe-area-inset-bottom))] [background:linear-gradient(180deg,#fcf9f4_0%,#f8f5f0_100%)] [font-family:'Gowun_Dodum',sans-serif] text-center min-h-screen box-border overflow-y-auto opacity-0 [animation:like-fade-in-page_0.9s_cubic-bezier(0.45,0,0.55,1)_forwards]";
// 자식 순차 등장 공통(구 .like-container .like-* 스태거) — 뒤에 [animation-delay:*] 부착
const animUp =
  'opacity-0 [transform:translateY(15px)] [animation:like-fade-up_0.9s_ease-in-out_forwards]';
// ::before 라이트 스윕 + ::after 별가루 (구 .like-button 의사요소)
const sparkle =
  "before:content-[''] before:absolute before:top-0 before:left-[-80%] before:w-[40%] before:h-full before:[background:var(--like-sweep)] before:[transform:skewX(-20deg)] before:opacity-0 before:[transition:all_0.8s_ease] hover:before:left-[130%] hover:before:opacity-100 hover:before:[transition:all_1.1s_ease] " +
  "after:content-[''] after:absolute after:inset-0 after:[background-image:var(--like-stars-image)] after:[background-size:var(--like-stars-size)] after:opacity-0 after:[filter:blur(0.3px)] after:[transition:opacity_0.5s_ease] hover:after:opacity-10 hover:after:[animation:like-star-drift_6s_linear_infinite_alternate]";
// 구 .like-button (그라디언트 + 스윕/별가루) + 진입 스태거(delay 0.45s)
const likeBtn = `relative overflow-hidden [background:var(--like-btn-bg)] text-white py-4 px-[100px] border-none rounded-full text-[17px] font-bold cursor-pointer [box-shadow:0_6px_14px_rgba(0,0,0,0.25)] [transition:all_0.3s_ease] hover:-translate-y-0.5 hover:[background:var(--like-btn-bg-hover-strong)] hover:[box-shadow:0_8px_18px_rgba(180,130,130,0.25)] max-[480px]:text-[15px] max-[480px]:px-[60px] max-[480px]:py-3.5 ${sparkle} ${animUp} [animation-delay:0.45s]`;
// 구 .deposit-button
const depositBtn =
  '[background:var(--like-btn-bg)] text-white py-3.5 px-[70px] border-none rounded-full text-[16px] font-semibold cursor-pointer [box-shadow:0_6px_14px_rgba(0,0,0,0.25)] [transition:all_0.3s_ease] mt-5 hover:[background:var(--like-btn-bg-hover)] hover:-translate-y-0.5 hover:[box-shadow:0_8px_20px_rgba(0,0,0,0.3)]';
// 구 .modal-box button + .modal-button(확인) / .modal-cancel(취소)
const modalBtn =
  '[background:var(--like-btn-bg)] text-white py-2.5 px-[22px] border-none rounded-full text-[15px] font-semibold cursor-pointer [transition:all_0.25s_ease] m-[10px_6px_0] hover:[background:var(--like-btn-bg-hover)] hover:-translate-y-px';
const modalCancel =
  'bg-[#f1efec] text-[var(--color-text-warm)] py-2.5 px-[22px] border-none rounded-full text-[15px] font-semibold cursor-pointer [transition:all_0.25s_ease] m-[10px_6px_0] hover:bg-[#e4e0db]';
// 구 .deposit-title / .deposit-text / .deposit-container / .qr-card / .modal-overlay(스코프)
const depositTitle =
  "[font-family:'Judson','Gowun_Dodum',serif] text-[20px] text-[var(--color-text-warm)] font-semibold mb-2 relative text-center";
const depositText = 'text-[16px] text-[#5b5146] leading-[1.6] text-center';
const depositContainer =
  'flex flex-col justify-center items-center text-center min-h-[calc(100vh_-_60px)] px-5 [transform:translateY(-5%)] bg-[#fcf9f4]';
const qrCard =
  'bg-[var(--color-surface)] pt-6 px-6 pb-4 rounded-[18px] [box-shadow:0_6px_20px_rgba(0,0,0,0.08)] mb-5 [transition:all_0.3s_ease] hover:-translate-y-[3px] hover:[box-shadow:0_10px_24px_rgba(0,0,0,0.12)]';
const modalOverlay =
  'fixed inset-0 bg-[rgba(0,0,0,0.45)] [backdrop-filter:blur(5px)] flex justify-center items-center z-[999] [animation:like-fade-in_0.25s_ease-in-out_forwards]';
// 구 .like-info / .like-warning (스태거 delay 는 사용처에서 부착)
const likeInfo =
  'text-[#8c817a] text-[0.9rem] leading-[1.6] mt-[50px] max-w-[420px] max-[480px]:text-[0.8rem] max-[480px]:mt-10';

const LikesPage = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('idle'); // idle → pending → checking → paid → expired
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [realName, setRealName] = useState('');
  const amount = 1000;

  // ✅ [1] 사용자 정보 불러오기
  const [myWordSets, setMyWordSets] = useState<Wordset[]>([]); // ✅ 안전한 초기값 설정

  // S1: profile 은 공용 캐시(useProfile)에서 받는다. currentUser 가 세팅되면
  // 아래 [2] effect 가 단어세트를 조회하므로, 여기서 연쇄 조회하던 로직은 제거했다.
  const { data: profileData } = useProfile();
  useEffect(() => {
    if (profileData === undefined) return; // 아직 로딩 중
    if (profileData.profile) {
      setCurrentUser({
        id: profileData.profile.userId,
        nickname: profileData.profile.nickname,
        username: profileData.profile.username,
      });
    }
    setLoading(false);
  }, [profileData]);

  // ✅ [2] 내 단어세트 불러오기
  useEffect(() => {
    if (!currentUser) return;

    const fetchWordSets = async () => {
      try {
        const res = await apiAxios.get<WordsetsMineResponse>(
          `/api/wordsets/mine/${currentUser.id}`,
          {
            withCredentials: true,
          },
        );
        if (res.data.success && Array.isArray(res.data.wordsets)) {
          setMyWordSets(res.data.wordsets);
        }
      } catch (err) {
        console.error('❌ 단어세트 조회 실패:', err);
      }
    };

    fetchWordSets();
  }, [currentUser]);

  // ✅ [3] 입금하기 버튼 클릭 → 실명 확인 & 모달 표시
  const handleDepositClick = async () => {
    if (!currentUser) return;

    try {
      // 🔍 user 테이블에서 실명 조회
      const res = await apiAxios.get<UserByIdResponse>('/api/user/me', {
        withCredentials: true,
      });
      const savedName = res.data?.real_name;

      if (savedName) {
        console.log('✅ 실명 이미 등록됨:', savedName);
        setRealName(savedName);
        handleStartPayment(savedName); // 바로 결제 프로세스 실행
      } else {
        console.log('⚠️ 실명 없음 → 입력 필요');
        setShowNameModal(true); // 실명 입력 모달 오픈
      }
    } catch (err) {
      console.error('❌ 실명 조회 실패:', err);
      alert('서버에서 사용자 정보를 불러오지 못했습니다. 다시 시도해주세요.');
    }
  };

  // ✅ [4] 실명 입력 모달 → 저장 후 결제 시작
  const handleSaveNameAndStart = async () => {
    if (!realName.trim()) return alert('실명을 입력해주세요!');

    try {
      await apiAxios.post(
        `/api/user/update-realname`,
        { user_id: currentUser!.id, real_name: realName },
        { withCredentials: true },
      );
      console.log('✅ 실명 저장 완료:', realName);
      setShowNameModal(false);
      handleStartPayment(realName);
    } catch (err) {
      console.error('❌ 실명 저장 실패:', err);
    }
  };

  //✅ [5] 결제 생성 (공통 로직)
  const handleStartPayment = async (finalName: string) => {
    try {
      await apiAxios.post(
        `/api/sp_payments/create`,
        {
          name: finalName,
          amount,
        },
        { withCredentials: true },
      );

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setStatus('pending');

      if (isMobile) {
        const mobileTossLink = `supertoss://send?amount=${amount}&bank=${encodeURIComponent(
          '케이뱅크',
        )}&accountNo=100121028199&origin=qr`;
        window.location.href = mobileTossLink;
        setTimeout(() => setStatus('checking'), 2000);
      }
    } catch (err) {
      console.error('❌ 결제 생성 오류:', err);
    }
  };

  // ✅ [6] PC에서 입금확인 버튼 클릭
  const handleCheckDeposit = () => {
    setStatus('checking');
    setTimer(60);
  };

  // ✅ [7] 60초 동안 결제 상태 주기적 확인
  useEffect(() => {
    if (status !== 'checking' || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiAxios.get<SpPaymentStatusResponse>('/api/sp_payments/status', {
          withCredentials: true,
        });

        if (res.data.status === 'paid') {
          clearInterval(interval);
          setStatus('paid');
          setShowSuccessModal(true);
        }
      } catch (err) {
        console.error('❌ 상태 확인 실패:', err);
      }

      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    // 타이머 만료 처리
    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === 'paid' ? prev : 'expired'));
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status, currentUser]);

  // ✅ [9] 기본 로딩 / 로그인 체크
  if (loading) return <h3 className="text-center">로딩 중입니다 ⏳</h3>;
  if (!currentUser)
    return (
      <div className={likeContainer}>
        <h3>로그인 후 이용 가능한 서비스예요 🔒</h3>
        <a href="/login" className={likeBtn}>
          로그인하러 가기
        </a>
      </div>
    );

  // ======================= 렌더링 =======================

  //💬 [1] 초기 상태
  if (status === 'idle') {
    return (
      <div className={likeContainer}>
        {/* 구 .like-title (그라디언트 텍스트) + 스태거 delay 0.1s */}
        <h1
          className={`mb-7 [background-image:var(--like-title-grad)] [background-clip:text] [font-family:'Judson','Gowun_Dodum',serif] text-[64px] tracking-[0.5px] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] max-[480px]:text-[44px] ${animUp} [animation-delay:0.1s]`}
        >
          Telepathy
        </h1>
        <p
          className={`mb-10 text-[18px] leading-[1.9] text-[#6e655d] max-[480px]:mb-[30px] max-[480px]:text-[15px] max-[480px]:leading-[1.7] ${animUp} [animation-delay:0.25s]`}
        >
          텔레파시에 등장하는 단어들을 직접 만들어보세요!
          <br />
          당신이 원하는 단어로 연결되는 짜릿함을 느껴보세요💫
        </p>
        <button onClick={handleDepositClick} className={likeBtn}>
          단어세트 직접 만들기 🐈‍⬛
        </button>

        <p className={`${likeInfo} ${animUp} [animation-delay:0.65s]`}>
          1,000원에 4개 단어 1세트를 추가 할 수 있습니다.
          <br />
          <br />
          부적절한 단어(종교,정치,19,욕설 등)는 검토 후 반영이 <br />
          거부 될 수 있으며 결제 금액은 입력하신 계좌로 환불됩니다.
          <br />
          <br />
          텔레파시 반영까지는 최대 24시간이 소요됩니다.
        </p>

        {/* 구 .like-warning + 스태거 delay 0.8s */}
        <p
          className={`mt-10 text-[0.85rem] leading-[1.6] font-medium text-[#d87777] max-[480px]:text-[0.8rem] ${animUp} [animation-delay:0.8s]`}
        >
          ⚠️ 입금자명(실명)과 결제 정보가 일치하지 않으면
          <br />
          결제가 승인되지 않으며 환불 대상에서도 제외됩니다.
        </p>

        <p className={likeInfo}>결제 오류가 발생했나요? 마이페이지 → 결제문의에서 알려주세요!🙏</p>

        {/* ✅ 실명 입력 모달 — 구 .modal-overlay(스코프) / .modal-box */}
        {showNameModal && (
          <div className={modalOverlay}>
            <div className="w-[320px] max-w-[85%] [animation:like-fade-up_0.3s_ease-in-out] rounded-[16px] bg-[#fffefc] px-6 py-7 text-center [font-family:'Gowun_Dodum',sans-serif] [box-shadow:0_10px_40px_rgba(0,0,0,0.15)] hover:scale-[1.01] hover:[box-shadow:0_12px_45px_rgba(0,0,0,0.18)] hover:[transition:all_0.3s_ease]">
              <h3 className="mb-4 text-[18px] leading-[1.4] font-semibold text-[var(--color-text-warm)]">
                입금자명(실명)을 입력해주세요 🙏
              </h3>
              <input
                type="text"
                value={realName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRealName(e.target.value)}
                placeholder="예: 홍길동"
                className="mx-auto box-border block w-full rounded-[10px] bg-[#fbf9f6] px-3.5 py-3 [font-family:'Gowun_Dodum',sans-serif] text-[15px] leading-[1.4] text-[var(--color-text-warm)] [box-shadow:inset_0_1px_3px_rgba(0,0,0,0.04)] outline-none [border:1.4px_solid_#d8d2cb] [transition:all_0.25s_ease] placeholder:text-[#b2a9a0] placeholder:italic focus:scale-[1.01] focus:[border-color:#d4a3a8] focus:bg-[var(--color-surface)] focus:[box-shadow:0_0_0_3px_rgba(212,163,168,0.2)]"
              />
              <div className="mt-[15px]">
                <button onClick={handleSaveNameAndStart} className={modalBtn}>
                  확인
                </button>
                <button onClick={() => setShowNameModal(false)} className={modalCancel}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ 내가만든 단어세트구역 (section/list/item/button/status 는 구 미스타일) */}
        {myWordSets.length > 0 && (
          <div>
            <h4 className="mb-3 [font-family:'Gowun_Dodum',sans-serif] text-[1.8rem] font-bold text-[#1e120b]">
              내가 신청한 단어세트
            </h4>
            <div>
              {myWordSets.map((set, i) => (
                <div key={i}>
                  <button>{set.words?.join(', ') || '단어 없음'}</button>
                  <span>- 처리중</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 💬 [2] 입금 안내
  if (status === 'pending') {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile)
      return (
        <div className={`${likeContainer} justify-center!`}>
          <h3 className={depositTitle}>토스 앱으로 이동 중입니다... 📱</h3>
          <p className={depositText}>입금 후 이 페이지로 돌아오시면 자동으로 확인이 시작돼요.</p>
        </div>
      );

    return (
      <div className={likeContainer}>
        <h3 className={depositTitle}>입금 안내</h3>
        <p className={depositText}>📱 휴대폰 토스 앱으로 아래 QR을 스캔해주세요.</p>
        {/* 구 .deposit-warning */}
        <p className="mb-[26px] inline-block rounded-[10px] bg-[rgba(255,225,225,0.6)] px-[18px] py-2.5 text-[15px] font-semibold text-[var(--color-danger-warm)] [border:1px_solid_#f0bdbd]">
          ⚠️아래 입금 확인하기 버튼을 누르신 후 60초 안에 결제를 완료해주세요.
        </p>
        <div className={qrCard}>
          <img src={tossQr} alt="Toss QR" className="h-[200px] w-[200px] rounded-[8px]" />
        </div>

        {/* 구 .deposit-account */}
        <p className="mt-3.5 text-[15px] font-medium text-[var(--color-text-warm)]">
          케이뱅크 100-121-028199 (문*서)
        </p>

        <button onClick={handleCheckDeposit} className={depositBtn}>
          입금 확인하기 ⏱
        </button>

        <p className={likeInfo}>결제 오류가 발생했나요? 마이페이지 → 결제문의에서 알려주세요!🙏</p>
      </div>
    );
  }

  // 💬 [3] 입금 확인 중
  if (status === 'checking' && timer > 0) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    return (
      <div className={depositContainer}>
        {/* ✅ PC일 때만 QR 표시 */}
        {!isMobile && (
          <div className={qrCard}>
            <img src={tossQr} alt="Toss QR" className="h-[200px] w-[200px] rounded-[8px]" />
          </div>
        )}

        <h3 className={depositTitle}>입금 확인 중입니다 ⏳</h3>
        <p className={depositText}>{timer}초 남았습니다</p>
      </div>
    );
  }

  // 💬 [4] 입금 완료
  if (status === 'paid') {
    return (
      <>
        {showSuccessModal && (
          <div className={modalOverlay}>
            <div className={qrCard}>
              <h3 className={depositTitle}>입금이 확인되었어요! 🎉</h3>
              <p className={depositText}>
                나만의 단어 세트를
                <br />
                만들어볼까요?
              </p>
              <button onClick={() => (window.location.href = '/wordset')} className={depositBtn}>
                만들러 가기 ✨
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // 💬 [5] 만료
  if (status === 'expired') {
    return (
      <div className={depositContainer}>
        <h3 className={depositTitle}>입금 시간이 만료되었어요 😢</h3>
        <button onClick={() => setStatus('idle')} className={depositBtn}>
          다시 시도하기
        </button>
      </div>
    );
  }
};

export default LikesPage;
