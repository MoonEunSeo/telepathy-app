// 📦 src/config/chat.socket.js
/*
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

    console.log(`🟢 Socket connected: senderId=${senderId}, roomId=${roomId}`);
    socket.join(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    console.log('🔍 socket joined room', roomId);
    console.log('👥 현재 방 참가자 수:', clients?.size);
    console.log('📌 현재 방 참가자 ID 목록:', [...(clients || [])]);

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

    // ✅ 메시지 저장 + 양방향 broadcast
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

      io.to(roomId).emit('chatMessage', data); // ✅ 모든 유저에게 emit
    });

    socket.on('typing', () => {
      socket.to(roomId).emit('typing');
    });

    socket.on('stopTyping', () => {
      socket.to(roomId).emit('stopTyping');
    });

    socket.on('leaveRoom', ({ roomId }) => {
      console.log(`🚪 leaveRoom: ${senderId}`);
      socket.to(roomId).emit('chatEnded');
      socket.leave(roomId);
      socket.disconnect(true);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId}`);
    });
  });
}

module.exports = { registerSocketHandlers };

*/

// 📦 src/config/chat.socket.js
// 📦 src/chat.socket.js (튜닝 버전)
const { Server } = require("socket.io");
const { supabase } = require("./supabase");
const { v4: uuidv4 } = require("uuid");

// 전역 큐 및 매칭 정보
const queue = [];
const socketToUser = {}; // socket.id -> user info
const userToSocket = {}; // userId -> socket

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`✅ 소켓 연결됨: ${socket.id}`);

    // 사용자 정보 등록
    socket.on("register", ({ userId, nickname }) => {
      socket.userId = userId;
      socket.nickname = nickname;
      socketToUser[socket.id] = { userId, nickname };
      userToSocket[userId] = socket;
      tryMatch(socket);
    });

    // 타이핑 표시
    socket.on("typing", () => {
      socket.partner?.emit("typing");
    });
    socket.on("stopTyping", () => {
      socket.partner?.emit("stopTyping");
    });

    // 메시지 송수신
    socket.on("message", (msg, ack) => {
      if (socket.partner) {
        socket.partner.emit("message", msg);
        ack?.({ success: true });
      } else {
        ack?.({ success: false });
      }
    });

    // 연결 종료
    socket.on("disconnect", () => {
      console.log(`❌ 연결 종료됨: ${socket.id}`);
      if (socket.partner) {
        socket.partner.emit("partner-disconnected");
        socket.partner.partner = null;
      }
      // 큐에서 제거
      const idx = queue.findIndex((s) => s.id === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    });
  });
}

async function tryMatch(socket) {
  if (queue.length === 0) {
    queue.push(socket);
    return;
  }
  const partner = queue.shift();
  if (partner.id === socket.id) return;

  // 연결
  socket.partner = partner;
  partner.partner = socket;

  const roomId = uuidv4();
  const timestamp = new Date().toISOString();

  // Supabase 기록
  await supabase.from("matches").insert([
    { user_id: socket.userId, partner_id: partner.userId, status: "active", created_at: timestamp },
    { user_id: partner.userId, partner_id: socket.userId, status: "active", created_at: timestamp }
  ]);

  // 양쪽에게 연결 알림
  socket.emit("matched", {
    roomId,
    partnerId: partner.userId,
    partnerNickname: partner.nickname
  });
  partner.emit("matched", {
    roomId,
    partnerId: socket.userId,
    partnerNickname: socket.nickname
  });
}

module.exports = { registerSocketHandlers };