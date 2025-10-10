// 📦 app.js
/*
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
const timeRoutes = require('./src/routes/time');
const userRoutes = require('./src/routes/user.routes');
const commentRoutes = require('./src/routes/comment.routes');
const paymentsRoutes = require('./src/routes/payments.routes');


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
app.use('/api', timeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/payments', paymentsRoutes);

const sp_paymentsRoutes = require('./src/routes/sp_payments.routes');
const depositRoutes = require('./src/routes/deposit.routes');

app.use('/api/sp_payments', paymentsRoutes);
app.use('/api/deposit', depositRoutes);


// ✅ 서버단 리디렉션: 루트로 들어오면 /login으로 보낸다
app.get(['/', '/index.html'], (req, res) => {
    res.redirect(302, '/login');
  });

// ✅ 헬스체크
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// ✅ 빌드된 Vite 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../client/dist')));


// ✅ sitemap.xml 요청은 index.html로 가로채지 않도록 예외 처리
app.use('/sitemap.xml', express.static(path.join(__dirname, '../client/public')));

// ✅ robots.txt 정적서빙
app.use('/robots.txt', express.static(path.join(__dirname, '../client/public')));

// ✅ SPA 핸들러 (라우트 미스매치 시 index.html 반환)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ✅ 빌드된 assets 경로도 서빙
app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets')));

module.exports = app;
*/

// 📦 app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// ✅ 허용할 클라이언트 도메인 설정
const allowedOrigins = [
  'http://localhost:5179',
  'http://localhost:5000',
  'https://telepathy.my',
  'https://telepathy-app.onrender.com'
];

// ✅ CORS 설정 (쿠키 포함 필수)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS 차단됨: ${origin}`);
        callback(new Error('CORS 차단됨'));
      }
    },
    credentials: true, // ✅ 쿠키 허용 (Access-Control-Allow-Credentials)
  })
);

// ✅ 공통 미들웨어
app.use(express.json());
app.use(cookieParser());

// ================================
// 📦 라우트 모듈 등록
// ================================
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
const timeRoutes = require('./src/routes/time');
const userRoutes = require('./src/routes/user.routes');
const commentRoutes = require('./src/routes/comment.routes');
const paymentsRoutes = require('./src/routes/payments.routes');
const sp_paymentsRoutes = require('./src/routes/sp_payments.routes');
const depositRoutes = require('./src/routes/deposit.routes');

// ✅ API 라우트 연결
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
app.use('/api', timeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/sp_payments', sp_paymentsRoutes); // ✅ 올바르게 수정
app.use('/api/deposit', depositRoutes);

// ================================
// 📦 정적 파일 및 기본 라우트 처리
// ================================

// ✅ 루트 접근 시 /login으로 리디렉션
app.get(['/', '/index.html'], (req, res) => {
  res.redirect(302, '/login');
});

// ✅ 헬스체크
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// ✅ 정적 파일 서빙 (Vite 빌드 결과)
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// ✅ sitemap.xml, robots.txt 등은 index.html로 리디렉션되지 않게 예외 처리
app.use('/sitemap.xml', express.static(path.join(__dirname, '../client/public')));
app.use('/robots.txt', express.static(path.join(__dirname, '../client/public')));

// ✅ SPA 라우팅 처리 (404나 미스매치 시 index.html 반환)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ✅ assets 폴더 정적 서빙
app.use('/assets', express.static(path.join(distPath, 'assets')));

module.exports = app;
