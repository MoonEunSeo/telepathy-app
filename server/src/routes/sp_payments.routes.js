//심플버전(무통장입금)페이먼츠 - 결제생성/상태조회/환불정보저장
// ✅ /routes/sp_payments.routes.js
/*const express = require('express');
const router = express.Router();
const  supabase  = require('../config/supabase');
const CryptoJS = require('crypto-js');

require('dotenv').config();

// ✅ 방어코드 추가 (디버깅용)
//console.log("🧩 Supabase 객체 확인:", typeof supabase, supabase !== undefined ? "정상" : "❌ undefined");
//console.log("🧪 Supabase Key 존재?:", process.env.SUPABASE_KEY ? "✅ 있음" : "❌ 없음");

// ============================================
// 🪙 [1] 결제 생성
// ============================================
router.post('/create', async (req, res) => {
  try {
    const { user_id, name, amount } = req.body;

    if (!user_id || !name || !amount) {
      console.error("❌ 요청 누락:", req.body);
      return res.status(400).json({ error: "요청 파라미터 누락" });
    }

    console.log("💳 결제 요청:", { user_id, name, amount });

    // ✅ supabase 객체 방어
    if (!supabase || typeof supabase.from !== "function") {
      console.error("❌ supabase 초기화 실패!");
      return res.status(500).json({ error: "Supabase 클라이언트가 초기화되지 않았습니다." });
    }

    // ✅ DB 삽입
    const { data, error } = await supabase
      .from('sp_payments')
      .insert([
        {
          user_id,
          name,
          amount,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('❌ Supabase DB insert 실패:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ DB 삽입 성공:', data);

    // ✅ Toss 송금 딥링크 생성
    const bankCode = '090'; // 케이뱅크
    const accountNo = '100121028199';
    const encodedMsg = encodeURIComponent(`텔레파시 단어세트 (${name})`);

    const tossLink = `tossapp://transfer?bankCode=${bankCode}&accountNo=${accountNo}&amount=${amount}&message=${encodedMsg}`;

    const bankInfo = {
      bank: '케이뱅크',
      account: '100-121-028199',
      holder: '텔레파시',
    };

    res.json({
      success: true,
      tossLink,
      bankInfo,
      message: `아래 계좌로 ${amount}원을 송금해주세요 💸`,
    });
  } catch (err) {
    console.error("🔥 /create 라우트 내부 오류:", err);
    res.status(500).json({ error: err.message || "서버 내부 오류" });
  }
});

// ============================================
// 🧾 [2] 결제 상태 조회
// ============================================
router.get('/status/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('sp_payments')
      .select('status')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    res.json({ status: data?.status || 'none' });
  } catch (err) {
    console.error('❌ 상태 조회 실패:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================
// 💸 [3] 환불정보 & 단어세트 업데이트
// ============================================
router.post('/update-refund', async (req, res) => {
  try {
    const { user_id, refund_bank, refund_account, wordset } = req.body;
    console.log("📩 [요청 수신] /update-refund:", req.body);

    if (!user_id) {
      console.warn("⚠️ user_id 누락");
      return res.status(400).json({ ok: false, message: "user_id가 필요합니다." });
    }

    // ✅ 단어 배열 → 쉼표로 연결
    const wordsetText = Array.isArray(wordset)
      ? wordset.filter(Boolean).join(', ')
      : null;

    // ✅ 계좌번호 암호화 (AES)
    const secretKey = process.env.ACCOUNT_SECRET_KEY || "telepathy-key";
    const encryptedAccount = refund_account
      ? CryptoJS.AES.encrypt(refund_account, secretKey).toString()
      : null;

    console.log("🔒 암호화된 계좌:", encryptedAccount);

    // ✅ 가장 최근 결제 내역 찾기
    const { data: recentPayment, error: selectErr } = await supabase
      .from('sp_payments')
      .select('id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectErr || !recentPayment) {
      console.warn("⚠️ 결제 내역 없음:", selectErr);
      return res.status(404).json({ ok: false, message: '결제 내역을 찾을 수 없습니다.' });
    }

    console.log("💳 업데이트 대상 paymentId:", recentPayment.id);

    // ✅ 업데이트 시도
    const { data: updateData, error: updateErr } = await supabase
      .from('sp_payments')
      .update({
        refund_bank,
        refund_account: encryptedAccount,
        wordset_text: wordsetText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recentPayment.id)
      .select();

    if (updateErr) {
      console.error("❌ Supabase 업데이트 실패:", updateErr.message);
      return res.status(500).json({ ok: false, error: updateErr.message });
    }

    if (!updateData || updateData.length === 0) {
      console.warn("⚠️ 업데이트된 행이 없습니다 (조건 불일치)");
      return res.status(404).json({ ok: false, message: "DB에 반영되지 않았습니다." });
    }

    console.log("✅ 업데이트 완료 데이터:", updateData);
    res.json({ ok: true, message: "환불정보 및 단어세트 저장 완료" });
  } catch (err) {
    console.error("💥 /update-refund 예외:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ 마지막엔 항상 이렇게 닫아야 함!
module.exports = router;*/

