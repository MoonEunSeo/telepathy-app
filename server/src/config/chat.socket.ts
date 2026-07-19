// 📦 src/config/chat.socket.ts
import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents';
import { v4 as uuidv4 } from 'uuid';
import supabase from './supabase';
import { filterMessage } from '../utils/badwords';
// chat.socket.ts
import type { SessionUser } from '../middleware/auth';

interface InterServerEvents {} // 서버 간 통신 미사용

export interface SocketData {
  user?: SessionUser;
}

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSocketHandlers(io: IOServer): void {
  io.on('connection', (socket: IOSocket) => {
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
    socket.on('megaphone:send', async ({ message }) => {
      const userId = socket.data.user?.user_id;
      if (!userId) {
        socket.emit('megaphone:failed', { message: '로그인이 필요합니다.' });
        return;
      }
      try {
        // 닉네임 조회
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', userId)
          .single();

        if (userError || !user) {
          console.error('❌ 닉네임 조회 실패:', userError?.message);
          return;
        }

        const nickname = user.nickname;

        // 메시지 필터링
        const cleanMessage = filterMessage(message);

        // 확성기 차감
        const { data: used, error: useError } = await supabase.rpc('use_megaphone', {
          uid: userId,
        });

        if (useError || !used) {
          socket.emit('megaphone:failed', { message: '확성기가 부족합니다.' });
          return;
        }

        // 로그 저장 (필터링된 메시지)
        await supabase
          .from('megaphone_logs')
          .insert([{ user_id: userId, nickname, message: cleanMessage }]);

        // 브로드캐스트
        io.emit('megaphone:show', { nickname, message: cleanMessage });

        console.log(`📢 [Megaphone] ${nickname}: ${cleanMessage}`);
      } catch (err) {
        console.error('❌ megaphone 처리 오류:', (err as Error).message);
      }
    });

    /**
     * 📌 매칭 요청 이벤트
     * data = { userId, username, nickname, word, round }
     */
    socket.on('join_match', async (data) => {
      const { userId, username, nickname, word, round } = data;

      // 재선택: 같은 라운드에서 이 유저의 기존 waiting 행 제거 후 새로 등록
      await supabase
        .from('telepathy_sessions_queue')
        .delete()
        .match({ user_id: userId, round, status: 'waiting' });

      // 1. 현재 유저를 큐에 등록 (waiting)
      const { error: insertError } = await supabase.from('telepathy_sessions_queue').insert([
        {
          user_id: userId,
          username,
          nickname,
          word,
          round,
          status: 'waiting',
          socket_id: socket.id,
          room_id: null,
        },
      ]);

      if (insertError) {
        console.error('❌ DB insert 실패:', insertError.message);
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
        await supabase
          .from('telepathy_sessions_queue')
          .update({
            status: 'matched',
            room_id: roomId,
            partner_id: partner.user_id,
            partner_username: partner.username,
            partner_nickname: partner.nickname,
          })
          .match({ user_id: userId, round });

        await supabase
          .from('telepathy_sessions_queue')
          .update({
            status: 'matched',
            room_id: roomId,
            partner_id: userId,
            partner_username: username,
            partner_nickname: nickname,
          })
          .match({ user_id: partner.user_id, round });

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
            created_at: new Date(),
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
            created_at: new Date(),
          },
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
     * 📌 미니 게임 이벤트
     */
    socket.on('game:event', (e) => {
      // 같은 방 상대에게만 전달(보낸 사람 제외 -> 발신자는 로컬에서 낙관적 반영)
      socket.to(e.roomId).emit('game:event', e);
    });

    /**
     * 📌 방 나가기
     */
    socket.on('leaveRoom', async ({ roomId, userId }) => {
      console.log(`🚪 leaveRoom: userId=${userId}, roomId=${roomId}`);
      socket.to(roomId).emit('chatEnded'); // 상대방에게 알림
      socket.leave(roomId);
      // socket.disconnect(true);

      // 🔹 DB 상태만 ended로 업데이트 (로그 기록은 하지 않음)
      await supabase
        .from('telepathy_sessions_queue')
        .update({ status: 'ended' })
        .match({ user_id: userId, room_id: roomId });
    });

    // ✅ 연결 끊기는 중 — 같은 방의 상대방에게 종료 알림
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
