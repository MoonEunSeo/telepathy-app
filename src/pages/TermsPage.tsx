// src/pages/TermsPage.tsx
import { useParams, Navigate } from 'react-router-dom';

export default function TermsPage() {
  const { type } = useParams<{ type: string }>();

  const routeMap: Record<string, string> = {
    service: '/terms/service-agreement',
    privacy: '/terms/privacy-policy',
    youth: '/terms/youth-protection',
    improve: '/terms/improve-consent',
    alarm: '/terms/notification-consent',
  };

  if (!type || !routeMap[type]) {
    return <p>존재하지 않는 약관 종류입니다.</p>;
  }

  return <Navigate to={routeMap[type]} replace />;
}
