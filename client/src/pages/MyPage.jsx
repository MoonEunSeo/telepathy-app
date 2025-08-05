import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWordSession } from '../contexts/WordSessionContext';
import WordTimer from '../components/WordTimer';
import profileImage from '../assets/profile_image.png';
import './MyPage.css';

const MyPage = () => {
  const [nickname, setNickname] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showNotSupportedModal, setShowNotSupportedModal] = useState(false);

  const navigate = useNavigate();
  const { isSessionActive, word } = useWordSession();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/nickname/profile', {
          credentials: 'include',
        });
        const data = await res.json();

        if (data.success && data.nickname) {
          setNickname(data.nickname);
          setUsername(data.username);
          setUserId(data.userId);
        } else {
          console.warn('⚠️ 프로필 정보 불러오기 실패:', data.message);
        }
      } catch (err) {
        console.error('❌ 프로필 fetch 오류:', err);
      }
    };

    const fetchWordCount = async () => {
      try {
        const res = await fetch('/api/word-history', {
          credentials: 'include',
        });
        const data = await res.json();
  
        if (Array.isArray(data.history)) {
          setWordCount(data.history.length); // 👉 word 개수만 따로 저장
        } else {
          console.warn('⚠️ history가 배열이 아님:', data);
          setWordCount(0);
        }
      } catch (err) {
        console.error('❌ 단어 기록 불러오기 실패:', err.message);
        setWordCount(0);
      }
    };
    fetchWordCount();
    fetchProfile();
  }, []);

  const handleNavigateWords = () => {
    console.log('Go to Words Page');
    navigate('/mywords');
  };

  const handleChangeProfile = () => {
    setShowNotSupportedModal(true);
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

      const data = await res.json();

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
    <div className="mypage-container">
      {isSessionActive && word && (
        <div className="mypage-current-word">
          지금 연결 중인 단어 : {word}
        </div>
      )}

      <h1 className="mypage-title">Telepathy</h1>

      
      <img className="mypage-profile-image" src={profileImage} alt="프로필" />

      <div className="mypage-nickname">{nickname || '닉네임 로딩중...'}</div>

      <div className="mypage-section">
        <hr />
        <p className="mypage-section-title">| 내 정보 |</p>
        <p className="mypage-text">ID: {username || '불러오는 중...'}</p>
        <p className="mypage-text">텔레파시 횟수 : {wordCount} 번</p>
        <button onClick={handleNavigateWords} className="mypage-button-full">
          {'>'} 누군가와 함께 떠올린 단어
        </button>
      </div>

      <hr />
      <div className="mypage-section">
        <p className="mypage-section-title">| 계정 |</p>
        <div className="mypage-button-group">
          <button onClick={handleChangeProfile} className="mypage-button">
            프로필 사진 변경
          </button>
          <button onClick={handleChangePassword} className="mypage-button">
            비밀번호 변경
          </button>
          <button onClick={handleChangeLogout} className="mypage-button">
            로그아웃
          </button>
        </div>
      </div>

      <hr />
      <button onClick={handleWithdraw} className="mypage-withdraw-button">
        회원탈퇴
      </button>

      {/* 미지원기능모달 */}
      {showNotSupportedModal && (
  <div className="modal-backdrop">
    <div className="modal-content">
      <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px' }}>
        아직 지원하지 않는 기능이에요!
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <button
          className="login-button1"
          onClick={() => setShowNotSupportedModal(false)}
        >
          확인
        </button>
      </div>
    </div>
  </div>
)}

      {/*탈퇴 모달 */}
      {showWithdrawModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <p style={{ fontFamily: 'Gowun Dodum', fontSize: '16px' }}>
              {withdrawMessage}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
              <button className="login-button1" onClick={confirmWithdraw}>탈퇴하기</button>
              <button className="login-button1 cancel" onClick={() => setShowWithdrawModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>

    
  );
};

export default MyPage;
