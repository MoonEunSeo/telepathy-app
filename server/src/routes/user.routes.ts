// routes/user.routes.ts
import express, { Request, Response } from 'express';
import supabase from '../config/supabase';
import authMiddleware from '../middleware/auth';
import type { MegaphoneCountResponse, UpdateRealnameRequest } from '@shared/api';

const router = express.Router();

// 유저 수 가져오기
router.get('/count', async (req: Request, res: Response) => {
  const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
  // head:true → 데이터는 안가져오고 count만

  if (error) return res.status(500).json({ error: error.message });
  res.json({ userCount: count });
});

// 내 확성기 개수 조회
router.get('/megaphone-count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id; // authMiddleware 가 주입한 JWT payload

    const { data, error } = await supabase
      .from('users')
      .select('megaphone_count')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      count: data.megaphone_count,
    } satisfies MegaphoneCountResponse);
  } catch (err) {
    console.error('❌ megaphone-count 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ [추가 1] 실명 조회
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const id = req.user?.user_id;
  try {
    const { data, error } = await supabase.from('users').select('real_name').eq('id', id).single();

    if (error) throw error;
    res.json({ real_name: data?.real_name || null });
  } catch (err) {
    console.error('❌ 실명 조회 실패:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ✅ [추가 2] 실명 업데이트
router.post('/update-realname', authMiddleware, async (req: Request, res: Response) => {
  const { real_name } = req.body as UpdateRealnameRequest;
  const user_id = req.user?.user_id;
  try {
    const { error } = await supabase.from('users').update({ real_name }).eq('id', user_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 실명 저장 실패:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
