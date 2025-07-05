
// 📦 src/index.js
/*
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { createClient } = require('@supabase/supabase-js');
const { registerSocketHandlers } = require('./src/config/chat.socket');

// 글로벌 상태
global.activeMatches = {};
global.queue = {};

// Supabase 클라이언트
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 서버 및 소켓 초기화
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5179',
    credentials: true,
  },
});

// 소켓 이벤트 연결
registerSocketHandlers(io);

// 서버 실행
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(🚀 서버 실행 중: http://localhost:${PORT});
});
// 📦 src/chat.socket.js (양방향 receiverInfo 전달)
const { supabase } = require('./supabase');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const {
      roomId,
      senderId,
      senderNickname,
      receiverId,
      receiverNickname,
      word,
    } = socket.handshake.query;

    console.log(🟢 Socket connected: senderId=${senderId}, roomId=${roomId});

    socket.join(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    console.log('🔍 socket joined room', roomId);
    console.log('👥 현재 방 참가자 수:', clients?.size);
    console.log('📌 현재 방 참가자 ID 목록:', [...(clients || [])]);

    // ✅ 방에 유저 2명일 때만 receiverInfo 전송 (중복 방지)
    if (clients?.size === 2) {
      const clientIds = [...clients];

      const [firstSocketId, secondSocketId] = clientIds;
      const firstSocket = io.sockets.sockets.get(firstSocketId);
      const secondSocket = io.sockets.sockets.get(secondSocketId);

      if (firstSocket && secondSocket) {
        const firstQuery = firstSocket.handshake.query;
        const secondQuery = secondSocket.handshake.query;

        firstSocket.emit('receiverInfo', {
          receiverId: secondQuery.senderId,
          receiverNickname: secondQuery.senderNickname,
        });

        secondSocket.emit('receiverInfo', {
          receiverId: firstQuery.senderId,
          receiverNickname: firstQuery.senderNickname,
        });

        console.log('✅ receiverInfo emitted once for both users');
      }
    }

    // 채팅 메시지 처리
    socket.on('chatMessage', async (data) => {
      console.log('💬 Chat message:', data);

      const {
        roomId,
        senderId,
        senderNickname,
        receiverId,
        receiverNickname,
        word,
        message,
        timestamp,
      } = data;

      const { error } = await supabase.from('chat_logs').insert({
        room_id: roomId,
        sender_id: senderId,
        sender_nickname: senderNickname,
        receiver_id: receiverId,
        receiver_nickname: receiverNickname,
        word,
        message,
        timestamp: new Date(timestamp),
      });

      if (error) {
        console.error('❌ chat_logs 저장 실패:', error.message);
      } else {
        console.log('✅ chat_logs 저장 완료!');
      }

      socket.to(roomId).emit('chatMessage', data);
    });

    // 타이핑 표시
    socket.on('typing', () => {
      socket.to(roomId).emit('typing');
    });

    socket.on('stopTyping', () => {
      socket.to(roomId).emit('stopTyping');
    });

    socket.on('leaveRoom', ({ roomId }) => {
      console.log(🚪 leaveRoom: ${senderId});
      socket.to(roomId).emit('chatEnded');
      socket.leave(roomId);
      socket.disconnect(true);
    });

    socket.on('disconnect', () => {
      console.log(🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId});
    });
  });
}

module.exports = { registerSocketHandlers };*/

/*
// 📦 index.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { registerSocketHandlers } = require('./src/config/chat.socket');
require('dotenv').config();


// ✅ 여기에 로거 호출!
const { initLogger } = require('./src/utils/logger');
initLogger();


const server = http.createServer(app);

const CLIENT_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? [
        'https://telepathy.my',              // ✅ 실제 배포 프론트 도메인
        'https://telepathy-app.onrender.com' // ✅ 기존 Render 도메인
      ]
    : 'http://localhost:5179'; // 개발 환경

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
});
io.on('connection', (socket) => {
  console.log(`✅ 사용자 연결됨 [socket.id: ${socket.id}]`);
  registerSocketHandlers(io, socket);
  socket.on('disconnect', () => console.log(`❌ 연결 종료 [socket.id: ${socket.id}]`));
});

// ✅ 서버 실행
const PORT = process.env.SERV_DEV || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});*/

const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { createClient } = require('@supabase/supabase-js');
const { registerSocketHandlers } = require('./src/config/chat.socket');

// 글로벌 상태
global.activeMatches = {};
global.queue = {};

// Supabase 클라이언트
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// HTTP 서버 생성
const server = createServer(app);

// Socket.IO 초기화 + 배포 도메인까지 포함한 CORS 설정
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5179',                // 로컬 개발환경
      'https://telepathy.my',                 // 메인 배포 도메인
      'https://telepathy-app.onrender.com'    // Render 앱 서버 도메인
    ],
    credentials: true,
  },
});

// 소켓 이벤트 등록
registerSocketHandlers(io);

// 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
