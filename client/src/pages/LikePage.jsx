/*

import { useEffect } from 'react';
import './LikePage.css';

export default function LikePage() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense 에러:', e);
      }
    }, 300); // 렌더 완료 후 실행

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="like-container">
      <h1 className="like-title">
        <span style={{ color: '#d18f92' }}>Tele</span>
        <span style={{ color: '#3a3020' }}>pathy</span>
      </h1>

      <p className="like-description">
        텔레파시는 오직<br />
        개인 서버비만으로 운영되고 있어요.
      </p>
      <p className="like-description">
        텔레파시의 서비스가 마음에 드셨다면<br />
        아래의 계좌로 후원해주세요
      </p>

      <p className="like-account">계좌 : 100-121-028199 (케이뱅크)</p>

      {/* ✅ 광고 감싸는 div로 스타일 안정 }
      <div style={{ minHeight: '100px', margin: '20px 0' }}>
        <ins className="adsbygoogle"
             style={{ display: 'block', width: '100%', minWidth: '320px', height: '100px' }}
             data-ad-client="ca-pub-9633518507670143"
             data-ad-slot="1490398761"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>

    </div>
  );
}*/

/*
import React, { useState, useEffect } from "react";
import axios from "axios";
import WordSetForm from "../components/WordSetForm";
import tossQr from "../assets/toss_qr.jpg";

const LikesPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle → pending → checking → paid
  const [timer, setTimer] = useState(20);
  const [loading, setLoading] = useState(true);
  const amount = 1000;

  // ✅ 사용자 정보 불러오기
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/nickname/profile", { credentials: "include" });
        const data = await res.json();
        if (data.success && (data.id || data.userId)) {
          setCurrentUser({
            id: data.id || data.userId,
            nickname: data.nickname,
            username: data.username,
          });
        }
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ✅ 결제 생성 (DB에 pending 상태 삽입)
  const handleStartPayment = async () => {
    if (!currentUser) return;

    try {
      await axios.post(
        `/api/sp_payments/create`,
        {
          user_id: currentUser.id,
          name: currentUser.nickname,
          amount,
        },
        { withCredentials: true }
      );

      // 모바일/PC 구분
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setStatus("pending");

      if (isMobile) {
        // ✅ 모바일: 토스 앱으로 바로 이동
        const mobileTossLink = `supertoss://send?amount=${amount}&bank=${encodeURIComponent(
          "케이뱅크"
        )}&accountNo=100121028199&origin=qr`;
        window.location.href = mobileTossLink;

        // 사용자가 앱 다녀온 후 페이지 복귀 시 자동 확인
        setTimeout(() => setStatus("checking"), 2000);
      }
    } catch (err) {
      console.error("❌ 결제 생성 오류:", err);
    }
  };

  // ✅ 입금확인 버튼 클릭 → 20초 타이머 시작
  const handleCheckDeposit = () => {
    setStatus("checking");
    setTimer(20);
  };

  // ✅ 결제 상태 체크
  useEffect(() => {
    if (status !== "checking" || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/sp_payments/status/${currentUser.id}`, {
          withCredentials: true,
        });

        if (res.data.status === "paid") {
          setStatus("paid");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("❌ 상태 확인 실패:", err);
      }

      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, currentUser]);

  // ✅ [1] 로딩 중
  if (loading) return <h3 style={{ textAlign: "center" }}>로딩 중입니다 ⏳</h3>;

  // ✅ [2] 로그인 필요
  if (!currentUser)
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <h3>로그인 후 이용 가능한 서비스예요 🔒</h3>
        <a href="/login">로그인하러 가기</a>
      </div>
    );

  // ✅ [3] 초기 상태
  if (status === "idle") {
    return (
      <div style={{ textAlign: "center", marginTop: "80px" }}>
        <h1 style={{ fontFamily: "Gowun Dodum" }}>Telepathy</h1>
        <p style={{ fontFamily: "Gowun Dodum", fontSize: "17px", marginTop: "10px" }}>
          텔레파시의 단어세트를 직접 만들어보세요!
          <br />
          당신이 원하는 단어로 연결되는 짜릿함을 느껴보세요💫
        </p>
        <button
          onClick={handleStartPayment}
          style={{
            marginTop: "20px",
            backgroundColor: "#ffb347",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontFamily: "Gowun Dodum",
            cursor: "pointer",
          }}
        >
          계좌이체하기 💸
        </button>
      </div>
    );
  }

  // ✅ [4] 입금 안내 (PC 전용)
  if (status === "pending") {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      return (
        <div style={{ textAlign: "center", marginTop: "80px" }}>
          <h3>토스 앱으로 이동 중입니다... 📱</h3>
          <p>입금 후 이 페이지로 돌아오시면 자동으로 확인이 시작돼요.</p>
        </div>
      );
    }

    return (
      <div style={{ textAlign: "center", marginTop: "80px" }}>
        <h3>입금 안내 💸</h3>
        <p>📱 휴대폰 토스 앱으로 아래 QR을 스캔해주세요.</p>
        <img src={tossQr} alt="Toss QR" style={{ width: "300px", marginTop: "10px" }} />
        <p style={{ marginTop: "8px" }}>케이뱅크 100-121-028199 (텔레파시)</p>
        <button
          onClick={handleCheckDeposit}
          style={{
            marginTop: "20px",
            backgroundColor: "#ffb347",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontFamily: "Gowun Dodum",
            cursor: "pointer",
          }}
        >
          입금 확인하기 ⏱
        </button>
      </div>
    );
  }

  // ✅ [5] 입금 확인 중 (타이머)
  if (status === "checking" && timer > 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "80px" }}>
        <h3 style={{ fontFamily: "Gowun Dodum" }}>입금 확인 중입니다 ⏳</h3>
        <p style={{ marginTop: "10px", fontFamily: "Gowun Dodum" }}>{timer}초 남았습니다</p>
      </div>
    );
  }

  // ✅ [6] 입금 완료
  if (status === "paid") {
    return (
      <div style={{ marginTop: "60px" }}>
        <WordSetForm currentUser={currentUser} />
      </div>
    );
  }

  // ✅ [7] 만료
  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h3>입금 시간이 만료되었어요 😢</h3>
      <button
        onClick={() => setStatus("idle")}
        style={{
          marginTop: "10px",
          backgroundColor: "#ffb347",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          fontFamily: "Gowun Dodum",
          cursor: "pointer",
        }}
      >
        다시 시도하기
      </button>
    </div>
  );
};

export default LikesPage;
*/

