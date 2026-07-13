import express, { Request, Response } from 'express';

// utils 불러오기
import { getCurrentRound } from '../utils/round';

const router = express.Router();

const OPEN_HOUR = 20;
const CLOSE_HOUR = 5;

router.get('/server-time', (req: Request, res: Response) => {
  try {
    const now = new Date();

    // 한국 시간(KST) 계산
    const hourKST = (now.getUTCHours() + 9) % 24;
    const minuteKST = now.getUTCMinutes();

    // let isOpen = (hourKST >= OPEN_HOUR || hourKST < CLOSE_HOUR);
    const isOpen = true;

    // ✅ 라운드/남은시간
    const { round, remaining } = getCurrentRound();

    res.json({
      success: true,
      currentTime: now.toISOString(),
      hourKST,
      minuteKST,
      isOpen,
      round,
      remaining,
    });
  } catch (err) {
    console.error('❌ /server-time 오류:', err);
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
