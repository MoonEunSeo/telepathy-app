import { createAdapter } from '@socket.io/redis-streams-adapter';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents';
import type { RedisRuntimeConfig } from '../config/runtime';
import { createOriginDelegate } from '../config/cors';
import { registerSocketHandlers, type SocketData } from '../config/chat.socket';
import type { RedisRuntime } from '../infra/redis';
import { decodeToken } from '../middleware/auth';
import { expireRound } from '../modules/matching/matching.service';
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
    },
  );

  if (options.redis !== null) {
    io.adapter(
      createAdapter(options.redis.client, {
        maxLen: options.redisConfig.streamMaxLen,
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

  let onlineUsers = 0;
  io.on('connection', (socket) => {
    onlineUsers++;
    console.log('🟢 유저 접속, 현재 인원:', onlineUsers);
    io.emit('onlineCount', onlineUsers);

    socket.on('disconnect', () => {
      onlineUsers--;
      console.log('🔴 유저 종료, 현재 인원:', onlineUsers);
      io.emit('onlineCount', onlineUsers);
    });
  });

  registerSocketHandlers(io);

  let lastRound = getCurrentRound().round;
  const roundTimer = setInterval(() => {
    const { round } = getCurrentRound();
    if (round === lastRound) return;

    const endedRound = lastRound;
    lastRound = round;
    io.emit('round:change', { round });
    if (options.v2MatchingEnabled) void expireRound(endedRound);
  }, 1_000);

  return {
    io,
    stopSchedulers: () => clearInterval(roundTimer),
  };
}
