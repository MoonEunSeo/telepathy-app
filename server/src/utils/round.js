function getCurrentRound() {
  const now = Date.now();
  const round = Math.floor(now / 15000);
  const remaining = 15 - Math.floor((now % 15000) / 1000);
  return { round, remaining };
}
  
  module.exports = { getCurrentRound };