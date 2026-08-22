import { describe, expect, it } from 'vitest';
import { MemoryPresenceStore } from '../src/infra/presence';

describe('메모리 presence store', () => {
  it('같은 사용자의 여러 소켓을 하나의 접속자로 집계한다', async () => {
    const store = new MemoryPresenceStore();

    await store.touch(['user-1', 'user-1', 'user-2'], 61_000);

    await expect(store.count(1_000)).resolves.toBe(2);
  });

  it('heartbeat가 만료 시각을 연장하고 TTL 이후 회원을 제거한다', async () => {
    const store = new MemoryPresenceStore();
    await store.touch(['user-1'], 60_000);
    await store.touch(['user-1'], 90_000);

    await expect(store.count(60_000)).resolves.toBe(1);
    await expect(store.count(90_000)).resolves.toBe(0);
  });

  it('서로 다른 사용자의 만료를 독립적으로 처리한다', async () => {
    const store = new MemoryPresenceStore();
    await store.touch(['user-1'], 30_000);
    await store.touch(['user-2'], 60_000);

    await expect(store.count(30_000)).resolves.toBe(1);
    await expect(store.count(60_000)).resolves.toBe(0);
  });
});
