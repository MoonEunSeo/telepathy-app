// src/pages/TermsPage.tsx
import { useParams, Navigate } from 'react-router-dom';
import NotFound from './NotFound';

export default function TermsPage() {
  const { type } = useParams<{ type: string }>();

  const routeMap: Record<string, string> = {
    service: '/terms/service-agreement',
    privacy: '/terms/privacy-policy',
    youth: '/terms/youth-protection',
    improve: '/terms/improve-consent',
    alarm: '/terms/notification-consent',
  };

  // 없는 슬러그는 서버가 이미 404 상태로 보낸다 (server/app.ts 의 CLIENT_ROUTES).
  if (!type || !routeMap[type]) {
    return <NotFound />;
  }

  return <Navigate to={routeMap[type]} replace />;
}
