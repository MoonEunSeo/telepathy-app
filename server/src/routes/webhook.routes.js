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
function parseKbankDeposit(text, appName = '') {
  const result = {
    sender: null,
    amount: null,
    bank: appName || null ,
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
        // ✅ 줄바꿈, 탭, 특수제어문자 제거
        body = body.replace(/[\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ');
        body = JSON.parse(body);
      } catch (e) {
        console.warn('⚠️ JSON 파싱 실패:', e.message);
      }
    }

    const { key } = req.query;
    const { title, text, app, sender, Sender, amount, Amount } = body || {};
    //const { title, text, app } = body || {};

    // ✅ 보안키 확인
    if (key !== process.env.WEBHOOK_SECRET) {
      console.warn('🚫 잘못된 Webhook 접근 (key mismatch)');
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const rawText = text || '(본문 없음)';
    let { sender: parsedSender, amount: parsedAmount, bank } = parseKbankDeposit(rawText, app);
    
    // 🧩 JSON에 sender/amount 직접 포함되어 있을 경우 우선 적용
    const finalSender = sender || Sender || parsedSender || null;
    const finalAmount = Number(amount || Amount || parsedAmount || 0) || null;

    console.log('📩 [Webhook 수신]');
    console.log(' ├─ App:', app || '(unknown)');
    console.log(' ├─ Title:', title || '(제목 없음)');
    console.log(' ├─ Text:', rawText);
    console.log(' ├─ Sender:', finalSender || '(없음)');
    console.log(' ├─ Amount:', finalAmount ? finalAmount + '원' : '(없음)');
    console.log(' └─ Bank:', bank);

// ✅ webhook 로그 저장
const safeAmount = Number.isFinite(finalAmount) ? finalAmount : null;

const { error: webhookErr } = await supabase.from('payment_webhooks').insert([
  {
    app,
    title,
    text: rawText,
    parsed_sender: finalSender || null,
    parsed_amount: safeAmount ?? null,
    parsed_bank: bank || null,
    raw_body: JSON.stringify(req.body),
  },
]);

if (webhookErr) throw webhookErr;
console.log('✅ webhook 로그 저장 완료');

// ✅ 매칭된 결제 찾기
if (finalAmount) {
  const { data: payments, error: selectErr } = await supabase
    .from('sp_payments')
    .select('*')
    .eq('status', 'pending')
    .eq('amount', finalAmount)
    .order('created_at', { ascending: false })
    .limit(5); // 동일 금액 여러명 대비

  if (selectErr) throw selectErr;

  if (payments?.length > 0) {
    let matched = null;

    // ✅ 입금자명 비교 (expected_depositor 기준)
    for (const p of payments) {
      const expected = (p.expected_depositor || p.name || '').trim();
      const actual = (finalSender || '').trim();

      if (expected && actual && expected === actual) {
        matched = p;
        break;
      }
    }

    if (matched) {
      console.log(`💰 입금자명 일치 → user=${matched.user_id}, depositor=${finalSender}`);

      const { error: updateErr } = await supabase
        .from('sp_payments')
        .update({
          status: 'paid',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', matched.id);

      if (updateErr) throw updateErr;
      console.log(`✅ 결제 ${matched.id} → paid 상태로 업데이트 완료`);
    } else {
      console.warn(`🚨 입금자명 불일치: sender=${finalSender}, 금액=${finalAmount}`);

      // ⛔️ 이름 불일치 로그 남기기
      await supabase.from('payment_webhooks').insert([
        {
          app,
          title,
          text: rawText,
          parsed_sender: finalSender,
          parsed_amount: finalAmount,
          parsed_bank: bank,
          match_status: 'name_mismatch',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  } else {
    console.log(`⚠️ 일치하는 pending 결제 없음 (${finalAmount}원)`);
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
