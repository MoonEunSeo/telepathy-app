import type { Request, Response } from 'express';
import * as phoneService from './phone.service';
import { hashClientIp } from '../../utils/clientIp';
import type { PhoneSendResponse, PhoneVerifyResponse } from '@shared/api';
import type { SendCodeInput, VerifyCodeInput } from './phone.schema';

export async function sendCode(req: Request, res: Response): Promise<void> {
  const input: SendCodeInput = req.body;

  await phoneService.sendCode(input, hashClientIp(req));

  res
    .status(200)
    .json({ success: true, message: '인증번호를 발송했습니다.' } satisfies PhoneSendResponse);
}

export async function verifyCode(req: Request, res: Response): Promise<void> {
  const input: VerifyCodeInput = req.body;

  await phoneService.verifyCode(input);

  res
    .status(200)
    .json({ success: true, message: '인증이 완료되었습니다.' } satisfies PhoneVerifyResponse);
}
