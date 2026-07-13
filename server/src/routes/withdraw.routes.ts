// 📦 server/src/routes/withdraw.routes.ts
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { WithdrawResponse } from '@shared/api';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

interface JwtUser {
  user_id: string;
  username?: string;
}

// 회원탈퇴
router.post('/', async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, message: '인증이 필요합니다.' } satisfies WithdrawResponse);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
    const userId = decoded.user_id;

    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      console.error('❌ 회원탈퇴 실패:', error.message);
      return res
        .status(500)
        .json({ success: false, message: '회원탈퇴에 실패했습니다.' } satisfies WithdrawResponse);
    }

    res.clearCookie('token'); // 쿠키 제거
    return res.status(200).json({ success: true, message: '회원탈퇴 완료' } satisfies WithdrawResponse);
  } catch (err) {
    console.error('❌ 토큰 검증 실패:', (err as Error).message);
    return res
      .status(403)
      .json({ success: false, message: '유효하지 않은 요청입니다.' } satisfies WithdrawResponse);
  }
});

export default router;
