import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_META, NOT_FOUND_META, normalizePath } from '@shared/seo';

// SPA 내부 이동 시 탭 제목을 맞춘다.
//
// 첫 진입 HTML 은 서버가 이미 경로에 맞게 채워 보낸다 (server/src/utils/indexHtml.ts).
// 여기서 다루는 건 그 다음의 클라이언트 이동뿐이라 검색엔진과는 무관하다 — 크롤러는
// 각 URL 을 새로 요청하지 SPA 안에서 링크를 눌러 다니지 않는다.
export function useRouteTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = (ROUTE_META[normalizePath(pathname)] ?? NOT_FOUND_META).title;
  }, [pathname]);
}
