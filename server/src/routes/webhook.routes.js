const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==============================
// 🔍 입금 내역 자동 파싱 함수
// ==============================
function parseDepositText(text) {
  const result = {
    sender: null,
    amount: null,
    bank: null
  };

  if (!text) return result;

  // 💰 금액 추출
  const amountMatch = text.match(/([\d,]+)\s*원/);
  if (amountMatch) result.amount = parseInt(amountMatch[1].replace(/,/g, ''));

  // 🙋‍♂️ 송금인 추출 (다양한 케이스 대응)
  const senderMatch = text.match(
    /(?:입금자|보낸이|보낸사람|보낸 사람|송금인|으로부터|님으로부터)\s*[:\s]*([가-힣A-Za-z0-9]+)\b/
  );
  if (senderMatch) result.sender = senderMatch[1];

  // 🏦 은행명 추출
  const bankMatch = text.match(
    /(케이뱅크|토스뱅크|카카오뱅크|신한|국민|농협|우리|하나|IBK|SC제일|기업|부산|대구|광주|전북|경남|제주)/
  );
  if (bankMatch) result.bank = bankMatch[1];

  return result;
}

// ==============================
// 💌 MacroDroid Webhook
// ==============================
router.post('/', async (req, res) => {
  try {
    // ✅ JSON이 문자열로 들어올 경우 처리
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        console.warn('⚠️ JSON 파싱 실패, 원문 저장');
        req.body = { raw: req.body };
      }
    }

    const { key } = req.query;
    const { title, text, app, message, data } = req.body;

    // ✅ 시크릿 키 검증
    if (key !== process.env.WEBHOOK_SECRET) {
      console.warn('🚫 잘못된 Webhook 접근 (key mismatch)');
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    // ✅ 본문 텍스트 처리
    const rawText =
      text ||
      message ||
      data?.text ||
      data?.message ||
      '(본문 없음)';

    console.log(`📩 [${app || 'unknown'}] 수신 → ${title || '(제목 없음)'} / ${rawText}`);

    // ✅ 입금내역 자동 파싱
    const { sender, amount, bank } = parseDepositText(rawText);
    console.log(`💰 파싱 결과 → ${bank || app || '은행 미상'} / ${sender || '보낸이 미상'} / ${amount || '금액 없음'}`);

    // ✅ webhook 로그 원본 저장
    const { data: webhookData, error: webhookErr } = await supabase
      .from('payment_webhooks')
      .insert([
        {
          app,
          title,
          text: rawText,
          raw_body: req.body,
          parsed_sender: sender,
          parsed_amount: amount,
          parsed_bank: bank,
        },
      ])
      .select();

    if (webhookErr) {
      console.error('❌ webhook 로그 저장 실패:', webhookErr.message);
      throw webhookErr;
    }

    console.log('🧾 webhook 저장 완료:', webhookData[0].id);

    // ✅ 금액이 있을 경우, 결제 매칭 시도
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
        console.log(`💸 매칭된 결제 발견 → user=${payment.user_id} / amount=${amount}`);

        const { error: updateErr } = await supabase
          .from('sp_payments')
          .update({
            status: 'paid',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        if (updateErr) throw updateErr;

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

    return res.json({ ok: true });
  } catch (err) {
    console.error('💥 Webhook 처리 중 오류:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
