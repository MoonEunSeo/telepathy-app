import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GUEST_NICKNAME, requireSession } from '../middleware/auth';
import { measureMemory } from 'node:vm';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

// 감정 피드백 저장
router.post('/add', requireSession, async (req: Request, res: Response) => {
  const { partnerId, partnerUsername, partnerNickname, word, emotion } = req.body;
  const me = req.user!;
  const userId = me.user_id;
  const userUsername = me.role === 'guest' ? me.user_id : (me.username ?? me.user_id);
  const userNickname = me.role === 'guest' ? me.nickname || GUEST_NICKNAME : req.body.userNickname;

  if (!partnerId || !partnerUsername || !partnerNickname || !word || !emotion) {
    return res.status(400).json({ success: false, message: '필수 값 누락' });
  }

  const { error } = await supabase.from('emotion_feedback').insert([
    {
      user_id: userId,
      user_username: userUsername,
      user_nickname: userNickname,
      partner_id: partnerId,
      partner_username: partnerUsername,
      partner_nickname: partnerNickname,
      word,
      emotion,
    },
  ]);

  if (error) {
    console.error('❌ 감정 피드백 저장 실패:', error);
    return res.status(500).json({ success: false, message: 'DB 저장 실패' });
  }

  return res.json({ success: true, message: '피드백 저장 완료' });
});

export default router;
