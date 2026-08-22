import { z } from 'zod';

import type { RedisRuntime } from '../../infra/redis';

const matchQueueEntrySchema = z.object({
  nickname: z.string(),
  queuedAt: z.number(),
  round: z.number().int(),
  socketId: z.string(),
  userId: z.string(),
  username: z.string(),
  word: z.string(),
});

const matchReservationSchema = z.object({
  current: matchQueueEntrySchema,
  matchId: z.string(),
  partner: matchQueueEntrySchema,
  roomId: z.string(),
  status: z.enum(['RESERVED', 'COMMITTED']),
});

const matchQueueResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('waiting') }),
  z.object({
    isNew: z.boolean(),
    kind: z.literal('reserved'),
    reservation: matchReservationSchema,
  }),
]);

export type MatchQueueEntry = z.infer<typeof matchQueueEntrySchema>;
export type MatchReservation = z.infer<typeof matchReservationSchema>;
export type MatchQueueResult = z.infer<typeof matchQueueResultSchema>;

export interface MatchQueue {
  commit: (reservation: MatchReservation) => Promise<void>;
  expireRound: (round: number) => Promise<void>;
  join: (
    entry: MatchQueueEntry,
    ids: { matchId: string; roomId: string },
  ) => Promise<MatchQueueResult>;
  removeWaiting: (entry: Pick<MatchQueueEntry, 'round' | 'socketId' | 'userId'>) => Promise<void>;
}

interface MemoryRoundState {
  matches: Map<string, MatchReservation>;
  queue: Map<string, MatchQueueEntry>;
  reservations: Map<string, MatchReservation>;
}

export class MemoryMatchQueue implements MatchQueue {
  private readonly rounds = new Map<number, MemoryRoundState>();

  constructor(private readonly ttlMs: number) {}

  async commit(reservation: MatchReservation): Promise<void> {
    const state = this.rounds.get(reservation.current.round);
    const stored = state?.matches.get(reservation.matchId);
    if (!state || !stored) return;

    const committed = { ...stored, status: 'COMMITTED' as const };
    state.matches.set(committed.matchId, committed);
    state.reservations.set(committed.current.userId, committed);
    state.reservations.set(committed.partner.userId, committed);
  }

  async expireRound(round: number): Promise<void> {
    this.rounds.delete(round);
  }

  async join(
    entry: MatchQueueEntry,
    ids: { matchId: string; roomId: string },
  ): Promise<MatchQueueResult> {
    const state = this.getState(entry.round);
    const existing = state.reservations.get(entry.userId);
    if (existing) return { isNew: false, kind: 'reserved', reservation: existing };

    for (const [userId, queued] of state.queue) {
      if (queued.queuedAt + this.ttlMs <= entry.queuedAt) state.queue.delete(userId);
    }

    state.queue.delete(entry.userId);
    const partner = [...state.queue.values()].find((candidate) => candidate.word === entry.word);
    if (!partner) {
      state.queue.set(entry.userId, entry);
      return { kind: 'waiting' };
    }

    state.queue.delete(partner.userId);
    const reservation: MatchReservation = {
      current: entry,
      matchId: ids.matchId,
      partner,
      roomId: ids.roomId,
      status: 'RESERVED',
    };
    state.matches.set(reservation.matchId, reservation);
    state.reservations.set(entry.userId, reservation);
    state.reservations.set(partner.userId, reservation);
    return { isNew: true, kind: 'reserved', reservation };
  }

  async removeWaiting(
    entry: Pick<MatchQueueEntry, 'round' | 'socketId' | 'userId'>,
  ): Promise<void> {
    const state = this.rounds.get(entry.round);
    const queued = state?.queue.get(entry.userId);
    if (queued?.socketId === entry.socketId) state?.queue.delete(entry.userId);
  }

  private getState(round: number): MemoryRoundState {
    const existing = this.rounds.get(round);
    if (existing) return existing;

    const state: MemoryRoundState = {
      matches: new Map(),
      queue: new Map(),
      reservations: new Map(),
    };
    this.rounds.set(round, state);
    return state;
  }
}

