//API 엔드포인트 레이어
//클라이언트 요청 /응답 처리
// 쿠키 설정 및 상태코드 반환

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // 추가
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.post('/', async (req, res) => {
  const { username, password, phone, gender, birthdate } = req.body;

  if (!username || !password || !phone || !gender || !birthdate) {
    return res.status(400).json({ success: false, message: '모든 항목을 입력해주세요.' });
  }

  try {
    // 중복 확인
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},phone.eq.${phone}`);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: '이미 등록된 아이디 또는 전화번호입니다.' });
    }

    // 비밀번호 해시
    const hash = await bcrypt.hash(password, 10);

    // DB 저장
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: hash,
        phone,
        gender,
        birthdate
      })
      .select()
      .single();

    if (error) throw error;

    // ✅ JWT 생성
    const token = jwt.sign(
      { user_id: newUser.id, username },
      process.env.JWT_SECRET,
      { expiresIn: '60d' }
    );

    // ✅ 쿠키에 저장
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // 배포시 true + https 필요
      maxAge: 60 * 24 * 60 * 60 * 1000, // 60일
    });

    return res.status(201).json({ success: true, message: '회원가입 완료 및 자동 로그인 성공' });
  } catch (err) {
    console.error('회원가입 오류:', err.message || err);
    return res.status(500).json({ success: false, message: '회원가입에 실패했습니다.' });
  }
});

module.exports = router;