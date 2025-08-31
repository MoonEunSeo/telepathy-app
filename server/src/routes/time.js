const express = require('express');
const router = express.Router();

router.get('/server-time', (req, res) => {
  try {
    const now = new Date();
    const hourKST = (now.getUTCHours() + 9) % 24;
    const minuteUTC = now.getUTCMinutes();

    // 실제
    let isOpen = false;
    // if (hourKST === 1 && minuteUTC >= 30 && minuteUTC <= 42) {
    //   isOpen = true;
    // }

    if ((hourKST >= 20 && hourKST <= 23) || (hourKST >= 0 && hourKST < 2)) {
        isOpen = true;
      } else {
        isOpen = false;
      }

    res.json({
      success: true,
      currentTime: now.toISOString(),
      hourKST,
      minuteUTC,
      isOpen,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
