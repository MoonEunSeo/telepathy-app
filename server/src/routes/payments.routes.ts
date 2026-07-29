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

// grant_megaphone_payment 의 반환 형태
// 정의: supabase/migrations/20260729_grant_megaphone_payment.sql
interface GrantResult {
  status: 'GRANTED' | 'DUPLICATE';
  new_count: number | null;
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
      // 결제 기록과 지급을 한 트랜잭션으로 처리한다.
      // 둘을 따로 호출하면 지급이 실패해도 기록만 남아 "돈은 받고 미지급" 이 된다.
      // 중복 결제(imp_uid unique 위반)는 함수 안에서 잡아 'DUPLICATE' 로 돌려준다.
      const { data, error: grantErr } = await supabase.rpc('grant_megaphone_payment', {
        p_user_id: userId, // 토큰에서 온 값
        p_imp_uid: imp_uid,
        p_item: item,
        p_count: sku.count, // 가격표에서 온 값, 클라는 개수 결정 못함
        p_amount: sku.amount,
      });

      // ⚠️ Supabase 는 DB 오류를 예외가 아닌 반환값으로 준다 → error 확인이 없으면 조용히 실패한다
      if (grantErr) {
        console.error('결제 지급 실패:', grantErr.message);
        return res.status(500).json({ success: false, message: '서버 오류' });
      }

      // rpc 반환값은 런타임 검사가 없으므로 사용처에서 방어한다
      const result = data as GrantResult | null;

      // 이미 처리된 결제 -> 지급하지 않고 종료 (트랜잭션은 이미 롤백됨)
      if (result?.status === 'DUPLICATE') {
        return res.status(409).json({ success: false, message: '이미 처리된 결제입니다.' });
      }

      // GRANTED 가 아니면 지급을 확신할 수 없으므로 성공으로 응답하지 않는다
      if (result?.status !== 'GRANTED') {
        console.error('결제 지급 응답 이상:', data);
        return res.status(500).json({ success: false, message: '서버 오류' });
      }

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
