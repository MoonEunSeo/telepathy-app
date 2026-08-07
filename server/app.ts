// server/app.ts
import './env'; // ⚠️ 반드시 최상단 — 라우트보다 먼저 .env 로드

import express, { Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { requestId } from './src/middleware/requestId';

// ================================
// 📦 라우트 모듈 등록
// ================================
import authRoutes from './src/routes/auth.routes';
import webhookRouter from './src/routes/webhook.routes';
import sp_paymentsRoutes from './src/routes/sp_payments.routes';
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
// 경로를 '/api'로 한정한다. 전체에 걸면 정적 파일 응답에도 Vary: Origin이 붙는데,
// Cloudflare는 Vary가 Accept-Encoding이 아니면 캐시하지 않는다. (cf-cache-status: DYNAMIC)
// max-age=31536000을 줘도 엣지를 못 타고 매번 Render 원본까지 간다.
// 정적 자산은 페이지와 같은 출처에서만 받으므로 CORS가 필요 없다.
// Socket.IO는 index.ts에서 자체 cors 옵션을 쓰므로 영향받지 않는다.
const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS 차단됨: ${origin}`);
      callback(new Error('CORS 차단됨'));
    }
  },
  credentials: true, // 쿠키 허용 (Access-Control-Allow-Credentials)
});

app.use('/api', corsMiddleware);
app.options('/api/*splat', corsMiddleware);

// ✅ 공통 미들웨어
// requestId 는 express.json() 보다 앞이다.
// 잘못된 JSON 으로 본문 파싱이 실패하는 것도 오류 응답이므로 id 를 가져야 한다.
app.use(requestId);
app.use(express.json());
app.use(cookieParser());

// ==============================
// ✅ API 라우트 연결
// ==============================
app.use('/api/auth', authRoutes);
app.use('/api/webhook', express.text({ type: '*/*' }), webhookRouter);
app.use('/api/sp_payments', sp_paymentsRoutes);
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

// ================================
// 📦 정적 파일 및 기본 라우트 처리
// ================================

// ✅ 헬스체크
app.get('/healthz', (req: Request, res: Response) => res.status(200).send('OK'));

// ✅ 정적 파일 서빙 (Vite 빌드 결과)
const distPath = path.join(__dirname, '../telepathy-front/dist');

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ✅ assets 폴더 정적 서빙
// Vite 가 붙이는 내용 해시 덕에 같은 파일명이면 내용이 같다.
// 재검증할 이유가 없으므로 1년 + immutable 로 준다.
// dist 전체 서빙보다 먼저 등록해야 이 헤더가 적용된다.
app.use(
  '/assets',
  express.static(path.join(distPath, 'assets'), {
    maxAge: ONE_YEAR_MS,
    immutable: true,
  }),
);

// ✅ 정적 파일 서빙 (Vite 빌드 결과)
// 나머지 정적 파일은 파일명에 해시가 없어 같은 URL 의 내용이 바뀔 수 있다.
// index.html 은 새 자산 파일명을 알려주는 진입점이라 항상 재검증한다.
app.use(
  express.static(distPath, {
    maxAge: ONE_DAY_MS,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

// ✅ sitemap.xml, robots.txt 등은 index.html로 리디렉션되지 않게 예외 처리
app.use('/sitemap.xml', express.static(path.join(__dirname, '../telepathy-front/public')));
app.use('/robots.txt', express.static(path.join(__dirname, '../telepathy-front/public')));

// ✅ SPA 라우팅 처리 (404나 미스매치 시 index.html 반환)
app.use((req: Request, res: Response) => {
  // sendFile 기본값은 max-age=0 이지만 명시해 둔다.
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
