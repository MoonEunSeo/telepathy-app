// server/index.ts
import './env'; // ⚠️ 반드시 최상단 — 라우트/설정보다 먼저 .env 로드

import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents';
import { flushRound } from './src/utils/flush';
import { registerSocketHandlers } from './src/config/chat.socket';
import app from './app';

// ✅ CORS 설정
app.use(
  cors({
    origin: [
      'http://localhost:5179',
      'https://telepathy.my',
      'https://telepathy-app.onrender.com',
      'http://70.12.102.131:5000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// ✅ HTTP 서버 생성
const server = createServer(app);

// ✅ Socket.IO 설정
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: [
      'http://localhost:5179',
      'https://telepathy.my',
      'https://telepathy-app.onrender.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
  path: '/socket.io',
});

// ✅ WebSocket 연결 수 카운트
let onlineUsers = 0;
io.on('connection', (socket) => {
  onlineUsers++;
  console.log('🟢 유저 접속, 현재 인원:', onlineUsers);
  io.emit('onlineCount', onlineUsers);

  socket.on('disconnect', () => {
    onlineUsers--;
    console.log('🔴 유저 종료, 현재 인원:', onlineUsers);
    io.emit('onlineCount', onlineUsers);
  });
});

// ✅ 채팅 관련 소켓 핸들러 등록
registerSocketHandlers(io);

// ✅ 30초마다 flushRound 실행
cron.schedule('*/30 * * * * *', () => {
  flushRound();
});

// ✅ 포트 설정 및 서버 실행
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
