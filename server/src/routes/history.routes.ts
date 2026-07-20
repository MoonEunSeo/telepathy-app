import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import type {
  WordHistoryAddRequest,
  WordHistoryAddResponse,
  WordHistoryUpdateRequest,
} from '@shared/api';
import authMiddleware from '../middleware/auth';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

// ✅ 단어 히스토리 조회 API
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    const { data, error } = await supabase
      .from('word_history')
      .select('id, word, connected_at, partner_id, partner_nickname, is_favorite, memo')
      .eq('user_id', userId)
      .order('connected_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, history: data });
  } catch (err) {
    console.error('❌ 단어 히스토리 조회 실패:', (err as Error).message);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 단어 히스토리 저장 API
router.post('/add', authMiddleware, async (req: Request, res: Response) => {
  const { partnerId, partnerNickname, word, userNickname } = req.body as WordHistoryAddRequest;

  if (partnerId === 'undefined') {
    return res.status(400).json({ success: false, message: '유효하지 않은 partnerId' });
  }

  try {
    const userId = req.user?.user_id;

    // 중복 저장 방지 (같은 조합이 있으면 패스)
    const { data: existing, error: checkError } = await supabase
      .from('word_history')
      .select('id')
      .eq('user_id', userId)
      .eq('partner_id', partnerId)
      .eq('word', word)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return res
        .status(200)
        .json({ success: true, message: '이미 저장된 기록' } satisfies WordHistoryAddResponse);
    }

    const { error } = await supabase.from('word_history').insert([
      {
        user_id: userId,
        user_nickname: userNickname,
        partner_id: partnerId,
        partner_nickname: partnerNickname,
        word,
      },
    ]);

    if (error) throw error;

    return res
      .status(200)
      .json({ success: true, message: '히스토리 저장 완료' } satisfies WordHistoryAddResponse);
  } catch (err) {
    console.error('❌ word_history 저장 실패:', (err as Error).message);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 즐겨찾기 / 메모 수정 API
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isFavorite, memo } = req.body as WordHistoryUpdateRequest;

  // 들어온 필드만 반영 (부분 수정)
  const patch: { is_favorite?: boolean; memo?: string } = {}; // 응답용 타입 변환 컨버터 추가
  if (typeof isFavorite === 'boolean') patch.is_favorite = isFavorite;
  if (typeof memo === 'string') patch.memo = memo;

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ success: false, message: '수정할 내용 없음' });
  }

  try {
    const userId = req.user?.user_id;

    const { error } = await supabase
      .from('word_history')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId); // 본인 행만 수정

    if (error) throw error;

    return res.status(200).json({ success: true, message: '수정 완료' });
  } catch (err) {
    console.error('❌ word_history 수정 실패:', (err as Error).message);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;
