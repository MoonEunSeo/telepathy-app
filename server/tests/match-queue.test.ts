import { describe, expect, it } from 'vitest';
import { MemoryMatchQueue, type MatchQueueEntry } from '../src/modules/matching/match-queue';

function entry(
  userId: string,
  word: string,
  queuedAt: number,
  socketId = `socket-${userId}`,
): MatchQueueEntry {
  return {
    nickname: `nickname-${userId}`,
    queuedAt,
    round: 10,
    socketId,
    userId,
    username: `username-${userId}`,
    word,
  };
}

describe('원자적 매칭 대기열', () => {
  it('A-B만 매칭하고 동시에 들어온 C는 대기시킨다', async () => {
    const queue = new MemoryMatchQueue(45_000);
    await expect(
      queue.join(entry('A', '영화', 1), { matchId: 'm1', roomId: 'r1' }),
    ).resolves.toEqual({
      kind: 'waiting',
    });

    const [b, c] = await Promise.all([
      queue.join(entry('B', '영화', 2), { matchId: 'm2', roomId: 'r2' }),
      queue.join(entry('C', '영화', 3), { matchId: 'm3', roomId: 'r3' }),
    ]);

    expect([b.kind, c.kind].sort()).toEqual(['reserved', 'waiting']);
    const reserved = b.kind === 'reserved' ? b : c;
    if (reserved.kind !== 'reserved') throw new Error('매칭 결과가 필요합니다.');
    expect(
      new Set([reserved.reservation.current.userId, reserved.reservation.partner.userId]),
    ).toEqual(new Set(['A', b.kind === 'reserved' ? 'B' : 'C']));
  });

  it('이미 선점된 사용자의 재요청에 기존 결과를 반환한다', async () => {
    const queue = new MemoryMatchQueue(45_000);
    await queue.join(entry('A', '음악', 1), { matchId: 'm1', roomId: 'r1' });
    const matched = await queue.join(entry('B', '음악', 2), {
      matchId: 'm2',
      roomId: 'r2',
    });
    if (matched.kind !== 'reserved') throw new Error('매칭 결과가 필요합니다.');
    await queue.commit(matched.reservation);

    const replay = await queue.join(entry('A', '음악', 3), {
      matchId: 'm3',
      roomId: 'r3',
    });

    expect(replay).toMatchObject({
      isNew: false,
      kind: 'reserved',
      reservation: { matchId: 'm2', roomId: 'r2', status: 'COMMITTED' },
    });
  });

  it('재선택은 기존 단어 후보를 교체한다', async () => {
    const queue = new MemoryMatchQueue(45_000);
    await queue.join(entry('A', '영화', 1), { matchId: 'm1', roomId: 'r1' });
    await queue.join(entry('A', '음악', 2), { matchId: 'm2', roomId: 'r2' });

    await expect(
      queue.join(entry('B', '영화', 3), { matchId: 'm3', roomId: 'r3' }),
    ).resolves.toEqual({ kind: 'waiting' });
    await expect(
      queue.join(entry('C', '음악', 4), { matchId: 'm4', roomId: 'r4' }),
    ).resolves.toMatchObject({ kind: 'reserved', reservation: { partner: { userId: 'A' } } });
  });

  it('이전 socket의 늦은 disconnect가 새 socket 후보를 지우지 않는다', async () => {
    const queue = new MemoryMatchQueue(45_000);
    await queue.join(entry('A', '영화', 1, 'old'), { matchId: 'm1', roomId: 'r1' });
    await queue.join(entry('A', '영화', 2, 'new'), { matchId: 'm2', roomId: 'r2' });
    await queue.removeWaiting({ round: 10, socketId: 'old', userId: 'A' });

    await expect(
      queue.join(entry('B', '영화', 3), { matchId: 'm3', roomId: 'r3' }),
    ).resolves.toMatchObject({ kind: 'reserved', reservation: { partner: { socketId: 'new' } } });
  });

  it('TTL이 만료한 후보는 매칭하지 않는다', async () => {
    const queue = new MemoryMatchQueue(45_000);
    await queue.join(entry('A', '영화', 1), { matchId: 'm1', roomId: 'r1' });

    await expect(
      queue.join(entry('B', '영화', 45_001), { matchId: 'm2', roomId: 'r2' }),
    ).resolves.toEqual({ kind: 'waiting' });
  });
});
