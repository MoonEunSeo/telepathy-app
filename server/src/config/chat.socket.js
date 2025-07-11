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
// 📁 chat.socket.js
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('./supabase');
const activeRooms = {};

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('✅ Socket 연결됨:', socket.id);

    socket.on('joinRoom', async ({ userId, nickname, word }) => {
      if (!word || !userId || !nickname) return;

      const roomId = `room-${word}`;
      socket.join(roomId);
      socket.data = { userId, nickname, word, roomId };
      console.log(`🟢 [joinRoom] ${nickname} (${userId})가 방 ${roomId} 입장`);

      if (!activeRooms[roomId]) activeRooms[roomId] = [];
      activeRooms[roomId].push(socket);

      // 두 명이 모이면 채팅 시작
      if (activeRooms[roomId].length === 2) {
        const [a, b] = activeRooms[roomId];
        const payload = {
          roomId,
          users: [
            { id: a.data.userId, nickname: a.data.nickname },
            { id: b.data.userId, nickname: b.data.nickname },
          ],
          word,
        };
        io.to(roomId).emit('startChat', payload);
        console.log(`🎉 [매칭 완료] ${a.data.nickname}와 ${b.data.nickname} - ${word}`);
      }
    });

    socket.on('sendMessage', ({ roomId, message, sender }) => {
      io.to(roomId).emit('receiveMessage', { message, sender });
    });

    socket.on('typing', ({ roomId, userId }) => {
      socket.to(roomId).emit('typing', { userId });
    });

    socket.on('stopTyping', ({ roomId, userId }) => {
      socket.to(roomId).emit('stopTyping', { userId });
    });

    socket.on('leaveRoom', () => {
      const { roomId, userId, nickname } = socket.data || {};
      socket.leave(roomId);
      if (roomId && activeRooms[roomId]) {
        activeRooms[roomId] = activeRooms[roomId].filter(s => s.id !== socket.id);
        if (activeRooms[roomId].length === 0) delete activeRooms[roomId];
      }
      io.to(roomId).emit('userLeft', { userId, nickname });
      console.log(`👋 ${nickname}가 방 ${roomId}에서 나감`);
    });

    socket.on('disconnect', () => {
      const { roomId, userId, nickname } = socket.data || {};
      if (roomId && activeRooms[roomId]) {
        activeRooms[roomId] = activeRooms[roomId].filter(s => s.id !== socket.id);
        if (activeRooms[roomId].length === 0) delete activeRooms[roomId];
      }
      io.to(roomId).emit('userLeft', { userId, nickname });
      console.log(`❌ 소켓 연결 해제: ${nickname || socket.id}`);
    });
  });
}

module.exports = { registerSocketHandlers };