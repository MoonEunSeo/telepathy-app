const express = require("express");
const axios = require("axios");
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

router.post("/verify", async (req, res) => {
  const { imp_uid, userId, count, amount } = req.body;

  try {
    // 1. PortOne 토큰 발급
    const tokenRes = await axios.post("https://api.portone.io/login", {
      apiKey: process.env.PORTONE_API_KEY,
      apiSecret: process.env.PORTONE_API_SECRET,
    });
    console.log("🔑 tokenRes.data:", tokenRes.data);

    const { accessToken } = tokenRes.data;

    // 2. 결제 내역 확인
    const paymentRes = await axios.get(
      `https://api.portone.io/payments/${imp_uid}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const paymentData = paymentRes.data;
    console.log("💳 paymentData:", paymentData);

    // 3. 검증 후 DB 반영
    if (paymentData.status === "PAID" && paymentData.amount.total === amount) {
      await supabase.rpc("increment_megaphone", {
        uid: userId,
        add_count: count
      });

      await supabase.from("payments").insert([
        {
          user_id: userId,
          imp_uid,
          item: `megaphone_${count}`,
          count,
          amount,
          status: "PAID"
        },
      ]);

      return res.json({ success: true });
    } else {
      return res.status(400).json({ success: false, message: "결제 검증 실패" });
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

module.exports = router;
