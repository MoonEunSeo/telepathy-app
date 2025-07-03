// server/src/routes/verify.routes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// 1. identityVerificationId 생성
router.post('/prepare', (req, res) => {
  try {
    const identityVerificationId = `identity-verification-${uuidv4()}`;
    console.log('[생성된 ID]', identityVerificationId);
    res.json({ identityVerificationId });
  } catch (err) {
    console.error('[ID 발급 오류]', err);
    res.status(500).json({ error: 'ID 발급 실패' });
  }
});

// 2. 인증 결과 확인
router.post('/confirm', async (req, res) => {
  const { identityVerificationId } = req.body;

  if (!identityVerificationId) {
    return res.status(400).json({ success: false, message: 'ID가 없습니다.' });
  }

  try {
    const response = await axios.get(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
      headers: {
        Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`, // 비밀키
      },
    });

    if (response.data.status !== 'VERIFIED') {
      return res.status(400).json({ success: false, message: '인증 실패' });
    }

    // 인증된 사용자 정보
    const { name, phone, birth, gender } = response.data;
    console.log('✅ 인증 성공:', name, phone, birth, gender);
    res.json({ success: true, user: { name, phone, birth, gender } });
  } catch (err) {
    console.error('[인증 조회 실패]', err.response?.data || err.message);
    res.status(500).json({ success: false, message: '인증 확인 실패' });
  }
});

module.exports = router;