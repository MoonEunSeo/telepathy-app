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

// ✅ [추가 1] 실명 조회
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('real_name')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json({ real_name: data?.real_name || null });
  } catch (err) {
    console.error('❌ 실명 조회 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ [추가 2] 실명 업데이트
router.post('/update-realname', async (req, res) => {
  const { user_id, real_name } = req.body;
  try {
    const { error } = await supabase
      .from('users')
      .update({ real_name })
      .eq('id', user_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 실명 저장 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