/*
import React, { useState, useEffect } from "react";
import axios from "axios";
import WordSetForm from "../components/WordSetForm";
import tossQr from "../assets/toss_qr.jpg";
import "./LikePage.css"; // ✅ CSS 적용

const LikesPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle → pending → checking → paid
  const [timer, setTimer] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); // ✅ 입금 완료 모달 상태
  const amount = 1000;

  ✅ [1] 사용자 정보 불러오기 
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/nickname/profile", { credentials: "include" });
        const data = await res.json();

        if (data.success && (data.id || data.userId)) {
          setCurrentUser({
            id: data.id || data.userId,
            nickname: data.nickname,
            username: data.username,
          });
        }
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ✅ [2] 결제 생성 → 모바일/PC 분기 
  const handleStartPayment = async () => {
    if (!currentUser) return;

    try {
      await axios.post(
        `/api/sp_payments/create`,
        {
          user_id: currentUser.id,
          name: currentUser.nickname,
          amount,
        },
        { withCredentials: true }
      );

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setStatus("pending");

      if (isMobile) {
        // ✅ 모바일: 토스 앱으로 바로 이동
        const mobileTossLink = `supertoss://send?amount=${amount}&bank=${encodeURIComponent(
          "케이뱅크"
        )}&accountNo=100121028199&origin=qr`;
        window.location.href = mobileTossLink;

        // 사용자가 앱 다녀온 후 복귀 시 자동 확인
        setTimeout(() => setStatus("checking"), 2000);
      }
    } catch (err) {
      console.error("❌ 결제 생성 오류:", err);
    }
  };

  /// ✅ [3] PC: 입금확인 버튼 → 타이머 시작 
  const handleCheckDeposit = () => {
    setStatus("checking");
    setTimer(20);
  };

  //✅ [4] 결제 상태 체크 
  useEffect(() => {
    if (status !== "checking" || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/sp_payments/status/${currentUser.id}`, {
          withCredentials: true,
        });

        if (res.data.status === "paid") {
          clearInterval(interval);
          setStatus("paid");
          setShowModal(true); // ✅ 모달 오픈
        }
      } catch (err) {
        console.error("❌ 상태 확인 실패:", err);
      }

      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, currentUser]);

  //✅ [5] 모달 닫기 
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // ========== 렌더링 구간 ==========

  // 로딩 중 
  if (loading) return <h3 style={{ textAlign: "center" }}>로딩 중입니다 ⏳</h3>;

  // 로그인 필요
  if (!currentUser)
    return (
      <div className="like-container">
        <h3>로그인 후 이용 가능한 서비스예요 🔒</h3>
        <a href="/login" className="like-button">
          로그인하러 가기
        </a>
      </div>
    );

  // 기본 (idle) 상태 
  if (status === "idle") {
    return (
      <div className="like-container">
        <h1 className="like-title">
          <span style={{ color: "#d18f92" }}>Tele</span>
          <span style={{ color: "#3a3020" }}>pathy</span>
        </h1>

        <p className="like-description">
          텔레파시의 단어세트를 직접 만들어보세요!
          <br />
          당신이 원하는 단어로 연결되는 짜릿함을 느껴보세요💫
        </p>

        <button onClick={handleStartPayment} className="like-button">
          계좌이체하기 💸
        </button>
      </div>
    );
  }

  // 입금 안내 
  if (status === "pending") {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      return (
        <div className="like-container">
          <h3>토스 앱으로 이동 중입니다... 📱</h3>
          <p>입금 후 이 페이지로 돌아오시면 자동으로 확인이 시작돼요.</p>
        </div>
      );
    }

    return (
      <div className="like-container">
        <h3>입금 안내 💸</h3>
        <p>📱 휴대폰 토스 앱으로 아래 QR을 스캔해주세요.</p>
        <p> 아직 미완성 기능이에요! 입금하시면 환불이 어려우니 입금하시면 안돼요!!!!!!</p>
        <img src={tossQr} alt="Toss QR" style={{ width: "300px", marginTop: "10px" }} />
        <p style={{ marginTop: "8px" }}>케이뱅크 100-121-028199 (텔레파시)</p>

        <button onClick={handleCheckDeposit} className="like-button" style={{ marginTop: "20px" }}>
          입금 확인하기 ⏱
        </button>
      </div>
    );
  }

  // 입금 확인 중 
  if (status === "checking" && timer > 0) {
    return (
      <div className="like-container">
        <h3>입금 확인 중입니다 ⏳</h3>
        <p style={{ marginTop: "10px" }}>{timer}초 남았습니다</p>
      </div>
    );
  }

  // 입금 완료 
  if (status === "paid") {
    return (
      <>
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>입금이 확인되었어요! 🎉</h3>
              <p>나만의 단어 세트를<br />만들어볼까요?</p>
              <button onClick={handleCloseModal} className="modal-button">
                만들러 가기 ✨
              </button>
            </div>
          </div>
        )}

        {!showModal && (
          <div className="like-container" style={{ marginTop: "60px" }}>
            <WordSetForm currentUser={currentUser} />
          </div>
        )}
      </>
    );
  }

  //만료
  return (
    <div className="like-container">
      <h3>입금 시간이 만료되었어요 😢</h3>
      <button onClick={() => setStatus("idle")} className="like-button" style={{ marginTop: "20px" }}>
        다시 시도하기
      </button>
    </div>
  );
};

export default LikesPage;*/


