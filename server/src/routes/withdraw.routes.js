// 📦 server/src/routes/withdraw.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 회원탈퇴
router.post('/', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ success: false, message: '인증이 필요합니다.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('❌ 회원탈퇴 실패:', error.message);
      return res.status(500).json({ success: false, message: '회원탈퇴에 실패했습니다.' });
    }

    res.clearCookie('token'); // 쿠키 제거
    return res.status(200).json({ success: true, message: '회원탈퇴 완료' });
  } catch (err) {
    console.error('❌ 토큰 검증 실패:', err.message);
    return res.status(403).json({ success: false, message: '유효하지 않은 요청입니다.' });
  }
});

module.exports = router;