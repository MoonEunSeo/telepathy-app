import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useWordSession } from '../contexts/WordSessionContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { HelpCircle, Megaphone } from 'lucide-react';
import { socket } from '../config/socket';

import ClosedModal from '../components/ClosedModal';
import NicknameModal from '../components/NicknameModal';
import GuestLoginModal from '../components/GuestLoginModal';
import MegaphoneInputModal from '../components/MegaphoneInputModal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { recommendations } from '../utils/recommendations';
import { getStorage, setStorage, removeStorage } from '../types';
import type {
  Id,
  UserProfile,
  FeedbackInfo,
  ChatInfo,
  JoinMatchPayload,
  Emotion,
  FeedbackAddRequest,
  FeedbackAddResponse,
  ServerTimeResponse,
  SetNicknameResponse,
  MatchCurrentRoundResponse,
} from '../types';
import { ensureGuestSession, updateGuestNickname } from '../utils/guest';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '../hooks/useProfile';
import { megaphoneCountKey, fetchMegaphoneCount } from '../hooks/useMegaphoneCount';

// import useRandomSequence from '../hooks/useRandomSequence'; //단어셔플

// ── 구 MainPage.module.css → Tailwind 유틸 상수 (실사용 클래스만; word-timer/intent/
//    search/recommend 등은 죽은 컴포넌트분이라 변환에서 제외) ──────────────────
// 단어 버튼: paid/selected 조합의 특이도 충돌 회피 위해 "명시적 상태"로 계산(레이어링 X)
const wordBtnStruct =
  'rounded-[10px] py-3.5 px-2.5 text-[clamp(14px,4vw,16px)] cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed min-[1025px]:text-[18px] min-[1025px]:py-4 min-[1025px]:px-3.5 min-[1025px]:rounded-[12px] min-[1025px]:w-[160px]';
const wbNormal =
  '[background:var(--word-btn-bg)] [border:1.8px_solid_var(--word-btn-border)] text-[var(--word-btn-text)] font-medium [box-shadow:var(--word-btn-shadow)] [backdrop-filter:var(--word-btn-backdrop)] [transition:all_0.25s_ease] hover:[background:var(--word-btn-hover-bg)] hover:[border-color:var(--word-btn-hover-border)] hover:-translate-y-0.5';
const wbNormalSel =
  '[background:var(--word-btn-selected-bg)] [border:1.8px_solid_var(--word-btn-selected-border)] text-[var(--word-btn-selected-text)] font-semibold [box-shadow:0_6px_16px_rgba(47,36,26,0.28)] [transition:all_0.25s_ease]';
const wbPaid =
  '[background:var(--paid-btn-bg)] [border:1.8px_solid_var(--paid-btn-border)] text-[var(--paid-btn-text)] font-[550] [box-shadow:var(--paid-btn-shadow)] [backdrop-filter:blur(5px)] [transition:all_0.3s_ease] hover:[background:var(--paid-btn-hover-bg)] hover:[border-color:var(--paid-btn-hover-border)] hover:text-[var(--paid-btn-hover-text)] hover:-translate-y-[3px] hover:[box-shadow:var(--paid-btn-hover-shadow)]';
const wbPaidSel =
  '[background:var(--paid-btn-selected-bg)] [border:1.8px_solid_var(--paid-btn-selected-border)] text-[var(--paid-btn-selected-text)] font-semibold [box-shadow:var(--paid-btn-selected-shadow)] [backdrop-filter:blur(5px)] [transition:all_0.3s_ease] scale-[1.04]';
const wordBtnClass = (isPaid: boolean, sel: boolean) =>
  `${wordBtnStruct} ${isPaid ? (sel ? wbPaidSel : wbPaid) : sel ? wbNormalSel : wbNormal}`;

