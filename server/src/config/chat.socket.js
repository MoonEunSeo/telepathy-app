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
  });
}

module.exports = { registerSocketHandlers };
*/


// 📦 src/config/chat.socket.js
const supabase = require('./supabase.js');
const { v4: uuidv4 } = require('uuid');
const { filterMessage } = require("../utils/badwords");

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('🟢 New socket connected:', socket.id);
  
    // ✅ 접속자 수 항상 브로드캐스트
    io.emit('onlineCount', io.engine.clientsCount);
  
    // ✅ 클라이언트가 직접 요청할 수도 있게
    socket.on('getOnlineCount', () => {
      socket.emit('onlineCount', io.engine.clientsCount);
    });

     /**
     * 📢 확성기 이벤트
     */

    socket.on("megaphone:send", async ({ userId, message }) => {
      try {
        // 닉네임 조회
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", userId)
          .single();

        if (userError || !user) {
          console.error("❌ 닉네임 조회 실패:", userError?.message);
          return;
        }

        const nickname = user.nickname;

        // 메시지 필터링
        const cleanMessage = filterMessage(message);

        // 확성기 차감
        const { data: used, error: useError } = await supabase.rpc("use_megaphone", {
          uid: userId
        });

        if (useError || !used) {
          socket.emit("megaphone:failed", { message: "확성기가 부족합니다." });
          return;
        }

        // 로그 저장 (필터링된 메시지)
        await supabase.from("megaphone_logs").insert([
          { user_id: userId, nickname, message: cleanMessage }
        ]);

        // 브로드캐스트
        io.emit("megaphone:show", { nickname, message: cleanMessage });

        console.log(`📢 [Megaphone] ${nickname}: ${cleanMessage}`);
      } catch (err) {
        console.error("❌ megaphone 처리 오류:", err.message);
      }
    });


    /**
     * 📌 매칭 요청 이벤트
     * data = { userId, username, nickname, word, round }
     */
    socket.on('join_match', async (data) => {
      //console.log("📥 서버에서 join_match 수신:", data);
      const { userId, username, nickname, word, round } = data;

      // 1. 현재 유저를 큐에 등록 (waiting)
      const { error: insertError } = await supabase
        .from('telepathy_sessions_queue')
        .insert([{
          user_id: userId,
          username,
          nickname,
          word,
          round,
          status: 'waiting',
          socket_id: socket.id,
          room_id: null,
        }]);

      if (insertError) {
        console.error("❌ DB insert 실패:", insertError.message);
        return;
      }

      // 2. 같은 단어+라운드 waiting 유저 찾기 (본인 제외)
      const { data: waiting, error: waitingError } = await supabase
        .from('telepathy_sessions_queue')
        .select('*')
        .eq('word', word)
        .eq('round', round)
        .eq('status', 'waiting')
        .neq('user_id', userId);

      if (waitingError) {
        console.error('❌ waiting 조회 실패:', waitingError.message);
        return;
      }

      // 3. 상대가 있으면 매칭 성사
      if (waiting && waiting.length > 0) {
        const partner = waiting[0];
        const roomId = uuidv4();

        // 두 명 모두 matched 처리
        await supabase.from('telepathy_sessions_queue').update({
          status: 'matched',
          room_id: roomId,
          partner_id: partner.user_id,
          partner_username: partner.username,
          partner_nickname: partner.nickname,
        }).match({ user_id: userId, round });

        await supabase.from('telepathy_sessions_queue').update({
          status: 'matched',
          room_id: roomId,
          partner_id: userId,
          partner_username: username,
          partner_nickname: nickname,
        }).match({ user_id: partner.user_id, round });

        // 4. 로그 기록 (양쪽 다 기록)
        await supabase.from('telepathy_sessions_log').insert([
          {
            user_id: userId,
            username,
            nickname,
            word,
            round,
            result: 'matched',
            partner_id: partner.user_id,
            partner_username: partner.username,
            partner_nickname: partner.nickname,
            room_id: roomId,
            created_at: new Date()
          },
          {
            user_id: partner.user_id,
            username: partner.username,
            nickname: partner.nickname,
            word,
            round,
            result: 'matched',
            partner_id: userId,
            partner_username: username,
            partner_nickname: nickname,
            room_id: roomId,
            created_at: new Date()
          }
        ]);

        // socket 방 join
        socket.join(roomId);
        const partnerSocket = io.sockets.sockets.get(partner.socket_id);
        if (partnerSocket) partnerSocket.join(roomId);

        // 5. 매칭 성공 이벤트 전송
        socket.emit('matched', {
          roomId,
          senderId: userId,
          senderUsername: username,
          senderNickname: nickname,
          receiverId: partner.user_id,
          receiverUsername: partner.username,
          receiverNickname: partner.nickname,
          word,
          round,
        });

        if (partnerSocket) {
          partnerSocket.emit('matched', {
            roomId,
            senderId: partner.user_id,
            senderUsername: partner.username,
            senderNickname: partner.nickname,
            receiverId: userId,
            receiverUsername: username,
            receiverNickname: nickname,
            word,
            round,
          });
        }

        console.log(`✅ 매칭 성공! roomId=${roomId}, ${userId} <-> ${partner.user_id}`);
      }
    });

    /**
     * 📌 메시지 이벤트
     */
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
      }

      io.to(roomId).emit('chatMessage', data);
    });

    /**
     * 📌 typing 이벤트
     */
    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('typing');
    });

    socket.on('stopTyping', ({ roomId }) => {
      socket.to(roomId).emit('stopTyping');
    });

      /**
     * 📌 방 나가기
     */
 // 📌 방 나가기
    socket.on('leaveRoom', async ({ roomId, userId }) => {
      console.log(`🚪 leaveRoom: userId=${userId}, roomId=${roomId}`);
      socket.to(roomId).emit('chatEnded');   // 상대방에게 알림
      socket.leave(roomId);
      socket.disconnect(true);

      // 🔹 DB 상태만 ended로 업데이트 (로그 기록은 하지 않음)
      await supabase.from('telepathy_sessions_queue')
        .update({ status: 'ended' })
        .match({ user_id: userId, room_id: roomId });

      // ❌ 여기서 telepathy_sessions_log.insert 제거!
    });
      
          // ✅ 여기만 남겨야 함 (중첩 제거)
          socket.on('disconnecting', () => {
            for (const roomId of socket.rooms) {
              if (roomId === socket.id) continue;
              socket.to(roomId).emit('chatEnded');
              console.log(`📤 chatEnded → room=${roomId}`);
            }
          });
      
          socket.on('disconnect', () => {
            console.log(`🔴 Socket disconnected: ${socket.id}`);
            io.emit('onlineCount', io.engine.clientsCount);
          });
        });
      }

module.exports = { registerSocketHandlers };
