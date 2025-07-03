// MainPage.jsx
/*(import React, { useState, useEffect } from 'react';
import { useWordSession } from '../contexts/WordSessionContext';
import WordConfirmModal from '../components/WordConfirmModal';
import IntentToggle from '../components/IntentToggle';
import NicknameModal from '../components/NicknameModal';
import WordTimer from '../components/WordTimer';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useIntent } from '../contexts/IntentContext';
import 'react-toastify/dist/ReactToastify.css';
import './MainPage.css';

export default function MainPage() {
  const navigate = useNavigate();
  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [isIntentVisible, setIsIntentVisible] = useState(false);
  const { intent, setIntent } = useIntent();

  const {
    word: selectedWord,
    isSessionActive: sessionActive,
    startSession,
    endSession,
  } = useWordSession();

  const handleToggleIntent = () => {
    setIsIntentVisible((prev) => !prev);
  };

  const getDisplayedWord = (selectedWord, intent) => {
    if (intent === 'comfort_me') return '누군가에게 위로받고 싶어요';
    if (intent === 'comfort_others') return '누군가를 위로하고 싶어요';
    if (intent === 'light_connection') return '누군가와 가볍게 연결되고 싶어요';
    return selectedWord ?? ''; // <= undefined 방지
  };

  const getRoleFromIntent = (intent) => {
    if (intent === 'comfort_me') return 'receiver';
    if (intent === 'comfort_others') return 'sender';
    return 'neutral';
  };

  const wordMap = {
    comfort_me: '위로받고싶어요_밸',
    comfort_others: '위로하고싶어요_밸',
    light_connection: '가볍게연결되고싶어요_밸',
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

  const handleSubmit = () => {
    if (!word.trim()) {
      setError('단어를 입력해주세요.');
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async () => {
    startSession(word);
    setShowModal(false);

    try {
      await fetch(`http://localhost:5000/api/match/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ word }),
      });
    } catch (err) {
      console.error('세션 시작 오류:', err);
    }
  };

  const handleCancel = () => setShowModal(false);

  const handleSaveNickname = async (nickname) => {
    try {
      const res = await fetch('http://localhost:5000/api/nickname/set-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
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

  const requestMatchWithIntent = async (intent) => {
    const mappedWord = wordMap[intent];
    const role = getRoleFromIntent(intent);

    if (!mappedWord) return;

    startSession(mappedWord);

    try {
      const res = await fetch('http://localhost:5000/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          word: intent,
          role: role,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        console.warn('[매칭 실패]', data.message);
      }
    } catch (err) {
      console.error('매칭 오류:', err);
    }
  };

  useEffect(() => {
    const checkNickname = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/nickname/profile', {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && !data.nickname) {
          setShowNicknameModal(true);
        }
      } catch (err) {
        console.error('닉네임 확인 중 오류:', err);
      }
    };
    checkNickname();
  }, []);

  useEffect(() => {
    if (intent && !sessionActive) {
      requestMatchWithIntent(intent);
    }
  }, [intent, sessionActive]);

  useEffect(() => {
    if (!sessionActive || !selectedWord) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5000/api/match/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ word: intent || selectedWord }),
        });

        const data = await res.json();

        if (data.matched) {
          toast.success('✨ 연결되었습니다! 잠시 후 채팅으로 이동합니다.', {
            position: 'bottom-center',
            autoClose: 5000,
          });

          clearInterval(interval);

          setTimeout(() => {
            navigate(
              `/chatpage/${data.roomId}/${data.senderId}/${encodeURIComponent(data.senderNickname)}/${data.receiverId}/${encodeURIComponent(data.receiverNickname)}/${encodeURIComponent(data.word)}`
            );
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
        <NicknameModal
          onClose={() => setShowNicknameModal(false)}
          onSave={handleSaveNickname}
        />
      )}

      <div className="login-container">
        {sessionActive && selectedWord && (
          <WordTimer
            word={getDisplayedWord(selectedWord, intent)}
            onExpire={() => {
              toast.error('⏰ 5분 내 연결이 되지 않았어요.');
              endSession();
            }}
          />
        )}

        <h1 className="title">Telepathy</h1>
        <p className="subtitle">
          누군가 지금,<br />이 단어를 기다리고 있어요.
        </p>
        <p className="recommend-word">• 추천 단어 : 「그리움」</p>

        <div className="search-box">
          <input
            className="search-input"
            placeholder="단어를 입력하세요."
            value={word}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button className="search-btn" onClick={handleSubmit}>
            <img src="/src/assets/SearchIcon.svg" alt="검색" />
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="intent-toggle-wrapper">
          <div className="intent-toggle-header" onClick={handleToggleIntent}>
            <span>단어가 생각나지 않으시나요?</span>
            {isIntentVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          <div className={`intent-toggle-divider ${isIntentVisible ? 'show' : ''}`}></div>

          {<div className={`intent-toggle-box ${isIntentVisible ? 'open' : ''}`}>
            <IntentToggle onSelect={setIntent} />
          </div>}

          <div className={`intent-toggle-divider ${isIntentVisible ? 'show' : ''}`}></div>
        </div>

        <button className="help-icon" onClick={() => navigate('/helppage')}>
          <HelpCircle />
        </button>

        {showModal && (
          <WordConfirmModal
            word={word}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
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

import searchIcon from '../assets/SearchIcon.svg';

export default function MainPage() {
  const navigate = useNavigate();

  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [isIntentVisible, setIsIntentVisible] = useState(false);

  const { intent, setIntent } = useIntent();
  const {
    word: selectedWord,
    isSessionActive: sessionActive,
    startSession,
    endSession,
  } = useWordSession();

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
    setIntent(null);            // 기존 입력 방식이므로 intent 초기화
    setShowModal(true);
  };

  const handleSelectIntent = (selectedIntent) => {
    const mappedWord = wordMap[selectedIntent];
    if (!mappedWord) return;
    setIntent(selectedIntent);
    setWord(mappedWord);       // 모달에 intent 기반 단어 전달
    setShowModal(true);
  };

  const handleWordConfirm = async () => {
    startSession(word);
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
          toast.success('✨ 연결되었습니다! 잠시 후 채팅으로 이동합니다.', { autoClose: 5000 });
          clearInterval(interval);
          setTimeout(() => {
            navigate(
              `/chatpage/${data.roomId}/${data.senderId}/${encodeURIComponent(data.senderNickname)}/${data.receiverId}/${encodeURIComponent(data.receiverNickname)}/${encodeURIComponent(intent || selectedWord)}`
            );
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
          word={getDisplayedWord(selectedWord, intent)}   // ✅ selectedWord로 고정
          displayedText={getDisplayedWord(selectedWord, intent)}
          onExpire={() => {
            toast.error('⏰ 5분 내 연결이 되지 않았어요.');
            endSession();
          }}
        />
      )}

        <h1 className="title">Telepathy</h1>
        <p className="subtitle">누군가 지금,<br />이 단어를 기다리고 있어요.</p>
        <p className="recommend-word">• 추천 단어 : 「그리움」</p>

        <div className="search-box">
          <input
            className="search-input"
            placeholder="단어를 입력하세요."
            value={word}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleWordSubmit()}
          />
          <button className="search-btn" onClick={handleWordSubmit}>
            <img className="mypage-profile-image" src={searchIcon} alt="검색" />
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
