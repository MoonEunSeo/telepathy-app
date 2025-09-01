const express = require('express');
const router = express.Router();

// utils 불러오기
const { getCurrentRound } = require('../utils/round');

router.get('/server-time', (req, res) => {
  try {
    const now = new Date();

    // 한국 시간(KST) 계산
    const hourKST = (now.getUTCHours() + 9) % 24;
    const minuteKST = now.getUTCMinutes();

    // ✅ 운영 시간: 오후 8시 ~ 새벽 2시
    let isOpen = (hourKST >= 20 || hourKST < 4);

    // ✅ 라운드/남은시간
    const { round, remaining } = getCurrentRound();

    res.json({
      success: true,
      currentTime: now.toISOString(),
      hourKST,
      minuteKST,
      isOpen,
      round,
      remaining
    });
  } catch (err) {
    console.error('❌ /server-time 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
