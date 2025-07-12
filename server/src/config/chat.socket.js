// 📦 src/config/chat.socket.js

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

    /*
    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId}`);
    });
  });
}*/

    // ✅ 새로고침/닫기 시 상대방에게 종료 알림
    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: senderId=${senderId}, roomId=${roomId}`);

      const clients = io.sockets.adapter.rooms.get(roomId);

      // 방에 아직 다른 참가자가 남아 있으면, 그 사람에게 chatEnded 보내기
      if (clients && clients.size === 1) {
        const [remainingSocketId] = [...clients];
        const remainingSocket = io.sockets.sockets.get(remainingSocketId);
        if (remainingSocket) {
          remainingSocket.emit('chatEnded');
          console.log('📤 chatEnded 이벤트를 남은 유저에게 전송');
        }
      }
    });
  }); // <--- 이거 잊지 마!!
}

module.exports = { registerSocketHandlers };



// 📦 src/config/chat.socket.js
// 📦 src/config/chat.socket.js
/*const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('✅ 소켓 연결됨:', socket.id);

    let roomId;
    let currentUser = null;

    socket.on('joinRoom', async ({ token }) => {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        currentUser = payload;

        const { data, error } = await supabase
          .from('telepathy_sessions')
          .select('*')
          .eq('user1_id', currentUser.id)
          .maybeSingle();

        if (!data) {
          console.log('❌ 세션 없음');
          return;
        }

        roomId = data.room_id;
        socket.join(roomId);
        console.log(`🟢 ${currentUser.nickname} 님 ${roomId} 입장 완료`);

        socket.to(roomId).emit('userJoined', {
          nickname: currentUser.nickname,
        });
      } catch (err) {
        console.error('❌ 토큰 인증 오류:', err);
      }
    });

    socket.on('message', (msg) => {
      if (!roomId || !currentUser) return;
      io.to(roomId).emit('message', {
        ...msg,
        senderId: currentUser.id,
        senderNickname: currentUser.nickname,
      });
    });

    socket.on('typing', () => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('typing', {
        senderId: currentUser.id,
      });
    });

    socket.on('leave', () => {
      if (roomId) {
        socket.to(roomId).emit('chatEnded');
        socket.leave(roomId);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 연결 해제됨:', socket.id);
    });
  });
}

module.exports = { registerSocketHandlers };*/