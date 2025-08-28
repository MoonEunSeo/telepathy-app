// /routes/report.js
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
  const { reasons, extraMessage, reporterId, reportedId, roomId } = req.body;

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
        created_at: new Date().toISOString(), // ✅ JS에서 UTC ISO 포맷
      }
    ]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message || error.details || error);
      return res.status(500).json({ success: false, message: '서버 내부 오류' });
    }
    // ✅ 신고 성공 후 socket으로 상대방에게 알림
      const io = req.app.get('io');
      if (io) {
        io.to(roomId).emit('chatEndedByReport', { reporterId });
      }

    return res.status(200).json({ success: true, message: '신고 완료' });
  } catch (err) {
    console.error('🔥 서버 에러:', err);
    return res.status(500).json({ success: false, message: '서버 내부 오류' });
  }
});

module.exports = router;
