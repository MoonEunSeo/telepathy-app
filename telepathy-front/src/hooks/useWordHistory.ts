import { apiFetch } from '../lib/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { WordHistoryResponse, WordHistoryItem, WordHistoryUpdateRequest } from '../types';

/**
 * 단어 기록 목록 (S1: MyPage 개수 + MyWords 목록이 공유하는 단일 캐시)
 * -----------------------------------------------------------------
 * 기존에는 MyPage(개수용)와 MyWords(목록용)가 각자 `/api/word-history` 를 fetch 해
 * 화면을 오갈 때마다 같은 데이터를 다시 받았다. queryKey ['wordHistory'] 를 공유하면
 * staleTime(60초) 안에서는 네트워크 없이 캐시를 반환한다.
 *
 * MyWords 의 즐겨찾기·메모 낙관적 업데이트는 queryClient.setQueryData(wordHistoryKey, ...)
 * 로 캐시를 직접 갱신한다 → 재방문 시에도 편집 상태가 유지된다.
 */
export const wordHistoryKey = ['wordHistory'] as const;

async function fetchWordHistory(): Promise<WordHistoryResponse> {
  const res = await apiFetch('/api/word-history', { credentials: 'include' });
  if (!res.ok) throw new Error('단어 기록을 불러오지 못했습니다.');
  return (await res.json()) as WordHistoryResponse;
}

export function useWordHistory() {
  return useQuery({
    queryKey: wordHistoryKey,
    queryFn: fetchWordHistory,
    // 소비처는 배열만 쓰므로 select 로 history 를 꺼내 반환한다.
    select: (data): WordHistoryItem[] => data.history ?? [],
  });
}

/**
 * S4: 즐겨찾기·메모 수정 (카드별 직렬화 + 낙관적 업데이트 + 서버 수렴)
 * -----------------------------------------------------------------
 * 기존에는 클릭마다 PATCH 를 그대로 발사해, 같은 카드를 빠르게 연타하면 응답 도착 순서가
 * 보장되지 않아 DB 최종값이 "보낸 순서"가 아닌 "도착 순서"로 결정될 수 있었다.
 *
 * - scope { id }: 같은 카드의 연속 수정을 직렬화 → 응답 역전(경쟁 상태) 차단
 * - onMutate: 진행 중 refetch 취소 + 스냅샷 저장 + 낙관적 갱신
 * - onError: 스냅샷 복원 (계산된 반대값이 아니라 "이전 상태" 그대로)
 * - onSettled: invalidate 로 서버 값과 수렴. 연타 시 다음 onMutate 의 cancelQueries 가
 *   앞선 refetch 를 취소하므로, 실제로는 마지막 1건만 완료된다.
 */
export function usePatchWordHistory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: `wordHistory:${id}` },
    mutationFn: async (patch: WordHistoryUpdateRequest) => {
      const res = await apiFetch(`/api/word-history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('수정 실패');
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: wordHistoryKey });
      const prev = queryClient.getQueryData<WordHistoryResponse>(wordHistoryKey);
      // 서버 요청 필드(isFavorite) → 로컬 아이템 필드(is_favorite) 매핑
      const optimistic: Partial<WordHistoryItem> = {};
      if (patch.isFavorite !== undefined) optimistic.is_favorite = patch.isFavorite;
      if (patch.memo !== undefined) optimistic.memo = patch.memo;
      queryClient.setQueryData<WordHistoryResponse>(wordHistoryKey, (old) => ({
        history: (old?.history ?? []).map((it) => (it.id === id ? { ...it, ...optimistic } : it)),
      }));
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      // 계산된 반대값이 아니라 변경 직전 스냅샷으로 복원
      if (ctx?.prev) queryClient.setQueryData(wordHistoryKey, ctx.prev);
      toast.error('저장에 실패했어요.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wordHistoryKey });
    },
  });
}
