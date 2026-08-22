import { createClient } from 'redis';

import type { RedisRuntimeConfig } from '../config/runtime';

type RedisClient = ReturnType<typeof createClient>;

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

export class RedisRuntime {
  readonly client: RedisClient;

  private closing = false;
  private hasConnected = false;

  constructor(readonly config: RedisRuntimeConfig) {
    if (!config.enabled || config.url === null) {
      throw new Error('활성화된 Redis 설정이 필요합니다.');
    }

    this.client = createClient({
      url: config.url,
      socket: {
        connectTimeout: config.connectTimeoutMs,
        reconnectStrategy: (retries) => {
          if (!this.hasConnected && retries >= 2) return false;
          return Math.min(100 * 2 ** retries, 3_000);
        },
      },
    });

    this.client.on('ready', () => {
      this.hasConnected = true;
      console.log('[Redis] 연결 준비 완료');
    });
    this.client.on('reconnecting', () => {
      console.warn('[Redis] 연결 복구 시도 중');
    });
    this.client.on('error', (error) => {
      console.error(`[Redis] 연결 오류 (${getErrorCode(error)})`);
    });
  }

  get isReady(): boolean {
    return this.client.isReady;
  }

  async connect(): Promise<void> {
    if (this.client.isOpen) return;
    await this.client.connect();
  }

  async close(): Promise<void> {
    if (this.closing || !this.client.isOpen) return;
    this.closing = true;

    try {
      await this.client.close();
    } finally {
      this.closing = false;
    }
  }

  destroy(): void {
    if (this.client.isOpen) this.client.destroy();
  }
}
