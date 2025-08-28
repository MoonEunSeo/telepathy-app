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

import TermsPage from './pages/TermsPage';
import ServiceAgreement from './pages/terms/ServiceAgreement';
import PrivacyPolicy from './pages/terms/PrivacyPolicy';
import YouthPolicy from './pages/terms/YouthProtection';
import ImproveConsent from './pages/terms/ImproveConsent';
import NotificationConsent from './pages/terms/NotificationConsent';

import BottomLayout from './components/BottomLayout';
import { IntentProvider } from './contexts/IntentContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          // ✅ 로그인 상태에서 로그인/회원가입 페이지 접근 시 메인으로 이동
          if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/main');
          }
        } else {
          // ✅ 비로그인 상태에서 보호된 페이지 접근 시 로그인 페이지로 이동
          const protectedRoutes = ['/main', '/mypage', '/mywords', '/likes', '/chatpage'];
          if (protectedRoutes.includes(location.pathname)) {
            navigate('/login');
          }
        }
      });
  }, [navigate, location.pathname]);

  return (
    <IntentProvider>
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
        </Route>

        {/* ✅ 약관 & 정책 페이지 */}
        <Route path="/terms/:type" element={<TermsPage />} />
        <Route path="/terms/service-agreement" element={<ServiceAgreement />} />
        <Route path="/terms/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms/youth-protection" element={<YouthPolicy />} />
        <Route path="/terms/improve-consent" element={<ImproveConsent />} />
        <Route path="/terms/notification-consent" element={<NotificationConsent />} />

        {/* ✅ 404 페이지 (필요 시 추가 가능) */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
  <ToastContainer position="top-center" autoClose={2000} />

    </IntentProvider>
  );
}
