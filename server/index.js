
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
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { registerSocketHandlers } = require('./src/config/chat.socket'); // ✅ 채팅 소켓 핸들러
require('dotenv').config();

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://telepathy.my', 'https://telepathy-app.onrender.com']
      : 'http://localhost:5179',
    credentials: true,
  },
});

let mainPageUsers = 0; // ✅ 메인페이지 접속자 카운트

// ✅ 메인페이지 전용 소켓 이벤트
io.on('connection', (socket) => {
  console.log('🟢 새로운 클라이언트 연결됨');

  socket.on('joinMainPage', () => {
    mainPageUsers++;
    io.emit('mainPageUsers', mainPageUsers);
    console.log(`✅ MainPage 접속자: ${mainPageUsers}명`);
  });

  socket.on('leaveMainPage', () => {
    mainPageUsers = Math.max(mainPageUsers - 1, 0);
    io.emit('mainPageUsers', mainPageUsers);
    console.log(`❌ MainPage 퇴장 → 접속자: ${mainPageUsers}명`);
  });

  socket.on('disconnect', () => {
    mainPageUsers = Math.max(mainPageUsers - 1, 0);
    io.emit('mainPageUsers', mainPageUsers);
    console.log(`🔴 소켓 종료 → 접속자: ${mainPageUsers}명`);
  });
});

// ✅ 채팅 관련 소켓 핸들러 연결
registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});*/

// server/index.js//
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const { connectRedis } = require('./src/config/redis')
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const { flushRound } = require('./src/utils/flush');
const { registerSocketHandlers } = require('./src/config/chat.socket');

const app = require('./app');

// ✅ CORS 설정 (이거 추가!)
app.use(
  cors({
    origin: [
      'http://localhost:5179',
      'https://telepathy.my',
      'https://telepathy-app.onrender.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// ✅ HTTP 서버 생성
const server = createServer(app);

// ✅ Socket.IO 설정
const io = new Server(server, {
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
connectRedis().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  })
})
.catch((error) => {
  console.error('Redis 연결 실패:', error);
    process.exit(1);
})