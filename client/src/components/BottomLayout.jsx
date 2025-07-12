/*import { Home, MessageSquareHeart, Heart, User } from 'lucide-react';
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
*/

import { Home, MessageSquareHeart, Heart, User } from 'lucide-react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import './BottomLayout.css';

export default function BottomLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Home />, path: '/main' },
    {
      icon: <MessageSquareHeart />,
      external: true,
      url: 'https://gall.dcinside.com/mgallery/board/lists/?id=telepathy',
      title: '텔레파시 디시인사이드 갤러리',
    },
    { icon: <Heart />, path: '/liked' },
    { icon: <User />, path: '/mypage' },
  ];

  return (
    <>
      <Outlet />

      <div className="bottom-nav-container">
        {navItems.map(({ icon, path, external, url, title }, i) =>
          external ? (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={title || ''}
              className="bottom-nav-button"
            >
              {icon}
            </a>
          ) : (
            <button
              key={i}
              onClick={() => navigate(path)}
              className={`bottom-nav-button ${
                location.pathname === path ? 'active' : ''
              }`}
              title={title || ''}
            >
              {icon}
            </button>
          )
        )}
      </div>
    </>
  );
}
