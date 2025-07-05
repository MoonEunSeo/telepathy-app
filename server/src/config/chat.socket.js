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

const { supabase } = require('./supabase');
const roomReceiverSent = {}; // ✅ 방별 receiverInfo 전송 여부 기록

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const { roomId, senderId, senderNickname, word } = socket.handshake.query;
    console.log(`🟢 Socket connected: senderId=${senderId}, roomId=${roomId}`);

    socket.join(roomId);
    logRoomState(io, roomId);

    sendReceiverInfoIfReady(io, roomId);

    socket.on('chatMessage', async (data) => {
      console.log('💬 Chat message:', data);

      const { roomId, senderId, senderNickname, receiverId, receiverNickname, word, message, timestamp } = data;

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

      if (error) console.error('❌ chat_logs 저장 실패:', error.message);
      else console.log('✅ chat_logs 저장 완료!');

      io.to(roomId).emit('chatMessage', data);
    });

    socket.on('typing', () => socket.to(roomId).emit('typing'));
    socket.on('stopTyping', () => socket.to(roomId).emit('stopTyping'));

    socket.on('leaveRoom', ({ roomId }) => {
      console.log(`🚪 leaveRoom: senderId=${senderId}, roomId=${roomId}`);
      socket.to(roomId).emit('chatEnded');
      socket.leave(roomId);
      socket.disconnect(true);
    });

    socket.on('disconnect', () => {
      const clients = io.sockets.adapter.rooms.get(roomId);
      if (!clients || clients.size === 0) {
        delete roomReceiverSent[roomId]; // ✅ 방 비면 receiverInfo 상태 초기화
        console.log(`🧹 방 상태 초기화: roomId=${roomId}`);
      }
      console.log(`🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId}`);
    });
  });
}

function sendReceiverInfoIfReady(io, roomId) {
  const clients = io.sockets.adapter.rooms.get(roomId);
  if (clients?.size === 2 && !roomReceiverSent[roomId]) {
    const [firstSocketId, secondSocketId] = [...clients];
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

      roomReceiverSent[roomId] = true; // ✅ 중복 방지
      console.log('✅ receiverInfo emitted to both users');
    }
  }
}

function logRoomState(io, roomId) {
  const clients = io.sockets.adapter.rooms.get(roomId);
  console.log('🔍 socket joined room', roomId);
  console.log('👥 현재 방 참가자 수:', clients?.size || 0);
  console.log('📌 현재 방 참가자 ID 목록:', [...(clients || [])]);
}

module.exports = { registerSocketHandlers };