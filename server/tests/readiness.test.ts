import { describe, expect, it } from 'vitest';
import { getReadiness } from '../src/bootstrap/readiness';

describe('서버 readiness', () => {
  it('Redis 비활성 모드는 준비 상태로 처리한다', () => {
    expect(getReadiness(false, null)).toEqual({ ready: true, redis: 'disabled' });
  });

  it('Redis 연결 상태를 readiness에 반영한다', () => {
    expect(getReadiness(false, { isReady: true })).toEqual({ ready: true, redis: 'ready' });
    expect(getReadiness(false, { isReady: false })).toEqual({
      ready: false,
      redis: 'unavailable',
    });
  });

  it('종료 시작 후에는 Redis 상태와 무관하게 준비되지 않은 상태다', () => {
    expect(getReadiness(true, { isReady: true })).toEqual({ ready: false, redis: 'ready' });
  });
});
