// server/src/routes/payments.routes.ts
import express, { Request, Response } from 'express';
import axios from 'axios';
import type { PaymentsVerifyRequest, PaymentsVerifyResponse } from '@shared/api';
import authMiddleware from '../middleware/auth';
import supabase from '../config/supabase';
import { MEGAPHONE_SKUS, type MegaphoneSku } from '@shared/domain';

const router = express.Router();

interface IamportTokenResponse {
  code: number;
  message: string | null;
  response: { access_token: string; expired_at: number; now: number };
}

interface IamportPaymentResponse {
  code: number;
  message: string | null;
  response: {
    imp_uid: string;
    merchant_uid: string;
    status: string; // 'ready' / 'paid' / 'cancelled' / 'failed'
    amount: number;
    name: string;
  } | null;
}

router.post('/verify', authMiddleware, async (req: Request, res: Response) => {
  const { imp_uid, item } = req.body as PaymentsVerifyRequest;
  const userId = req.user?.user_id;

  // 메가폰 가격
  const sku = MEGAPHONE_SKUS[item as MegaphoneSku];

  if (!imp_uid || !sku) {
    return res.status(400).json({ success: false, message: '잘못된 요청' });
  }

  try {
    // 1. PortOne 토큰 발급
    const tokenRes = await axios.post<IamportTokenResponse>(
      'https://api.iamport.kr/users/getToken',
      {
        imp_key: process.env.PORTONE_API_KEY,
        imp_secret: process.env.PORTONE_API_SECRET,
      },
    );
    const accessToken = tokenRes.data.response.access_token;

    // 2. 결제 내역 확인
    const paymentRes = await axios.get<IamportPaymentResponse>(
      `https://api.iamport.kr/payments/${encodeURIComponent(imp_uid)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const payment = paymentRes.data.response; // ⚠️ .response 한 겹

    if (!payment) {
      return res.status(400).json({ success: false, message: '결제 내역 없음' });
    }
    console.log('💳 payment:', payment);

    // 서버 가격표와 대조
    if (payment.status === 'paid' && payment.amount === sku.amount) {
      // 결제 기록 추가 -> 결제 결과 확인
      const { error: logErr } = await supabase.from('payments').insert([
        {
          // 결과 확인
          user_id: userId,
          imp_uid,
          item,
          count: sku.count,
          amount: sku.amount,
          status: 'PAID',
        },
      ]);

      if (logErr) {
        // 중복 결제면, 이미 처리된 결제 -> 지급하지 않고 즉시 종료
        if (logErr.code === '23505') {
          return res.status(409).json({ success: false, message: '이미 처리된 결제입니다.' });
        }
        // 그 밖의 DB 오류는 지급하면 안 되지 여기서 멈춘다
        console.error('payments 기록 실패:', logErr.message);
        return res.status(500).json({ success: false, message: '서버 오류' });
      }

      // 기록에 성공한 요청만 지급
      await supabase.rpc('increment_megaphone', {
        uid: userId, // 토큰에서 온 값
        add_count: sku.count, // 가격표에서 온 값, 클라는 개수 결정 못함
      });

      return res.json({ success: true });
    }
    return res.status(400).json({ success: false, message: '결제 검증 실패' });
  } catch (err) {
    const error = err as { response?: { data?: unknown }; message?: string };
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, message: '서버 오류' } satisfies PaymentsVerifyResponse);
  }
});

export default router;
