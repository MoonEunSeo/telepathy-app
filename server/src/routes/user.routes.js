// routes/user.routes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

const authMiddleware = require('../middleware/auth');

// 유저 수 가져오기
router.get('/count', async (req, res) => {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true }); 
    // head:true → 데이터는 안가져오고 count만

  if (error) return res.status(500).json({ error: error.message });
  res.json({ userCount: count });
});

// 내 확성기 개수 조회
router.get("/megaphone-count", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id; // JWT에서 가져온 값

    const { data, error } = await supabase
      .from("users")
      .select("megaphone_count")
      .eq("id", userId)
      .single();

    if (error) throw error;

    return res.json({ success: true, count: data.megaphone_count });
  } catch (err) {
    console.error("❌ megaphone-count 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});



module.exports = router;
