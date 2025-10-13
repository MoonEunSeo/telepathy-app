// 📩 server/src/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ✅ Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 📩 MacroDroid → POST https://telepathy.my/api/webhook?key=YOUR_SECRET_KEY
 * body = { title: "", text: "", app: "" }
 */
router.post('/', async (req, res) => {
  const { key } = req.query;
  const { title, text, app, message, data } = req.body;

  // body가 어떤 형식이든 일단 텍스트를 확보
  const rawText =
    text ||
    message ||
    data?.text ||
    data?.message ||
    "(본문 없음)";
  
  console.log(`📩 [${app || 'unknown'}] 수신 → ${title || '(제목 없음)'} / ${rawText}`);
  

  // ✅ 1. 보안키 검사
  if (key !== process.env.WEBHOOK_SECRET) {
    console.warn('🚫 잘못된 Webhook 접근 (key mismatch)');
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }

  console.log(`📩 [${app}] 알림 수신 → ${title || '(제목 없음)'} / ${text}`);

  try {
    // ✅ 2. 입금내역 파싱
    const match = text.match(/입금\s*([\d,]+)원\s*(.*)/);
    const amount = match ? parseInt(match[1].replace(/,/g, '')) : null;
    const sender = match ? match[2].trim().replace(/\s+$/, '') : null;

    // ✅ 3. webhook 로그 저장
    const { data: webhookData, error: webhookErr } = await supabase
      .from('payment_webhooks')
      .insert([
        {
          app,
          title,
          text,
          parsed_amount: amount,
          parsed_sender: sender,
        },
      ])
      .select();

    if (webhookErr) console.error('❌ webhook 로그 저장 실패:', webhookErr);
    else console.log('🧾 webhook 로그 저장 완료:', webhookData[0].id);

    // ✅ 4. 금액 일치하는 pending 결제 찾기
    if (amount) {
      const { data: payments, error: selectErr } = await supabase
        .from('sp_payments')
        .select('*')
        .eq('status', 'pending')
        .eq('amount', amount)
        .order('created_at', { ascending: false })
        .limit(1);

      if (selectErr) throw selectErr;

      if (payments && payments.length > 0) {
        const payment = payments[0];
        console.log(`💰 매칭된 결제 발견: ${payment.user_id} (${amount}원)`);

        // ✅ 5. 상태를 paid로 변경
        const { error: updateErr } = await supabase
          .from('sp_payments')
          .update({
            status: 'paid',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        if (updateErr) console.error('❌ 결제 상태 업데이트 실패:', updateErr);
        else console.log(`✅ 결제 ${payment.id} → paid 갱신 완료`);

        // ✅ 6. webhook 로그에도 matched_payment_id 업데이트
        if (webhookData?.[0]?.id) {
          await supabase
            .from('payment_webhooks')
            .update({ matched_payment_id: payment.id })
            .eq('id', webhookData[0].id);
        }
      } else {
        console.log('⚠️ 일치하는 pending 결제 없음 (amount:', amount, ')');
      }
    } else {
      console.log('⚠️ 금액 파싱 실패 →', text);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('💥 Webhook 처리 중 오류:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
