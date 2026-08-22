import { describe, expect, it } from 'vitest';
import { parseServerRuntimeConfig } from '../src/config/runtime';

describe('서버 런타임 설정', () => {
  it('웹 출처의 공백과 중복을 정규화한다', () => {
    const config = parseServerRuntimeConfig({
      PORT: '5001',
      REDIS_ENABLED: 'true',
      REDIS_URL: 'redis://redis:6379',
      SERVE_WEB_STATIC: 'false',
      TRUST_PROXY_HOPS: '1',
      WEB_ORIGINS: ' https://telepathy.my/, http://localhost:5179,https://telepathy.my ',
    });

    expect(config).toEqual({
      port: 5001,
      redis: {
        connectTimeoutMs: 3000,
        enabled: true,
        matchQueuePrefix: 'telepathy:development:matching',
        matchQueueTtlMs: 90000,
        matchingEnabled: false,
        presenceHeartbeatMs: 20000,
        presenceKey: 'telepathy:development:presence',
        presenceTtlMs: 60000,
        streamMaxLen: 10000,
        streamName: 'telepathy:development:socket.io',
        url: 'redis://redis:6379',
      },
      serveWebStatic: false,
      trustProxyHops: 1,
      webOrigins: ['https://telepathy.my', 'http://localhost:5179'],
    });
  });

  it('Redis 활성화 시 URL을 요구하고 프로토콜을 제한한다', () => {
    expect(() => parseServerRuntimeConfig({ REDIS_ENABLED: 'true' })).toThrow('REDIS_URL');
    expect(() => parseServerRuntimeConfig({ REDIS_URL: 'https://redis.example' })).toThrow(
      'redis://',
    );
    expect(() => parseServerRuntimeConfig({ REDIS_URL: 'not-a-url' })).toThrow('유효한');
  });

  it('Redis stream 기본 이름을 실행 환경별로 분리한다', () => {
    const config = parseServerRuntimeConfig({ NODE_ENV: 'production' });

    expect(config.redis.streamName).toBe('telepathy:production:socket.io');
    expect(config.redis.presenceKey).toBe('telepathy:production:presence');
    expect(config.redis.matchQueuePrefix).toBe('telepathy:production:matching');
  });

  it('presence heartbeat는 TTL보다 짧아야 한다', () => {
    expect(() =>
      parseServerRuntimeConfig({ PRESENCE_TTL_MS: '60000', PRESENCE_HEARTBEAT_MS: '60000' }),
    ).toThrow('PRESENCE_HEARTBEAT_MS');
    expect(() => parseServerRuntimeConfig({ PRESENCE_TTL_MS: '9999' })).toThrow('PRESENCE_TTL_MS');
  });

  it('Redis 매칭은 Redis 연결을 필수로 한다', () => {
    expect(() => parseServerRuntimeConfig({ REDIS_MATCHING_ENABLED: 'true' })).toThrow(
      'REDIS_ENABLED',
    );
    expect(() => parseServerRuntimeConfig({ MATCH_QUEUE_TTL_MS: '14999' })).toThrow(
      'MATCH_QUEUE_TTL_MS',
    );
  });

  it('잘못된 포트와 경로가 포함된 출처를 거부한다', () => {
    expect(() => parseServerRuntimeConfig({ PORT: '0' })).toThrow('PORT');
    expect(() => parseServerRuntimeConfig({ TRUST_PROXY_HOPS: '-1' })).toThrow();
    expect(() => parseServerRuntimeConfig({ WEB_ORIGINS: 'https://telepathy.my/path' })).toThrow(
      '경로',
    );
  });
});
