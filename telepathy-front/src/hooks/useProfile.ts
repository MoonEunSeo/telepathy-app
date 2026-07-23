import { useQuery } from '@tanstack/react-query';
import type { ProfileResponse, Id } from '../types';

/**
 * 로그인 사용자 프로필 (S1: 여러 페이지가 공유하는 단일 캐시)
 * -----------------------------------------------------------------
 * 기존에는 MyPage·MainPage·LikePage 가 각자 `/api/nickname/profile` 을 fetch 해
 * 화면을 오갈 때마다 같은 데이터를 다시 받았다. 이 훅으로 queryKey ['profile'] 을
 * 공유하면 staleTime(60초) 안에서는 네트워크 없이 캐시를 반환한다.
 *
 * 응답의 id 필드가 user_id / id / userId 로 혼재하므로 여기서 userId 로 정규화한다.
 */
export interface Profile {
  userId: Id;
  username: string;
  nickname: string | null;
}

async function fetchProfile(): Promise<ProfileResponse> {
  const res = await fetch('/api/nickname/profile', { credentials: 'include' });
  return (await res.json()) as ProfileResponse;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    // success=false(미로그인)는 정상 응답이므로 select 로 정규화만 하고 에러로 다루지 않는다.
    select: (data): { profile: Profile | null; raw: ProfileResponse } => {
      const userId = data.user_id ?? data.id ?? data.userId;
      const profile =
        data.success && userId
          ? { userId, username: data.username, nickname: data.nickname }
          : null;
      return { profile, raw: data };
    },
  });
}
