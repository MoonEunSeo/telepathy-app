const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 감정 피드백 저장
router.post('/add', async (req, res) => {
    const {
      userId,
      userUsername,
      userNickname,
      partnerId,
      partnerUsername,
      partnerNickname,
      word,
      emotion
    } = req.body;
  
    if (!userId || !userUsername || !userNickname ||
        !partnerId || !partnerUsername || !partnerNickname ||
        !word || !emotion) {
      return res.status(400).json({ success: false, message: '필수 값 누락' });
    }
  
    const { error } = await supabase.from('emotion_feedback').insert([{
      user_id: userId,
      user_username: userUsername,
      user_nickname: userNickname,
      partner_id: partnerId,
      partner_username: partnerUsername,
      partner_nickname: partnerNickname,
      word,
      emotion
    }]);
  
    if (error) {
      console.error('❌ 감정 피드백 저장 실패:', error);
      return res.status(500).json({ success: false, message: 'DB 저장 실패' });
    }
  
    return res.json({ success: true, message: '피드백 저장 완료' });
  });

module.exports = router;