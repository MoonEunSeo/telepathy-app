import { describe, expect, it, vi } from 'vitest';

import type { MatchReservation } from '../src/modules/matching/match-queue';
import {
  getMatchFingerprint,
  reconcileMatchReservation,
  type MatchPersistence,
  type MatchReconciliationStore,
} from '../src/modules/matching/match-reconciliation';

const reservation: MatchReservation = {
  current: {
    nickname: '사용자A',
    queuedAt: 1,
    round: 10,
    socketId: 'socket-a',
    userId: 'actor-a',
    username: 'user-a',
    word: '영화',
  },
  matchId: 'match-1',
  partner: {
    nickname: '사용자B',
    queuedAt: 2,
    round: 10,
    socketId: 'socket-b',
    userId: 'actor-b',
    username: 'user-b',
    word: '영화',
  },
  roomId: 'room-1',
  status: 'RESERVED',
};

function createStore() {
  return {
    finalize: vi.fn<MatchReconciliationStore['finalize']>().mockResolvedValue(undefined),
    quarantine: vi.fn<MatchReconciliationStore['quarantine']>().mockResolvedValue(undefined),
  };
}

describe('RESERVED 매칭 재조정', () => {
  it('DB에 이미 확정된 같은 fingerprint를 Redis COMMITTED로 복구한다', async () => {
    const fingerprint = getMatchFingerprint(reservation);
    const persistence: MatchPersistence = {
      commit: vi.fn(),
      find: vi.fn().mockResolvedValue({
        kind: 'committed',
        match: { fingerprint, matchId: reservation.matchId },
      }),
    };
    const store = createStore();

    await expect(reconcileMatchReservation(reservation, persistence, store)).resolves.toEqual({
      kind: 'committed',
      source: 'existing',
    });
    expect(persistence.commit).not.toHaveBeenCalled();
    expect(store.finalize).toHaveBeenCalledOnce();
  });

  it('DB에 없으면 같은 match_id로 멱등 commit 후 확정한다', async () => {
    const fingerprint = getMatchFingerprint(reservation);
    const persistence: MatchPersistence = {
      commit: vi.fn().mockResolvedValue({
        kind: 'committed',
        match: { fingerprint, matchId: reservation.matchId },
      }),
      find: vi.fn().mockResolvedValue({ kind: 'not_found' }),
    };
    const store = createStore();

    await expect(reconcileMatchReservation(reservation, persistence, store)).resolves.toEqual({
      kind: 'committed',
      source: 'new',
    });
    expect(persistence.commit).toHaveBeenCalledWith(reservation, fingerprint);
    expect(store.finalize).toHaveBeenCalledOnce();
  });

  it('DB timeout에서는 예약을 해제하거나 격리하지 않는다', async () => {
    const persistence: MatchPersistence = {
      commit: vi.fn(),
      find: vi.fn().mockResolvedValue({ kind: 'retryable_error' }),
    };
    const store = createStore();

    await expect(reconcileMatchReservation(reservation, persistence, store)).resolves.toEqual({
      kind: 'retained',
    });
    expect(store.finalize).not.toHaveBeenCalled();
    expect(store.quarantine).not.toHaveBeenCalled();
  });

  it('같은 match_id의 다른 fingerprint를 격리한다', async () => {
    const persistence: MatchPersistence = {
      commit: vi.fn(),
      find: vi.fn().mockResolvedValue({
        kind: 'committed',
        match: { fingerprint: 'different', matchId: reservation.matchId },
      }),
    };
    const store = createStore();

    await expect(reconcileMatchReservation(reservation, persistence, store)).resolves.toEqual({
      kind: 'quarantined',
      reason: 'MATCH_ID_FINGERPRINT_CONFLICT',
    });
    expect(store.quarantine).toHaveBeenCalledOnce();
    expect(store.finalize).not.toHaveBeenCalled();
  });
});
