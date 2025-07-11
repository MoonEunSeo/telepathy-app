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
// ✅ chat.socket.js
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const queue = {}; // { word: [ { socketId, userId, nickname, timestamp } ] }
const activeRooms = {}; // { roomId: [ socketId1, socketId2 ] }

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('✅ Socket 연결됨:', socket.id);

    socket.on('joinWordQueue', async ({ token, word }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user_id;

        const { data: userProfile, error } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', userId)
          .single();

        if (error || !userProfile) {
          socket.emit('matchError', { message: '닉네임 조회 실패' });
          return;
        }

        const nickname = userProfile.nickname;
        const now = Date.now();

        if (!queue[word]) queue[word] = [];
        queue[word] = queue[word].filter(entry => now - entry.timestamp < 5 * 60 * 1000);
        queue[word] = queue[word].filter(entry => entry.userId !== userId);

        queue[word].push({ socketId: socket.id, userId, nickname, timestamp: now });

        if (queue[word].length >= 2) {
          const user1 = queue[word].shift();
          const user2 = queue[word].shift();
          const roomId = uuidv4();

          activeRooms[roomId] = [user1.socketId, user2.socketId];

          await supabase.from('telepathy_sessions').insert([
            { word, user_id: user1.userId, status: 'matched', matched_user_id: user2.userId, room_id: roomId },
            { word, user_id: user2.userId, status: 'matched', matched_user_id: user1.userId, room_id: roomId }
          ]);

          io.to(user1.socketId).emit('matched', {
            roomId,
            myId: user1.userId,
            myNickname: user1.nickname,
            partnerId: user2.userId,
            partnerNickname: user2.nickname,
            word
          });

          io.to(user2.socketId).emit('matched', {
            roomId,
            myId: user2.userId,
            myNickname: user2.nickname,
            partnerId: user1.userId,
            partnerNickname: user1.nickname,
            word
          });
        }
      } catch (err) {
        console.error('❌ 소켓 매칭 오류:', err);
        socket.emit('matchError', { message: '서버 오류' });
      }
    });

    // 🔁 기존의 socket.on('joinRoom') 아래쪽 또는 적절한 위치에 추가
socket.on('joinRoomDirect', async (payload) => {
  const {
    roomId,
    myId,
    myNickname,
    partnerId,
    partnerNickname,
    word,
  } = payload;

  console.log(`🟢 [joinRoomDirect] 유저 ${myNickname} (${myId})가 방 ${roomId}에 참가합니다.`);

  socket.join(roomId);

  // 유저 정보를 소켓에 저장해두기 (나중에 나갈 때 사용)
  socket.roomId = roomId;
  socket.userId = myId;
  socket.nickname = myNickname;

  // 🧠 activeMatches에 등록
  if (!global.activeMatches[word]) global.activeMatches[word] = {};
  global.activeMatches[word][myId] = {
    roomId,
    receiverId: partnerId,
    receiverNickname: partnerNickname,
  };

  // 상대방에게도 메시지 보낼 수 있도록 소켓 알림
  socket.to(roomId).emit('userJoined', {
    userId: myId,
    nickname: myNickname,
  });

  console.log(`✅ [joinRoomDirect] ${myNickname} (${myId}) 참가 완료`);
});

    socket.on('sendMessage', ({ roomId, sender, content }) => {
      if (!activeRooms[roomId]) return;
      activeRooms[roomId].forEach(id => {
        if (id !== socket.id) {
          io.to(id).emit('receiveMessage', { sender, content });
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket 연결 해제됨:', socket.id);
      for (const word in queue) {
        queue[word] = queue[word].filter(entry => entry.socketId !== socket.id);
      }
      for (const roomId in activeRooms) {
        activeRooms[roomId] = activeRooms[roomId].filter(id => id !== socket.id);
        if (activeRooms[roomId].length === 0) delete activeRooms[roomId];
      }
    });
  });
}

module.exports = { registerSocketHandlers };