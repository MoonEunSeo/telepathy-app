/*//server/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 회원가입
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ message: '회원가입 성공', data });
});

// 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ message: '로그인 성공', data });
});

module.exports = router;*/

// routes/auth.routes.js
/*
require('dotenv').config();
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

//console.log('✅ JWT_SECRET:', process.env.JWT_SECRET);

// ✅ 로그인 API
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '입력 누락' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, message: '존재하지 않는 아이디입니다.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }

    // ✅ JWT 생성
    const token = jwt.sign(
      { user_id: user.id, username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '60d' }
    );

    // ✅ 쿠키에 저장
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 개발: false, 배포: true
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 60
    });

    return res.status(200).json({ success: true, message: '로그인 성공' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ 자동 로그인 확인 API
router.get('/check', (req, res) => {
  const token = req.cookies.token;

  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ loggedIn: true, user: decoded });
  } catch {
    return res.json({ loggedIn: false });
  }
});

// ✅ 중복 ID 확인 API 
router.post('/check-username', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: '아이디가 없습니다.' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('❌ 중복 확인 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }

  const isAvailable = !data;
  return res.json({ success: true, isAvailable });
});

// ✅ 로그아웃 API
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // 배포 시 true
  });

  res.json({ success: true, message: '로그아웃 완료' });
});

module.exports = router;*/

require('dotenv').config();
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ================================
// 📌 로그인 API
// ================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '입력 누락' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, message: '존재하지 않는 아이디입니다.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }

    // ✅ JWT 생성
    const token = jwt.sign(
      { user_id: user.id, username },
      process.env.JWT_SECRET,
      { expiresIn: '60d' }
    );

    // ✅ 환경별 쿠키 옵션 설정
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd ? true : false,         // ✅ 배포만 true
      sameSite: isProd ? 'None' : 'Lax',     // ✅ cross-site 허용
      maxAge: 1000 * 60 * 60 * 24 * 60,      // 60일
      path: '/',                             // ✅ 기본 경로
    });

    console.log(`🍪 쿠키 발급 완료: ${isProd ? 'PROD' : 'DEV'} 모드`);

    return res.status(200).json({ success: true, message: '로그인 성공' });
  } catch (err) {
    console.error('❌ 로그인 처리 오류:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================
// 📌 자동 로그인 확인 API
// ================================
router.get('/check', (req, res) => {
  const token = req.cookies.token;
  console.log('🔍 받은 쿠키:', token?.slice(0, 30) + '...');
  console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET);

  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ 토큰 해석 성공:', decoded);
    return res.json({ loggedIn: true, user: decoded });
  } catch (err) {
    console.error('❌ JWT 검증 실패:', err.message);
    return res.json({ loggedIn: false });
  }
});
// ================================
// 📌 중복 ID 확인 API
// ================================
router.post('/check-username', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: '아이디가 없습니다.' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('❌ 중복 확인 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }

  const isAvailable = !data;
  return res.json({ success: true, isAvailable });
});

// ================================
// 📌 로그아웃 API
// ================================
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    sameSite: isProd ? 'None' : 'Lax',
    secure: isProd ? true : false,
    path: '/',
  });

  return res.json({ success: true, message: '로그아웃 완료' });
});

module.exports = router;
