import type { MatchReservation } from './match-queue';

export interface PersistedMatch {
  fingerprint: string;
  matchId: string;
}

export type MatchLookupResult =
  | { kind: 'committed'; match: PersistedMatch }
  | { kind: 'not_found' }
  | { kind: 'retryable_error' };

export type MatchCommitResult =
  | { kind: 'committed'; match: PersistedMatch }
  | { kind: 'permanent_conflict'; reason: string }
  | { kind: 'retryable_error' };

/**
 * 레거시/V2 테이블 구조를 Redis 재조정 코어에 노출하지 않는 영속성 경계.
 */
export interface MatchPersistence {
  commit: (reservation: MatchReservation, fingerprint: string) => Promise<MatchCommitResult>;
  find: (matchId: string) => Promise<MatchLookupResult>;
}

/** Redis의 상태 전이는 lease/fencing을 검증한 adapter가 수행한다. */
export interface MatchReconciliationStore {
  finalize: (reservation: MatchReservation) => Promise<void>;
  quarantine: (reservation: MatchReservation, reason: string) => Promise<void>;
}

export type MatchReconciliationResult =
  | { kind: 'committed'; source: 'existing' | 'new' }
  | { kind: 'quarantined'; reason: string }
  | { kind: 'retained' };

export function getMatchFingerprint(reservation: MatchReservation): string {
  const actorIds = [reservation.current.userId, reservation.partner.userId].sort();

  return JSON.stringify({
    actorIds,
    matchId: reservation.matchId,
    round: reservation.current.round,
    word: reservation.current.word.trim().normalize('NFC'),
  });
}

/**
 * RESERVED 재조정의 순수 오케스트레이션.
 *
 * DB timeout은 성공 후 응답만 유실된 경우일 수 있으므로 예약을 유지한다.
 * 영구 충돌이나 같은 match_id의 다른 fingerprint만 수동 확인 대상으로 격리한다.
 */
export async function reconcileMatchReservation(
  reservation: MatchReservation,
  persistence: MatchPersistence,
  store: MatchReconciliationStore,
): Promise<MatchReconciliationResult> {
  const fingerprint = getMatchFingerprint(reservation);
  const existing = await persistence.find(reservation.matchId);

  if (existing.kind === 'retryable_error') return { kind: 'retained' };

  if (existing.kind === 'committed') {
    if (existing.match.fingerprint !== fingerprint) {
      const reason = 'MATCH_ID_FINGERPRINT_CONFLICT';
      await store.quarantine(reservation, reason);
      return { kind: 'quarantined', reason };
    }

    await store.finalize(reservation);
    return { kind: 'committed', source: 'existing' };
  }

  const committed = await persistence.commit(reservation, fingerprint);
  if (committed.kind === 'retryable_error') return { kind: 'retained' };

  if (committed.kind === 'permanent_conflict') {
    await store.quarantine(reservation, committed.reason);
    return { kind: 'quarantined', reason: committed.reason };
  }

  if (committed.match.fingerprint !== fingerprint) {
    const reason = 'COMMIT_FINGERPRINT_CONFLICT';
    await store.quarantine(reservation, reason);
    return { kind: 'quarantined', reason };
  }

  await store.finalize(reservation);
  return { kind: 'committed', source: 'new' };
}
