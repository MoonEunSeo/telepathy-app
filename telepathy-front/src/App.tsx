import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';

import { useAuthCheck } from './hooks/useAuthCheck';

// ✅ 페이지 컴포넌트
// SplashScreen은 진입 화면이라 초기 번들에 둔다. 쪼개면 이것 하나 받으려고
// 왕복이 한 번 더 생겨 첫 페인트가 오히려 늦어진다.
import SplashScreen from './pages/SplashScreen';

// 나머지는 라우트 진입 시점에 받는다.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Register = lazy(() => import('./pages/Register'));
const Verify_mvp = lazy(() => import('./pages/Verify_mvp'));
const FindPassword = lazy(() => import('./pages/FindPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

const MainPage = lazy(() => import('./pages/MainPage'));
const MyPage = lazy(() => import('./pages/MyPage'));
const MyWords = lazy(() => import('./pages/MyWords'));
const LikePage = lazy(() => import('./pages/LikePage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const WordSetPage = lazy(() => import('./pages/WordSetPage'));

const TermsPage = lazy(() => import('./pages/TermsPage'));
const ServiceAgreement = lazy(() => import('./pages/terms/ServiceAgreement'));
const PrivacyPolicy = lazy(() => import('./pages/terms/PrivacyPolicy'));
const YouthPolicy = lazy(() => import('./pages/terms/YouthProtection'));
const ImproveConsent = lazy(() => import('./pages/terms/ImproveConsent'));
const NotificationConsent = lazy(() => import('./pages/terms/NotificationConsent'));

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

  // ✅ 로그인 상태 확인 — 1회 조회 후 캐시 (라우트 이동마다 재요청하지 않는다)
  const { data: auth } = useAuthCheck();

  // ✅ 라우트 가드 — 캐시된 인증 상태 + 현재 경로로 리다이렉트만 판단 (재요청 없음)
  useEffect(() => {
    if (!auth) return; // 인증 조회 완료 전엔 판단 보류
    if (auth.loggedIn && auth.role !== 'guest') {
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/main');
      }
    } else {
      const protectedRoutes = ['/mypage', '/mywords', '/likes'];
      if (protectedRoutes.includes(location.pathname)) {
        navigate('/login');
      }
    }
  }, [auth, navigate, location.pathname]);

  // ✅ 날짜 기반 테마 적용
  useSeasonalTheme();

  if (!sessionReady) return null; // 세션 준비 전엔 렌더 보류

  return (
    <>
      {/* 
    라우트 청크를 받는 동안 보여줄 것. 화면 전체를 비우면 깜빡임이 크게 보이므로 배경색만 유지한다.
    스플래시에서 MainPage를 미리 받아두면 대부분 보이지 않는다.
     */}
      <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
        <Routes>
          {/* ✅ 진입 스플래시 */}
          <Route path="/" element={<SplashScreen />} />

          {/* ✅ 인증 관련 */}
          <Route path="/verify-mvp" element={<Verify_mvp />} />

          {/* ✅ 네비게이션 없는 페이지 */}
          <Route path="/chatpage" element={<ChatPage />} />

          {/* ✅ 네비게이션 있는 페이지 */}
          <Route element={<BottomLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/findpassword" element={<FindPassword />} />
            <Route path="/changepassword" element={<ChangePassword />} />
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
      </Suspense>
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
