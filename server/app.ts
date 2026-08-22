import './env'; // 반드시 최상단 — 라우트보다 먼저 .env 로드

import express, { type Express } from 'express';

import authRoutes from './src/routes/auth.routes';
import webhookRouter from './src/routes/webhook.routes';
import spPaymentsRoutes from './src/routes/sp_payments.routes';
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
import { createApp, type CreateAppOptions } from './src/http/createApp';

function registerApiRoutes(app: Express): void {
  app.use('/api/auth', authRoutes);
  app.use('/api/webhook', express.text({ type: '*/*' }), webhookRouter);
  app.use('/api/sp_payments', spPaymentsRoutes);
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
}

export function createServerApp(
  options: Omit<CreateAppOptions, 'registerApiRoutes'> = {},
): Express {
  return createApp({ ...options, registerApiRoutes });
}
