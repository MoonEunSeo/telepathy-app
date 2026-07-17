// 📦 server/src/routes/withdraw.routes.ts
import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { WithdrawResponse } from '@shared/api';
import authMiddleware from '../middleware/auth';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

// 회원탈퇴
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      console.error('❌ 회원탈퇴 실패:', error.message);
      return res
        .status(500)
        .json({ success: false, message: '회원탈퇴에 실패했습니다.' } satisfies WithdrawResponse);
    }

    res.clearCookie('token'); // 쿠키 제거
    return res
      .status(200)
      .json({ success: true, message: '회원탈퇴 완료' } satisfies WithdrawResponse);
  } catch (err) {
    console.error('❌ 회원탈퇴 처리 오류:', (err as Error).message);
    return res
      .status(500)
      .json({ success: false, message: '서버 오류' } satisfies WithdrawResponse);
  }
});

export default router;