// ✅ /routes/sp_payments.routes.js (Refactored & Hardened)
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const CryptoJS = require("crypto-js");
require("dotenv").config();

// ---------------------------
// 🧩 입력 검증 유틸
// ---------------------------
const KOREAN_WORD_RE = /^[가-힣]{1,6}$/;
const BANK_RE = /^[가-힣A-Za-z\s]{2,20}$/;
const ACCOUNT_RE = /^\d{4,20}$/;

function validateRefundPayload(req, res, next) {
  const { user_id, refund_bank, refund_account, wordset } = req.body;

  if (!user_id)
    return res.status(400).json({ ok: false, message: "user_id가 필요합니다." });

  if (!Array.isArray(wordset) || wordset.length === 0)
    return res.status(400).json({ ok: false, message: "단어세트를 입력해주세요." });

  for (let i = 0; i < wordset.length; i++) {
    const w = (wordset[i] || "").trim();
    if (!KOREAN_WORD_RE.test(w))
      return res
        .status(400)
        .json({ ok: false, message: `단어 ${i + 1}은(는) 한글 1~6자만 허용됩니다.` });
  }

  if (refund_bank && !BANK_RE.test(refund_bank))
    return res
      .status(400)
      .json({ ok: false, message: "은행명은 한글/영문/공백 2~20자만 허용됩니다." });

  if (refund_account && !ACCOUNT_RE.test(refund_account))
    return res
      .status(400)
      .json({ ok: false, message: "계좌번호는 숫자만 (4~20자리) 입력하세요." });

  next();
}

// ---------------------------
// 🪙 [1] 결제 생성
// ---------------------------
router.post("/create", async (req, res) => {
  try {
    const { user_id, name, amount } = req.body;
    if (!user_id || !name || !amount)
      return res.status(400).json({ error: "요청 파라미터 누락" });

    const { data, error } = await supabase
      .from("sp_payments")
      .insert([
        {
          user_id,
          name,
          expected_depositor: name, // ✅ 이 사람 이름으로 입금될 예정
          amount,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    const bankInfo = {
      bank: "케이뱅크",
      account: "100-121-028199",
      holder: "텔레파시",
    };

    const tossLink = `tossapp://transfer?bankCode=090&accountNo=100121028199&amount=${amount}&message=${encodeURIComponent(
      `텔레파시 단어세트 (${name})`
    )}`;

    res.json({
      success: true,
      tossLink,
      bankInfo,
      message: `아래 계좌로 ${amount}원을 송금해주세요 💸`,
    });
  } catch (err) {
    console.error("🔥 /create 에러:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 🧾 [2] 결제 상태 조회
// ---------------------------
router.get("/status/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { data, error } = await supabase
      .from("sp_payments")
      .select("status")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    res.json({ status: data?.status || "none" });
  } catch (err) {
    console.error("❌ 상태 조회 실패:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ---------------------------
// 💸 [3] 환불정보 & 단어세트 저장
// ---------------------------
router.post("/update-refund", validateRefundPayload, async (req, res) => {
  try {
    const { user_id, refund_bank, refund_account, wordset } = req.body;

    // 단어 배열 → 문자열
    const wordsetText = wordset.filter(Boolean).join(", ");

    // 계좌 암호화
    const secretKey = process.env.ACCOUNT_SECRET_KEY || "telepathy-key";
    const encryptedAccount = refund_account
      ? CryptoJS.AES.encrypt(refund_account, secretKey).toString()
      : null;

    // 최근 결제내역 찾기
    const { data: recentPayment, error: selectErr } = await supabase
      .from("sp_payments")
      .select("id")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (selectErr || !recentPayment)
      return res
        .status(404)
        .json({ ok: false, message: "결제 내역을 찾을 수 없습니다." });

    // DB 업데이트
    const { data: updated, error: updateErr } = await supabase
      .from("sp_payments")
      .update({
        refund_bank,
        refund_account: encryptedAccount,
        wordset_text: wordsetText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recentPayment.id)
      .select();

    if (updateErr) throw updateErr;
    if (!updated?.length)
      return res
        .status(400)
        .json({ ok: false, message: "DB 업데이트에 실패했습니다." });

    res.json({ ok: true, message: "환불정보 및 단어세트 저장 완료" });
  } catch (err) {
    console.error("💥 /update-refund 오류:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
