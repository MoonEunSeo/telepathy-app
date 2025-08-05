// 📦 app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// 📦 라우트 모듈 import
const authRoutes = require('./src/routes/auth.routes');
const verifyRoutes = require('./src/routes/verify.routes');
const verifyMvpRoutes = require('./src/routes/verify-mvp.routes');
const matchRoutes = require('./src/routes/match.routes');
const registerRoutes = require('./src/routes/register.routes');
const passwordRoutes = require('./src/routes/password.routes');
const nicknameRoutes = require('./src/routes/nickname.routes');
const withdrawRoutes = require('./src/routes/withdraw.routes');
const balanceGameRoutes = require('./src/routes/balanceGame.routes');
const reportRoutes = require('./src/routes/report.routes');
const historyRoutes = require('./src/routes/history.routes');
const feedbackRoutes = require('./src/routes/feedback.routes');



const app = express();

const CLIENT_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? [
        'https://telepathy.my',              // ✅ 실제 프론트 배포 도메인
        'https://telepathy-app.onrender.com' // ✅ 기존 Render 도메인
      ]
    : 'http://localhost:5179'; // 개발 환경

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// ✅ API 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/verify-mvp', verifyMvpRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/nickname', nicknameRoutes);
app.use('/api/auth/withdraw', withdrawRoutes);
app.use('/api/balance-game', balanceGameRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/word-history', historyRoutes);
app.use('/api/feedback', feedbackRoutes);

// ✅ 서버단 리디렉션: 루트로 들어오면 /login으로 보낸다
app.get(['/', '/index.html'], (req, res) => {
    res.redirect(302, '/login');
  });

// ✅ 헬스체크
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// ✅ 빌드된 Vite 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../client/dist')));

// ✅ SPA 핸들러 (라우트 미스매치 시 index.html 반환)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ✅ 빌드된 assets 경로도 서빙
app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets')));

module.exports = app;
