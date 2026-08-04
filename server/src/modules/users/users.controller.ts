import type { Request, Response } from 'express';
import * as usersService from './users.service';
import type { UserNicknameResponse, UserProfileResponse } from '@shared/api';
import type { SetNicknameInput } from './users.schema';
import { sendOk } from '../../utils/respond';

export async function setNickname(req: Request, res: Response): Promise<void> {
  // requireMember 를 통과한 뒤에만 도달한다.
  // V2 에서 user_id 는 actors.id 다 (auth.service.login 참조).
  const actorId = req.user!.user_id;
  const input: SetNicknameInput = req.body;

  await usersService.changeNickname(actorId, input);

  sendOk<UserNicknameResponse>(res, 200, null, '닉네임을 변경했습니다.');
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const actorId = req.user!.user_id;

  const profile = await usersService.getProfile(actorId);

  // 레거시는 userId·username·nickname 을 최상위에 실었다.
  // 프론트가 data.user_id || data.id || data.userId 로 받는 것도 그래서인데,
  // 확인해 보니 서버가 준 적 있는 것은 userId 하나뿐이다.
  sendOk<UserProfileResponse>(res, 200, profile);
}
