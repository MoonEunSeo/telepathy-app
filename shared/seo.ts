// 경로별 메타 정보의 단일 출처.
//
// 서버는 index.html 의 <!--seo--> 블록을 이 값으로 채우고 (server/src/utils/indexHtml.ts),
// 프론트는 SPA 내부 이동 시 document.title 을 맞춘다 (hooks/useRouteTitle.ts).
//
// ⚠️ shared/ 의 유일한 런타임 모듈이다. 나머지는 전부 타입 전용이다.
//    경로 목록은 값이라 유니온으로 표현할 수 없어 예외를 뒀다.
//    이 파일의 키 목록이 곧 "서버가 아는 클라이언트 라우트"다 — App.tsx 의 <Route path> 와 짝을 이룬다.
//    한쪽만 고치면 새 페이지가 404 로 나간다.

export const SITE_ORIGIN = 'https://telepathy.my';

export interface RouteMeta {
  title: string;
  description: string;
  /** 검색 결과에 노출할 페이지인지. false 면 noindex 를 준다. */
  index: boolean;
  /** 이 경로가 다른 문서의 별칭일 때 정본 경로. 생략하면 자기 자신. */
  canonical?: string;
}

const BRAND = 'Telepathy';
const s = (t: string) => `${t} :: ${BRAND}`;

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: '텔레파시 — 같은 단어를 떠올린 사람과 익명 대화',
    description:
      '랜덤채팅 텔레파시에서 같은 단어를 떠올린 사람과 실시간으로 연결되는 특별한 기쁨을 경험하세요. 우연과 감성이 어우러진 대화를 통해 하루에 잊지 못할 설렘과 따뜻함을 더해보세요.',
    index: true,
  },
  '/helppage': {
    title: s('이용 방법'),
    description:
      '단어 매칭으로 사람을 만나는 방법, 감정 밸런스 게임, 감정 피드백까지 텔레파시 사용법을 안내합니다.',
    index: true,
  },

  // ── 약관·정책 ────────────────────────────────────────────
  '/terms/service-agreement': {
    title: s('서비스 이용약관'),
    description: '텔레파시 서비스 이용약관입니다.',
    index: true,
  },
  '/terms/privacy-policy': {
    title: s('개인정보 처리방침'),
    description: '텔레파시가 수집하는 개인정보 항목과 이용·보관·파기 절차를 안내합니다.',
    index: true,
  },
  '/terms/youth-protection': {
    title: s('청소년 보호정책'),
    description: '텔레파시의 청소년 보호정책과 유해정보 대응 절차를 안내합니다.',
    index: true,
  },
  '/terms/improve-consent': {
    title: s('서비스 개선 활용 동의'),
    description: '서비스 개선을 위한 데이터 활용 동의 내용을 안내합니다.',
    index: true,
  },
  '/terms/notification-consent': {
    title: s('알림 수신 동의'),
    description: '텔레파시 알림 수신 동의 내용을 안내합니다.',
    index: true,
  },

  // ── 약관 별칭 — TermsPage 가 정본으로 넘긴다. canonical 로 정본을 가리킨다 ──
  '/terms/service': {
    title: s('서비스 이용약관'),
    description: '텔레파시 서비스 이용약관입니다.',
    index: false,
    canonical: '/terms/service-agreement',
  },
  '/terms/privacy': {
    title: s('개인정보 처리방침'),
    description: '텔레파시가 수집하는 개인정보 항목과 이용·보관·파기 절차를 안내합니다.',
    index: false,
    canonical: '/terms/privacy-policy',
  },
  '/terms/youth': {
    title: s('청소년 보호정책'),
    description: '텔레파시의 청소년 보호정책과 유해정보 대응 절차를 안내합니다.',
    index: false,
    canonical: '/terms/youth-protection',
  },
  '/terms/improve': {
    title: s('서비스 개선 활용 동의'),
    description: '서비스 개선을 위한 데이터 활용 동의 내용을 안내합니다.',
    index: false,
    canonical: '/terms/improve-consent',
  },
  '/terms/alarm': {
    title: s('알림 수신 동의'),
    description: '텔레파시 알림 수신 동의 내용을 안내합니다.',
    index: false,
    canonical: '/terms/notification-consent',
  },

  // ── 로그인·계정 — 검색 유입 가치가 없다 ──────────────────
  '/login': { title: s('로그인'), description: '텔레파시에 로그인합니다.', index: false },
  '/register': { title: s('회원가입'), description: '텔레파시 계정을 만듭니다.', index: false },
  '/findpassword': {
    title: s('비밀번호 찾기'),
    description: '비밀번호를 재설정합니다.',
    index: false,
  },
  '/changepassword': {
    title: s('비밀번호 변경'),
    description: '비밀번호를 변경합니다.',
    index: false,
  },
  '/verify-mvp': { title: s('본인 확인'), description: '본인 확인을 진행합니다.', index: false },

  // ── 로그인 후 화면 ───────────────────────────────────────
  '/mypage': { title: s('마이페이지'), description: '내 프로필과 계정을 관리합니다.', index: false },
  '/mywords': { title: s('내 단어'), description: '내가 보낸 단어 기록입니다.', index: false },
  '/likes': { title: s('좋아요'), description: '주고받은 좋아요를 확인합니다.', index: false },
  '/wordset': { title: s('단어 설정'), description: '단어 세트를 설정합니다.', index: false },
  '/chatpage': { title: s('대화'), description: '연결된 상대와 대화합니다.', index: false },
};

export const NOT_FOUND_META: RouteMeta = {
  title: s('페이지를 찾을 수 없습니다'),
  description: '요청한 페이지가 없습니다.',
  index: false,
};

/** '/login/' 과 '/login' 을 같은 경로로 본다. 루트는 그대로 둔다. */
export function normalizePath(pathname: string): string {
  if (pathname.length <= 1) return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}
