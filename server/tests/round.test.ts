import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCurrentRound } from '../src/utils/round';

describe('getCurrentRound', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('15초 단위 라운드와 남은 시간을 계산한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(35_000);

    expect(getCurrentRound()).toEqual({ round: 2, remaining: 10 });
  });

  it('라운드 시작 시 남은 시간은 15초다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(45_000);

    expect(getCurrentRound()).toEqual({ round: 3, remaining: 15 });
  });
});
