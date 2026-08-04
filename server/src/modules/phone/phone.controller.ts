import type { Request, Response } from 'express';
import * as phoneService from './phone.service';
import { hashClientIp } from '../../utils/clientIp';
import type { PhoneSendResponse, PhoneVerifyResponse } from '@shared/api';
import type { SendCodeInput, VerifyCodeInput } from './phone.schema';
import { sendOk } from '../../utils/respond';

export async function sendCode(req: Request, res: Response): Promise<void> {
  const input: SendCodeInput = req.body;

  await phoneService.sendCode(input, hashClientIp(req));

  sendOk<PhoneSendResponse>(res, 200, null, '인증번호를 발송했습니다.');
}

export async function verifyCode(req: Request, res: Response): Promise<void> {
  const input: VerifyCodeInput = req.body;

  await phoneService.verifyCode(input);

  // TEL-21 에서 challengeId 를 실어 보낸다.
  // 지금은 "이 번호가 최근 인증됐다" 만 남고, 인증한 사람과 재설정을 요청한 사람이
  // 같은지 확인할 수단이 없다 (TEL-16 §7.1).
  sendOk<PhoneVerifyResponse>(res, 200, null, '인증이 완료되었습니다.');
}
