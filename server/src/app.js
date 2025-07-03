/*const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
console.log('✅ authRoutes:', authRoutes);
const verifyRoutes = require('./routes/verify.routes');
const verifyMvpRoutes = require('./routes/verify-mvp.routes');
const matchRoutes = require('./routes/match.routes');
const registerRoutes = require('./routes/register.routes');
const passwordRoutes = require('./routes/password.routes');
const nicknameRoutes = require('./routes/nickname.routes');
const withdrawRoutes = require('./routes/withdraw.routes');
const balanceGameRoutes = require('./routes/balanceGame.routes');

const app = express();

// ✅ CORS 설정을 환경변수로 변경
const CLIENT_ORIGIN = process.env.REALSITE || 'http://localhost:5179';
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));


app.use(express.json());
app.use(cookieParser());

// API 라우팅 연결
app.use('/api/auth', authRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/verify-mvp', verifyMvpRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/nickname', nicknameRoutes);  // 위치는 여기도 OK (CORS는 전역 적용됨)
app.use('/api/auth/withdraw', withdrawRoutes);
app.use('/api/balance-game', balanceGameRoutes);

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('텔레파시 서버 작동 중...');
});

module.exports = app;
*/

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// 📦 라우트 모듈 import
import authRoutes from '../routes/auth.routes.js';
import verifyRoutes from '../routes/verify.routes.js';
import verifyMvpRoutes from '../routes/verify-mvp.routes.js';
import matchRoutes from '../routes/match.routes.js';
import registerRoutes from '../routes/register.routes.js';
import passwordRoutes from '../routes/password.routes.js';
import nicknameRoutes from '../routes/nickname.routes.js';
import withdrawRoutes from '../routes/withdraw.routes.js';
import balanceGameRoutes from '../routes/balanceGame.routes.js';

import registerChatHandlers from './chat.socket.js'; // 소켓 핸들러

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.REALSITE || 'http://localhost:5179';

// ✅ CORS 설정
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
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

// ✅ 헬스체크
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// ✅ 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../../../client/dist')));

// ✅ SPA 핸들러
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../client/dist/index.html'));
});

// ✅ 소켓 서버 연결
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});
io.on('connection', (socket) => {
  console.log(`✅ 사용자 연결됨 [socket.id: ${socket.id}]`);
  registerChatHandlers(io, socket);
  socket.on('disconnect', () => console.log(`❌ 연결 종료 [socket.id: ${socket.id}]`));
});

// ✅ 서버 실행
const PORT = process.env.SERV_DEV || 5000;
server.listen(PORT, () => {
  console.log(`🚀 통합 서버 실행 중: http://localhost:${PORT}`);
});
