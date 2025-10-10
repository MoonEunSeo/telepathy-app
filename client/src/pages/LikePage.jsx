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

import React, { useState, useEffect } from "react";
import axios from "axios";
import WordSetForm from "../components/WordSetForm";

const LikesPage = () => {
  // ✅ 모든 Hook은 컴포넌트 최상단에서 선언
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState("idle");
  const [timer, setTimer] = useState(20);
  const [tossLink, setTossLink] = useState(null);
  const [loading, setLoading] = useState(true);

  const amount = 1000; // 후원 금액 예시

  // [1] 사용자 정보 불러오기
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/nickname/profile", { credentials: "include" });
  
        // ✅ 응답 상태 먼저 확인
        if (!res.ok) {
          const text = await res.text(); // 혹시나 응답이 문자열일 수도 있으니 대비
          console.error("❌ 서버 응답 오류:", res.status, text);
          setLoading(false);
          return;
        }
  
        const data = await res.json();
        console.log("✅ profile data:", data);
  
        if (data.success && (data.id || data.userId)) {
          setCurrentUser({
            id: data.id || data.userId,
            nickname: data.nickname,
            username: data.username,
          });
        } else {
          console.warn("⚠️ 로그인 정보 없음:", data);
        }
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchProfile();
  }, []);

// [2] 결제 시작 핸들러
const handleStartPayment = async () => {
  if (!currentUser) return;

  try {
    const res = await axios.post(
      `/api/sp_payments/create`,
      {
        user_id: currentUser.id,
        name: currentUser.nickname,
        amount,
      },
      { withCredentials: true }
    );

    setStatus("pending");

    if (res.data.tossLink) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setTossLink(res.data.tossLink);

      // ✅ 모바일일 때만 새 탭 열기
      if (isMobile) {
        window.open(res.data.tossLink, "_blank");
      }
    }

    setTimer(20);
  } catch (err) {
    console.error("❌ 결제 생성 오류:", err);
  }
};
// [3] 결제 상태 체크
useEffect(() => {
  if (status !== "pending" || !currentUser) return;

  const interval = setInterval(async () => {
    try {
      const res = await axios.get(
        `/api/sp_payments/status/${currentUser.id}`,
        { withCredentials: true } // ✅ 여기도 포함!
      );

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


  // ✅ [4] 로딩 중
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <h3>잠시만요... 사용자 정보를 불러오는 중이에요 ⏳</h3>
      </div>
    );
  }

  // ✅ [5] 로그인 안 된 경우
  if (!currentUser) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <h3>로그인 후 이용 가능한 서비스예요 🔒</h3>
        <a href="/login" className="toss-link">
          로그인하러 가기
        </a>
      </div>
    );
  }

  // ✅ [6] 기본 후원 안내 상태
  if (status === "idle") {
    return (
      <div style={{ textAlign: "center", marginTop: "80px" }}>
        <h1 style={{ fontFamily: "Gowun Dodum", color: "#2c2c2c" }}>Telepathy</h1>
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

 // ✅ [7] 입금 대기 중
if (status === "pending" && timer > 0) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const mobileTossLink = `tossapp://transfer?bankCode=090&accountNo=100121028199&amount=${amount}&message=${encodeURIComponent(
    `텔레파시 단어세트 (${name})`
  )}`;

  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h3 style={{ fontFamily: "Gowun Dodum" }}>입금 대기 중이에요 💸</h3>

      {isMobile ? (
        // ✅ 모바일: 토스 앱으로 바로 연결
        <a
          href={mobileTossLink}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            marginTop: "10px",
            color: "#007aff",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          👉 토스로 바로 송금하기
        </a>
      ) : (
        // 💻 PC: 안내 메시지 표시
        <div
          style={{
            marginTop: "10px",
            color: "#999",
            fontFamily: "Gowun Dodum",
          }}
        >
          모바일 환경에서만 송금이 가능합니다 📱  
          <br />
          휴대폰으로 <b>텔레파시</b>를 열고 송금 버튼을 눌러주세요.
        </div>
      )}

      <p style={{ marginTop: "10px", fontFamily: "Gowun Dodum" }}>
        {timer}초 남았습니다 ⏳
      </p>
    </div>
  );
}
  // ✅ [8] 입금 완료 → 단어 세트 입력 폼 표시
  if (status === "paid") {
    return (
      <div style={{ marginTop: "60px" }}>
        <WordSetForm currentUser={currentUser} />
      </div>
    );
  }

  // ✅ [9] 타이머 만료 시 재시도 안내
  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h3>입금 시간이 만료되었어요 😢</h3>
      <button
        onClick={handleStartPayment}
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
