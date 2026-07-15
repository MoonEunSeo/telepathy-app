// server/src/routes/payments.routes.ts
import express, { Request, Response } from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { PaymentsVerifyRequest, PaymentsVerifyResponse } from '@shared/api';

const router = express.Router();

// supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string,
);

interface PortOneTokenResponse {
  accessToken: string;
}

interface PortOnePaymentResponse {
  status: string;
  amount: { total: number };
}

router.post('/verify', async (req: Request, res: Response) => {
  const { imp_uid, userId, count, amount } = req.body as PaymentsVerifyRequest;

  try {
    // 1. PortOne 토큰 발급
    const tokenRes = await axios.post<PortOneTokenResponse>('https://api.portone.io/login', {
      apiKey: process.env.PORTONE_API_KEY,
      apiSecret: process.env.PORTONE_API_SECRET,
    });
    console.log('🔑 tokenRes.data:', tokenRes.data);

    const { accessToken } = tokenRes.data;

    // 2. 결제 내역 확인
    const paymentRes = await axios.get<PortOnePaymentResponse>(
      `https://api.portone.io/payments/${imp_uid}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const paymentData = paymentRes.data;
    console.log('💳 paymentData:', paymentData);

    // 3. 검증 후 DB 반영
    if (paymentData.status === 'PAID' && paymentData.amount.total === amount) {
      await supabase.rpc('increment_megaphone', {
        uid: userId,
        add_count: count,
      });

      await supabase.from('payments').insert([
        {
          user_id: userId,
          imp_uid,
          item: `megaphone_${count}`,
          count,
          amount,
          status: 'PAID',
        },
      ]);

      return res.json({ success: true } satisfies PaymentsVerifyResponse);
    } else {
      return res
        .status(400)
        .json({ success: false, message: '결제 검증 실패' } satisfies PaymentsVerifyResponse);
    }
  } catch (err) {
    const error = err as { response?: { data?: unknown }; message?: string };
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, message: '서버 오류' } satisfies PaymentsVerifyResponse);
  }
});

export default router;
