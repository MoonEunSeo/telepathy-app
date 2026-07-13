// deposit.routes.ts
import express, { Request, Response } from 'express';
import supabase from '../config/supabase';
import { parseDepositMessage } from '../utils/parseDeposit';

const router = express.Router();

router.post('/webhook', async (req: Request, res: Response) => {
  console.log('🔍 Raw body:', req.body);

  try {
    const { message } = req.body as { message: string };

    const parsed = parseDepositMessage(message);
    if (!parsed) {
      console.log('⚠️ 파싱 실패:', message);
      return res.status(400).json({ error: 'Parsing failed' });
    }

    const { amount, name } = parsed;
    console.log(`📩 문자 수신 → ${name} / ${amount}원`);

    // status=pending인 결제 내역 찾기
    const { data, error } = await supabase
      .from('sp_payments')
      .select('*')
      .eq('status', 'pending')
      .eq('name', name)
      .eq('amount', amount);

    if (error) throw error;

    if (data && data.length > 0) {
      const id = data[0].id;

      await supabase
        .from('sp_payments')
        .update({
          status: 'paid',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', id);

      console.log(`✅ 입금 확인 완료 → ${name} / ${amount}원`);
      return res.json({ success: true });
    }

    console.log('❌ 매칭되는 결제 없음');
    return res.json({ success: false });
  } catch (err) {
    console.error('❌ /deposit/webhook 오류:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
