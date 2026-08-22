import type { RedisRuntime } from './redis';

export interface PresenceStore {
  count: (now: number) => Promise<number>;
  touch: (userIds: readonly string[], expiresAt: number) => Promise<void>;
}

export class MemoryPresenceStore implements PresenceStore {
  private readonly expirations = new Map<string, number>();

  async count(now: number): Promise<number> {
    for (const [userId, expiresAt] of this.expirations) {
      if (expiresAt <= now) this.expirations.delete(userId);
    }
    return this.expirations.size;
  }

  async touch(userIds: readonly string[], expiresAt: number): Promise<void> {
    for (const userId of userIds) this.expirations.set(userId, expiresAt);
  }
}

export class RedisPresenceStore implements PresenceStore {
  constructor(
    private readonly redis: RedisRuntime,
    private readonly key: string,
  ) {}

  async count(now: number): Promise<number> {
    await this.redis.client.zRemRangeByScore(this.key, 0, now);
    return this.redis.client.zCard(this.key);
  }

  async touch(userIds: readonly string[], expiresAt: number): Promise<void> {
    if (userIds.length === 0) return;
    await this.redis.client.zAdd(
      this.key,
      userIds.map((userId) => ({ score: expiresAt, value: userId })),
    );
  }
}

export function createPresenceStore(redis: RedisRuntime | null, key: string): PresenceStore {
  return redis === null ? new MemoryPresenceStore() : new RedisPresenceStore(redis, key);
}
