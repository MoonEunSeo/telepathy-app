import type { ReactNode } from "react";
import { Home, MessageSquareHeart, Heart, User } from "lucide-react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";

interface NavItem {
  icon: ReactNode;
  path?: string;
  external?: boolean;
  url?: string;
  title?: string;
}

// 구 .bottom-nav-button (색은 active 여부로 분기 → 충돌 없이 명시)
const navBtn = "flex flex-col items-center bg-transparent border-none text-[20px] cursor-pointer";

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

      {/* 구 .bottom-nav-container */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[var(--color-surface)] [border-top:1px_solid_#e5e7eb] flex justify-around items-center z-50">
        {navItems.map(({ icon, path, external, url, title }, i) =>
          external ? (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={title || ""}
              className={`${navBtn} text-[#9ca3af]`}
            >
              {icon}
            </a>
          ) : (
            <button
              key={i}
              onClick={() => path && navigate(path)}
              className={`${navBtn} ${
                location.pathname === path ? "text-[var(--color-accent)]" : "text-[#9ca3af]"
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
