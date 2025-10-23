import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import { socket } from './config/socket';

// ✅ 페이지 컴포넌트
import LoginPage from './pages/LoginPage';
import Register from './pages/Register';
import Verify from './pages/Verify';
import VerifyCallback from './pages/VerifyCallback';
import Verify_mvp from './pages/Verify_mvp';
import FindPassword from './pages/FindPassword';
import ChangePassword from './pages/ChangePassword';

import MainPage from './pages/MainPage';
import MyPage from './pages/MyPage';
import MyWords from './pages/MyWords';
import LikePage from './pages/LikePage';
import HelpPage from './pages/HelpPage';
import ChatPage from './pages/ChatPage';
import WordSetPage from './pages/WordSetPage';

import TermsPage from './pages/TermsPage';
import ServiceAgreement from './pages/terms/ServiceAgreement';
import PrivacyPolicy from './pages/terms/PrivacyPolicy';
import YouthPolicy from './pages/terms/YouthProtection';
import ImproveConsent from './pages/terms/ImproveConsent';
import NotificationConsent from './pages/terms/NotificationConsent';

import BottomLayout from './components/BottomLayout';
import { IntentProvider } from './contexts/IntentContext';
import { ToastContainer } from 'react-toastify';
import { ThemeProvider, useTheme } from "./themes/themes/ThemeContext"; // ✅ 추가

import 'react-toastify/dist/ReactToastify.css';
import './index.css';

// --------------------------------------------------
// 🎁 날짜 기반 테마 자동 설정 Hook
// --------------------------------------------------

import halloweenCSS from './themes/themes/halloween.css?url';
import christmasCSS from './themes/themes/christmas.css?url';
import defaultCSS from './themes/themes/default.css?url';

function useSeasonalTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    let selectedTheme = "default";
    let cssToLoad = defaultCSS;

    if (month === 10 && day >= 23 && day <= 31) {
      selectedTheme = "halloween";
      cssToLoad = halloweenCSS;
    } else if (month === 12 && day >= 1 && day <= 31) {
      selectedTheme = "christmas";
      cssToLoad = christmasCSS;
    }

    // ✅ 기존 스타일 초기화
    document.body.className = "";
    const oldThemeStyle = document.getElementById("theme-style");
    if (oldThemeStyle) oldThemeStyle.remove();

    // ✅ 새 스타일 추가
    const link = document.createElement("link");
    link.id = "theme-style";
    link.rel = "stylesheet";
    link.href = cssToLoad;
    document.head.insertBefore(link, document.head.firstChild);

    // ✅ body 클래스 추가
    document.body.classList.add(`${selectedTheme}-mode`);
    setTheme(selectedTheme);
  }, [setTheme]);
}
/*
function useSeasonalTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    let selectedTheme = "default";
    let cssToLoad = new URL(`./themes/themes/default.css`, import.meta.url).href;

    if (month === 10 && day >= 23 && day <= 31) {
      selectedTheme = "halloween";
      cssToLoad = new URL(`./themes/themes/halloween.css`, import.meta.url).href;
    } else if (month === 12 && day >= 1 && day <= 31) {
      selectedTheme = "christmas";
      cssToLoad = new URL(`./themes/themes/christmas.css`, import.meta.url).href;
    }

    // ✅ 기존 스타일 초기화
    document.body.className = "";
    const oldThemeStyle = document.getElementById("theme-style");
    if (oldThemeStyle) oldThemeStyle.remove();

    // ✅ 새 스타일 추가
    const link = document.createElement("link");
    link.id = "theme-style";
    link.rel = "stylesheet";
    link.href = cssToLoad;
    document.head.insertBefore(link, document.head.firstChild);


    // ✅ body 클래스 추가
    document.body.classList.add(`${selectedTheme}-mode`);
    setTheme(selectedTheme);
  }, [setTheme]);
}*/
// --------------------------------------------------
// 🎯 App 구성
// --------------------------------------------------
function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 로그인 상태 확인
  useEffect(() => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/main');
          }
        } else {
          const protectedRoutes = ['/main', '/mypage', '/mywords', '/likes', '/chatpage'];
          if (protectedRoutes.includes(location.pathname)) {
            navigate('/login');
          }
        }
      });
  }, [navigate, location.pathname]);


  return (
    <>
      <Routes>
        {/* ✅ 인증 관련 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify/callback" element={<VerifyCallback />} />
        <Route path="/verify-mvp" element={<Verify_mvp />} />
        <Route path="/findpassword" element={<FindPassword />} />
        <Route path="/changepassword" element={<ChangePassword />} />

        {/* ✅ 네비게이션 없는 페이지 */}
        <Route path="/chatpage" element={<ChatPage />} />

        {/* ✅ 네비게이션 있는 페이지 */}
        <Route element={<BottomLayout />}>
          <Route path="/main" element={<MainPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/mywords" element={<MyWords />} />
          <Route path="/likes" element={<LikePage />} />
          <Route path="/helppage" element={<HelpPage />} />
          <Route path="/wordset" element={<WordSetPage />} />
        </Route>

        {/* ✅ 약관 & 정책 페이지 */}
        <Route path="/terms/:type" element={<TermsPage />} />
        <Route path="/terms/service-agreement" element={<ServiceAgreement />} />
        <Route path="/terms/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms/youth-protection" element={<YouthPolicy />} />
        <Route path="/terms/improve-consent" element={<ImproveConsent />} />
        <Route path="/terms/notification-consent" element={<NotificationConsent />} />
      </Routes>

      <ToastContainer position="top-center" autoClose={2000} />
    </>
  );
}

// --------------------------------------------------
// 🧙‍♀️ 최종 내보내기
// --------------------------------------------------
export default function App() {
  useSeasonalTheme();
  return (
    <ThemeProvider>
      <IntentProvider>
        <AppRoutes />
      </IntentProvider>
    </ThemeProvider>
  );
}
