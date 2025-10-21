// ✅ WordSetPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WordSetForm from "../components/WordSetForm";
import axios from "axios";


export default function WordSetPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ 사용자 정보 자동 로드
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/nickname/profile", {
          withCredentials: true,
        });
        if (res.data.success && (res.data.id || res.data.userId)) {
          setCurrentUser({
            id: res.data.id || res.data.userId,
            nickname: res.data.nickname,
            username: res.data.username,
          });
        } else {
          console.warn("⚠️ 로그인 정보 없음 — 로그인 페이지로 이동");
          navigate("/login");
        }
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // ✅ 로딩 상태 표시
  if (loading)
    return <h3 style={{ textAlign: "center" }}>로딩 중입니다 ⏳</h3>;

  // ✅ 로그인 안 되어있을 경우
  if (!currentUser)
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <h3>로그인이 필요합니다 🔒</h3>
        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: "12px",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            background: "#d18f92",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          로그인하러 가기
        </button>
      </div>
    );

  // ✅ 정상 사용자라면 단어세트 입력 폼 표시
  return (
    <div className="wordset-page">
  <h1 className="wordset-title">
    <span>나만의</span> 단어세트 만들기 ✨
  </h1>
  <p className="wordset-description">
    당신만의 감정을 담은 네 개의 단어를 입력해보세요. <br />
    동일한 단어를 입력한 사람과의 연결이 시작됩니다 ✨
  </p>

  <div className="wordset-card">
    <WordSetForm currentUser={currentUser} />
  </div>
</div>
  );
}
