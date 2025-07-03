// routes/password.routes.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 1. 아이디 존재 여부 확인
router.post('/check-user', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ exists: false });

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error || !data) return res.status(200).json({ exists: false });
  return res.status(200).json({ exists: true });
});

// ✅ 2. 비밀번호 재설정
router.post('/change', async (req, res) => {
  const token = req.cookies.token;
  const { currentPassword, newPassword } = req.body;

  if (!token) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id;

    // ✅ 1️⃣ 유저 정보 조회 (기존 해시 비밀번호 포함)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user || !user.password_hash) {
      throw new Error('유저 정보를 불러올 수 없습니다.');
    }

    // ✅ 2️⃣ 기존 비밀번호 일치 확인
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });
    }

    // ✅ 3️⃣ 새 비밀번호 해싱 후 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })  // ✅ 여기도 password_hash!
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (err) {
    console.error('❌ 비밀번호 변경 실패:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

//로그인하지 않은 상태에서 비밀번호찾기
router.post('/reset', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '필수 정보 누락' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('username', username);

    if (error) throw error;

    res.json({ success: true, message: '비밀번호가 재설정되었습니다.' });
  } catch (err) {
    console.error('❌ 비밀번호 재설정 오류:', err);
    res.status(500).json({ success: false, message: '비밀번호 재설정 실패' });
  }
});

module.exports = router;
