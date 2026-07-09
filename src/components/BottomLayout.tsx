import type { ReactNode } from "react";
import { Home, MessageSquareHeart, Heart, User } from "lucide-react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import styles from "../themes/base/BottomLayout.module.css";

interface NavItem {
  icon: ReactNode;
  path?: string;
  external?: boolean;
  url?: string;
  title?: string;
}

export default function BottomLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    { icon: <Home />, path: "/main" },
    { icon: <Heart />, path: "/likes" },
    {
      icon: <MessageSquareHeart />,
      external: true,
      url: "https://gall.dcinside.com/mgallery/board/lists/?id=telepathy",
      title: "텔레파시 디시인사이드 갤러리",
    },
    { icon: <User />, path: "/mypage" },
  ];

  return (
    <>
      <Outlet />

      <div className={styles['bottom-nav-container']}>
        {navItems.map(({ icon, path, external, url, title }, i) =>
          external ? (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={title || ""}
              className={styles['bottom-nav-button']}
            >
              {icon}
            </a>
          ) : (
            <button
              key={i}
              onClick={() => path && navigate(path)}
              className={`${styles['bottom-nav-button']} ${
                location.pathname === path ? styles.active : ""
              }`}
              title={title || ""}
            >
              {icon}
            </button>
          )
        )}
      </div>
    </>
  );
}
