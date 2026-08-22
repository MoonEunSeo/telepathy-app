import { z } from 'zod';

const DEFAULT_WEB_ORIGINS = [
  'http://localhost:5179',
  'http://localhost:5000',
  'https://telepathy.my',
  'https://telepathy-app.onrender.com',
  'http://70.12.102.131:5000',
] as const;

const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.string().regex(/^\d+$/).optional(),
  REDIS_CONNECT_TIMEOUT_MS: z.string().regex(/^\d+$/).optional(),
  REDIS_ENABLED: z.enum(['true', 'false']).optional(),
  REDIS_PRESENCE_KEY: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9:_-]+$/)
    .optional(),
  REDIS_STREAM_MAX_LEN: z.string().regex(/^\d+$/).optional(),
  REDIS_STREAM_NAME: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9:_-]+$/)
    .optional(),
  REDIS_URL: z.string().optional(),
  PRESENCE_HEARTBEAT_MS: z.string().regex(/^\d+$/).optional(),
  PRESENCE_TTL_MS: z.string().regex(/^\d+$/).optional(),
  SERVE_WEB_STATIC: z.enum(['true', 'false']).optional(),
  TRUST_PROXY_HOPS: z.string().regex(/^\d+$/).optional(),
  WEB_ORIGINS: z.string().optional(),
});

export interface ServerRuntimeConfig {
  port: number;
  redis: RedisRuntimeConfig;
  serveWebStatic: boolean;
  trustProxyHops: number;
  webOrigins: string[];
}

export interface RedisRuntimeConfig {
  connectTimeoutMs: number;
  enabled: boolean;
  presenceHeartbeatMs: number;
  presenceKey: string;
  presenceTtlMs: number;
  streamMaxLen: number;
  streamName: string;
  url: string | null;
}

function normalizeOrigin(value: string): string {
  const candidate = value.trim();
  const url = new URL(candidate);

  if (!['http:', 'https:', 'capacitor:'].includes(url.protocol)) {
    throw new Error(`지원하지 않는 WEB_ORIGINS 프로토콜입니다: ${url.protocol}`);
  }

  if (
    (url.pathname !== '' && url.pathname !== '/') ||
    url.search !== '' ||
    url.hash !== '' ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error(`WEB_ORIGINS에는 경로·인증정보·쿼리·해시를 사용할 수 없습니다: ${candidate}`);
  }

  return `${url.protocol}//${url.host}`;
}

function parseWebOrigins(rawOrigins: string | undefined): string[] {
  if (rawOrigins === undefined) return [...DEFAULT_WEB_ORIGINS];

  const origins = rawOrigins
    .split(',')
    .map(normalizeOrigin)
    .filter((origin, index, values) => values.indexOf(origin) === index);

  if (origins.length === 0) {
    throw new Error('WEB_ORIGINS에는 하나 이상의 허용 출처가 필요합니다.');
  }

  return origins;
}

function parseRedisConfig(parsed: z.infer<typeof runtimeEnvironmentSchema>): RedisRuntimeConfig {
  const enabled = parsed.REDIS_ENABLED === 'true';
  const connectTimeoutMs = Number(parsed.REDIS_CONNECT_TIMEOUT_MS ?? '3000');
  const presenceTtlMs = Number(parsed.PRESENCE_TTL_MS ?? '60000');
  const presenceHeartbeatMs = Number(parsed.PRESENCE_HEARTBEAT_MS ?? '20000');
  const streamMaxLen = Number(parsed.REDIS_STREAM_MAX_LEN ?? '10000');
  const environmentName = parsed.NODE_ENV ?? 'development';
  const presenceKey = parsed.REDIS_PRESENCE_KEY?.trim() ?? `telepathy:${environmentName}:presence`;
  const streamName = parsed.REDIS_STREAM_NAME?.trim() ?? `telepathy:${environmentName}:socket.io`;
  const redisUrl = parsed.REDIS_URL?.trim() || null;

  if (
    !Number.isSafeInteger(connectTimeoutMs) ||
    connectTimeoutMs < 100 ||
    connectTimeoutMs > 60_000
  ) {
    throw new Error('REDIS_CONNECT_TIMEOUT_MS는 100~60000 범위의 정수여야 합니다.');
  }

  if (!Number.isSafeInteger(streamMaxLen) || streamMaxLen < 100 || streamMaxLen > 1_000_000) {
    throw new Error('REDIS_STREAM_MAX_LEN은 100~1000000 범위의 정수여야 합니다.');
  }

  if (!Number.isSafeInteger(presenceTtlMs) || presenceTtlMs < 10_000 || presenceTtlMs > 300_000) {
    throw new Error('PRESENCE_TTL_MS는 10000~300000 범위의 정수여야 합니다.');
  }

  if (
    !Number.isSafeInteger(presenceHeartbeatMs) ||
    presenceHeartbeatMs < 1_000 ||
    presenceHeartbeatMs >= presenceTtlMs
  ) {
    throw new Error('PRESENCE_HEARTBEAT_MS는 1000 이상이고 PRESENCE_TTL_MS보다 작아야 합니다.');
  }

  if (enabled && redisUrl === null) {
    throw new Error('REDIS_ENABLED=true이면 REDIS_URL이 필요합니다.');
  }

  if (redisUrl !== null) {
    let protocol: string;
    try {
      protocol = new URL(redisUrl).protocol;
    } catch {
      throw new Error('REDIS_URL은 유효한 redis:// 또는 rediss:// URL이어야 합니다.');
    }
    if (protocol !== 'redis:' && protocol !== 'rediss:') {
      throw new Error('REDIS_URL은 redis:// 또는 rediss:// 형식이어야 합니다.');
    }
  }

  return {
    connectTimeoutMs,
    enabled,
    presenceHeartbeatMs,
    presenceKey,
    presenceTtlMs,
    streamMaxLen,
    streamName,
    url: redisUrl,
  };
}

export function parseServerRuntimeConfig(environment: NodeJS.ProcessEnv): ServerRuntimeConfig {
  const parsed = runtimeEnvironmentSchema.parse(environment);
  const port = parsed.PORT === undefined ? 5000 : Number(parsed.PORT);
  const trustProxyHops =
    parsed.TRUST_PROXY_HOPS === undefined ? 0 : Number(parsed.TRUST_PROXY_HOPS);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT는 1~65535 범위의 정수여야 합니다.');
  }

  if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS는 0 이상의 정수여야 합니다.');
  }

  return {
    port,
    redis: parseRedisConfig(parsed),
    serveWebStatic: parsed.SERVE_WEB_STATIC !== 'false',
    trustProxyHops,
    webOrigins: parseWebOrigins(parsed.WEB_ORIGINS),
  };
}

export const serverRuntimeConfig = Object.freeze(parseServerRuntimeConfig(process.env));
