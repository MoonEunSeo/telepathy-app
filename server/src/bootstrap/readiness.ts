import type { ReadinessSnapshot } from '../http/createApp';

export interface RedisReadinessSource {
  readonly isReady: boolean;
}

export function getReadiness(
  shuttingDown: boolean,
  redis: RedisReadinessSource | null,
): ReadinessSnapshot {
  const redisReady = redis === null || redis.isReady;

  return {
    ready: !shuttingDown && redisReady,
    redis: redis === null ? 'disabled' : redis.isReady ? 'ready' : 'unavailable',
  };
}
