import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Megaphone } from 'lucide-react';
import { socket } from '../config/socket';

import { useWordSession } from '../contexts/WordSessionContext';
import { recommendations } from '../utils/recommendations';

import ClosedModal from '../components/ClosedModal';
import NicknameModal from '../components/NicknameModal';
import MegaphoneInputModal from '../components/MegaphoneInputModal';

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  // ✅ 랜덤 가짜 인원 추가 로직
  useEffect(() => {
    let fakeOffset = Math.floor(Math.random() * 3); // 초깃값 0~2명 랜덤
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
            // 순차구조처리
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
    const syncInterval = setInterval(syncFromServer, 1000);
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
              className={`word-btn
                ${selectedWord === w ? 'selected' : ''}
                ${recommendations[round % recommendations.length].paid ? 'paid' : ''}`}
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

        {/* 🎃 왼쪽 하단 아이콘 버튼 묶음 */}
        <div className="icon-buttons">
          {/* 헬프 버튼 */}
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
