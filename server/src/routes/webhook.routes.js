// 📦 server/src/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * ✅ 케이뱅크 입금 알림 전용 파서
 */
function parseKbankDeposit(text) {
  const result = {
    sender: null,
    amount: null,
    bank: '케이뱅크',
  };

  const amountMatch = text.match(
    /입금\s*([\d,]+)\s*원|입금액\s*[:\s]*([\d,]+)\s*원|([\d,]+)\s*원\s*입금/
  );
  if (amountMatch) {
    const amountStr = amountMatch[1] || amountMatch[2] || amountMatch[3];
    result.amount = parseInt(amountStr.replace(/,/g, ''), 10);
  }

  const senderMatch = text.match(/([가-힣A-Za-z0-9]+)\s*\|/);
  if (senderMatch) {
    result.sender = senderMatch[1];
  }

  return result;
}

// ✅ MacroDroid Webhook (POST)
router.post('/', async (req, res) => {
  try {
    // ⚠️ text/plain으로 들어오는 경우 대비
    let body = req.body;
    if (typeof body === 'string' && body.trim().startsWith('{')) {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.warn('⚠️ JSON 파싱 실패:', e.message);
      }
    }

    const { key } = req.query;
    const { title, text, app } = body || {};

    // ✅ 보안키 확인
    if (key !== process.env.WEBHOOK_SECRET) {
      console.warn('🚫 잘못된 Webhook 접근 (key mismatch)');
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const rawText = text || '(본문 없음)';
    const { sender, amount, bank } = parseKbankDeposit(rawText);

    console.log('📩 [Webhook 수신]');
    console.log(' ├─ App:', app || '(unknown)');
    console.log(' ├─ Title:', title || '(제목 없음)');
    console.log(' ├─ Text:', rawText);
    console.log(' ├─ Sender:', sender || '(없음)');
    console.log(' ├─ Amount:', amount ? amount + '원' : '(없음)');
    console.log(' └─ Bank:', bank);

    // ✅ webhook 로그 저장
    const { error: webhookErr } = await supabase.from('payment_webhooks').insert([
      {
        app,
        title,
        text: rawText,
        parsed_sender: sender,
        parsed_amount: amount,
        // parsed_bank: bank, // ← Supabase에 없으면 주석처리
        raw_body: req.body,
      },
    ]);

    if (webhookErr) throw webhookErr;
    console.log('✅ webhook 로그 저장 완료');

    // ✅ 매칭된 결제 찾기
    if (amount) {
      const { data: payments, error: selectErr } = await supabase
        .from('sp_payments')
        .select('*')
        .eq('status', 'pending')
        .eq('amount', amount)
        .order('created_at', { ascending: false })
        .limit(1);

      if (selectErr) throw selectErr;

      if (payments?.length > 0) {
        const payment = payments[0];
        console.log(`💰 매칭된 결제 발견: user=${payment.user_id} (${amount}원)`);

        const { error: updateErr } = await supabase
          .from('sp_payments')
          .update({
            status: 'paid',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        if (updateErr) throw updateErr;

        console.log(`✅ 결제 ${payment.id} → paid 상태로 업데이트 완료`);
      } else {
        console.log(`⚠️ 일치하는 pending 결제 없음 (${amount}원)`);
      }
    } else {
      console.log('⚠️ 금액 파싱 실패 →', rawText);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('💥 Webhook 처리 중 오류:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
