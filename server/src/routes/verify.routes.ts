// server/src/routes/verify.routes.ts
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import type {
  VerifyPrepareResponse,
  VerifyConfirmRequest,
  VerifyConfirmResponse,
} from '@shared/api';

//  (PortOne 실명/본인인증)
const router = express.Router();

// 1. identityVerificationId 생성
router.post('/prepare', (req: Request, res: Response) => {
  try {
    const identityVerificationId = `identity-verification-${uuidv4()}`;
    console.log('[생성된 ID]', identityVerificationId);
    res.json({ identityVerificationId } satisfies VerifyPrepareResponse);
  } catch (err) {
    console.error('[ID 발급 오류]', err);
    res.status(500).json({ error: 'ID 발급 실패' });
  }
});

// 2. 인증 결과 확인
router.post('/confirm', async (req: Request, res: Response) => {
  const { identityVerificationId } = req.body as VerifyConfirmRequest;

  if (!identityVerificationId) {
    return res
      .status(400)
      .json({ success: false, message: 'ID가 없습니다.' } satisfies VerifyConfirmResponse);
  }

  try {
    const response = await axios.get(
      `https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
      {
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`, // 비밀키
        },
      },
    );

    if (response.data.status !== 'VERIFIED') {
      return res
        .status(400)
        .json({ success: false, message: '인증 실패' } satisfies VerifyConfirmResponse);
    }

    // 인증된 사용자 정보
    const { name, phone, birth, gender } = response.data;
    console.log('✅ 인증 성공:', name, phone, birth, gender);
    res.json({
      success: true,
      user: { name, phone, birth, gender },
    } satisfies VerifyConfirmResponse);
  } catch (err) {
    const error = err as { response?: { data?: unknown }; message?: string };
    console.error('[인증 조회 실패]', error.response?.data || error.message);
    res
      .status(500)
      .json({ success: false, message: '인증 확인 실패' } satisfies VerifyConfirmResponse);
  }
});

export default router;
