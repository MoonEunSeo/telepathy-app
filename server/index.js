/*const app = require('./src/app');
const PORT = process.env.PORT || 5000;
require('dotenv').config();

app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});*/

/*
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = require("./src/app"); // 기존 app 사용
const { createClient } = require("@supabase/supabase-js");

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5179", // 너 클라 주소
    credentials: true,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

io.on('connection', (socket) => {
  const { roomId, senderId, senderNickname, receiverId, receiverNickname, word } = socket.handshake.query;

  console.log(`🟢 Socket connected: senderId=${senderId}, roomId=${roomId}`);

  // join room
  socket.join(roomId);

  // [NEW] 서버에서 socket에 receiver info 응답 보내기 (정확하게)
  socket.emit('receiverInfo', {
    receiverId,
    receiverNickname
  });

  // 채팅 메시지 수신
  socket.on('chatMessage', (data) => {
    console.log('💬 Chat message:', data);
    io.to(roomId).emit('chatMessage', data);
  });

  // 타이핑 표시
  socket.on('typing', () => {
    socket.to(roomId).emit('typing');
  });

  socket.on('stopTyping', () => {
    socket.to(roomId).emit('stopTyping');
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId}`);
  });
});


// 기존 app.listen → server.listen 으로 바꿔야함!
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});
*/

/*
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:5179',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const matchRouter = require('./src/routes/match.routes'); // match.routes.js
app.use('/api/match', matchRouter);

app.use(express.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const PORT = 5000;

global.activeMatches = {}; // ⭐ 글로벌로 export 하기
global.queue = {};          // ⭐ 글로벌로 export 하기

// ✅ Socket.io 처리
io.on('connection', (socket) => {
  const { roomId, senderId, word } = socket.handshake.query;
  console.log(`✅ Socket connected: senderId=${senderId}, roomId=${roomId}, word=${word}`);

  socket.join(roomId);

  // 📢 receiverInfo emit
  if (global.activeMatches[word] && global.activeMatches[word][senderId]) {
    const matchInfo = global.activeMatches[word][senderId];

    socket.emit('receiverInfo', {
      receiverId: matchInfo.receiverId,
      receiverNickname: matchInfo.receiverNickname,
    });

    console.log(`📢 emit receiverInfo → senderId=${senderId}, receiverNickname=${matchInfo.receiverNickname}`);
  }

  // ✅ chatMessage
  socket.on('chatMessage', (data) => {
    console.log('💬 chatMessage:', data);

    io.to(roomId).emit('chatMessage', data);
  });

  // ✅ typing
  socket.on('typing', () => {
    socket.to(roomId).emit('typing');
  });

  socket.on('stopTyping', () => {
    socket.to(roomId).emit('stopTyping');
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: senderId=${senderId}, roomId=${roomId}`);
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});*/


//index.js
/*
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = require("./src/app"); // 기존 app 사용
const { createClient } = require("@supabase/supabase-js");
const authRouter = require('./src/routes/auth.routes');
app.use('/api/auth', authRouter);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5179", // 너 클라 주소
    credentials: true,
  },
});

const matchRouter = require('./src/routes/match.routes'); // match.routes.js
app.use('/api/match', matchRouter);

global.activeMatches = {}; // ⭐ 글로벌로 export 하기
global.queue = {};          // ⭐ 글로벌로 export 하기

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


io.on('connection', (socket) => {
  const { roomId, senderId, senderNickname, receiverId, receiverNickname, word } = socket.handshake.query;

  console.log(`🟢 Socket connected: senderId=${senderId}, roomId=${roomId}`);

  // 1️⃣ 방 참가
  socket.join(roomId);

  // 2️⃣ 상대방 정보 보내기
  if (global.activeMatches[word] && global.activeMatches[word][senderId]) {
    const matchInfo = global.activeMatches[word][senderId];

    socket.emit('receiverInfo', {
      receiverId: matchInfo.receiverId,
      receiverNickname: matchInfo.receiverNickname,
    });

    console.log(`📢 emit receiverInfo → senderId=${senderId}, receiverNickname=${matchInfo.receiverNickname}`);
  }

  // 3️⃣ 나가기 요청 수신 → 양쪽 강제 disconnect
    socket.on('leaveRoom', ({ roomId, word }) => {
      console.log(`🚪 leaveRoom 요청: senderId=${senderId}, roomId=${roomId}`);

      // 상대방에게 종료 알림
      socket.to(roomId).emit('chatEnded');

    // 자기 자신은 즉시 연결 해제
    socket.leave(roomId);
    socket.disconnect(true);
  });

  // 채팅 메시지 수신
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
      timestamp
    } = data;
  
    // ✅ Supabase에 채팅 로그 저장
    const { error } = await supabase
      .from('chat_logs')
      .insert({
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
  
    // ✅ 상대방에게 메시지 전송 (나 제외)
    socket.to(roomId).emit('chatMessage', data);
  });
  
  // 타이핑 표시
  socket.on('typing', () => {
    socket.to(roomId).emit('typing');
  });

  socket.on('stopTyping', () => {
    socket.to(roomId).emit('stopTyping');
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId}`);
  });
});

// 기존 app.listen → server.listen 으로 바꿔야함!
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});
*/

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
});
