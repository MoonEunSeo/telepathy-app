import express, { Request, Response } from 'express';
import { SolapiMessageService } from 'solapi';
import { randomInt } from 'node:crypto';
import { redisClient } from '../config/redis';
import type {
  VerifyMvpSendRequest,
  VerifyMvpSendResponse,
  VerifyMvpCheckRequest,
  VerifyMvpCheckResponse,
} from '@shared/api';

// (Solapi SMS 인증)
const router = express.Router();

const CODE_TTL_SECONDS = 180;
const DAILY_SEND_LIMIT = 5;
const ONE_DAY_SECONDS = 24 * 60 * 60;
const IP_WINDOW_SECONDS = 5 * 60;
const IP_SEND_LIMIT = 20;

const ipCountKey = (ip: string): string => `verify:ip:${ip}`;

const codeKey = (phone: string): string => `verify:code:${phone}`;
const dailyCountKey = (phone: string): string => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  return `verify:daily:${today}:${phone}`;
};

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

  const countKey = dailyCountKey(phone);
  const sendsToday = await redisClient.incr(countKey);
  if (sendsToday === 1) {
    await redisClient.expire(countKey, ONE_DAY_SECONDS);
  }

  if (sendsToday > DAILY_SEND_LIMIT) {
    return res.status(429).json({
      success: false,
      message: '인증번호는 하루에 최대 5회까지 요청할 수 있습니다.',
    } satisfies VerifyMvpSendResponse);
  }

  const code = generateCode();

  try {
    await redisClient.set(codeKey(phone), code, { EX: CODE_TTL_SECONDS });
    await messageService.send({
      to: phone,
      from: process.env.SENDER_PHONE as string,
      text: `[텔레파시] 인증번호는 ${code}입니다.`,
    });
    res.json({ success: true } satisfies VerifyMvpSendResponse);
  } catch (error) {
    await redisClient.del(codeKey(phone));
    await redisClient.decr(countKey);
    const e = error as { response?: { data?: unknown }; message?: string };
    console.error('문자 전송 실패:', e.response?.data || e.message);
    res.status(500).json({
      success: false,
      message: '문자 전송에 실패했습니다.',
    } satisfies VerifyMvpSendResponse);
  }
});

// ✅ 인증번호 검증 API
router.post('/check', async (req: Request, res: Response) => {
  const { phone, code } = req.body as VerifyMvpCheckRequest;
  const saved = await redisClient.get(codeKey(phone));

  if (saved === code) {
    await redisClient.del(codeKey(phone));
    res.json({ success: true } satisfies VerifyMvpCheckResponse);
  } else {
    res.status(400).json({
      success: false,
      message: '인증번호가 일치하지 않습니다.',
    } satisfies VerifyMvpCheckResponse);
  }
});

export default router;
