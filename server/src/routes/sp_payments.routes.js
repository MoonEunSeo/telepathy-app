//심플버전(무통장입금)페이먼츠 - 결제생성/상태조회/환불정보저장
// ✅ /routes/sp_payments.routes.js
const express = require('express');
const router = express.Router();
const  supabase  = require('../config/supabase');
require('dotenv').config();

// ✅ 방어코드 추가 (디버깅용)
//console.log("🧩 Supabase 객체 확인:", typeof supabase, supabase !== undefined ? "정상" : "❌ undefined");
//console.log("🧪 Supabase Key 존재?:", process.env.SUPABASE_KEY ? "✅ 있음" : "❌ 없음");

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
    const { data, error } = await supabase.from('sp_payments').insert([
        {
          user_id,
          name,
          amount,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ]).select();
      
      if (error) {
        console.error('❌ Supabase DB insert 실패:', error.message);
        return res.status(500).json({ error: error.message });
      }
      
      console.log('✅ DB 삽입 성공:', data);
    // ✅ Toss 링크 및 수동 계좌 안내
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

module.exports = router;
