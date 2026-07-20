import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import type { AuthCheckResponse } from './types';

// ✅ 페이지 컴포넌트
import LoginPage from './pages/LoginPage';
import Register from './pages/Register';
import Verify from './pages/Verify';
import VerifyCallback from './pages/VerifyCallback';
import Verify_mvp from './pages/Verify_mvp';
import FindPassword from './pages/FindPassword';
import ChangePassword from './pages/ChangePassword';
import SplashScreen from './pages/SplashScreen';

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
import { ThemeProvider, useTheme } from './themes/themes/ThemeContext'; // ✅ 추가

import 'react-toastify/dist/ReactToastify.css';
import './index.css';

// --------------------------------------------------
// 🎁 날짜 기반 테마 자동 설정 Hook
// --------------------------------------------------

import halloweenCSS from './themes/themes/halloween.css?url';
import christmasCSS from './themes/themes/christmas.css?url';
import { ensureSession } from './utils/session';
import { socket } from './config/socket';

function useSeasonalTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    let selectedTheme = 'default';
    let cssToLoad: string | null = null;

    if (month === 10 && day >= 23 && day <= 31) {
      selectedTheme = 'halloween';
      cssToLoad = halloweenCSS;
    } else if (month === 12 && day >= 1 && day <= 31) {
      selectedTheme = 'christmas';
      cssToLoad = christmasCSS;
    }

    // ✅ 기존 스타일 초기화
    document.body.className = '';
    const oldThemeStyle = document.getElementById('theme-style');
    if (oldThemeStyle) oldThemeStyle.remove();

    // ✅ 시즌 테마만 <link> 주입. 기본(default) 테마는 tokens.css :root
    //    토큰(항상 로드)이 담당하므로 로드할 별도 CSS 가 없다.
    if (cssToLoad) {
      const link = document.createElement('link');
      link.id = 'theme-style';
      link.rel = 'stylesheet';
      link.href = cssToLoad;
      document.head.insertBefore(link, document.head.firstChild);
    }

    // ✅ body 클래스 추가
    document.body.classList.add(`${selectedTheme}-mode`);
    setTheme(selectedTheme);
  }, [setTheme]);
}

// --------------------------------------------------
// 🎯 App 구성
// --------------------------------------------------
function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionReady, setSessionReady] = useState(false);

  // 세션 (회원 or 게스트)을 먼저 보장하고 그 다음 소켓 연결
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSession();
      if (cancelled) return;
      if (!socket.connected) socket.connect(); // 소켓 연결
      setSessionReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ 로그인 상태 확인
  useEffect(() => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then((res) => res.json())
      .then((data: AuthCheckResponse) => {
        if (data.loggedIn && data.role !== 'guest') {
          if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/main');
          }
        } else {
          const protectedRoutes = ['/mypage', '/mywords', '/likes'];
          if (protectedRoutes.includes(location.pathname)) {
            navigate('/login');
          }
        }
      });
  }, [navigate, location.pathname]);

  // ✅ 날짜 기반 테마 적용
  useSeasonalTheme();

  if (!sessionReady) return null; // 세션 준비 전엔 렌더 보류

  return (
    <>
      <Routes>
        {/* ✅ 진입 스플래시 */}
        <Route path="/" element={<SplashScreen />} />

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
  return (
    <ThemeProvider>
      <IntentProvider>
        <AppRoutes />
      </IntentProvider>
    </ThemeProvider>
  );
}
