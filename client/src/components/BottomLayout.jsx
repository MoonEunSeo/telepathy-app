import { Home, MessageSquareHeart, Heart, User } from 'lucide-react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import './BottomLayout.css'; // ✅ css 분리한 파일

export default function BottomLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Home />, path: '/main' },
    { icon: <MessageSquareHeart />, path: '/helppage' },
    { icon: <Heart />, path: '/liked' },
    { icon: <User />, path: '/mypage' },
  ];

  return (
    <>
      <Outlet />

      <div className="bottom-nav-container">
        {navItems.map(({ icon, path }, i) => (
          <button
            key={i}
            onClick={() => navigate(path)}
            className={`bottom-nav-button ${
              location.pathname === path ? 'active' : ''
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </>
  );
}