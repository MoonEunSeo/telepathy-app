import type { Id, UserProfile } from '../types';

export const GUEST_NICKNAME = '익명의 사용자';

interface GuestResponse {
  success: boolean;
  user_id: string;
  nickname: string;
  role: 'guest';
}

// 서버에서 게스트 세션을 발급받는다 (멱등 - 이미 있으면 같은 신원)
export async function ensureGuestSession(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/auth/guest', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null; // 409(회원) 포함
    const data = (await res.json()) as GuestResponse;
    return {
      userId: data.user_id as Id,
      username: data.user_id,
      nickname: data.nickname === GUEST_NICKNAME ? null : data.nickname,
    };
  } catch {
    return null;
  }
}

// 게스트 닉네임 변경 (토큰 재발급)
export async function updateGuestNickname(nickname: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/guest/nickname', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nickname }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
