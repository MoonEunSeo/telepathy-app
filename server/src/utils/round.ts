export interface RoundInfo {
  round: number;
  remaining: number;
}

export function getCurrentRound(): RoundInfo {
  const now = Date.now();
  const round = Math.floor(now / 15000);
  const remaining = 15 - Math.floor((now % 15000) / 1000);
  return { round, remaining };
}
