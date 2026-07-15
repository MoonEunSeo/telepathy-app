// routes/password.routes.ts
import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type {
  PasswordCheckUserRequest,
  PasswordCheckUserResponse,
  PasswordChangeRequest,
  PasswordChangeResponse,
  PasswordResetRequest,
  PasswordResetResponse,
} from '@shared/api';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

interface JwtUser {
  user_id: string;
  username?: string;
}

// ✅ 1. 아이디 존재 여부 확인
router.post('/check-user', async (req: Request, res: Response) => {
  const { username } = req.body as PasswordCheckUserRequest;
  if (!username) return res.status(400).json({ exists: false } satisfies PasswordCheckUserResponse);

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error || !data)
    return res.status(200).json({ exists: false } satisfies PasswordCheckUserResponse);
  return res.status(200).json({ exists: true } satisfies PasswordCheckUserResponse);
});

// ✅ 2. 비밀번호 재설정 (로그인 상태)
router.post('/change', async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  const { currentPassword, newPassword } = req.body as PasswordChangeRequest;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: '로그인이 필요합니다.' } satisfies PasswordChangeResponse);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
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
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호가 일치하지 않습니다.',
      } satisfies PasswordChangeResponse);
    }

    // ✅ 3️⃣ 새 비밀번호 해싱 후 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    } satisfies PasswordChangeResponse);
  } catch (err) {
    console.error('❌ 비밀번호 변경 실패:', err);
    res.status(500).json({ success: false, message: '서버 오류' } satisfies PasswordChangeResponse);
  }
});

// 로그인하지 않은 상태에서 비밀번호 찾기
router.post('/reset', async (req: Request, res: Response) => {
  const { username, password } = req.body as PasswordResetRequest;
  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: '필수 정보 누락' } satisfies PasswordResetResponse);
  }

  // 중요** 추후 username이 실제로 존재하는지 검증 로직이 필요함

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('username', username);

    if (error) throw error;

    res.json({
      success: true,
      message: '비밀번호가 재설정되었습니다.',
    } satisfies PasswordResetResponse);
  } catch (err) {
    console.error('❌ 비밀번호 재설정 오류:', err);
    res
      .status(500)
      .json({ success: false, message: '비밀번호 재설정 실패' } satisfies PasswordResetResponse);
  }
});

export default router;
