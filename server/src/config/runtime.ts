import { z } from 'zod';

const DEFAULT_WEB_ORIGINS = [
  'http://localhost:5179',
  'http://localhost:5000',
  'https://telepathy.my',
  'https://telepathy-app.onrender.com',
  'http://70.12.102.131:5000',
] as const;

const runtimeEnvironmentSchema = z.object({
  PORT: z.string().regex(/^\d+$/).optional(),
  SERVE_WEB_STATIC: z.enum(['true', 'false']).optional(),
  TRUST_PROXY_HOPS: z.string().regex(/^\d+$/).optional(),
  WEB_ORIGINS: z.string().optional(),
});

export interface ServerRuntimeConfig {
  port: number;
  serveWebStatic: boolean;
  trustProxyHops: number;
  webOrigins: string[];
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
    serveWebStatic: parsed.SERVE_WEB_STATIC !== 'false',
    trustProxyHops,
    webOrigins: parseWebOrigins(parsed.WEB_ORIGINS),
  };
}

export const serverRuntimeConfig = Object.freeze(parseServerRuntimeConfig(process.env));
