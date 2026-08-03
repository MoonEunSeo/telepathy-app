import type { Request, Response } from 'express';
import * as authService from './auth.service';
import type {
  LoginResponse,
  RegisterResponse,
  PasswordChangeResponse,
  PasswordResetResponse,
} from '@shared/api';
import type {
  LoginInput,
  SignupInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from './auth.schema';
import { buildCookieOptions } from '../../utils/cookie';

export async function signup(req: Request, res: Response): Promise<void> {
  const input: SignupInput = req.body;
  const { token, maxAgeMs } = await authService.signup(input);

  res.cookie('token', token, buildCookieOptions(maxAgeMs));
  res.status(201).json({ success: true, message: '회원가입 완료' } satisfies RegisterResponse);
}

export async function login(req: Request, res: Response): Promise<void> {
  /**
   * req.body는 any다. LoginInput을 믿을 수 있는 근거는 타입이 아니라
   * 앞단의 validateBody(loginSchema)가 런타임에 검사했다는 사실이다.
   */
  const input: LoginInput = req.body;

  const { token, maxAgeMs } = await authService.login(input);

  res.cookie('token', token, buildCookieOptions(maxAgeMs));
  res.status(200).json({ success: true, message: '로그인 성공' } satisfies LoginResponse);
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  // requireMember 를 통과한 뒤에만 도달한다 -> req.user 가 반드시 있다.
  // V2 에서 user_id 는 actors.id 다 (auth.service.login 참조).
  const actorId = req.user!.user_id;
  const input: ChangePasswordInput = req.body;

  await authService.changePassword(actorId, input);

  res
    .status(200)
    .json({ success: true, message: '비밀번호가 변경되었습니다.' } satisfies PasswordChangeResponse);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const input: ResetPasswordInput = req.body;

  await authService.resetPassword(input);

  res
    .status(200)
    .json({ success: true, message: '비밀번호가 재설정되었습니다.' } satisfies PasswordResetResponse);
}
