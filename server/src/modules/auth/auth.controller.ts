import type { Request, Response } from 'express';
import * as authService from './auth.service';
import type { LoginResponse, RegisterResponse } from '@shared/api';
import type { LoginInput, SignupInput } from './auth.schema';
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
