const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 신고 접수 처리
router.post('/', async (req, res) => {
    console.log('🚨 신고 요청 본문:', req.body);
    const { reporterId, reportedId, roomId, reasons, extraMessage } = req.body;
  
    if (!reporterId || !reportedId || !roomId) {
      return res.status(400).json({ success: false, message: '필수 값 누락' });
    }
  
    try {
      const { error } = await supabase.from('reported_reports').insert([
        {
          reporter_id: reporterId,
          reported_id: reportedId,
          room_id: roomId,
          reasons,
          extra_message: extraMessage,
        }
      ]);
  
      if (error) {
        console.error('❌ Supabase insert error:', error.message || error.details || error);
        return res.status(500).json({ success: false, message: '서버 내부 오류' });
      }
  
      return res.status(200).json({ success: true, message: '신고 완료' });
  
    } catch (err) {
      console.error('🔥 서버 에러:', err);
      return res.status(500).json({ success: false, message: '서버 내부 오류' });
    }
  });
module.exports = router;
