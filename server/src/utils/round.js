// 📦 /src/utils/round.js

// ✅ 30초 단위 UTC 라운드 계산
function getCurrentRound() {
    const now = Date.now();
    const round = Math.floor(now / 30000); // UTC 기반 라운드
    const nextBoundary = Math.ceil(now / 30000) * 30000;
    const remaining = Math.floor((nextBoundary - now) / 1000);
  
    return { round, remaining };
  }
  
  module.exports = { getCurrentRound };