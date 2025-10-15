// server/src/middlewares/validateRefund.js
const KOREAN_WORD_RE = /^[가-힣]{1,6}$/;
const BANK_RE = /^[가-힣A-Za-z\s]{2,20}$/;
const ACCOUNT_RE = /^\d{4,20}$/;

function trimString(v) {
  return typeof v === 'string' ? v.trim() : v;
}

/**
 * req.body 검증 및 정제:
 *  - user_id: 존재 (uuid 또는 문자열)
 *  - refund_bank: 은행명 규칙
 *  - refund_account: 숫자 4~20
 *  - wordset: 배열, 각 요소 한글 1~6자
 */
function validateRefundPayload(req, res, next) {
  try {
    const { user_id, refund_bank, refund_account, wordset } = req.body || {};

    if (!user_id) {
      return res.status(400).json({ ok: false, message: 'user_id가 필요합니다.' });
    }

    // 정제
    const bank = trimString(refund_bank);
    const account = trimString(refund_account);

    // wordset 기본값/타입검사
    if (!Array.isArray(wordset)) {
      return res.status(400).json({ ok: false, message: 'wordset은 배열이어야 합니다.' });
    }

    if (wordset.length === 0) {
      return res.status(400).json({ ok: false, message: '단어세트를 최소 1개 이상 입력하세요.' });
    }

    // 단어 검증 (각 항목 한글 1~6자)
    for (let i = 0; i < wordset.length; i++) {
      const wRaw = wordset[i];
      if (typeof wRaw !== 'string') {
        return res.status(400).json({ ok: false, message: `wordset[${i}]는 문자열이어야 합니다.` });
      }
      const w = wRaw.trim();
      if (!KOREAN_WORD_RE.test(w)) {
        return res.status(400).json({ ok: false, message: `wordset[${i}]는 한글 1~6자만 허용됩니다.` });
      }
      // 덮어쓰기: 정제된 값으로 교체 (so downstream uses clean)
      wordset[i] = w;
    }

    // 은행명/계좌 검증 (선택값 허용: 없으면 null)
    if (bank != null && bank !== '') {
      if (!BANK_RE.test(bank)) {
        return res.status(400).json({ ok: false, message: '은행명은 한글/영문/공백 2~20자만 허용됩니다.' });
      }
      req.body.refund_bank = bank;
    } else {
      req.body.refund_bank = null;
    }

    if (account != null && account !== '') {
      if (!ACCOUNT_RE.test(account)) {
        return res.status(400).json({ ok: false, message: '계좌번호는 숫자만(4~20자리) 입력하세요.' });
      }
      req.body.refund_account = account;
    } else {
      req.body.refund_account = null;
    }

    // wordset는 이미 정제했음
    req.body.wordset = wordset.map((s) => s); // 안전 복사

    // 통과
    return next();
  } catch (err) {
    console.error('validateRefundPayload 예외:', err);
    return res.status(500).json({ ok: false, message: '서버 검증 중 오류' });
  }
}

module.exports = { validateRefundPayload };
