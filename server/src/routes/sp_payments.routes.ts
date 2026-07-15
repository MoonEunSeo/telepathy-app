// 심플버전(무통장입금) 페이먼츠 - 결제생성/상태조회/환불정보저장
// ✅ /routes/sp_payments.routes.ts (Refactored & Hardened)
import express, { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';
import CryptoJS from 'crypto-js';
import type {
  SpPaymentCreateRequest,
  SpPaymentStatusResponse,
  SpPaymentUpdateRefundResponse,
} from '@shared/api';

const router = express.Router();

// ---------------------------
// 🧩 입력 검증 유틸
// ---------------------------
const KOREAN_WORD_RE = /^[가-힣]{1,6}$/;
const BANK_RE = /^[가-힣A-Za-z\s]{2,20}$/;
const ACCOUNT_RE = /^\d{4,20}$/;

function validateRefundPayload(req: Request, res: Response, next: NextFunction) {
  const { user_id, refund_bank, refund_account, wordset } = req.body;

  if (!user_id) return res.status(400).json({ ok: false, message: 'user_id가 필요합니다.' });

  if (!Array.isArray(wordset) || wordset.length === 0)
    return res.status(400).json({ ok: false, message: '단어세트를 입력해주세요.' });

  for (let i = 0; i < wordset.length; i++) {
    const w = (wordset[i] || '').trim();
    if (!KOREAN_WORD_RE.test(w))
      return res
        .status(400)
        .json({ ok: false, message: `단어 ${i + 1}은(는) 한글 1~6자만 허용됩니다.` });
  }

  if (refund_bank && !BANK_RE.test(refund_bank))
    return res
      .status(400)
      .json({ ok: false, message: '은행명은 한글/영문/공백 2~20자만 허용됩니다.' });

  if (refund_account && !ACCOUNT_RE.test(refund_account))
    return res.status(400).json({ ok: false, message: '계좌번호는 숫자만 (4~20자리) 입력하세요.' });

  next();
}

// ---------------------------
// 🪙 [1] 결제 생성
// ---------------------------
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { user_id, name, amount } = req.body as SpPaymentCreateRequest;
    if (!user_id || !name || !amount) return res.status(400).json({ error: '요청 파라미터 누락' });

    const { data, error } = await supabase
      .from('sp_payments')
      .insert([
        {
          user_id,
          name,
          expected_depositor: name, // ✅ 이 사람 이름으로 입금될 예정
          amount,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    console.log('✅ DB 삽입 성공:', data);

    const bankInfo = {
      bank: '케이뱅크',
      account: '100-121-028199',
      holder: '텔레파시',
    };

    const tossLink = `tossapp://transfer?bankCode=090&accountNo=100121028199&amount=${amount}&message=${encodeURIComponent(
      `텔레파시 단어세트 (${name})`,
    )}`;

    res.json({
      success: true,
      tossLink,
      bankInfo,
      message: `아래 계좌로 ${amount}원을 송금해주세요 💸`,
    });
  } catch (err) {
    console.error('🔥 /create 에러:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------
// 🧾 [2] 결제 상태 조회
// ---------------------------
router.get('/status/:user_id', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { data, error } = await supabase
      .from('sp_payments')
      .select('status')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ status: data?.status || 'none' } satisfies SpPaymentStatusResponse);
  } catch (err) {
    console.error('❌ 상태 조회 실패:', err);
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
});

// ---------------------------
// 💸 [3] 환불정보 & 단어세트 저장
// ---------------------------
router.post('/update-refund', validateRefundPayload, async (req: Request, res: Response) => {
  try {
    const { user_id, refund_bank, refund_account, wordset } = req.body;

    // 단어 배열 → 문자열
    const wordsetText = wordset.filter(Boolean).join(', ');

    // 계좌 암호화
    const secretKey = process.env.ACCOUNT_SECRET_KEY || 'telepathy-key';
    const encryptedAccount = refund_account
      ? CryptoJS.AES.encrypt(refund_account, secretKey).toString()
      : null;

    // 최근 결제내역 찾기
    const { data: recentPayment, error: selectErr } = await supabase
      .from('sp_payments')
      .select('id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectErr || !recentPayment)
      return res.status(404).json({
        ok: false,
        message: '결제 내역을 찾을 수 없습니다.',
      } satisfies SpPaymentUpdateRefundResponse);

    // DB 업데이트
    const { data: updated, error: updateErr } = await supabase
      .from('sp_payments')
      .update({
        refund_bank,
        refund_account: encryptedAccount,
        wordset_text: wordsetText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recentPayment.id)
      .select();

    if (updateErr) throw updateErr;
    if (!updated?.length)
      return res.status(400).json({
        ok: false,
        message: 'DB 업데이트에 실패했습니다.',
      } satisfies SpPaymentUpdateRefundResponse);

    res.json({
      ok: true,
      message: '환불정보 및 단어세트 저장 완료',
    } satisfies SpPaymentUpdateRefundResponse);
  } catch (err) {
    console.error('💥 /update-refund 오류:', err);
    res
      .status(500)
      .json({ ok: false, message: (err as Error).message } satisfies SpPaymentUpdateRefundResponse);
  }
});

export default router;
