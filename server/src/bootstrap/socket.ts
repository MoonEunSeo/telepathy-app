import { createAdapter } from '@socket.io/redis-streams-adapter';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents';
import type { RedisRuntimeConfig } from '../config/runtime';
import { createOriginDelegate } from '../config/cors';
import { registerSocketHandlers, type SocketData } from '../config/chat.socket';
import type { RedisRuntime } from '../infra/redis';
import { createPresenceStore } from '../infra/presence';
import { decodeToken } from '../middleware/auth';
import { expireRound } from '../modules/matching/matching.service';
import { RedisMatchQueue, type MatchQueue } from '../modules/matching/match-queue';
import { getCurrentRound } from '../utils/round';

interface InterServerEvents {}

type TelepathySocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface SocketRuntime {
  io: TelepathySocketServer;
  stopSchedulers: () => void;
}

export interface CreateSocketRuntimeOptions {
  allowedOrigins: readonly string[];
  redis: RedisRuntime | null;
  redisConfig: RedisRuntimeConfig;
  v2MatchingEnabled: boolean;
}

function readToken(raw?: string): string | undefined {
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === 'token') return decodeURIComponent(value.join('='));
  }
  return undefined;
}

export function createSocketRuntime(
  server: HttpServer,
  options: CreateSocketRuntimeOptions,
): SocketRuntime {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    server,
    {
      cors: {
        origin: createOriginDelegate(options.allowedOrigins),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket'],
      path: '/socket.io',
      connectionStateRecovery: {
        maxDisconnectionDuration: options.redisConfig.presenceTtlMs,
        skipMiddlewares: false,
      },
    },
  );

  if (options.redis !== null) {
    io.adapter(
      createAdapter(options.redis.client, {
        maxLen: options.redisConfig.streamMaxLen,
        sessionKeyPrefix: `${options.redisConfig.streamName}:session:`,
        streamName: options.redisConfig.streamName,
      }),
    );
  }

  io.use((socket, next) => {
    if (options.redis !== null && !options.redis.isReady) {
      next(new Error('실시간 서비스 준비 중'));
      return;
    }

    const user = decodeToken(readToken(socket.handshake.headers.cookie));
    if (!user) {
      next(new Error('인증 필요'));
      return;
    }

    socket.data.user = user;
    next();
  });

  const presence = createPresenceStore(options.redis, options.redisConfig.presenceKey);
  let matchQueue: MatchQueue | null = null;
  if (options.redisConfig.matchingEnabled) {
    if (options.redis === null) throw new Error('Redis 매칭에는 Redis 연결이 필요합니다.');
    matchQueue = new RedisMatchQueue(
      options.redis,
      options.redisConfig.matchQueuePrefix,
      options.redisConfig.matchQueueTtlMs,
    );
  }
  const pendingRoomEnds = new Map<string, NodeJS.Timeout>();
  const presenceExpiryTimers = new Set<NodeJS.Timeout>();
  let stopped = false;

  const getOnlineCount = async (): Promise<number | null> => {
    try {
      return await presence.count(Date.now());
    } catch (error) {
      console.error(
        `[Presence] 접속자 수 조회 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
      );
      return null;
    }
  };

  const emitOnlineCount = async (): Promise<void> => {
    const count = await getOnlineCount();
    if (count !== null) io.emit('onlineCount', count);
  };

  const touchUsers = async (userIds: readonly string[]): Promise<boolean> => {
    try {
      await presence.touch(userIds, Date.now() + options.redisConfig.presenceTtlMs);
      return true;
    } catch (error) {
      console.error(`[Presence] 갱신 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`);
      return false;
    }
  };

  const scheduleRoomEnd = (userId: string, roomId: string): void => {
    const key = `${userId}:${roomId}`;
    const previousTimer = pendingRoomEnds.get(key);
    if (previousTimer !== undefined) clearTimeout(previousTimer);

    const timer = setTimeout(() => {
      pendingRoomEnds.delete(key);
      void io
        .in(roomId)
        .fetchSockets()
        .then((roomSockets) => {
          const recovered = roomSockets.some(
            (roomSocket) => roomSocket.data.user?.user_id === userId,
          );
          if (recovered) return;
          io.to(roomId).emit('chatEnded');
          console.log(`📤 재접속 유예 만료 → room=${roomId}`);
        })
        .catch((error: unknown) => {
          console.error(
            `[Socket] 방 복구 확인 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
          );
        });
    }, options.redisConfig.presenceTtlMs);
    pendingRoomEnds.set(key, timer);
  };

  io.on('connection', (socket) => {
    const userId = socket.data.user?.user_id;
    if (!userId) return;

    void touchUsers([userId]).then((touched) => {
      if (touched) void emitOnlineCount();
    });

    let disconnectedRooms: string[] = [];
    let recoverableDisconnect = true;
    socket.on('disconnecting', (reason) => {
      disconnectedRooms = [...socket.rooms].filter((roomId) => roomId !== socket.id);
      recoverableDisconnect = ![
        'client namespace disconnect',
        'server namespace disconnect',
      ].includes(reason);

      if (!recoverableDisconnect) {
        for (const roomId of disconnectedRooms) socket.to(roomId).emit('chatEnded');
      }
    });

    socket.on('disconnect', () => {
      if (stopped) return;
      void touchUsers([userId]);
      if (recoverableDisconnect) {
        for (const roomId of disconnectedRooms) scheduleRoomEnd(userId, roomId);
      }

      const expiryTimer = setTimeout(() => {
        presenceExpiryTimers.delete(expiryTimer);
        void emitOnlineCount();
      }, options.redisConfig.presenceTtlMs);
      presenceExpiryTimers.add(expiryTimer);
    });
  });

  const presenceHeartbeat = setInterval(() => {
    const userIds = [
      ...new Set(
        [...io.sockets.sockets.values()]
          .map((socket) => socket.data.user?.user_id)
          .filter((userId): userId is string => userId !== undefined),
      ),
    ];
    void touchUsers(userIds);
  }, options.redisConfig.presenceHeartbeatMs);

  registerSocketHandlers(io, { getOnlineCount, matchQueue });

  let lastRound = getCurrentRound().round;
  const roundTimer = setInterval(() => {
    const { round } = getCurrentRound();
    if (round === lastRound) return;

    const endedRound = lastRound;
    lastRound = round;
    io.emit('round:change', { round });
    if (matchQueue !== null) {
      void matchQueue.expireRound(endedRound).catch((error: unknown) => {
        console.error(
          `[Matching] 라운드 큐 정리 실패 (${error instanceof Error ? error.name : 'UNKNOWN'})`,
        );
      });
    }
    if (options.v2MatchingEnabled) void expireRound(endedRound);
  }, 1_000);

  return {
    io,
    stopSchedulers: () => {
      stopped = true;
      clearInterval(roundTimer);
      clearInterval(presenceHeartbeat);
      for (const timer of pendingRoomEnds.values()) clearTimeout(timer);
      pendingRoomEnds.clear();
      for (const timer of presenceExpiryTimers) clearTimeout(timer);
      presenceExpiryTimers.clear();
    },
  };
}
