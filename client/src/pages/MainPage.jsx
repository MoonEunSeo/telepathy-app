/*
import React, { useState, useEffect } from 'react';
import { useWordSession } from '../contexts/WordSessionContext';
import WordConfirmModal from '../components/WordConfirmModal';
import NicknameModal from '../components/NicknameModal';
import WordTimer from '../components/WordTimer';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import './MainPage.css';
import SearchIcon from '../assets/SearchIcon.svg';
import { recommendations } from '../assets/recommendations';

export default function MainPage() {
  const navigate = useNavigate();

  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [recommendClass, setRecommendClass] = useState("recommend-transition"[0]);
  const [isComposing, setIsComposing] = useState(false);

  const {
    word: selectedWord,
    isSessionActive: sessionActive,
    startSession,
    endSession,
    startTime
  } = useWordSession();

  // ✅ 추천 단어 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setRecommendClass("recommend-transition");
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % recommendations.length);
        setRecommendClass("recommend-transition recommend-visible");
      }, 3000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);


  const handleInputChange = (e) => {
    setWord(e.target.value); // 필터링 없이 그대로 반영
    setError('');
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    const input = e.target.value;
    const onlyKorean = input.replace(/[^가-힣]/g, ''); // ✅ 한글만 허용
    setWord(onlyKorean.slice(0, 20));
  };


  const handleWordSubmit = () => {
    const filteredWord = word.replace(/[^가-힣]/g, '');
    if (!filteredWord) {
      setError('한글 단어만 입력해주세요.');
      return;
    }
    setShowModal(true);
  };

  
  const handleWordConfirm = async () => {
    const filteredWord = word.replace(/[^가-힣]/g, '');
    if (!filteredWord) {
      toast.error('❌ 한글만 입력할 수 있어요.');
      return;
    }

    try {
      const res = await fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word: filteredWord }),
      });
      const data = await res.json();

      if (data.success) {
        startSession(filteredWord); // ✅ 성공 후 세션 시작
        setShowModal(false);
        toast.success('✨ 매칭을 시작합니다.');
      } else {
        toast.error('❌ 매칭 시작 실패');
      }
    } catch (err) {
      console.error('세션 시작 오류:', err);
      toast.error('❌ 서버 오류로 매칭을 시작할 수 없습니다.');
    }
  };


  const handleSaveNickname = async (nickname) => {
    try {
      const res = await fetch('/api/nickname/set-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNicknameModal(false);
        toast.success('닉네임이 저장되었습니다!');
      } else toast.error('닉네임 저장 실패: ' + data.message);
    } catch (err) {
      console.error('닉네임 저장 오류:', err);
      toast.error('서버 오류로 저장 실패');
    }
  };

 
  useEffect(() => {
    const checkNickname = async () => {
      try {
        const res = await fetch('/api/nickname/profile', { credentials: 'include' });
        const data = await res.json();
        if (data.success && !data.nickname) setShowNicknameModal(true);
      } catch (err) {
        console.error('닉네임 확인 중 오류:', err);
      }
    };
    checkNickname();
  }, []);

  useEffect(() => {
    if (!sessionActive || !selectedWord) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/match/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ word: selectedWord }),
        });
        const data = await res.json();
        if (data.matched) {
          localStorage.setItem('chatInfo', JSON.stringify({
            roomId: data.roomId,
            myId: data.senderId,
            myNickname: data.senderNickname,
            partnerId: data.receiverId,
            partnerNickname: data.receiverNickname,
            word: selectedWord
          }));

          toast.success('✨ 연결되었습니다! 잠시 후 채팅으로 이동합니다.', { autoClose: 5000 });

          clearInterval(interval);
          setTimeout(() => {
            navigate('/chatpage');
          }, 2000);
        }
      } catch (err) {
        console.error('매칭 확인 중 오류:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionActive, selectedWord, navigate]);

  return (
    <>
      {showNicknameModal && (
        <NicknameModal onClose={() => setShowNicknameModal(false)} onSave={handleSaveNickname} />
      )}

      <div className="login-container">
        {sessionActive && (
          <WordTimer
            word={selectedWord || word}
            displayedText={selectedWord || word}
            onExpire={() => {
              toast.error('⏰ 5분 내 연결이 되지 않았어요.');
              endSession();
            }}
          />
        )}

        <h1 className="title">Telepathy</h1>
        <p className="subtitle">누군가 지금,<br />이 단어를 기다리고 있어요.</p>

        <p className="recommend-word">
          • 추천 단어 :
          <span className={recommendClass}>
            「{recommendations[currentIdx]}」
          </span>
        </p>

        <div className="search-box">
          <input
            className="search-input"
            placeholder="단어를 입력하세요."
            value={word}
            onChange={handleInputChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={(e) => e.key === 'Enter' && handleWordSubmit()}
          />
          <button className="search-btn" onClick={handleWordSubmit}>
            <img src={SearchIcon} alt="검색" />
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button className="help-icon" onClick={() => navigate('/helppage')}>
          <HelpCircle />
        </button>

        {showModal && (
          <WordConfirmModal
            word={word}
            onConfirm={handleWordConfirm}
            onCancel={() => setShowModal(false)}
          />
        )}

        <ToastContainer />
      </div>
    </>
  );
}
*/

