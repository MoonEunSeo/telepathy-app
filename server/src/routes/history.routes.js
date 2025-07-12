const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 단어 히스토리 조회 API
router.get('/', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: '인증 토큰 없음' });
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user_id;
  
      const { data, error } = await supabase
        .from('word_history')
        .select('word, connected_at, partner_id, partner_nickname') // 🔄 새 구조
        .eq('user_id', userId)
        .order('connected_at', { ascending: false });
  
      if (error) throw error;
  
      return res.status(200).json({ success: true, history: data });
    } catch (err) {
      console.error('❌ 단어 히스토리 조회 실패:', err.message);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
  });


// ✅ 단어 히스토리 저장 API
// 📦 routes/word-history.routes.js
router.post('/add', async (req, res) => {
    const token = req.cookies.token;
    const { partnerId, partnerNickname, word, userNickname } = req.body;
  
    if (!token || !partnerId || !partnerNickname || !word || !userNickname) {
      return res.status(400).json({ success: false, message: '필수 정보 누락' });
    }
  
    if (partnerId === 'undefined') {
      return res.status(400).json({ success: false, message: '유효하지 않은 partnerId' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user_id;
  
      // 중복 저장 방지 (같은 조합이 있으면 패스)
      const { data: existing, error: checkError } = await supabase
        .from('word_history')
        .select('id')
        .eq('user_id', userId)
        .eq('partner_id', partnerId)
        .eq('word', word)
        .maybeSingle();
  
      if (checkError) throw checkError;
      if (existing) {
        return res.status(200).json({ success: true, message: '이미 저장된 기록' });
      }
  
      const { error } = await supabase.from('word_history').insert([
        {
          user_id: userId,
          user_nickname: userNickname,
          partner_id: partnerId,
          partner_nickname: partnerNickname,
          word,
        },
      ]);
  
      if (error) throw error;
  
      return res.status(200).json({ success: true, message: '히스토리 저장 완료' });
    } catch (err) {
      console.error('❌ word_history 저장 실패:', err.message);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
  });

module.exports = router;