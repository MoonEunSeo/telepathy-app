import type { Request, Response } from 'express';
import * as authService from './auth.service';
import type {
  AuthLoginResponse,
  AuthRegisterResponse,
  AuthPasswordChangeResponse,
  AuthPasswordResetResponse,
  AuthWithdrawResponse,
} from '@shared/api';
import type {
  LoginInput,
  SignupInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from './auth.schema';
import { buildCookieOptions, TOKEN_COOKIE_OPTIONS } from '../../utils/cookie';
import { sendOk } from '../../utils/respond';

export async function signup(req: Request, res: Response): Promise<void> {
  const input: SignupInput = req.body;
  const { token, maxAgeMs } = await authService.signup(input);

  res.cookie('token', token, buildCookieOptions(maxAgeMs));
  // 토큰은 쿠키로 나가므로 본문 페이로드가 없다 -> data: null
  sendOk<AuthRegisterResponse>(res, 201, null, '회원가입 완료');
}

export async function login(req: Request, res: Response): Promise<void> {
  /**
   * req.body는 any다. LoginInput을 믿을 수 있는 근거는 타입이 아니라
   * 앞단의 validateBody(loginSchema)가 런타임에 검사했다는 사실이다.
   */
  const input: LoginInput = req.body;

  const { token, maxAgeMs } = await authService.login(input);

  res.cookie('token', token, buildCookieOptions(maxAgeMs));
  sendOk<AuthLoginResponse>(res, 200, null, '로그인 성공');
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  // requireMember 를 통과한 뒤에만 도달한다 -> req.user 가 반드시 있다.
  // V2 에서 user_id 는 actors.id 다 (auth.service.login 참조).
  const actorId = req.user!.user_id;
  const input: ChangePasswordInput = req.body;

  await authService.changePassword(actorId, input);

  sendOk<AuthPasswordChangeResponse>(res, 200, null, '비밀번호가 변경되었습니다.');
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const input: ResetPasswordInput = req.body;

  await authService.resetPassword(input);

  sendOk<AuthPasswordResetResponse>(res, 200, null, '비밀번호가 재설정되었습니다.');
}

export async function withdraw(req: Request, res: Response): Promise<void> {
  // requireMember 를 통과한 뒤에만 도달한다.
  const actorId = req.user!.user_id;

  // 쿠키를 먼저 지우지 않는다. 탈퇴가 실패하면 로그인만 풀린 상태가 된다.
  await authService.withdraw(actorId);

  // 발급 때와 속성이 맞아야 실제로 지워진다 (utils/cookie.ts 참조).
  res.clearCookie('token', TOKEN_COOKIE_OPTIONS);
  sendOk<AuthWithdrawResponse>(res, 200, null, '회원탈퇴 완료');
}
