import { QueryClient } from '@tanstack/react-query';

/**
 * 앱 전역 단일 QueryClient (S1: 화면 전환 시 중복 fetch 제거)
 * -----------------------------------------------------------------
 * - staleTime 60초: 이 시간 안에 같은 queryKey 를 다시 마운트하면 네트워크 없이 캐시 반환.
 *   S1 의 "MyPage ↔ 다른 페이지 왕복 시 profile 재요청" 을 차단하는 핵심 값.
 * - refetchOnWindowFocus off: 인증 세션이 페이지 이동으로 바뀌지 않으므로 포커스 재요청 불필요.
 * - retry 1: Supabase 왕복이 실패해도 무한 재시도하지 않는다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
