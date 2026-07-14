import type { ReactNode } from "react";
import { Home, MessageSquareHeart, Heart, User } from "lucide-react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";

interface NavItem {
  icon: ReactNode;
  path?: string;
  external?: boolean;
  url?: string;
  title?: string;
  label?: string;
}

// 구 .bottom-nav-button (색은 active 여부로 분기 → 충돌 없이 명시)
const navBtn = "flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer";

export default function BottomLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    { icon: <Home />, path: "/main", label: "홈" },
    { icon: <Heart />, path: "/likes", label: "좋아요" },
    {
      icon: <MessageSquareHeart />,
      external: true,
      url: "https://gall.dcinside.com/mgallery/board/lists/?id=telepathy",
      title: "텔레파시 디시인사이드 갤러리",
      label: "커뮤니티",
    },
    { icon: <User />, path: "/mypage", label: "마이" },
  ];

  return (
    <>
      <Outlet />

      {/* 구 .bottom-nav-container — 리디자인: 웜톤 탭바 + 라벨 */}
      <div className="fixed bottom-0 left-0 right-0 pt-2 pb-3 bg-[var(--tab-bar-bg)] [border-top:1px_solid_var(--tab-bar-border)] [backdrop-filter:blur(8px)] flex justify-around items-center z-50">
        {navItems.map(({ icon, path, external,  title, label }, i) => {
          const active = !external && location.pathname === path;
          const colorCls = active ? "text-[var(--tab-icon-active)]" : "text-[var(--tab-icon)]";
          const content = (
            <>
              <span className="[&>svg]:w-[22px] [&>svg]:h-[22px]">{icon}</span>
              <span className={`text-[11px] ${active ? "font-bold" : "font-normal"}`}>{label}</span>
            </>
          );
          return external ? (
            <span
              key={i}
              // href={url}
              // target="_blank"
              rel="noopener noreferrer"
              title={title || ""}
              className={`${navBtn} ${colorCls}`}
            >
              {content}
            </span>
          ) : (
            <button
              key={i}
              onClick={() => path && navigate(path)}
              className={`${navBtn} ${colorCls}`}
              title={title || ""}
            >
              {content}
            </button>
          );
        })}
      </div>
    </>
  );
}