import React, { useState, useEffect } from "react";
import "./LikePage.css";
import axios from "axios";
//import WordSetForm from "../components/WordSetForm";
import tossQr from "../assets/toss_qr.jpg";



const LikesPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle → pending → checking → paid → expired
  const [timer, setTimer] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [realName, setRealName] = useState("");
  const amount = 1000;

  // ✅ [1] 사용자 정보 불러오기
  const [myWordSets, setMyWordSets] = useState([]); // ✅ 안전한 초기값 설정

  useEffect(() => {
    const fetchProfileAndWordsets = async () => {
      try {
        const res = await fetch("/api/nickname/profile", { credentials: "include" });
        const data = await res.json();
  
        if (data.success && (data.id || data.userId)) {
          const user = {
            id: data.id || data.userId,
            nickname: data.nickname,
            username: data.username,
          };
          setCurrentUser(user);
  
          // ✅ 프로필이 성공적으로 불러와졌다면 즉시 단어세트 조회 실행
          try {
            const wordRes = await axios.get(`/api/wordsets/mine/${user.id}`, { withCredentials: true });
            if (wordRes.data.success && Array.isArray(wordRes.data.wordsets)) {
              setMyWordSets(wordRes.data.wordsets);
            }
          } catch (err) {
            console.error("❌ 단어세트 조회 실패:", err);
          }
        }
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchProfileAndWordsets();
  }, []);
  
    // ✅ [2] 내 단어세트 불러오기 
    useEffect(() => {
      if (!currentUser) return;
  
      const fetchWordSets = async () => {
        try {
          const res = await axios.get(`/api/wordsets/mine/${currentUser.id}`, { withCredentials: true });
          if (res.data.success && Array.isArray(res.data.wordsets)) {
            setMyWordSets(res.data.wordsets);
          }
        } catch (err) {
          console.error("❌ 단어세트 조회 실패:", err);
        }
      };
  
      fetchWordSets();
    }, [currentUser]);

  // ✅ [3] 입금하기 버튼 클릭 → 실명 확인 & 모달 표시 
  const handleDepositClick = async () => {
    if (!currentUser) return;
  
    try {
      // 🔍 user 테이블에서 실명 조회
      const res = await axios.get(`/api/user/${currentUser.id}`, { withCredentials: true });
      const savedName = res.data?.real_name;
  
      if (savedName) {
        console.log("✅ 실명 이미 등록됨:", savedName);
        setRealName(savedName);
        handleStartPayment(savedName); // 바로 결제 프로세스 실행
      } else {
        console.log("⚠️ 실명 없음 → 입력 필요");
        setShowNameModal(true); // 실명 입력 모달 오픈
      }
    } catch (err) {
      console.error("❌ 실명 조회 실패:", err);
      alert("서버에서 사용자 정보를 불러오지 못했습니다. 다시 시도해주세요.");
    }
  };

  // ✅ [4] 실명 입력 모달 → 저장 후 결제 시작 
  const handleSaveNameAndStart = async () => {
    if (!realName.trim()) return alert("실명을 입력해주세요!");

    try {
      await axios.post(
        `/api/user/update-realname`,
        { user_id: currentUser.id, real_name: realName },
        { withCredentials: true }
      );
      console.log("✅ 실명 저장 완료:", realName);
      setShowNameModal(false);
      handleStartPayment(realName);
    } catch (err) {
      console.error("❌ 실명 저장 실패:", err);
    }
  };

  //✅ [5] 결제 생성 (공통 로직)
  const handleStartPayment = async (finalName) => {
    try {
      await axios.post(
        `/api/sp_payments/create`,
        {
          user_id: currentUser.id,
          name: finalName,
          amount,
        },
        { withCredentials: true }
      );

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setStatus("pending");

      if (isMobile) {
        const mobileTossLink = `supertoss://send?amount=${amount}&bank=${encodeURIComponent(
          "케이뱅크"
        )}&accountNo=100121028199&origin=qr`;
        window.location.href = mobileTossLink;
        setTimeout(() => setStatus("checking"), 2000);
      }
    } catch (err) {
      console.error("❌ 결제 생성 오류:", err);
    }
  };

  // ✅ [6] PC에서 입금확인 버튼 클릭
  const handleCheckDeposit = () => {
    setStatus("checking");
    setTimer(20);
  };

  // ✅ [7] 20초 동안 결제 상태 주기적 확인 
  useEffect(() => {
    if (status !== "checking" || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/sp_payments/status/${currentUser.id}`, {
          withCredentials: true,
        });

        if (res.data.status === "paid") {
          clearInterval(interval);
          setStatus("paid");
          setShowSuccessModal(true);
        }
      } catch (err) {
        console.error("❌ 상태 확인 실패:", err);
      }

      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    // 타이머 만료 처리
    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === "paid" ? prev : "expired"));
    }, 20000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status, currentUser]);

  // ✅ [8] 모달 닫기 
  const handleCloseSuccessModal = () => setShowSuccessModal(false);

  // ✅ [9] 기본 로딩 / 로그인 체크
  if (loading) return <h3 style={{ textAlign: "center" }}>로딩 중입니다 ⏳</h3>;
  if (!currentUser)
    return (
      <div className="like-container">
        <h3>로그인 후 이용 가능한 서비스예요 🔒</h3>
        <a href="/login" className="like-button">로그인하러 가기</a>
      </div>
    );

  // ======================= 렌더링 =======================

  //💬 [1] 초기 상태 
  if (status === "idle") {
    return (
      <div className="like-container">
        <h1 className="like-title">
          <span style={{ color: "#d18f92" }}>Tele</span>
          <span style={{ color: "#3a3020" }}>pathy</span>
        </h1>
        <p className="like-description">
          텔레파시의 단어세트를 직접 만들어보세요!
          <br />
          당신이 원하는 단어로 연결되는 짜릿함을 느껴보세요💫
        </p>
        <button onClick={handleDepositClick} className="like-button">
          계좌이체하기 💸
        </button>

        // ✅ 실명 입력 모달
        {showNameModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>입금자명(실명)을 입력해주세요 🙏</h3>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="예: 홍길동"
                className="modal-input"
              />
              <div style={{ marginTop: "15px" }}>
                <button onClick={handleSaveNameAndStart} className="modal-button">
                  확인
                </button>
                <button onClick={() => setShowNameModal(false)} className="modal-cancel">
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        // ✅ 내가 만든 단어세트 구역 
        {myWordSets.length > 0 && (
          <div className="wordset-section">
            <h4 className="wordset-title">내가 신청한 단어세트</h4>
            <div className="wordset-list">
              {myWordSets.map((set, i) => (
                <div key={i} className="wordset-item">
                  <button className="wordset-button">
                    {set.words?.join(", ") || "단어 없음"}
                  </button>
                  <span className="wordset-status">- 처리중</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
    

  //💬 [2] 입금 안내 
  if (status === "pending") {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile)
      return (
        <div className="like-container">
          <h3>토스 앱으로 이동 중입니다... 📱</h3>
          <p>입금 후 이 페이지로 돌아오시면 자동으로 확인이 시작돼요.</p>
        </div>
      );

    return (
      <div className="like-container">
        <h3>입금 안내 💸</h3>
        <p>📱 휴대폰 토스 앱으로 아래 QR을 스캔해주세요.</p>
        <p style={{ color: "red" }}>
          ⚠️ 테스트 중 기능이에요. 실제 입금하지 마세요!
        </p>
        <img src={tossQr} alt="Toss QR" style={{ width: "300px", marginTop: "10px" }} />
        <p style={{ marginTop: "8px" }}>케이뱅크 100-121-028199 (텔레파시)</p>
        <button onClick={handleCheckDeposit} className="like-button" style={{ marginTop: "20px" }}>
          입금 확인하기 ⏱
        </button>
      </div>
    );
  }

  //💬 [3] 입금 확인 중
  if (status === "checking" && timer > 0) {
    return (
      <div className="like-container">
        <h3>입금 확인 중입니다 ⏳</h3>
        <p style={{ marginTop: "10px" }}>{timer}초 남았습니다</p>
      </div>
    );
  }

  // 💬 [4] 입금 완료 
  if (status === "paid") {
    return (
      <>
        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>입금이 확인되었어요! 🎉</h3>
              <p>나만의 단어 세트를<br />만들어볼까요?</p>
              <button
                onClick={() => (window.location.href = "/wordset")}
                className="modal-button"
              >
                만들러 가기 ✨
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // 💬 [5] 만료
  if (status === "expired") {
    return (
      <div className="like-container">
        <h3>입금 시간이 만료되었어요 😢</h3>
        <button onClick={() => setStatus("idle")} className="like-button" style={{ marginTop: "20px" }}>
          다시 시도하기
        </button>
      </div>
    );
  }
};


export default LikesPage;