const JOIN_SCRIPT = `
local existing = redis.call('HGET', KEYS[3], ARGV[2])
if existing then
  return cjson.encode({ kind = 'reserved', isNew = false, reservation = cjson.decode(existing) })
end

local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[5])
for _, userId in ipairs(expired) do
  redis.call('HDEL', KEYS[2], userId)
end
if #expired > 0 then
  redis.call('ZREM', KEYS[1], unpack(expired))
end

redis.call('ZREM', KEYS[1], ARGV[2])
redis.call('HDEL', KEYS[2], ARGV[2])

local candidates = redis.call('ZRANGE', KEYS[1], 0, -1)
for _, candidateId in ipairs(candidates) do
  local raw = redis.call('HGET', KEYS[2], candidateId)
  if not raw then
    redis.call('ZREM', KEYS[1], candidateId)
  else
    local candidate = cjson.decode(raw)
    if candidate.word == ARGV[3] then
      redis.call('ZREM', KEYS[1], candidateId)
      redis.call('HDEL', KEYS[2], candidateId)
      local reservation = {
        current = cjson.decode(ARGV[1]),
        matchId = ARGV[7],
        partner = candidate,
        roomId = ARGV[8],
        status = 'RESERVED'
      }
      local encoded = cjson.encode(reservation)
      redis.call('HSET', KEYS[3], ARGV[2], encoded, candidateId, encoded)
      redis.call('HSET', KEYS[4], ARGV[7], encoded)
      for _, key in ipairs(KEYS) do redis.call('PEXPIRE', key, ARGV[6]) end
      return cjson.encode({ kind = 'reserved', isNew = true, reservation = reservation })
    end
  end
end

redis.call('ZADD', KEYS[1], ARGV[4], ARGV[2])
redis.call('HSET', KEYS[2], ARGV[2], ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[6])
redis.call('PEXPIRE', KEYS[2], ARGV[6])
redis.call('PEXPIRE', KEYS[3], ARGV[6])
redis.call('PEXPIRE', KEYS[4], ARGV[6])
return cjson.encode({ kind = 'waiting' })
`;

const COMMIT_SCRIPT = `
local raw = redis.call('HGET', KEYS[2], ARGV[1])
if not raw then return 0 end
local reservation = cjson.decode(raw)
reservation.status = 'COMMITTED'
local encoded = cjson.encode(reservation)
redis.call('HSET', KEYS[1], reservation.current.userId, encoded, reservation.partner.userId, encoded)
redis.call('HSET', KEYS[2], ARGV[1], encoded)
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[2])
return 1
`;

const REMOVE_WAITING_SCRIPT = `
local raw = redis.call('HGET', KEYS[2], ARGV[1])
if not raw then return 0 end
local entry = cjson.decode(raw)
if entry.socketId ~= ARGV[2] then return 0 end
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[1])
return 1
`;

interface MatchQueueKeys {
  entries: string;
  matches: string;
  queue: string;
  reservations: string;
}

export class RedisMatchQueue implements MatchQueue {
  constructor(
    private readonly redis: RedisRuntime,
    private readonly prefix: string,
    private readonly ttlMs: number,
  ) {}

  async commit(reservation: MatchReservation): Promise<void> {
    const keys = this.getKeys(reservation.current.round);
    await this.redis.client.eval(COMMIT_SCRIPT, {
      arguments: [reservation.matchId, String(this.ttlMs)],
      keys: [keys.reservations, keys.matches],
    });
  }

  async expireRound(round: number): Promise<void> {
    const keys = this.getKeys(round);
    await this.redis.client.del([keys.queue, keys.entries, keys.reservations, keys.matches]);
  }

  async join(
    entry: MatchQueueEntry,
    ids: { matchId: string; roomId: string },
  ): Promise<MatchQueueResult> {
    const keys = this.getKeys(entry.round);
    const raw = await this.redis.client.eval(JOIN_SCRIPT, {
      arguments: [
        JSON.stringify(entry),
        entry.userId,
        entry.word,
        String(entry.queuedAt),
        String(entry.queuedAt - this.ttlMs),
        String(this.ttlMs),
        ids.matchId,
        ids.roomId,
      ],
      keys: [keys.queue, keys.entries, keys.reservations, keys.matches],
    });

    if (typeof raw !== 'string') throw new Error('Redis 매칭 응답 형식이 올바르지 않습니다.');
    const parsed: unknown = JSON.parse(raw);
    return matchQueueResultSchema.parse(parsed);
  }

  async removeWaiting(
    entry: Pick<MatchQueueEntry, 'round' | 'socketId' | 'userId'>,
  ): Promise<void> {
    const keys = this.getKeys(entry.round);
    await this.redis.client.eval(REMOVE_WAITING_SCRIPT, {
      arguments: [entry.userId, entry.socketId],
      keys: [keys.queue, keys.entries],
    });
  }

  private getKeys(round: number): MatchQueueKeys {
    const roundPrefix = `${this.prefix}:{${round}}`;
    return {
      entries: `${roundPrefix}:entries`,
      matches: `${roundPrefix}:matches`,
      queue: `${roundPrefix}:queue`,
      reservations: `${roundPrefix}:reservations`,
    };
  }
}
