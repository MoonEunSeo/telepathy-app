// server/app.ts
import './env'; // ⚠️ 반드시 최상단 — 라우트보다 먼저 .env 로드

import express, { Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

// ================================
// 📦 라우트 모듈 등록
// ================================
import authRoutes from './src/routes/auth.routes';
import webhookRouter from './src/routes/webhook.routes';
import sp_paymentsRoutes from './src/routes/sp_payments.routes';
import verifyRoutes from './src/routes/verify.routes';
import verifyMvpRoutes from './src/routes/verify-mvp.routes';
import matchRoutes from './src/routes/match.routes';
import registerRoutes from './src/routes/register.routes';
import passwordRoutes from './src/routes/password.routes';
import nicknameRoutes from './src/routes/nickname.routes';
import withdrawRoutes from './src/routes/withdraw.routes';
import reportRoutes from './src/routes/report.routes';
import historyRoutes from './src/routes/history.routes';
import feedbackRoutes from './src/routes/feedback.routes';
import timeRoutes from './src/routes/time';
import userRoutes from './src/routes/user.routes';
import commentRoutes from './src/routes/comment.routes';
import paymentsRoutes from './src/routes/payments.routes';

const app = express();

// ✅ 응답 압축 (gzip/deflate)
// 라우트·정적 서빙보다 먼저 등록해야 API JSON 과 dist 번들이 모두 압축된다.
// 클라이언트가 Accept-Encoding 을 보낼 때만 동작하며, 미지원 시 자동으로 원본을 보낸다.
app.use(compression());

// ✅ 허용할 클라이언트 도메인 설정
const allowedOrigins = [
  'http://localhost:5179',
  'http://localhost:5000',
  'https://telepathy.my',
  'https://telepathy-app.onrender.com',
  'http://70.12.102.131:5000',
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
  }),
);

app.options(/.*/, cors());

// ✅ 공통 미들웨어
app.use(express.json());
app.use(cookieParser());

// ==============================
// ✅ API 라우트 연결
// ==============================
app.use('/api/auth', authRoutes);
app.use('/api/webhook', express.text({ type: '*/*' }), webhookRouter);
app.use('/api/sp_payments', sp_paymentsRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/verify-mvp', verifyMvpRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/nickname', nicknameRoutes);
app.use('/api/auth/withdraw', withdrawRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/word-history', historyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api', timeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/payments', paymentsRoutes);

// ================================
// 📦 정적 파일 및 기본 라우트 처리
// ================================

// ✅ 헬스체크
app.get('/healthz', (req: Request, res: Response) => res.status(200).send('OK'));

// ✅ 정적 파일 서빙 (Vite 빌드 결과)
const distPath = path.join(__dirname, '../telepathy-front/dist');
app.use(express.static(distPath));

// ✅ assets 폴더 정적 서빙
app.use('/assets', express.static(path.join(distPath, 'assets')));

// ✅ sitemap.xml, robots.txt 등은 index.html로 리디렉션되지 않게 예외 처리
app.use('/sitemap.xml', express.static(path.join(__dirname, '../telepathy-front/public')));
app.use('/robots.txt', express.static(path.join(__dirname, '../telepathy-front/public')));

// ✅ SPA 라우팅 처리 (404나 미스매치 시 index.html 반환)
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
