import { createServer, type Server as HttpServer } from 'node:http';

import { createServerApp } from '../../app';
import { serverRuntimeConfig } from '../config/runtime';
import { RedisRuntime } from '../infra/redis';
import { getReadiness } from './readiness';
import { createSocketRuntime, type SocketRuntime } from './socket';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function getErrorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return error instanceof Error ? error.name : 'UNKNOWN';
}

function listen(server: HttpServer, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function closeSocket(io: SocketRuntime['io']): Promise<void> {
  return new Promise((resolve) => {
    io.close(() => resolve());
  });
}

export async function startServer(): Promise<void> {
  const redis = serverRuntimeConfig.redis.enabled
    ? new RedisRuntime(serverRuntimeConfig.redis)
    : null;

  if (redis !== null) {
    try {
      await redis.connect();
    } catch (error) {
      redis.destroy();
      throw new Error(`Redis 초기 연결 실패 (${getErrorCode(error)})`);
    }
  }

  let shuttingDown = false;
  const app = createServerApp({
    readinessCheck: () => getReadiness(shuttingDown, redis),
  });
  const httpServer = createServer(app);
  const socketRuntime = createSocketRuntime(httpServer, {
    allowedOrigins: serverRuntimeConfig.webOrigins,
    redis,
    redisConfig: serverRuntimeConfig.redis,
    v2MatchingEnabled: process.env.V2_MATCHING_ENABLED === 'true',
  });

  await listen(httpServer, serverRuntimeConfig.port);

  console.log(`🚀 서버 실행 중: http://localhost:${serverRuntimeConfig.port}`);
  console.log(`   웹 정적 파일 제공: ${serverRuntimeConfig.serveWebStatic ? 'ON' : 'OFF'}`);
  console.log(`   Redis Streams Adapter: ${redis === null ? 'OFF' : 'ON'}`);

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Server] ${signal} 종료 시작`);
    socketRuntime.stopSchedulers();

    const forceTimer = setTimeout(() => {
      console.error('[Server] 정상 종료 제한시간 초과');
      httpServer.closeAllConnections();
      redis?.destroy();
      process.exitCode = 1;
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await closeSocket(socketRuntime.io);
      await redis?.close();
      console.log('[Server] 정상 종료 완료');
    } catch (error) {
      console.error(`[Server] 종료 오류 (${getErrorCode(error)})`);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceTimer);
    }
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}
