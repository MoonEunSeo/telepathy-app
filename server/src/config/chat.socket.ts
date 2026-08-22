// 📦 src/config/chat.socket.ts
import type { Server, Socket } from 'socket.io';
import type { MatchedPayload } from '@shared/domain';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents';
import { v4 as uuidv4 } from 'uuid';
import supabase from './supabase';
import { filterMessage } from '../utils/badwords';
// chat.socket.ts
import { GUEST_NICKNAME, type SessionUser } from '../middleware/auth';
import type {
  MatchQueue,
  MatchQueueEntry,
  MatchReservation,
} from '../modules/matching/match-queue';
import { getCurrentRound } from '../utils/round';

interface InterServerEvents {} // 서버 간 통신 미사용

export interface SocketData {
  user?: SessionUser;
}

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// 같은 (room, sender, timestamp) 조합이 짧은 시간 내에 두 번 들어오면
// 두 번째는 broadcast를 건너뛴다. 5초 지난 항목은 자동 정리
const recentBroadcasts = new Map<string, number>();

function isRecentDuplicate(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recentBroadcasts) {
    if (now - ts > 5000) recentBroadcasts.delete(k);
  }
  if (recentBroadcasts.has(key)) return true;
  recentBroadcasts.set(key, now);
  return false;
}

export interface RegisterSocketHandlerOptions {
  getOnlineCount: () => Promise<number | null>;
  matchQueue: MatchQueue | null;
}

function getMatchedPayload(reservation: MatchReservation, userId: string): MatchedPayload {
  const me = reservation.current.userId === userId ? reservation.current : reservation.partner;
  const partner = reservation.current.userId === userId ? reservation.partner : reservation.current;
  return {
    receiverId: partner.userId,
    receiverNickname: partner.nickname,
    receiverUsername: partner.username,
    roomId: reservation.roomId,
    round: me.round,
    senderId: me.userId,
    senderNickname: me.nickname,
    senderUsername: me.username,
    word: me.word,
  };
}

