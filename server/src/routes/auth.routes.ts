// routes/auth.routes.ts
import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type {
  LoginRequest,
  LoginResponse,
  AuthCheckResponse,
  CheckUsernameRequest,
  CheckUsernameResponse,
  LogoutResponse,
} from '@shared/api';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

// ================================
// 📌 로그인 API
// ================================
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as LoginRequest;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '입력 누락' } satisfies LoginResponse);
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      return res
        .status(401)
        .json({ success: false, message: '존재하지 않는 아이디입니다.' } satisfies LoginResponse);
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: '비밀번호가 일치하지 않습니다.' } satisfies LoginResponse);
    }

    // ✅ JWT 생성
    const token = jwt.sign({ user_id: user.id, username }, process.env.JWT_SECRET as string, {
      expiresIn: '60d',
    });

    // ✅ 환경별 쿠키 옵션 설정
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd, // ✅ 배포만 true
      sameSite: isProd ? 'none' : 'lax', // ✅ cross-site 허용
      maxAge: 1000 * 60 * 60 * 24 * 60, // 60일
      path: '/',
    });

    console.log(`🍪 쿠키 발급 완료: ${isProd ? 'PROD' : 'DEV'} 모드`);

    return res.status(200).json({ success: true, message: '로그인 성공' } satisfies LoginResponse);
  } catch (err) {
    console.error('❌ 로그인 처리 오류:', err);
    return res
      .status(500)
      .json({ success: false, message: (err as Error).message } satisfies LoginResponse);
  }
});

// ================================
// 📌 자동 로그인 확인 API
// ================================
router.get('/check', (req: Request, res: Response) => {
  const token = req.cookies?.token;

  if (!token) return res.json({ loggedIn: false } satisfies AuthCheckResponse);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    // 성공 시 user 를 함께 실어 보냄(프론트는 loggedIn 만 사용) → AuthCheckResponse superset
    return res.json({ loggedIn: true, user: decoded });
  } catch (err) {
    console.error('❌ JWT 검증 실패:', (err as Error).message);
    return res.json({ loggedIn: false } satisfies AuthCheckResponse);
  }
});

// ================================
// 📌 중복 ID 확인 API
// ================================
router.post('/check-username', async (req: Request, res: Response) => {
  const { username } = req.body as CheckUsernameRequest;

  if (!username) {
    return res.status(400).json({ success: false, message: '아이디를 입력해주세요.' });
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
  return res.json({ success: true, isAvailable } satisfies CheckUsernameResponse);
});

// ================================
// 📌 로그아웃 API
// ================================
router.post('/logout', (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  });

  return res.json({ success: true, message: '로그아웃 완료' } satisfies LogoutResponse);
});

export default router;
