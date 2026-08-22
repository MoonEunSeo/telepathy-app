import { apiFetch } from '../lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import type { AuthCheckResponse } from '../types';

/**
 * 로그인 상태 확인 (S1: 라우트 변경마다 재요청되던 /api/auth/check 를 1회 조회로)
 * -----------------------------------------------------------------
 * 기존 App.tsx 는 인증 조회와 라우트 가드를 한 effect 에 묶고 location.pathname 을
 * 의존성에 넣어, 페이지를 이동할 때마다 auth/check 를 다시 fetch 했다(4회 중 3회 불필요).
 * 인증 상태는 페이지 이동으로 바뀌지 않으므로 useQuery 로 1회 조회 후 캐시한다.
 *
 * 인증 상태가 실제로 바뀌는 시점(로그인·로그아웃·탈퇴)에는
 * invalidateQueries(authCheckKey) 로 캐시를 무효화해 다시 조회한다.
 */
export const authCheckKey = ['authCheck'] as const;

export async function fetchAuthCheck(): Promise<AuthCheckResponse> {
  const res = await apiFetch('/api/auth/check', { credentials: 'include' });
  return (await res.json()) as AuthCheckResponse;
}

export function useAuthCheck() {
  return useQuery({
    queryKey: authCheckKey,
    queryFn: fetchAuthCheck,
  });
}
