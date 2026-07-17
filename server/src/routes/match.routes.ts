// 📦 routes/match.routes.ts
import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getCurrentRound } from '../utils/round';
import type { MatchCurrentRoundResponse } from '@shared/api';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// ✅ Supabase 연결
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

// ✅ 0. 현재 라운드 API (이제 단어세트는 프론트에서 처리)
router.get('/current-round', (req: Request, res: Response) => {
  const { round, remaining } = getCurrentRound();
  res.json({ round, remaining } satisfies MatchCurrentRoundResponse);
});

// ✅ 3. 세션 종료
router.post('/end', authMiddleware, async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  const { roomId } = req.body as { roomId?: string };

  console.log('📥 /end 요청 body:', req.body); // ✅ body 값 확인
  console.log('📥 /end token:', token); // ✅ 쿠키 확인

  if (!token || !roomId) {
    return res.status(400).json({ success: false, message: '필수 값 누락' });
  }

  try {
    const userId = req.user?.user_id;

    console.log('✅ decoded userId:', userId, 'roomId:', roomId);

    // roomId로 세션 찾기
    const { data: mySession, error: sessionError } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .single();

    console.log('🔍 mySession:', mySession); // ✅ 조회된 세션
    console.log('🔍 sessionError:', sessionError); // ✅ 에러 내용

    if (sessionError || !mySession) {
      return res.status(404).json({ success: false, message: '세션 없음' });
    }

    // ended 처리
    const { error: updateError } = await supabase
      .from('telepathy_sessions_queue')
      .update({ status: 'ended' })
      .match({ user_id: userId, room_id: roomId });

    console.log('📝 ended update error:', updateError);

    // 로그 기록
    const { error: logError } = await supabase.from('telepathy_sessions_log').upsert(
      {
        user_id: userId,
        username: mySession.username,
        nickname: mySession.nickname,
        word: mySession.word,
        round: mySession.round,
        result: 'ended', // 🔹 기존 matched → ended 로 덮어씀
        partner_id: mySession.partner_id,
        partner_username: mySession.partner_username,
        partner_nickname: mySession.partner_nickname,
        room_id: mySession.room_id,
        created_at: new Date(),
      },
      { onConflict: 'round,user_id' },
    ); // 🔑 유니크키 기준으로 upsert

    console.log('📝 logError:', logError);

    if (logError) {
      console.error('❌ 로그 저장 실패:', logError);
      return res.status(500).json({ success: false, message: '로그 저장 실패' });
    }

    res.json({ success: true, message: '세션 종료 완료' });
  } catch (err) {
    console.error('❌ /end 오류 (catch):', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 4. 세션 상태 확인
router.post('/session-status', async (req: Request, res: Response) => {
  const { word, round, userId } = req.body as { word?: string; round?: number; userId?: string };
  if (!word || !round || !userId) return res.status(400).json({ active: false });

  try {
    const { data } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('round', round)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return res.json({ active: false });

    return res.json({
      active: data.status === 'matched' || data.status === 'waiting',
      ...data,
    });
  } catch (err) {
    console.error('❌ /session-status 오류:', err);
    res.status(500).json({ active: false });
  }
});

export default router;
