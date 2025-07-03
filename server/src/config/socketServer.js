/*// 📦 backend/socketServer.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const registerChatHandlers = require('./chat.socket'); // 2단계에서 만들 예정

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS 설정 (프론트 주소에 맞게 수정)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5179',
    credentials: true,
  },
});

// 기본 미들웨어
app.use(cors({ origin: 'http://localhost:5179', credentials: true }));
app.use(express.json());

// 소켓 연결
io.on('connection', (socket) => {
  console.log(`✅ 사용자 연결됨 [socket.id: ${socket.id}]`);

  // 👉 실제 채팅 로직은 이 함수에서 위임 처리
  registerChatHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`❌ 연결 종료 [socket.id: ${socket.id}]`);
  });
});

// 서버 시작
const PORT = process.env.SOCKET_PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO 서버 실행 중: http://localhost:${PORT}`);
});
*/

//app을 불러와 소켓 서버와 프론트 정적 서비스까지 통합
// 📦 src/config/socketServer.js
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const express = require('express');
const app = require('../app'); // API까지 등록된 app
const { registerSocketHandlers } = require('./chat.socket');
require('dotenv').config();

const CLIENT_ORIGIN = process.env.REALSITE || 'http://localhost:5179';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
});

// 소켓 이벤트 연결
registerSocketHandlers(io);

// ⚠️ 반드시 API 라우트 이후에 정적 서빙 추가
app.use(express.static(path.join(__dirname, '../../../client/dist')));

// ⚠️ SPA 핸들러는 맨 마지막에 등록
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../client/dist/index.html'));
});

module.exports = server;
