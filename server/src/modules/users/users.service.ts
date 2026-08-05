import { AppError } from '../../errors/AppError';
import * as usersRepository from './users.repository';
import type { Profile } from './users.repository';
import type { SetNicknameInput } from './users.schema';

// 토큰 수명이 60일이라 그 사이 탈퇴한 계정의 토큰이 살아 있을 수 있다.
// 서명이 유효하다는 것과 프로필이 남아 있다는 것은 다른 얘기다.
const PROFILE_GONE = '로그인이 필요합니다.';

export async function changeNickname(
  actorId: string,
  { nickname }: SetNicknameInput,
): Promise<void> {
  const outcome = await usersRepository.changeNickname(actorId, nickname);
  if (outcome.ok) return;

  if (outcome.reason === 'NICKNAME_TAKEN') {
    // 레거시는 이 경우 500 "서버 오류" 를 냈다.
    // 사용자는 이름이 겹친 건지 서버가 고장난 건지 알 수 없었다.
    throw new AppError(409, 'NICKNAME_TAKEN', '이미 사용 중인 닉네임입니다.');
  }

  throw new AppError(401, 'UNAUTHENTICATED', PROFILE_GONE);
}

export async function getProfile(actorId: string): Promise<Profile> {
  const profile = await usersRepository.findProfile(actorId);
  if (!profile) throw new AppError(401, 'UNAUTHENTICATED', PROFILE_GONE);
  return profile;
}
