const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ nickname 저장 API
router.post('/set-nickname', async (req, res) => {
  const token = req.cookies.token;
  const { nickname } = req.body;

  console.log('✅ POST /set-nickname 호출됨');
  console.log('✅ token:', token);
  console.log('✅ nickname:', nickname);

  if (!token) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!nickname || nickname.length > 20) {
    return res.status(400).json({ success: false, message: '닉네임이 유효하지 않습니다.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.user_id;
    const safeUsername = decoded.username || 'unknown'; // fallback 처리
  
    console.log('✅ user_id:', user_id);
  
    // 1️⃣ users 테이블에 nickname 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ nickname })
      .eq('id', user_id);
  
    if (updateError) {
      console.error('[닉네임 업데이트 오류]', updateError);
      throw updateError;
    }
  
    // 2️⃣ nickname_histories 테이블에 기록 추가
    const { error: insertError } = await supabase
      .from('nickname_histories')
      .insert([
        {
          user_id,
          username: safeUsername,
          nickname,
          changed_at: new Date().toISOString(),
        },
      ]);
  
    if (insertError) {
      console.warn('[닉네임 삽입 오류 - 무시]', insertError); // 절대 throw 하지 않음
    }
  
    return res.json({ success: true, message: '닉네임 저장 완료' });
  } catch (err) {
    console.error('[닉네임 저장 오류]', err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ GET /profile → 유저 닉네임 조회용
router.get('/profile', async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: '토큰 없음' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    const { data, error } = await supabase
      .from('users')
      .select('id, username, nickname') // ✅ id, username, nickname 다 불러오기
      .eq('id', userId)
      .maybeSingle();

      console.log('🧪 Supabase 조회결과:', { data, error });
      
    if (error || !data) {
      throw error || new Error('유저 없음');
    }

    res.json({
      success: true,
      id: data.id,
      username: data.username,
      nickname: data.nickname,
    });
  } catch (err) {
    console.error('❌ 닉네임 프로필 조회 실패:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
