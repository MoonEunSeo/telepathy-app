
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

// 📦 src/index.js
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app'); // app.js에서 export한 Express 앱
const { registerSocketHandlers } = require('./src/config/chat.socket');
require('dotenv').config();

// 글로벌 상태 (필요 시 유지)
global.activeMatches = {};
global.queue = {};

// http 서버에 app 연결
const server = createServer(app);

// socket.io 초기화 (http 서버에 연결)
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [
          'https://telepathy.my',
          'https://telepathy-app.onrender.com',
        ]
      : 'http://localhost:5179',
    credentials: true,
  },
});

// 소켓 이벤트 등록
registerSocketHandlers(io);

// 서버 실행
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});