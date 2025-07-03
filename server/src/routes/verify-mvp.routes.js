const express = require('express');
const router = express.Router();
const { SolapiMessageService } = require('solapi');
require('dotenv').config();

// 인증번호 저장소 (실 서비스에선 Redis 등 권장)
const codeStore = new Map();

// Solapi 서비스 인스턴스 생성
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

// 인증번호 생성 함수
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// ✅ 문자 전송 API
router.post('/send', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: '전화번호를 입력해주세요.' });

  const code = generateCode();
  codeStore.set(phone, code);
  setTimeout(() => codeStore.delete(phone), 180000); // 3분 후 삭제

  try {
    await messageService.send({
      to: phone,
      from: process.env.SENDER_PHONE,
      text: `[텔레파시] 인증번호는 ${code}입니다.`,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('문자 전송 실패:', error?.response?.data || error.message);
    res.status(500).json({ success: false, message: '문자 전송에 실패했습니다.' });
  }
});

// ✅ 인증번호 검증 API
router.post('/check', (req, res) => {
  const { phone, code } = req.body;
  const saved = codeStore.get(phone);

  if (saved === code) {
    codeStore.delete(phone);
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: '인증번호가 일치하지 않습니다.' });
  }
});

module.exports = router;
