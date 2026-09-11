import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on('error', (error) => {
  console.error('❌ Redis 오류:', error);
});

export async function connectRedis(): Promise<void> {
  if (redisClient.isOpen) return;
  await redisClient.connect();
  console.log('✅ Redis 연결 완료');
}