/*
-----------위로 모달없이, 8~12시 텔파 집중시간 ------------
import React, { useState, useEffect } from 'react';
import { useWordSession } from '../contexts/WordSessionContext';
import WordConfirmModal from '../components/WordConfirmModal';
import NicknameModal from '../components/NicknameModal';
import WordTimer from '../components/WordTimer';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import './MainPage.css';
import SearchIcon from '../assets/SearchIcon.svg';
import { recommendations } from '../assets/recommendations';

export default function MainPage() {
  const navigate = useNavigate();

  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [recommendClass, setRecommendClass] = useState("recommend-transition"[0]);
  const [isComposing, setIsComposing] = useState(false);

  // ✅ 피드백 모달 상태
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackInfo, setFeedbackInfo] = useState(null);
  const [selectedEmotion, setSelectedEmotion] = useState('');

  const {
    word: selectedWord,
    isSessionActive: sessionActive,
    startSession,
    endSession,
    startTime
  } = useWordSession();

// ✅ 추천 단어 애니메이션
useEffect(() => {
  setRecommendClass("recommend-transition recommend-visible"); // ✅ 처음부터 visible

  const interval = setInterval(() => {
    setRecommendClass("recommend-transition"); // ✅ 먼저 fade-out
    setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % recommendations.length); // ✅ 단어 변경
      setRecommendClass("recommend-transition recommend-visible"); // ✅ fade-in
    }, 1000); // ✅ 1초 후 새 단어 등장
  }, 30000); // ✅ 30초마다 실행

  return () => clearInterval(interval);
}, []);

  //✅ 입력 처리 (iOS 대응)
  const handleInputChange = (e) => {
    setWord(e.target.value);
    setError('');
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    const input = e.target.value;
    const onlyKorean = input.replace(/[^가-힣]/g, '');
    setWord(onlyKorean.slice(0, 20));
  };

  //✅ 단어 확인 버튼 클릭
  const handleWordSubmit = () => {
    const filteredWord = word.replace(/[^가-힣]/g, '');
    if (!filteredWord) {
      setError('한글 단어만 입력해주세요.');
      return;
    }
    setShowModal(true);
  };

  //✅ 매칭 시작 (API 성공 시에만 세션 시작)
  const handleWordConfirm = async () => {
    const filteredWord = word.replace(/[^가-힣]/g, '');
    if (!filteredWord) {
      toast.error('❌ 한글만 입력할 수 있어요.');
      return;
    }

    try {
      const res = await fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word: filteredWord }),
      });
      const data = await res.json();

      if (data.success) {
        startSession(filteredWord);
        setShowModal(false);
        toast.success('✨ 매칭을 시작합니다.');
      } else {
        toast.error('❌ 매칭 시작 실패');
      }
    } catch (err) {
      console.error('세션 시작 오류:', err);
      toast.error('❌ 서버 오류로 매칭을 시작할 수 없습니다.');
    }
  };

  // ✅ 닉네임 저장
  const handleSaveNickname = async (nickname) => {
    try {
      const res = await fetch('/api/nickname/set-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNicknameModal(false);
        toast.success('닉네임이 저장되었습니다!');
      } else toast.error('닉네임 저장 실패: ' + data.message);
    } catch (err) {
      console.error('닉네임 저장 오류:', err);
      toast.error('서버 오류로 저장 실패');
    }
  };

  //✅ 닉네임 확인
  useEffect(() => {
    const checkNickname = async () => {
      try {
        const res = await fetch('/api/nickname/profile', { credentials: 'include' });
        const data = await res.json();
        if (data.success && !data.nickname) setShowNicknameModal(true);
      } catch (err) {
        console.error('닉네임 확인 중 오류:', err);
      }
    };
    checkNickname();
  }, []);

  // ✅ 매칭 상태 확인
  useEffect(() => {
    if (!sessionActive || !selectedWord) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/match/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ word: selectedWord }),
        });
        const data = await res.json();
        if (data.matched) {
          localStorage.setItem('chatInfo', JSON.stringify({
            roomId: data.roomId,
            myId: data.senderId,
            myUsername: data.senderUsername, // ✅ username 추가
            myNickname: data.senderNickname,
            partnerId: data.receiverId,
            partnerUsername: data.receiverUsername, // ✅ username 추가
            partnerNickname: data.receiverNickname,
            word: selectedWord
          }));

          toast.success('✨ 연결되었습니다! 잠시 후 채팅으로 이동합니다.', { autoClose: 5000 });

          clearInterval(interval);
          setTimeout(() => {
            navigate('/chatpage');
          }, 2000);
        }
      } catch (err) {
        console.error('매칭 확인 중 오류:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionActive, selectedWord, navigate]);


  // ✅ 피드백 모달 띄우기 (ChatPage에서 localStorage 저장값 체크)
  useEffect(() => {
    const info = localStorage.getItem('feedbackInfo');
    if (info) {
      setFeedbackInfo(JSON.parse(info));
      setShowFeedbackModal(true);
      localStorage.removeItem('feedbackInfo');
    }
  }, []);

  // ✅ 피드백 제출
  const handleSubmitFeedback = async () => {
    if (!selectedEmotion) {
      toast.error('감정을 선택해주세요!');
      return;
    }

    try {
      const res = await fetch('/api/feedback/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: feedbackInfo.myId,
          userUsername: feedbackInfo.myUsername,
          userNickname: feedbackInfo.myNickname,
          partnerId: feedbackInfo.partnerId,
          partnerUsername: feedbackInfo.partnerUsername,
          partnerNickname: feedbackInfo.partnerNickname,
          word: feedbackInfo.word,
          emotion: selectedEmotion
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('감정 피드백이 저장되었습니다!');
        setShowFeedbackModal(false);
      } else {
        toast.error('저장 실패');

        console.log('📤 서버로 보낼 데이터:', {
          userId: feedbackInfo.myId,
          userUsername: feedbackInfo.myUsername,
          userNickname: feedbackInfo.myNickname,
          partnerId: feedbackInfo.partnerId,
          partnerUsername: feedbackInfo.partnerUsername,
          partnerNickname: feedbackInfo.partnerNickname,
          word: feedbackInfo.word,
          emotion: selectedEmotion
        });
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

      <div className="login-container">
        {sessionActive && (
          <WordTimer
            word={selectedWord || word}
            displayedText={selectedWord || word}
            onExpire={() => {
              toast.error('⏰ 5분 내 연결이 되지 않았어요.');
              endSession();
            }}
          />
        )}

        <h1 className="title">Telepathy</h1>
        <p className="subtitle">누군가 지금,<br />이 단어를 기다리고 있어요.</p>

        <p className="recommend-word">
          • 추천 단어 :
          <span className={recommendClass}>
            「{recommendations[currentIdx]}」
          </span>
        </p>

        <div className="search-box">
          <input
            className="search-input"
            placeholder="단어를 입력하세요."
            value={word}
            onChange={handleInputChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={(e) => e.key === 'Enter' && handleWordSubmit()}
          />
          <button className="search-btn" onClick={handleWordSubmit}>
            <img src={SearchIcon} alt="검색" />
          </button>
        </div>

        <div className="focus-hours" aria-live="polite">
  🕗 텔레파시 집중 운영시간: <strong>오후 8시 ~ 자정(00:00)</strong></div>

        {error && <p className="error-message">{error}</p>}

        <button className="help-icon" onClick={() => navigate('/helppage')}>
          <HelpCircle />
        </button>

        {showModal && (
          <WordConfirmModal
            word={word}
            onConfirm={handleWordConfirm}
            onCancel={() => setShowModal(false)}
          />
        )}

        {showFeedbackModal && (
          <div className="feedback-modal">
            <div className="feedback-content">
              <h2>Telepathy</h2>
              <p>지금, 당신의 기분은 어떤가요?</p>
              <div className="emotion-buttons">
                {['기뻐요', '괜찮아요', '슬퍼요', '행복해요', '화나요'].map((emo) => (
                  <button
                    key={emo}
                    className={selectedEmotion === emo ? 'selected' : ''}
                    onClick={() => setSelectedEmotion(emo)}
                  >
                    {emo}
                  </button>
                ))}
              </div>
              <button className="submit-btn" onClick={handleSubmitFeedback}>
                결정하기
              </button>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </>
  );
} */
  import ClosedModal from '../components/ClosedModal';
  import React, { useState, useEffect } from 'react';
  import { useWordSession } from '../contexts/WordSessionContext';
  import { useNavigate } from 'react-router-dom';
  import { HelpCircle, Megaphone } from 'lucide-react';
  import { socket } from '../config/socket';
  import './MainPage.css';
  import NicknameModal from '../components/NicknameModal';
  import { toast, ToastContainer } from 'react-toastify';
  import 'react-toastify/dist/ReactToastify.css';
  import { recommendations } from '../utils/recommendations';
  import MegaphoneInputModal from "../components/MegaphoneInputModal";
  
  export default function MainPage() {
    const navigate = useNavigate();
    const [onlineCount, setOnlineCount] = useState(0);
  
    const [round, setRound] = useState(0);
    const [wordSet, setWordSet] = useState([]);
    const [remaining, setRemaining] = useState(30);
    const [selectedWord, setSelectedWord] = useState('');
    const [fadeClass, setFadeClass] = useState("fade-in");

    // 확성기 관련 모달
    const [showMegaphoneModal, setShowMegaphoneModal] = useState(false);
    const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
    const [hasMegaphone, setHasMegaphone] = useState(false);

    const [showBizInfo, setShowBizInfo] = useState(false);

    // 버튼 클릭 핸들러
    const handleMegaphoneClick = async () => {
      const seen = localStorage.getItem("seenMegaphoneIntro");
      if (!seen) {
        // 처음이면 설명 모달만 띄움
        setShowFirstTimeModal(true);
        return;
      }

      // 이미 본 경우 → 바로 DB 조회 후 모달 실행
      try {
        const res = await fetch("/api/user/megaphone-count", {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success) {
          const hasMegaphone = data.count > 0;
          setShowMegaphoneModal(true);
          setHasMegaphone(hasMegaphone);
        } else {
          console.error("메가폰 조회 실패:", data.message);
        }
      } catch (err) {
        console.error("메가폰 조회 에러:", err);
      }
    };

    // 설명 모달에서 "확인" 누를 때
    const handleFirstTimeConfirm = async () => {
      localStorage.setItem("seenMegaphoneIntro", "true");
      setShowFirstTimeModal(false);

      // 설명 모달 닫고 DB 조회 → 실제 모달 실행
      try {
        const res = await fetch("/api/user/megaphone-count", {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success) {
          const hasMegaphone = data.count > 0;
          setShowMegaphoneModal(true);
          setHasMegaphone(hasMegaphone);
        } else {
          console.error("메가폰 조회 실패:", data.message);
        }
      } catch (err) {
        console.error("메가폰 조회 에러:", err);
      }
    };

      // === 결제 & 메시지 로직 ===
  const handleMegaphoneSend = async (payload) => {
    try {
      if (typeof payload === "string" && payload.startsWith("megaphone_")) {
        // 구매 모드
        const skuTable = {
          megaphone_1: { name: "확성기 1개", amount: 500, count: 1 },
          megaphone_5: { name: "확성기 5개", amount: 2000, count: 5 },
          megaphone_10: { name: "확성기 10개", amount: 3500, count: 10 },
        };
        const sku = skuTable[payload];
        if (!sku) return;

        const { IMP } = window;
        IMP.init("imp17086516"); // PortOne 가맹점 코드

        IMP.request_pay(
          {
            pg: "html5_inicis",
            pay_method: "card",
            merchant_uid: "order_" + new Date().getTime(),
            name: sku.name,
            amount: sku.amount,
            buyer_email: profile?.username || "guest@telepathy.my",
            buyer_name: profile?.nickname || "사용자",
          },
          async (rsp) => {
            if (rsp.success) {
              const res = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  imp_uid: rsp.imp_uid,
                  merchant_uid: rsp.merchant_uid,
                  item: payload,
                }),
              });
              const data = await res.json();
              if (data.success) {
                toast.success(`구매 완료! 확성기 ${sku.count}개 지급됨 🎉`);
                setHasMegaphone(true);
              } else {
                toast.error("검증 실패: " + data.message);
              }
            } else {
              toast.error("결제 실패 또는 취소됨");
            }
          }
        );
      } else {
        // 메시지 발사
        socket.emit("megaphone:send", {
          userId: profile.userId,
          message: payload,
        });
        toast.success("메시지가 발사되었습니다!");
      }
    } catch (err) {
      console.error("Megaphone 처리 오류:", err);
      toast.error("오류가 발생했습니다.");
    } finally {
      setShowMegaphoneModal(false);
    }
  };


    
    // 감정 피드백 모달
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackInfo, setFeedbackInfo] = useState(null);
    const [selectedEmotion, setSelectedEmotion] = useState('');
  
    const { startSession } = useWordSession();
  
    // 운영시간 모달 상태
    const [showClosedModal, setShowClosedModal] = useState(false);
  
    // 운영시간 확인
    useEffect(() => {
      const checkTime = async () => {
        try {
          const res = await fetch('/api/server-time');
          const data = await res.json();
  
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
    const [profile, setProfile] = useState(null);
    const [showNicknameModal, setShowNicknameModal] = useState(false);
  
    // ✅ 유저 프로필 가져오기
    useEffect(() => {
      const fetchProfile = async () => {
        try {
          const res = await fetch('/api/nickname/profile', { credentials: 'include' });
          const data = await res.json();
          if (data.success) {
            setProfile({
                userId: data.user_id || data.id || data.userId, // ✅ 양쪽 다 커버
                username: data.username,
                nickname: data.nickname
              });
            if (!data.nickname) setShowNicknameModal(true);
            console.log("🎯 profile 응답:", data);
            console.log("🎯 세팅된 profile:", {
              userId: data.user_id || data.id || data.userId,
              username: data.username,
              nickname: data.nickname
            });
          }
        } catch (err) {
          console.error('프로필 불러오기 오류:', err);
        }
      };
      fetchProfile();
    }, []);
  
    // ✅ 닉네임 저장
    const handleSaveNickname = async (nickname) => {
      try {
        const res = await fetch('/api/nickname/set-nickname', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nickname }),
        });
        const data = await res.json();
        if (data.success) {
          setProfile((prev) => ({ ...prev, nickname }));
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
  
    // ✅ 매칭 이벤트 수신
    useEffect(() => {
      socket.on('matched', (data) => {
        const chatInfo = {
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
  
        localStorage.setItem('chatInfo', JSON.stringify(chatInfo));
        startSession(chatInfo);
        navigate('/chatpage');
      });
  
      return () => {
        socket.off('matched');
      };
    }, [navigate, startSession]);
  
    // ✅ 서버와 라운드 동기화
    useEffect(() => {
      const syncFromServer = async () => {
        try {
          const res = await fetch('/api/match/current-round');
          const data = await res.json();
  
          if (data.round !== round) {
            setFadeClass("fade-out");
            setTimeout(() => {
              const idx = data.round % recommendations.length;
              setWordSet(recommendations[idx].words);
              setRound(data.round);
              setRemaining(data.remaining);
              setSelectedWord('');
              setFadeClass("fade-in");
            }, 500);
          } else {
            setRemaining((prev) =>
              Math.abs(prev - data.remaining) > 2 ? data.remaining : prev
            );
          }
        } catch (err) {
          console.error("서버 동기화 실패:", err);
        }
      };
  
      syncFromServer();
      const syncInterval = setInterval(syncFromServer, 5000);
      return () => clearInterval(syncInterval);
    }, [round]);
  
    // ✅ 클라이언트 카운트다운
    useEffect(() => {
      if (remaining <= 0) return;
      const tick = setInterval(() => {
        setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(tick);
    }, [remaining]);
  
    // ✅ 단어 선택
    /*const handleWordSelect = (word) => {
      if (!profile || selectedWord) return;
      setSelectedWord(word);
  
      socket.emit('join_match', {
        userId: profile.userId,
        username: profile.username,
        nickname: profile.nickname,
        word,
        round,
      });
    };*/
    // ✅ 단어 선택
      const handleWordSelect = (word) => {
        // ✅ 프로필이나 userId가 비어있으면 실행 막기
        if (!profile || !profile.userId) {
          toast.error("❌ 사용자 정보가 아직 불러와지지 않았어요. 잠시 후 다시 시도해주세요!");
          console.log("🚨 profile 누락 또는 userId 없음:", profile);
          return;
        }

        // ✅ 이미 단어 선택했으면 중복 방지
        if (selectedWord) return;

        setSelectedWord(word);

        const payload = {
          userId: profile.userId,
          username: profile.username,
          nickname: profile.nickname,
          word,
          round,
        };

        console.log("📤 join_match emit payload:", payload);
        socket.emit('join_match', payload);
      };
  
    // ✅ 감정 피드백 모달 띄우기
    useEffect(() => {
      const info = localStorage.getItem('feedbackInfo');
      if (info) {
        setFeedbackInfo(JSON.parse(info));
        setShowFeedbackModal(true);
        localStorage.removeItem('feedbackInfo');
      }
    }, []);
  
    // ✅ 피드백 제출
    const handleSubmitFeedback = async () => {
      if (!selectedEmotion) {
        toast.error('감정을 선택해주세요!');
        return;
      }
      if (!feedbackInfo) return;
  
      const payload = {
        userId: feedbackInfo.myId,
        userUsername: feedbackInfo.myUsername,
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
        const data = await res.json();
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
  
        {showClosedModal && <ClosedModal />}

        {/* 처음 설명 모달 */}
        {showFirstTimeModal && (
              <div className="firsttime-modal">
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

  
        <div className="telepathy-container">
          <div className="timer-display">{remaining}초</div>
          <h1 className="title">Telepathy</h1>
          <p className="subtitle">같은 단어를 선택한 사람과 연결돼요.</p>
  
          <div className={`word-set ${fadeClass}`}>
            {wordSet.map((w) => (
              <button
                key={w}
                className={`word-btn ${selectedWord === w ? 'selected' : ''}`}
                onClick={() => handleWordSelect(w)}
                disabled={!!selectedWord}
              >
                {w}
              </button>
            ))}
          </div>
  
          {showFeedbackModal && feedbackInfo && (
            <div className="feedback-modal">
              <div className="feedback-content">
                <h2>Telepathy</h2>
                <p>지금, 당신의 기분은 어떤가요?</p>
                <div className="emotion-buttons">
                  {['기뻐요', '괜찮아요', '슬퍼요', '행복해요', '화나요'].map((emo) => (
                    <button
                      key={emo}
                      className={selectedEmotion === emo ? 'selected' : ''}
                      onClick={() => setSelectedEmotion(emo)}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
                <button
                  className="submit-btn"
                  onClick={handleSubmitFeedback}
                  disabled={!selectedEmotion}  // ✅ 감정 선택 전엔 비활성화
                >
                  결정하기
                </button>
              </div>
            </div>
          )}
  
          <div className="focus-hours" aria-live="polite">
           텔레파시 집중운영시간: <strong>오후 8시 ~ 새벽 2시</strong>
          </div>
          <footer>
  <button onClick={() => setShowBizInfo(!showBizInfo)}>
    ⓒ Telepathy | 고객센터/사업자 정보
  </button>

          {showBizInfo && (
            <div className="biz-info">
              <p>상호명 : 넥스트커넥트 | 대표자 : 이수현</p>
              <p>사업자등록번호 : 316-22-01911</p>
              <p>주소 : (06978) 서울 동작구 상도로55길 8, 404호</p>
              <p>대표 이메일 : telepathy.cs@gmail.com</p>
              <p>※ 통신판매업 신고 준비 중</p>
            </div>
          )}
        </footer>
  
          {/* ✅ 현재 접속자 수는 2명 이상일 때만 보이게 */}
          {onlineCount >= 2 && (
            <div className="online-counter">
              현재 접속자 수: <strong>{onlineCount}</strong>명
            </div>
          )}
          
            {/* 헬프 버튼 */}
            <div className="icon-buttons">
            <button className="help-icon" onClick={() => navigate('/helppage')}>
              <HelpCircle />
            </button>

            {/* 확성기 버튼 */}
            <button className="megaphone-button" onClick={handleMegaphoneClick}>
            <Megaphone />
          </button>
            </div>
          </div>

            <ToastContainer />
      </>
    );
  }
  