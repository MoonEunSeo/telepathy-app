import { apiFetch } from '../lib/apiClient';
import { ensureGuestSession } from './guest';

// 로그인 상태면 그대로, 아니면 게스트 토큰을 발급받는다.
// 소켓 연결 전에 반드시 한 번 호출되어야 한다.
export async function ensureSession(): Promise<void> {
  try {
    const res = await apiFetch('/api/auth/check', { credentials: 'include' });
    const data = await res.json();
    if (data.loggedIn) return; // 회원 토큰 있음
  } catch {}
  await ensureGuestSession(); // 게스트 토큰 발급
}
