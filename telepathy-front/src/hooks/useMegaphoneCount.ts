import { apiFetch } from '../lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import type { MegaphoneCountResponse } from '../types';

/**
 * 확성기(메가폰) 보유 개수 (S1: MyPage 표시 + MainPage 온디맨드 조회 공유)
 * -----------------------------------------------------------------
 * - MyPage: 마운트 시 개수 표시 → useMegaphoneCount (useQuery)
 * - MainPage: 확성기 버튼 클릭 시 개수 확인 → queryClient.fetchQuery(megaphoneCountKey)
 *   (fetchQuery 는 staleTime 안이면 캐시를 반환, 아니면 재요청)
 *
 * 개수는 구매(+N)·발사(-1)로 바뀌므로, 그 시점에 invalidateQueries(megaphoneCountKey)
 * 로 캐시를 무효화해야 다음 조회가 신선한 값을 받는다.
 */
export const megaphoneCountKey = ['megaphoneCount'] as const;

export async function fetchMegaphoneCount(): Promise<MegaphoneCountResponse> {
  const res = await apiFetch('/api/user/megaphone-count', { credentials: 'include' });
  return (await res.json()) as MegaphoneCountResponse;
}

export function useMegaphoneCount() {
  return useQuery({
    queryKey: megaphoneCountKey,
    queryFn: fetchMegaphoneCount,
    // 실패(미로그인 등)면 0 으로 정규화 — 기존 MyPage 동작과 동일
    select: (data): number => (data.success ? data.count : 0),
  });
}
