import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import TermsPage from './pages/TermsPage';
import Register from './pages/Register';
import Verify from './pages/Verify';
import VerifyCallback from './pages/VerifyCallback'
import Verify_mvp from './pages/Verify_mvp';
import Mainpage from './pages/MainPage';
import Mypage from './pages/MyPage';
import Mywords from './pages/MyWords';
import Helppage from './pages/HelpPage';
import Chatpage from './pages/ChatPage';
import ChatPage2 from './pages/ChatPage2';
import FindPassword from './pages/FindPassword';
import { useNavigate } from 'react-router-dom';
import React, { useEffect} from 'react';
import ServiceAgreement from './pages/terms/ServiceAgreement';
import PrivacyPolicy from './pages/terms/PrivacyPolicy';
import YouthPolicy from './pages/terms/YouthProtection';
import ImproveConsent from './pages/terms/ImproveConsent';
import NotificationConsent from './pages/terms/NotificationConsent';
import BottomLayout from './components/BottomLayout';
import ChangePassword from './pages/ChangePassword';
import Likepage from './pages/LikePage';
import { IntentProvider } from './contexts/IntentContext';


export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/auth/check', {
      credentials: 'include' // 쿠키 포함 필수
    })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          navigate('/main');
        }
      });
  }, []);
  
  return (
    <IntentProvider>
      <Routes>
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify/callback" element={<VerifyCallback />} />
        <Route path="/verify-mvp" element={<Verify_mvp />} />
        <Route path="/findpassword" element={<FindPassword/>} />
        <Route path="/helppage" element={<Helppage/>} />
        <Route path="/changepassword" element={<ChangePassword/>} /> 
        <Route path="/chatpage" element={<Chatpage />} />
        <Route
          path="/chatpage2/:roomId/:myId/:myNickname/:partnerId/:partnerNickname/:word"
          element={<ChatPage2/>}
        />
      

        {/* ✅ 네비게이션이 있는 페이지들 */}
        <Route element={<BottomLayout />}>
        <Route path="/liked" element={<Likepage />} />
        <Route path="/main" element={<Mainpage />} />
        <Route path="/mypage" element={<Mypage />} />
        <Route path="/mywords" element={<Mywords />} />
        <Route path="/helppage" element={<Helppage />} />
        </Route>

        
         {/* 기타 약관 페이지 */}
        <Route path="/terms/:type" element={<TermsPage />} />
        <Route path="/terms/service-agreement" element={<ServiceAgreement />} />
        <Route path="/terms/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms/youth-protection" element={<YouthPolicy />} />
        <Route path="/terms/improve-consent" element={<ImproveConsent />} />
        <Route path="/terms/notification-consent" element={<NotificationConsent />} />
        
      </Routes>
      </IntentProvider>
  );
}
