// /routes/report.routes.ts
import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { ReportRequest, ReportResponse } from '@shared/api';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// 신고 접수 처리
router.post('/', async (req: Request, res: Response) => {
  console.log('🚨 신고 요청 본문:', req.body);
  const { reasons, extraMessage, reporterId, reportedId, roomId } = req.body as ReportRequest;

  if (!reporterId || !reportedId || !roomId) {
    return res.status(400).json({ success: false, message: '필수 값 누락' } satisfies ReportResponse);
  }

  try {
    const { error } = await supabase.from('reported_reports').insert([
      {
        reporter_id: reporterId,
        reported_id: reportedId,
        room_id: roomId,
        reasons,
        extra_message: extraMessage,
        created_at: new Date().toISOString(), // ✅ JS에서 UTC ISO 포맷
      },
    ]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message || error.details || error);
      return res.status(500).json({ success: false, message: '서버 내부 오류' } satisfies ReportResponse);
    }

    // ✅ 신고 성공 후 socket으로 상대방에게 알림
    // ⚠️ [마이그레이션 노트] index.ts에서 app.set('io', io)를 하지 않아 현재 io는 undefined →
    //    이 emit은 실제로 실행되지 않음(기존 잠재 버그). 동작 보존 위해 그대로 둠.
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('chatEndedByReport', { reporterId });
    }

  } catch (err) {
    console.error('🔥 서버 에러:', err);
    return res.status(500).json({ success: false, message: '서버 내부 오류' } satisfies ReportResponse);
  }

  return res.status(200).json({ success: true, message: '신고 완료' } satisfies ReportResponse);
});

export default router;
