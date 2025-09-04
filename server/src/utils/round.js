function getCurrentRound() {
  const now = Date.now();
  const round = Math.floor(now / 30000);
  const remaining = 30 - Math.floor((now % 30000) / 1000);
  return { round, remaining };
}
  
  module.exports = { getCurrentRound };