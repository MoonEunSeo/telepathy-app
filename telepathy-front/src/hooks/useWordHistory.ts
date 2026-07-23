import { useQuery } from '@tanstack/react-query';
import type { WordHistoryResponse, WordHistoryItem } from '../types';

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
  const res = await fetch('/api/word-history', { credentials: 'include' });
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
