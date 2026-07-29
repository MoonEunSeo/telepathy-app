/**
 * 토큰 쿠키의 속성을 한 곳에 만든다
 *
 * 발급 지점이 4곳인데 정책이 흩어져 있어 register만 secure가 빠져있었다.
 * clearCookie 도 발급 때와 속성이 맞아야 실제로 지워지므로 함께 내보낸다.
 */
const isProd = process.env.NODE_ENV === 'production';

const BASE_OPTIONS = {
  httpOnly: true, // JS에서 못 읽음 -> XSS로 토큰 탈취 방지
  secure: isProd, // 배포에선 HTTPS 요청에만 실린다.
  // 프론트 API 호출은 전부 상대 경로이고, 소켓도 window.location.origin을 쓴다. (config/socket.ts)
  // 크로스사이트 요청이 없으므로 'none'은 CSRF 방어를 낮출 뿐이다.
  sameSite: 'lax' as const,
  path: '/',
};

/** clearCookie 용 maxAge 없이 속성만 */
export const TOKEN_COOKIE_OPTIONS = BASE_OPTIONS;

/** res.cookie 용 */
export function buildCookieOptions(maxAgeMs: number) {
  return { ...BASE_OPTIONS, maxAge: maxAgeMs };
}
