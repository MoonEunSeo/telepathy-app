
/*import React, { useState, useEffect } from 'react';
import { useWordSession } from '../contexts/WordSessionContext';
import { useIntent } from '../contexts/IntentContext';
import WordConfirmModal from '../components/WordConfirmModal';
import IntentToggle from '../components/IntentToggle';
import NicknameModal from '../components/NicknameModal';
import WordTimer from '../components/WordTimer';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import './MainPage.css';
import SearchIcon from '../assets/SearchIcon.svg'
import { recommendations } from '../assets/recommendations'; // ✅ 추천 단어 import

export default function MainPage() {
  const navigate = useNavigate();

  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [isIntentVisible, setIsIntentVisible] = useState(false);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [recommendClass, setRecommendClass] = useState("recommend-transition"[0]);

// 추천단어 페이드인
  useEffect(() => {
    const interval = setInterval(() => {
      setRecommendClass("recommend-transition"); // 페이드 아웃
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % recommendations.length);
        setRecommendClass("recommend-transition recommend-visible"); // 페이드 인
      }, 500); // 페이드 아웃 시간 후 단어 변경 & 페이드 인
    }, 5000);
    return () => clearInterval(interval);
  }, []);


  const { intent, setIntent } = useIntent();
  const {
    word: selectedWord,
    isSessionActive: sessionActive,
    startSession,
    endSession,
    startTime
  } = useWordSession();

  useEffect(() => {
    console.log('🟢 [MainPage] sessionActive:', sessionActive, 'startTime:', startTime, 'selectedWord:', selectedWord);
  }, [sessionActive, startTime, selectedWord]);

  const wordMap = {
    comfort_me: '위로받고싶어요_밸',
    comfort_others: '위로하고싶어요_밸',
    light_connection: '가볍게연결되고싶어요_밸',
  };

  const getDisplayedWord = (selectedWord, intent) => {
    if (intent === 'comfort_me') return '누군가에게 위로받고 싶어요';
    if (intent === 'comfort_others') return '누군가를 위로하고 싶어요';
    if (intent === 'light_connection') return '누군가와 가볍게 연결되고 싶어요';
    return selectedWord ?? '';
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    if (e.nativeEvent.isComposing) return setWord(input);
    const onlyKorean = input.replace(/[^가-힣]/g, '');
    if (onlyKorean.length <= 20) {
      setWord(onlyKorean);
      setError('');
    }
  };

  const handleWordSubmit = () => {
    if (!word.trim()) return setError('단어를 입력해주세요.');
    setIntent(null);
    setShowModal(true);
  };

  const handleSelectIntent = (selectedIntent) => {
    const mappedWord = wordMap[selectedIntent];
    if (!mappedWord) return;
    setIntent(selectedIntent);
    setWord(mappedWord);
    setShowModal(true);
  };

  const handleWordConfirm = async () => {
    console.log('🔥 handleWordConfirm 호출됨');
    startSession(word);
    console.log('📅 startSession 실행됨, word:', word);
    setShowModal(false);
    try {
      if (intent) {
        const res = await fetch('/api/balance-game/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ intent }),
        });
        const data = await res.json();
        if (!data.success) toast.error('❌ 밸런스게임 매칭 시작 실패');
      } else {
        const res = await fetch('/api/match/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ word }),
        });
        const data = await res.json();
        if (!data.success) toast.error('❌ 단어 매칭 시작 실패');
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
        const res = await fetch('/api/nickname/profile', {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && !data.nickname) setShowNicknameModal(true);
      } catch (err) {
        console.error('닉네임 확인 중 오류:', err);
      }
    };
    checkNickname();
  }, []);

  useEffect(() => {
    if (!sessionActive || !(intent || selectedWord)) return;
    const interval = setInterval(async () => {
      try {
        let res, data;
        if (intent) {
          res = await fetch('/api/balance-game/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ intent }),
          });
        } else {
          res = await fetch('/api/match/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ word: selectedWord }),
          });
        }
        data = await res.json();
        if (data.matched) {
          localStorage.setItem('chatInfo', JSON.stringify({
            roomId: data.roomId,
            myId: data.senderId,
            myNickname: data.senderNickname,
            partnerId: data.receiverId,
            partnerNickname: data.receiverNickname,
            word: intent || selectedWord // ❗여기서 intent도 selectedWord도 null이면 undefined 저장됨
          }));
        
          toast.success('✨ 연결되었습니다! 잠시 후 채팅으로 이동합니다.', { autoClose: 5000 });
        
          clearInterval(interval);
          setTimeout(() => {
            navigate('/chatpage'); // ✅ URL에 아무 정보도 넘기지 않음
          }, 2000);
        }
      } catch (err) {
        console.error('매칭 확인 중 오류:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionActive, selectedWord, intent, navigate]);



  return (
    <>
      {showNicknameModal && (
        <NicknameModal onClose={() => setShowNicknameModal(false)} onSave={handleSaveNickname} />
      )}

      <div className="login-container">
        {sessionActive && (
          <WordTimer
            word={getDisplayedWord(word || selectedWord, intent)}
            displayedText={getDisplayedWord(word || selectedWord, intent)}
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
            onKeyDown={(e) => e.key === 'Enter' && handleWordSubmit()}
          />
          <button className="search-btn" onClick={handleWordSubmit}>
            <img src={SearchIcon} alt="검색" />
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="intent-toggle-wrapper">
          <div className="intent-toggle-header" onClick={() => setIsIntentVisible(!isIntentVisible)}>
            <span>단어가 생각나지 않으시나요?</span>
            {isIntentVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          <div className={`intent-toggle-divider ${isIntentVisible ? 'show' : ''}`}></div>

          <div className={`intent-toggle-box ${isIntentVisible ? 'open' : ''}`}>
            <IntentToggle onSelect={handleSelectIntent} />
          </div>

          <div className={`intent-toggle-divider ${isIntentVisible ? 'show' : ''}`}></div>
        </div>

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
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /** ✅ 입력 처리 (iOS 대응) */
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

  /** ✅ 단어 확인 버튼 클릭 */
  const handleWordSubmit = () => {
    const filteredWord = word.replace(/[^가-힣]/g, '');
    if (!filteredWord) {
      setError('한글 단어만 입력해주세요.');
      return;
    }
    setShowModal(true);
  };

  /** ✅ 매칭 시작 (API 성공 시에만 세션 시작) */
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

  /** ✅ 닉네임 저장 */
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

  /** ✅ 닉네임 확인 */
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

  /** ✅ 매칭 상태 확인 */
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