async function deliverMatch(
  io: IOServer,
  socket: IOSocket,
  reservation: MatchReservation,
): Promise<void> {
  const userId = socket.data.user?.user_id;
  if (!userId) return;
  const partner = reservation.current.userId === userId ? reservation.partner : reservation.current;

  await socket.join(reservation.roomId);
  socket.emit('matched', getMatchedPayload(reservation, userId));
  try {
    await io.in(partner.socketId).socketsJoin(reservation.roomId);
    io.to(partner.socketId).emit('matched', getMatchedPayload(reservation, partner.userId));
  } catch (error) {
    console.error(
      `[Matching] 상대 socket 전송 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
    );
  }
}

export function registerSocketHandlers(io: IOServer, options: RegisterSocketHandlerOptions): void {
  io.on('connection', (socket: IOSocket) => {
    console.log('🟢 New socket connected:', socket.id);

    // ✅ 클라이언트가 직접 요청할 수도 있게
    socket.on('getOnlineCount', () => {
      void options.getOnlineCount().then((count) => {
        if (count !== null) socket.emit('onlineCount', count);
      });
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
    let waitingEntry: MatchQueueEntry | null = null;
    socket.on('join_match', async (data) => {
      const { word, round } = data;

      const me = socket.data.user;
      if (!me) return; // io.use가 보장하지만 타입 좁히기 용
      const userId = me.user_id;
      const isGuest = me.role === 'guest';

      // 게스트는 토큰 닉네임, 회원은 payload 닉네임
      const nickname = isGuest ? me.nickname || GUEST_NICKNAME : data.nickname;
      const username = isGuest ? userId : (me.username ?? userId);

      if (!word || round == null) return;
      if (options.matchQueue !== null && getCurrentRound().round !== round) {
        socket.emit('match:failed', { code: 'ROUND_CLOSED', retryable: true });
        return;
      }

      const currentEntry: MatchQueueEntry = {
        nickname,
        queuedAt: Date.now(),
        round,
        socketId: socket.id,
        userId,
        username,
        word: word.trim().normalize('NFC'),
      };

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

      let reservation: MatchReservation | null = null;
      if (options.matchQueue !== null) {
        try {
          const result = await options.matchQueue.join(currentEntry, {
            matchId: uuidv4(),
            roomId: uuidv4(),
          });
          if (result.kind === 'waiting') {
            waitingEntry = currentEntry;
            return;
          }
          waitingEntry = null;
          reservation = result.reservation;

          if (!result.isNew) {
            await supabase
              .from('telepathy_sessions_queue')
              .delete()
              .match({ socket_id: socket.id, status: 'waiting', user_id: userId, round });
            if (reservation.status === 'COMMITTED') {
              await deliverMatch(io, socket, reservation);
            } else {
              socket.emit('match:failed', { code: 'MATCHING_IN_PROGRESS', retryable: true });
            }
            return;
          }
        } catch (error) {
          console.error(
            `[Matching] Redis 대기열 처리 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
          );
          await supabase
            .from('telepathy_sessions_queue')
            .delete()
            .match({ socket_id: socket.id, status: 'waiting', user_id: userId, round });
          socket.emit('match:failed', { code: 'MATCHING_UNAVAILABLE', retryable: true });
          return;
        }
      } else {
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

        const legacyPartner = waiting?.[0];
        if (legacyPartner) {
          reservation = {
            current: currentEntry,
            matchId: uuidv4(),
            partner: {
              nickname: legacyPartner.nickname,
              queuedAt: new Date(legacyPartner.created_at).getTime(),
              round,
              socketId: legacyPartner.socket_id,
              userId: legacyPartner.user_id,
              username: legacyPartner.username,
              word,
            },
            roomId: uuidv4(),
            status: 'RESERVED',
          };
        }
      }

      // 3. 상대가 있으면 매칭 성사
      if (reservation !== null) {
        const partner = reservation.partner;
        const roomId = reservation.roomId;

        // Redis 선점 후에도 DB 상태를 다시 가드한다.
        const [currentUpdate, partnerUpdate] = await Promise.all([
          supabase
            .from('telepathy_sessions_queue')
            .update({
              partner_id: partner.userId,
              partner_nickname: partner.nickname,
              partner_username: partner.username,
              room_id: roomId,
              status: 'matched',
            })
            .match({ round, status: 'waiting', user_id: userId })
            .select('user_id'),
          supabase
            .from('telepathy_sessions_queue')
            .update({
              partner_id: userId,
              partner_nickname: nickname,
              partner_username: username,
              room_id: roomId,
              status: 'matched',
            })
            .match({ round, status: 'waiting', user_id: partner.userId })
            .select('user_id'),
        ]);

        const corePersistFailed =
          currentUpdate.error !== null ||
          partnerUpdate.error !== null ||
          currentUpdate.data?.length !== 1 ||
          partnerUpdate.data?.length !== 1;

        if (corePersistFailed) {
          console.error('[Matching] DB 핵심 상태 확정 실패');
          await Promise.all([
            supabase
              .from('telepathy_sessions_queue')
              .update({
                partner_id: null,
                partner_nickname: null,
                partner_username: null,
                room_id: null,
                status: 'waiting',
              })
              .match({ room_id: roomId, user_id: userId }),
            supabase
              .from('telepathy_sessions_queue')
              .update({
                partner_id: null,
                partner_nickname: null,
                partner_username: null,
                room_id: null,
                status: 'waiting',
              })
              .match({ room_id: roomId, user_id: partner.userId }),
          ]);
          socket.emit('match:failed', { code: 'PERSIST_FAILED', retryable: true });
          return;
        }

        if (options.matchQueue !== null) {
          try {
            await options.matchQueue.commit(reservation);
            reservation = { ...reservation, status: 'COMMITTED' };
          } catch (error) {
            console.error(
              `[Matching] Redis commit 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
            );
          }
        }

        // 4. 로그 기록 (양쪽 다 기록)
        await supabase.from('telepathy_sessions_log').insert([
          {
            user_id: userId,
            username,
            nickname,
            word,
            round,
            result: 'matched',
            partner_id: partner.userId,
            partner_username: partner.username,
            partner_nickname: partner.nickname,
            room_id: roomId,
            created_at: new Date(),
          },
          {
            user_id: partner.userId,
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

        // 4-1. 단어 기록 저장 (MyWords 단어장 - 양쪽 다 기록)
        // · 게스트 본인 기록은 users 에 행이 없어 FK 제약상 저장 불가 → 제외
        // · 상대가 게스트면 partner_id 는 null 로 두고 닉네임만 남긴다
        // · 같은 상대 + 같은 단어 조합은 한 번만 남긴다

        const partnerIsGuest = partner.username === partner.userId;

        try {
          const historyRows = [
            {
              user_id: userId,
              user_nickname: nickname,
              partner_id: partnerIsGuest ? null : partner.userId, // 👈
              partner_nickname: partner.nickname,
              word,
              isGuest,
            },
            {
              user_id: partner.userId,
              user_nickname: partner.nickname,
              partner_id: isGuest ? null : userId,
              partner_nickname: nickname,
              word,
              // 큐에 role 컬럼이 없어 저장된 값으로 판별한다.
              // 게스트는 username에 user_id(uuid)를 그대로 넣으므로 두 값이 같다.
              isGuest: partner.username === partner.userId,
            },
          ].filter((row) => !row.isGuest);

          for (const row of historyRows) {
            const { isGuest: _omit, ...record } = row;

            let query = supabase
              .from('word_history')
              .select('id')
              .eq('user_id', record.user_id)
              .eq('word', word);

            // partner_id 가 null(게스트 상대)이면 = 비교가 안 되므로 IS NULL + 닉네임으로 판별
            query =
              record.partner_id === null
                ? query.is('partner_id', null).eq('partner_nickname', record.partner_nickname)
                : query.eq('partner_id', record.partner_id);

            const { data: existing } = await query.maybeSingle();

            if (!existing) {
              const { error: insertError } = await supabase.from('word_history').insert([record]);
              if (insertError) {
                console.error('❌ word_history insert 실패:', insertError.message, record);
              }
            }
          }
        } catch (err) {
          console.error('word_history 저장 실패:', (err as Error).message);
        }

        // Adapter 분산 API를 사용해 다른 인스턴스의 socket도 room에 합류시킨다.
        await deliverMatch(io, socket, reservation);

        console.log(`✅ 매칭 성공! roomId=${roomId}, ${userId} <-> ${partner.userId}`);
      }
    });

    socket.on('match:resume', async ({ roomId }, ack) => {
      const userId = socket.data.user?.user_id;
      if (!userId) {
        ack({ ok: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('telepathy_sessions_queue')
          .select('user_id')
          .match({ room_id: roomId, status: 'matched', user_id: userId })
          .maybeSingle();

        if (error || !data) {
          console.error('[Matching] room 복구 검증 실패');
          ack({ ok: false });
          return;
        }

        await socket.join(roomId);
        ack({ ok: true });
      } catch (error) {
        console.error(
          `[Matching] room 복구 오류 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
        );
        ack({ ok: false });
      }
    });

    /**
     * 📌 메시지 이벤트
     */
    socket.on('chatMessage', async (data) => {
      const { roomId, receiverId, receiverNickname, word, message, timestamp } = data;

      const me = socket.data.user;
      if (!me) return;
      const senderId = me.user_id;
      const senderNickname =
        me.role === 'guest' ? me.nickname || GUEST_NICKNAME : data.senderNickname;

      // 같은 (room, sender, timestamp) 중복 차단 - DB insert/broadcast 모두 건너뜀
      const dedupKey = `${roomId}::${senderId}::${timestamp}`;
      if (isRecentDuplicate(dedupKey)) {
        console.log('중복 차단');
        return;
      }

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

      // ⚠️ 브로드캐스트도 서버가 확정한 신원으로
      io.to(roomId).emit('chatMessage', { ...data, senderId, senderNickname });
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
    socket.on('leaveRoom', async ({ roomId }) => {
      const me = socket.data.user;
      if (!me) return;

      socket.to(roomId).emit('chatEnded'); // 상대방에게 알림
      socket.leave(roomId);

      // 🔹 DB 상태만 ended로 업데이트 (로그 기록은 하지 않음)
      await supabase
        .from('telepathy_sessions_queue')
        .update({ status: 'ended' })
        .match({ user_id: me.user_id, room_id: roomId });
    });

    socket.on('disconnect', () => {
      if (options.matchQueue !== null && waitingEntry !== null) {
        void options.matchQueue.removeWaiting(waitingEntry).catch((error: unknown) => {
          console.error(
            `[Matching] 단절 socket 큐 정리 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
          );
        });
      }
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
}
