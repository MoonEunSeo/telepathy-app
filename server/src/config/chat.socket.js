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
// 📦 chat.socket.js
const { Server } = require('socket.io');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('✅ 새 소켓 연결:', socket.id);

    // 유저가 방 입장
    socket.on('joinRoom', ({ roomId, userId }) => {
      socket.join(roomId);
      console.log(`📥 ${userId} 님이 방(${roomId})에 입장했습니다.`);
    });

    // 메시지 수신 및 브로드캐스트
    socket.on('chatMessage', ({ roomId, userId, message }) => {
      console.log(`💬 [${roomId}] ${userId}: ${message}`);
      io.to(roomId).emit('message', { userId, message });
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log(`❌ 연결 해제: ${socket.id}`);
    });
  });
}

module.exports = { registerSocketHandlers };