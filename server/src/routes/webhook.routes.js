// server/src/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ MacroDroid webhook
router.post('/', async (req, res) => {
  const { key } = req.query;
  const { title, text, app, message, data } = req.body;

  if (key !== process.env.WEBHOOK_SECRET) {
    console.warn('🚫 잘못된 Webhook 접근 (key mismatch)');
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }

  const rawText =
    text ||
    message ||
    data?.text ||
    data?.message ||
    '(본문 없음)';

  console.log(`📩 [${app || 'unknown'}] 수신 → ${title || '(제목 없음)'} / ${rawText}`);

  try {
    // ✅ 1. 최근 중복 webhook 방지 (같은 텍스트 5분 내 중복)
    const { data: existing } = await supabase
      .from('payment_webhooks')
      .select('id, created_at')
      .eq('text', rawText)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (existing?.length > 0) {
      console.warn('⚠️ 중복 webhook 감지 → skip');
      return res.json({ ok: true, skipped: true });
    }

    // ✅ 2. 입금내역 파싱 (다양한 형태 대응)
    const match = rawText.match(/입금.*?([\d,]+)\s*원\s*(.+)?/);
    const amount = match ? parseInt(match[1].replace(/,/g, '')) : null;
    const sender = match ? match[2]?.trim().replace(/\s+$/, '') : null;

    // ✅ 3. webhook 로그 원본 저장
    const { data: webhookData, error: webhookErr } = await supabase
      .from('payment_webhooks')
      .insert([
        {
          app,
          title,
          text: rawText,
          raw_body: req.body,
          parsed_amount: amount,
          parsed_sender: sender,
        },
      ])
      .select();

    if (webhookErr) {
      console.error('❌ webhook 로그 저장 실패:', webhookErr.message);
      throw webhookErr;
    }

    console.log('🧾 webhook 저장 완료:', webhookData[0].id);

    // ✅ 4. 금액 매칭된 결제 찾기
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

        // ✅ 상태 갱신
        const { error: updateErr } = await supabase
          .from('sp_payments')
          .update({
            status: 'paid',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        if (updateErr) throw updateErr;

        // ✅ webhook 로그에 매칭정보 추가
        await supabase
          .from('payment_webhooks')
          .update({
            matched_payment_id: payment.id,
            matched_user_id: payment.user_id,
          })
          .eq('id', webhookData[0].id);

        console.log(`✅ 결제 ${payment.id} → paid 업데이트 완료`);
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