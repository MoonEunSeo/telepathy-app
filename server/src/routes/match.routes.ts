// 📦 routes/match.routes.ts
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentRound } from '../utils/round';
import type { MatchCurrentRoundResponse } from '@shared/api';

const router = express.Router();

// ✅ Supabase 연결
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

interface JwtUser {
  user_id: string;
  username?: string;
}

// ✅ 0. 현재 라운드 API (이제 단어세트는 프론트에서 처리)
router.get('/current-round', (req: Request, res: Response) => {
  const { round, remaining } = getCurrentRound();
  res.json({ round, remaining } satisfies MatchCurrentRoundResponse);
});

// ✅ 1. 단어 등록 (큐에 대기열 upsert)
router.post('/start', async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  const { word, round } = req.body as { word?: string; round?: number };

  if (!word || !round) return res.status(400).json({ error: '단어 또는 라운드 누락' });
  if (!token) return res.status(401).json({ error: '인증 필요' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
    const userId = decoded.user_id;

    // 유저 프로필 조회
    const { data: profile } = await supabase
      .from('users')
      .select('username, nickname')
      .eq('id', userId)
      .single();

    if (!profile) return res.status(500).json({ error: '프로필 조회 실패' });

    // upsert 사용 → (user_id, round) 고유키 충돌시 update
    const { error } = await supabase.from('telepathy_sessions_queue').upsert(
      [
        {
          user_id: userId,
          username: profile.username,
          nickname: profile.nickname,
          word,
          round,
          status: 'waiting',
          room_id: null,
          partner_id: null,
          partner_username: null,
          partner_nickname: null,
        },
      ],
      { onConflict: 'round,user_id' }
    );

    if (error) {
      console.error('❌ /start upsert 오류:', error.message);
      return res.status(500).json({ success: false, message: 'DB 오류' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ /start 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 2. 매칭 확인
router.post('/check', async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  const { word, round } = req.body as { word?: string; round?: number };

  if (!token) return res.status(401).json({ success: false, message: '로그인 필요' });
  if (!word || !round) return res.status(400).json({ success: false, message: '단어/라운드 누락' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
    const userId = decoded.user_id;

    // 내 세션 조회
    const { data: mySession } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('round', round)
      .single();

    if (mySession && mySession.status === 'matched' && mySession.room_id) {
      return res.json({ matched: true, ...mySession });
    }

    // 후보자 검색
    const { data: candidates } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('word', word)
      .eq('round', round)
      .eq('status', 'waiting')
      .neq('user_id', userId);

    if (candidates && candidates.length > 0) {
      const partner = candidates[0];
      const roomId = uuidv4();

      // 두 유저 모두 matched 처리
      await supabase
        .from('telepathy_sessions_queue')
        .update({
          status: 'matched',
          room_id: roomId,
          partner_id: partner.user_id,
          partner_username: partner.username,
          partner_nickname: partner.nickname,
        })
        .eq('id', mySession.id);

      await supabase
        .from('telepathy_sessions_queue')
        .update({
          status: 'matched',
          room_id: roomId,
          partner_id: userId,
          partner_username: mySession.username,
          partner_nickname: mySession.nickname,
        })
        .eq('id', partner.id);

      // 로그 기록
      await supabase.from('telepathy_sessions_log').insert([
        {
          user_id: userId,
          username: mySession.username,
          nickname: mySession.nickname,
          word,
          round,
          result: 'matched',
          partner_id: partner.user_id,
          partner_username: partner.username,
          partner_nickname: partner.nickname,
          room_id: roomId,
        },
        {
          user_id: partner.user_id,
          username: partner.username,
          nickname: partner.nickname,
          word,
          round,
          result: 'matched',
          partner_id: userId,
          partner_username: mySession.username,
          partner_nickname: mySession.nickname,
          room_id: roomId,
        },
      ]);

      return res.json({
        matched: true,
        roomId,
        senderId: userId,
        senderUsername: mySession.username,
        senderNickname: mySession.nickname,
        receiverId: partner.user_id,
        receiverUsername: partner.username,
        receiverNickname: partner.nickname,
        word,
      });
    }

    return res.json({ matched: false });
  } catch (err) {
    console.error('❌ /check 오류:', err);
    res.status(500).json({ success: false });
  }
});

// ✅ 3. 세션 종료
router.post('/end', async (req: Request, res: Response) => {
  const token = req.cookies?.token;
  const { roomId } = req.body as { roomId?: string };

  console.log('📥 /end 요청 body:', req.body); // ✅ body 값 확인
  console.log('📥 /end token:', token); // ✅ 쿠키 확인

  if (!token || !roomId) {
    return res.status(400).json({ success: false, message: '필수 값 누락' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
    const userId = decoded.user_id;

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
      { onConflict: 'round,user_id' }
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
