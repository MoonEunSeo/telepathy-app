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

*/// 📦 src/config/chat.socket.js
const { Server } = require('socket.io');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        'https://telepathy.my',
        'https://telepathy-app.onrender.com',
        'http://localhost:5173',
      ],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const { roomId, senderId, senderNickname, word } = socket.handshake.query;
    if (!roomId || !senderId) {
      console.log('❌ 잘못된 연결 시도, query 누락');
      socket.disconnect();
      return;
    }

    console.log(`🟢 Socket connected: senderId=${senderId}, roomId=${roomId}`);

    // 방 입장
    socket.join(roomId);
    console.log(`🔍 socket joined room ${roomId}`);

    // 현재 방 참가자 정보 확인 후 상대방 정보 전달
    const clients = [...io.sockets.adapter.rooms.get(roomId) || []];
    const otherSocketId = clients.find((id) => id !== socket.id);

    if (otherSocketId) {
      const otherSocket = io.sockets.sockets.get(otherSocketId);
      if (otherSocket) {
        const otherQuery = otherSocket.handshake.query;
        // 현재 접속자에게 상대 정보 전달
        socket.emit('receiverInfo', {
          receiverId: otherQuery.senderId,
          receiverNickname: otherQuery.senderNickname,
        });
        // 상대방에게도 이 접속자의 정보 전달
        otherSocket.emit('receiverInfo', {
          receiverId: senderId,
          receiverNickname: senderNickname,
        });
      }
    }

    // 메시지 전송
    socket.on('chatMessage', (msg) => {
      console.log(`💬 ${senderNickname}의 메시지 중계`);
      socket.to(roomId).emit('chatMessage', msg);
    });

    // 타이핑 표시
    socket.on('typing', () => socket.to(roomId).emit('typing'));
    socket.on('stopTyping', () => socket.to(roomId).emit('stopTyping'));

    // 방 나가기 요청
    socket.on('leaveRoom', ({ roomId: leaveRoomId }) => {
      console.log(`👋 ${senderNickname} leaveRoom 호출`);
      socket.leave(leaveRoomId);
      socket.to(leaveRoomId).emit('chatEnded'); // 남은 사람에게 종료 알림
      socket.disconnect();
    });

    // 연결 끊김 처리
    socket.on('disconnect', (reason) => {
      console.log(`🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId}, reason=${reason}`);
      socket.to(roomId).emit('chatEnded');
    });
  });
}

module.exports = setupSocket;