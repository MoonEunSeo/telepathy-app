// utils/round.js
function getCurrentRound() {
    const now = Date.now();
    const round = Math.floor(now / 30000);
  
    // 현재 라운드 종료 시각
    const nextBoundary = (round + 1) * 30000;
  
    // 남은 시간(초)
    let remaining = Math.ceil((nextBoundary - now) / 1000);
  
    // 🚩 보정: 30이 찍히면 29로 강제 → 0~2초 멈춤 방지
    if (remaining === 30) remaining = 29;
  
    return { round, remaining };
  }
  
  module.exports = { getCurrentRound };