// 감정 버튼(피드백 모달)
const emoBase =
  "rounded-[12px] py-2 px-3.5 text-[0.95rem] cursor-pointer [transition:all_0.2s_ease-in-out] [font-family:'Gowun_Dodum',sans-serif] [border-width:1px] [border-style:solid] hover:scale-105 hover:[background:var(--emotion-btn-hover-bg)]";
const emoNormal =
  '[background:var(--emotion-btn-bg)] [border-color:var(--emotion-btn-border)] text-[var(--emotion-btn-text)]';
const emoSel =
  '[background:var(--emotion-btn-selected-bg)] [border-color:var(--emotion-btn-selected-border)] text-[var(--emotion-btn-selected-text)]';

// 좌하단 아이콘 버튼(help/megaphone — 구 .icon-buttons .help-icon/.megaphone-button 합성)
const iconBtn =
  'w-[50px] h-[50px] rounded-[12px] [border:1px_solid_var(--icon-btn-border)] [background:var(--icon-btn-bg)] text-[var(--icon-btn-text)] [box-shadow:var(--icon-btn-shadow)] flex items-center justify-center [transition:all_0.25s_ease-in-out] p-1.5 cursor-pointer hover:scale-105 hover:[background:var(--icon-btn-hover-bg)]';

export default function MainPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [onlineCount, setOnlineCount] = useState(0);

  const [round, setRound] = useState(0);
  const [wordSet, setWordSet] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(15);
  const [selectedWord, setSelectedWord] = useState('');
  const [fadeClass, setFadeClass] = useState('fade-in');

  // 확성기 관련 모달
  const [showMegaphoneModal, setShowMegaphoneModal] = useState(false);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [hasMegaphone, setHasMegaphone] = useState(false);

  const [showBizInfo, setShowBizInfo] = useState(false);

  // S1: 확성기 개수 조회를 공용 캐시와 공유 (MyPage 와 같은 queryKey)
  const queryClient = useQueryClient();

  //셔플에 필요한 애 (wordset포함)
  //const { getNextWordSet } = useRandomSequence();

  // 버튼 클릭 핸들러
  const handleMegaphoneClick = async () => {
    const seen = getStorage('seenMegaphoneIntro');
    if (!seen) {
      // 처음이면 설명 모달만 띄움
      setShowFirstTimeModal(true);
      return;
    }

    // 이미 본 경우 → 바로 DB 조회 후 모달 실행 (staleTime 안이면 캐시 사용)
    try {
      const data = await queryClient.fetchQuery({
        queryKey: megaphoneCountKey,
        queryFn: fetchMegaphoneCount,
      });

      if (data.success) {
        setShowMegaphoneModal(true);
        setHasMegaphone(data.count > 0);
      } else {
        console.error('메가폰 조회 실패:', data.message);
      }
    } catch (err) {
      console.error('메가폰 조회 에러:', err);
    }
  };

  // 설명 모달에서 "확인" 누를 때
  const handleFirstTimeConfirm = async () => {
    setStorage('seenMegaphoneIntro', 'true');
    setShowFirstTimeModal(false);

    // 설명 모달 닫고 DB 조회 → 실제 모달 실행 (staleTime 안이면 캐시 사용)
    try {
      const data = await queryClient.fetchQuery({
        queryKey: megaphoneCountKey,
        queryFn: fetchMegaphoneCount,
      });

      if (data.success) {
        setShowMegaphoneModal(true);
        setHasMegaphone(data.count > 0);
      } else {
        console.error('메가폰 조회 실패:', data.message);
      }
    } catch (err) {
      console.error('메가폰 조회 에러:', err);
    }
  };

  // === 메시지 발사 ===
  // 구매(PortOne 카드결제) 경로는 걷어냈다. 계좌이체 웹훅 결제로 대체 예정이며,
  // 그때까지 모달이 SKU 를 보내지 않으므로 여기 오는 값은 항상 메시지다.
  const handleMegaphoneSend = (message: string) => {
    try {
      socket.emit('megaphone:send', { message });
      toast.success('메시지가 발사되었습니다!');
      // 개수 감소(-1) → 캐시 무효화, 다음 조회는 신선한 값
      queryClient.invalidateQueries({ queryKey: megaphoneCountKey });
    } catch (err) {
      console.error('Megaphone 처리 오류:', err);
      toast.error('오류가 발생했습니다.');
    } finally {
      setShowMegaphoneModal(false);
    }
  };

  // 감정 피드백 모달
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackInfo, setFeedbackInfo] = useState<FeedbackInfo | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | ''>('');

  const { startSession } = useWordSession();

  // 운영시간 모달 상태
  const [showClosedModal, setShowClosedModal] = useState(false);

  // 운영시간 확인
  useEffect(() => {
    const checkTime = async () => {
      try {
        const res = await fetch('/api/server-time');
        const data = (await res.json()) as ServerTimeResponse;

        if (!data.isOpen) {
          setShowClosedModal(true);
        } else {
          setShowClosedModal(false);
          setRound(data.round);
          setRemaining(data.remaining);
        }
      } catch (err) {
        console.error('서버 시간 확인 오류:', err);
        const hour = new Date().getHours();
        if (hour < 20 || hour >= 24) setShowClosedModal(true);
        else setShowClosedModal(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // ✅ 유저 정보 state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [isGuest, setIsGuest] = useState(false); // 게스트 여부 확인

  // ✅ 유저 프로필 가져오기 — S1: 공용 캐시(useProfile)에서 받는다
  const { data: profileData, isError: profileError } = useProfile();
  useEffect(() => {
    // 비로그인/실패 시 게스트 신원으로 진행
    const applyGuestProfile = async () => {
      const guest = await ensureGuestSession();
      if (!guest) return;
      setProfile(guest);
      setIsGuest(true);
      // 게스트 닉네임 입력 모달 비활성화 (게스트는 기본 닉네임으로 진행)
      // if (!guest.nickname) setShowNicknameModal(true);
    };

    if (profileError) {
      applyGuestProfile(); // 네트워크 실패도 게스트로 진행함
      return;
    }
    if (profileData === undefined) return; // 아직 로딩 중

    if (profileData.profile) {
      setProfile({
        userId: profileData.profile.userId as Id,
        username: profileData.profile.username,
        nickname: profileData.profile.nickname,
      });
      if (!profileData.profile.nickname) setShowNicknameModal(true);
    } else {
      applyGuestProfile(); // 미로그인 -> 게스트
    }
  }, [profileData, profileError]);

  // ✅ 게스트가 매칭(대화) 종료 후 메인으로 돌아오면 → 회원 로그인 권유 (세션당 1회)
  //    ChatPage 의 endCurrentSession 이 navigate('/main', { state: { fromMatch: true } }) 로 신호를 준다.
  const [showGuestLoginModal, setShowGuestLoginModal] = useState(false);
  useEffect(() => {
    const fromMatch = (location.state as { fromMatch?: boolean } | null)?.fromMatch;
    if (!fromMatch || !isGuest) return;
    if (sessionStorage.getItem('guestLoginPromptShown') === '1') return; // 세션당 1회 캡
    sessionStorage.setItem('guestLoginPromptShown', '1');
    setShowGuestLoginModal(true);
  }, [location.state, isGuest]);

  // ✅ 닉네임 저장
  const handleSaveNickname = async (nickname: string) => {
    // 게스트면 서버 대신 로컬 저장
    if (isGuest) {
      const ok = await updateGuestNickname(nickname);
      if (!ok) return toast.error('닉네임 저장 실패');

      // 토큰이 재발급됐으므로 소켓도 새 토큰으로 다시 연결
      socket.disconnect();
      socket.connect();

      setProfile((prev) => ({ ...prev, nickname }) as UserProfile);
      setShowNicknameModal(false);
      toast.success('닉네임이 저장되었습니다!');
      return;
    }

    try {
      const res = await fetch('/api/nickname/set-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname }),
      });
      const data = (await res.json()) as SetNicknameResponse;
      if (data.success) {
        setProfile((prev) => ({ ...prev, nickname }) as UserProfile);
        setShowNicknameModal(false);
        toast.success('닉네임이 저장되었습니다!');
      } else {
        toast.error('닉네임 저장 실패: ' + data.message);
      }
    } catch (err) {
      console.error('닉네임 저장 오류:', err);
      toast.error('서버 오류로 저장 실패');
    }
  };

  // ✅ 온라인 카운트
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit('getOnlineCount');
    socket.on('onlineCount', (count) => {
      setOnlineCount(count);
    });

    return () => {
      socket.off('onlineCount');
    };
  }, []);

  // ✅ 랜덤 가짜 인원 추가 로직
  useEffect(() => {
    const fakeOffset = Math.floor(Math.random() * 3); // 초깃값 0~2명 랜덤
    setOnlineCount((prev) => prev + fakeOffset);

    const randomize = () => {
      // 1~5분 사이 랜덤 시간 설정
      const nextInterval = Math.floor(Math.random() * (5 * 60 * 1000 - 60 * 1000)) + 60 * 1000;
      // 1~4명 랜덤 증감 (더하거나 줄어들 수도 있음)
      const change = Math.floor(Math.random() * 5) - 1; // -1~+3 범위
      setOnlineCount((prev) => Math.max(1, prev + change)); // 최소 1명 이상
      // 다음 랜덤 타이머 재귀 설정
      setTimeout(randomize, nextInterval);
    };

    const timer = setTimeout(randomize, 3000); // 초기 3초 후 시작
    return () => clearTimeout(timer);
  }, []);

  // ✅ 매칭 이벤트 수신
  useEffect(() => {
    socket.on('matched', (data) => {
      const chatInfo: ChatInfo = {
        roomId: data.roomId,
        word: data.word,
        round: data.round,
        myId: data.senderId,
        myUsername: data.senderUsername,
        myNickname: data.senderNickname,
        partnerId: data.receiverId,
        partnerUsername: data.receiverUsername,
        partnerNickname: data.receiverNickname,
      };

      setStorage('chatInfo', chatInfo);
      startSession(chatInfo);
      navigate('/chatpage');
    });

    return () => {
      socket.off('matched');
    };
  }, [navigate, startSession]);

  // ✅ 라운드 동기화 — 소켓 push 기반 (S6: 1초 폴링 제거)
  // 라운드 전환은 서버가 15초 경계마다 'round:change' 로 알려준다.
  // 진입 시엔 라운드 중간일 수 있으므로 current-round 를 딱 1번 조회해 초기화한다.
  useEffect(() => {
    // 라운드 → 단어셋 적용 (순차 구조: round 로 인덱스 결정)
    const applyWordSet = (r: number) => {
      const idx = r % recommendations.length;
      setWordSet(recommendations[idx].words);
    };

    // 진입 시 1회 초기화 (라운드 중간 진입 대응)
    (async () => {
      try {
        const res = await fetch('/api/match/current-round');
        const data = (await res.json()) as MatchCurrentRoundResponse;
        applyWordSet(data.round);
        setRound(data.round);
        setRemaining(data.remaining);
      } catch (err) {
        console.error('라운드 초기화 실패:', err);
      }
    })();

    // 라운드 경계마다 서버가 push → 새 라운드로 전환 + 15초 리셋
    const onRoundChange = ({ round: nextRound }: { round: number }) => {
      setFadeClass('fade-out');
      setTimeout(() => {
        applyWordSet(nextRound);
        setRound(nextRound);
        setRemaining(15);
        setSelectedWord('');
        setFadeClass('fade-in');
      }, 500);
    };

    socket.on('round:change', onRoundChange);
    return () => {
      socket.off('round:change', onRoundChange);
    };
  }, []);

  // ✅ 클라이언트 카운트다운
  useEffect(() => {
    if (remaining <= 0) return;
    const tick = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [remaining]);

  // ✅ 단어 선택
  const handleWordSelect = (word: string) => {
    // ✅ 프로필이나 userId가 비어있으면 실행 막기
    if (!profile || !profile.userId) {
      toast.error('❌ 사용자 정보가 아직 불러와지지 않았어요. 잠시 후 다시 시도해주세요!');
      console.log('🚨 profile 누락 또는 userId 없음:', profile);
      return;
    }

    // ✅ (b) 닉네임 미설정 시 매칭 차단 → 닉네임 설정 모달로 유도
    //    JoinMatchPayload.nickname 이 항상 non-null 이 되도록 보장한다.
    if (!profile.nickname) {
      setShowNicknameModal(true);
      toast.info('먼저 닉네임을 설정해주세요!');
      return;
    }

    setSelectedWord(word);

    const payload: JoinMatchPayload = {
      nickname: profile.nickname,
      word,
      round,
    };

    console.log('📤 join_match emit payload:', payload);
    // ⚠️ 소켓이 끊겨 있으면(예: 직전 채팅 종료 시 disconnect) emit 은 에러 없이
    //    sendBuffer 에만 쌓이고 서버에 도달하지 않는다. 재연결을 먼저 보장한다
    //    (버퍼된 패킷은 연결 성립 시 자동 flush 됨).
    if (!socket.connected) socket.connect();
    socket.emit('join_match', payload);
  };

  // ✅ 감정 피드백 모달 띄우기
  useEffect(() => {
    const info = getStorage('feedbackInfo');
    if (info) {
      setFeedbackInfo(info);
      setShowFeedbackModal(true);
      removeStorage('feedbackInfo');
    }
  }, []);

  // ✅ 피드백 제출
  const handleSubmitFeedback = async () => {
    if (!selectedEmotion) {
      toast.error('감정을 선택해주세요!');
      return;
    }
    if (!feedbackInfo) return;

    const payload: FeedbackAddRequest = {
      userNickname: feedbackInfo.myNickname,
      partnerId: feedbackInfo.partnerId,
      partnerUsername: feedbackInfo.partnerUsername,
      partnerNickname: feedbackInfo.partnerNickname,
      word: feedbackInfo.word,
      emotion: selectedEmotion,
    };

    try {
      const res = await fetch('/api/feedback/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as FeedbackAddResponse;
      if (data.success) {
        toast.success('감정 피드백이 저장되었습니다!');
        setShowFeedbackModal(false);
      } else {
        toast.error('저장 실패: ' + data.message);
      }
    } catch (err) {
      console.error('❌ 피드백 저장 오류:', err);
      toast.error('서버 오류');
    }
  };

  return (
    <>
      {showNicknameModal && (
        <NicknameModal onClose={() => setShowNicknameModal(false)} onSave={handleSaveNickname} />
      )}

      {showGuestLoginModal && (
        <GuestLoginModal
          onLogin={() => navigate('/login')}
          onClose={() => setShowGuestLoginModal(false)}
        />
      )}

      {showClosedModal && <ClosedModal />}

      {/* 처음 설명 모달 (구 .firsttime-modal = 무스타일 래퍼 + 전역 .modal-content) */}
      {showFirstTimeModal && (
        <div>
          <div className="modal-content">
            <h2>🔊 확성기 안내</h2>
            <p>1분간 접속한 다른 사람들에게 내가 입력한 값을 전달할 수 있어요!</p>
            <button onClick={handleFirstTimeConfirm}>확인</button>
          </div>
        </div>
      )}

      {/* 확성기 모달 */}
      {showMegaphoneModal && (
        <MegaphoneInputModal
          onClose={() => setShowMegaphoneModal(false)}
          hasMegaphone={hasMegaphone}
          onSend={handleMegaphoneSend}
        />
      )}

      {/* 구 .telepathy-container */}
      <div className="relative box-border flex min-h-[80vh] flex-col items-center justify-center pt-[8vh] pb-[6vh]">
        {/* 원형 카운트다운 링 (구 .timer-display) */}
        <div className="mb-1 flex flex-col items-center">
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-full min-[1025px]:h-[120px] min-[1025px]:w-[120px]"
            style={
              {
                background:
                  'conic-gradient(var(--word-timer-ring) calc(var(--pct) * 360deg), var(--word-timer-track) 0)',
                '--pct': String(Math.max(0, Math.min(1, remaining / 15))),
              } as CSSProperties
            }
          >
            <div className="absolute inset-[9px] flex items-center justify-center rounded-full bg-[var(--color-bg)]">
              <span className="[font-family:'Judson','Gowun_Dodum',serif] text-[36px] leading-none font-bold text-[var(--word-timer-num)] min-[1025px]:text-[40px]">
                {remaining}
              </span>
              <span className="ml-0.5 text-[14px] text-[var(--word-timer-num)]">초</span>
            </div>
          </div>
        </div>
        {/* 구 .title */}
        <h1 className="mt-4 mb-2.5 [font-family:'Judson','Gowun_Dodum',serif] text-[clamp(34px,6vw,42px)] font-bold text-[var(--main-title-color)] min-[1025px]:text-[clamp(42px,3vw,54px)]">
          Telepathy
        </h1>
        {/* 구 .subtitle */}
        <p className="mt-1.5 max-w-[80%] text-center text-[clamp(15px,3.5vw,18px)] leading-[1.4] text-[var(--main-subtitle-color)] min-[1025px]:mt-2.5 min-[1025px]:text-[clamp(18px,1.5vw,22px)]">
          같은 단어를 선택한 사람과 연결돼요.
        </p>

        {/* 구 .word-set (+ fade-in/out 전환 상태) */}
        <div
          className={`mt-5 mb-10 grid min-h-[120px] w-[90%] max-w-[320px] grid-cols-2 gap-3 [transition:opacity_0.6s_ease,transform_0.6s_ease] min-[1025px]:mt-10 min-[1025px]:mb-[60px] min-[1025px]:min-h-[140px] min-[1025px]:gap-5 ${fadeClass === 'fade-in' ? 'translate-y-0 opacity-100' : 'translate-y-[10px] opacity-0'}`}
        >
          {wordSet.map((w) => {
            const isPaidSet = !!recommendations[round % recommendations.length].paid;
            return (
              <button
                key={w}
                className={`relative ${wordBtnClass(isPaidSet, selectedWord === w)}`}
                onClick={() => handleWordSelect(w)}
              >
                {isPaidSet && (
                  <span className="absolute -top-2.5 right-2.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold text-white [background:var(--paid-btn-selected-bg)]">
                    ✦ 확성기
                  </span>
                )}
                {w}
              </button>
            );
          })}
        </div>

        {showFeedbackModal && feedbackInfo && (
          /* 구 .feedback-modal */
          <div className="fixed top-0 left-0 z-[1000] flex h-full w-full items-center justify-center [background-color:var(--overlay)]">
            {/* 구 .feedback-content */}
            <div className="w-[300px] animate-[main-fade-in_0.3s_ease-out] rounded-[16px] px-5 py-6 text-center [font-family:'Gowun_Dodum',sans-serif] [box-shadow:var(--feedback-shadow)] [background:var(--feedback-bg)] [border:1px_solid_var(--feedback-border)]">
              <h2 className="mb-5 [font-family:'Judson','Gowun_Dodum',serif] text-[2.8rem] font-bold text-[var(--feedback-title-color)]">
                Telepathy
              </h2>
              <p className="mb-[18px] text-base text-[var(--feedback-desc-color)]">
                지금, 당신의 기분은 어떤가요?
              </p>
              {/* 구 .emotion-buttons */}
              <div className="mb-[18px] flex flex-wrap justify-center gap-2.5">
                {(['기뻐요', '괜찮아요', '슬퍼요', '행복해요', '화나요'] as const).map((emo) => (
                  <button
                    key={emo}
                    className={`${emoBase} ${selectedEmotion === emo ? emoSel : emoNormal}`}
                    onClick={() => setSelectedEmotion(emo)}
                  >
                    {emo}
                  </button>
                ))}
              </div>
              {/* 구 .submit-btn */}
              <button
                className="inline-block w-full cursor-pointer rounded-[10px] border-none px-0 py-3 [font-family:'Gowun_Dodum',sans-serif] text-base text-[var(--feedback-submit-text)] [background:var(--feedback-submit-bg)] [transition:background_0.3s_ease,transform_0.2s_ease] hover:-translate-y-0.5 hover:[background:var(--feedback-submit-bg-hover)]"
                onClick={handleSubmitFeedback}
                disabled={!selectedEmotion} // ✅ 감정 선택 전엔 비활성화
              >
                결정하기
              </button>
            </div>
          </div>
        )}

        {/* 구 .focus-hours (반응형 4단: 기본/태블릿/모바일/초소형) */}
        <div
          className="fixed bottom-[170px] left-1/2 z-[90] -translate-x-1/2 text-center [font-family:'Gowun_Dodum',sans-serif] text-[13px] leading-[1.6] font-normal text-[var(--focus-hours-color)] opacity-90 [transition:all_0.3s_ease] max-[767px]:bottom-[140px] max-[767px]:text-[9px]! max-[767px]:text-[#7d6a58] max-[360px]:bottom-[150px] max-[360px]:text-[11.6px] min-[768px]:max-[1024px]:bottom-[105px] min-[768px]:max-[1024px]:text-[#6b5847]"
          aria-live="polite"
        >
          텔레파시 집중운영시간: <strong>오후 8시 ~ 새벽 2시</strong>
        </div>
        {/* 구 footer (요소 셀렉터 → 유틸) */}
        <footer className="mt-[30px] p-[5px] text-center text-[12px] text-[var(--color-text-subtle)] min-[1025px]:mt-4 min-[1025px]:text-[13px]">
          <button
            className="cursor-pointer border-none bg-transparent text-[12px] text-[var(--color-text-secondary)]"
            onClick={() => setShowBizInfo(!showBizInfo)}
          >
            ⓒ Telepathy | 고객센터/사업자 정보
          </button>

          {showBizInfo && (
            /* 구 .biz-info(미정의) + footer div 규칙 */
            <div className="mt-2.5 text-[12px] text-[var(--color-text-subtle)]">
              <p>상호명 : 넥스트커넥트 | 대표자 : 이수현</p>
              <p>사업자등록번호 : 316-22-01911</p>
              <p>주소 : (06978) 서울 동작구 상도로55길 8, 404호</p>
              <p>대표 이메일 : telepathy.cs@gmail.com</p>
              <p>※ 통신판매업 신고 준비 중</p>
            </div>
          )}
        </footer>

        {/* ✅ 현재 접속자 수는 2명 이상일 때만 — 구 .online-counter → 라이브 상태 pill */}
        {onlineCount >= 2 && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--status-pill-bg)] px-3 py-1.5 text-[13px] font-medium text-[var(--status-pill-text)] [box-shadow:var(--card-shadow)]">
            <span className="h-[7px] w-[7px] [animation:pulseDot_1.6s_ease-in-out_infinite] rounded-full bg-[var(--live-dot)]"></span>
            지금 <strong className="font-bold">{onlineCount}</strong>명 접속 중
          </div>
        )}

        {/* 🎃 왼쪽 하단 아이콘 버튼 묶음 — 구 .icon-buttons */}
        <div className="fixed bottom-[90px] left-5 z-[100] flex flex-row items-center gap-[15px]">
          <button className={iconBtn} onClick={() => navigate('/helppage')}>
            <HelpCircle />
          </button>
          <button className={iconBtn} onClick={handleMegaphoneClick}>
            <Megaphone />
          </button>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
