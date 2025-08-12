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

/** ✅ 추천 단어 애니메이션 */
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

  /** ✅ 입력 처리 (iOS 대응) */
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


  /** ✅ 피드백 모달 띄우기 (ChatPage에서 localStorage 저장값 체크) */
  useEffect(() => {
    const info = localStorage.getItem('feedbackInfo');
    if (info) {
      setFeedbackInfo(JSON.parse(info));
      setShowFeedbackModal(true);
      localStorage.removeItem('feedbackInfo');
    }
  }, []);

  /** ✅ 피드백 제출 */
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
}
