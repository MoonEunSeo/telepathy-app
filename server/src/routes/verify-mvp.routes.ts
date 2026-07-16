import express, { Request, Response } from 'express';
import { SolapiMessageService } from 'solapi';
import { randomInt } from 'node:crypto';
import type {
  VerifyMvpSendRequest,
  VerifyMvpSendResponse,
  VerifyMvpCheckRequest,
  VerifyMvpCheckResponse,
} from '@shared/api';

// (Solapi SMS 인증)
const router = express.Router();

// 인증번호 저장소 (실 서비스에선 Redis 등 권장)
const codeStore = new Map<string, string>();

// Solapi 서비스 인스턴스 생성
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY as string,
  process.env.SOLAPI_API_SECRET as string,
);

// 인증번호 생성 함수
const generateCode = (): string => randomInt(100000, 1000000).toString();

// ✅ 문자 전송 API
router.post('/send', async (req: Request, res: Response) => {
  const { phone } = req.body as VerifyMvpSendRequest;
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: '전화번호를 입력해주세요.',
    } satisfies VerifyMvpSendResponse);
  }

  const code = generateCode();
  codeStore.set(phone, code);
  setTimeout(() => codeStore.delete(phone), 180000); // 3분 후 삭제

  try {
    await messageService.send({
      to: phone,
      from: process.env.SENDER_PHONE as string,
      text: `[텔레파시] 인증번호는 ${code}입니다.`,
    });
    res.json({ success: true } satisfies VerifyMvpSendResponse);
  } catch (error) {
    const e = error as { response?: { data?: unknown }; message?: string };
    console.error('문자 전송 실패:', e.response?.data || e.message);
    res.status(500).json({
      success: false,
      message: '문자 전송에 실패했습니다.',
    } satisfies VerifyMvpSendResponse);
  }
});

// ✅ 인증번호 검증 API
router.post('/check', (req: Request, res: Response) => {
  const { phone, code } = req.body as VerifyMvpCheckRequest;
  const saved = codeStore.get(phone);

  if (saved === code) {
    codeStore.delete(phone);
    res.json({ success: true } satisfies VerifyMvpCheckResponse);
  } else {
    res.status(400).json({
      success: false,
      message: '인증번호가 일치하지 않습니다.',
    } satisfies VerifyMvpCheckResponse);
  }
});

export default router;
