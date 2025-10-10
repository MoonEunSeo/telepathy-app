function parseDepositMessage(message) {
    // 예: [KB국민은행] 14:32 입금 10,000원 홍길동
    const regex = /입금\s?([\d,]+)원\s?([가-힣A-Za-z]+)/;
    const match = message.match(regex);
  
    if (!match) return null;
  
    return {
      amount: parseInt(match[1].replace(/,/g, ''), 10),
      name: match[2].trim(),
    };
  }
  
  module.exports = { parseDepositMessage };
  