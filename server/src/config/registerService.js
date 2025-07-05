// server/src/services/registerService.js
//회원데이터 생성 전용 서비스
// DB 관련 로직(중복체크 및 유저 insert) 담당
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../lib/supabaseClient');

const SALT_ROUNDS = 10;

async function registerUser({ user_id, password, nickname }) {
  try {
    // 비밀번호 해시화
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 중복 검사 (user_id, nickname)
    const { data: existingUser, error: userCheckErr } = await supabase
      .from('users')
      .select('id')
      .or(`user_id.eq.${user_id},nickname.eq.${nickname}`);

    if (userCheckErr) throw userCheckErr;
    if (existingUser.length > 0) {
      return { success: false, message: '이미 사용 중인 아이디 또는 닉네임입니다.' };
    }

    // 유저 생성
    const { data, error } = await supabase.from('users').insert([
      {
        id: uuidv4(),
        user_id,
        password_hash,
        kcp_verified: true,
        nickname,
        nickname_updated_at: new Date().toISOString(),
        birth_date: null,
        is_adult: false,
        status: 'active'
      }
    ]);

    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    console.error('회원가입 오류:', err);
    return { success: false, message: '회원가입에 실패했습니다.' };
  }
}

module.exports = { registerUser };
