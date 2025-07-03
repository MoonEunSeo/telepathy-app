const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 매칭 시작
router.post('/start', async (req, res) => {
    try {
      const token = req.cookies.token;
      const { role, word } = req.body;
  
      if (!token || !role || !word) return res.status(400).json({ success: false, message: '필수 정보 누락' });
  
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        console.error('JWT 검증 실패:', e);
        return res.status(401).json({ success: false, message: '인증 실패' });
      }
  
      const userId = payload.user_id;
  
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', userId)
        .single();
  
      if (userError || !userProfile) {
        console.error('유저 닉네임 조회 실패:', userError);
        return res.status(500).json({ success: false, message: '닉네임 조회 실패' });
      }
  
      const nickname = userProfile.nickname;
  
      await supabase
        .from('balance_sessions')
        .delete()
        .eq('user_id', userId);
  
      const { data: insertData, error: insertError } = await supabase
        .from('balance_sessions')
        .insert({
          word,
          role,
          user_id: userId,
          nickname,
          matched: false,
        })
        .select()
        .single();
  
      if (insertError) {
        console.error('세션 등록 실패:', insertError);
        return res.status(500).json({ success: false, message: '세션 등록 실패' });
      }
  
      console.log('🟢 세션 등록 완료:', insertData);
      return res.json({ success: true, waiting: true });
    } catch (err) {
      console.error('❌ /start 처리 중 에러 발생:', err);
      return res.status(500).json({ success: false, message: '서버 내부 오류' });
    }
  });

// 매칭 확인 (리팩토링)
router.get('/check', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: '인증 실패' });
  
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: '토큰 검증 실패' });
    }
  
    const myId = payload.user_id;
  
    // 1️⃣ 먼저 내 세션 조회
    const { data: mySession, error: sessionError } = await supabase
      .from('balance_sessions')
      .select('*')
      .eq('user_id', myId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
  
    if (sessionError || !mySession) {
      console.error('내 세션 조회 실패:', sessionError);
      return res.json({ success: false, matched: false });
    }
  
    // 2️⃣ 이미 매칭된 상태라면 → 내 session의 room_id와 상대 정보 조회 후 반환
    if (mySession.matched && mySession.room_id) {
      const { data: partner, error: partnerError } = await supabase
        .from('balance_sessions')
        .select('*')
        .eq('room_id', mySession.room_id)
        .neq('user_id', myId) // 나 아닌 상대 찾기
        .single();
  
      if (partnerError || !partner) {
        console.error('상대 정보 조회 실패:', partnerError);
        return res.status(500).json({ success: false, message: '상대 정보 조회 실패' });
      }
  
      return res.json({
        success: true,
        matched: true,
        roomId: mySession.room_id,
        partnerId: partner.user_id,
        partnerNickname: partner.nickname
      });
    }
  
    // 3️⃣ 아직 매칭 안 됐으면 → counterpart 탐색
    const counterpartRole = mySession.role === 'A' ? 'B' : 'A';
  
    const { data: partner, error: partnerError } = await supabase
      .from('balance_sessions')
      .select('*')
      .eq('word', mySession.word)
      .eq('role', counterpartRole)
      .eq('matched', false)
      .neq('user_id', myId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
  
    if (partnerError && partnerError.details !== 'The result contains 0 rows') {
      console.error('상대 탐색 실패:', partnerError);
      return res.status(500).json({ success: false, message: '상대 조회 오류' });
    }
  
    if (partner) {
      const roomId = uuidv4();
  
      await supabase
        .from('balance_sessions')
        .update({ matched: true, room_id: roomId })
        .in('id', [mySession.id, partner.id]);
  
      console.log(`✨ 매칭 완료! roomId=${roomId}`);
  
      return res.json({
        success: true,
        matched: true,
        roomId,
        myId: mySession.user_id,
        myNickname: mySession.nickname,
        partnerId: partner.user_id,
        partnerNickname: partner.nickname,
        word: mySession.word
      });
    }
  
    return res.json({ success: true, matched: false });
  });
  
module.exports = router;
