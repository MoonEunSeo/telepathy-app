// src/utils/badwords.js
const bannedWords = [
    // 🔹 금융/거래/스팸
    "계좌", "입금", "송금", "출금", "대출", "토토", "카지노", "배팅", "알바", "고수익", "고수위", "불법",
  
    // 🔹 혐오/비하
    "한남", "꼴페미", "병신", "시발", "좆", "씨발", "개새끼", "fuck", "shit", "지랄", "염병", "섹1스", "섹@스","섹2스",
  
    // 🔹 음란/불건전
    "섹스", "sex", "porn", "자위", "에로", "야동", "AV", "신음", "후배위", "정상위", "체위", "정액", "꼬추", "거시기", "성기", "보지", "자지", "씹질",
  
    // 🔹 정치/종교 과도 홍보 (필요시 확장)
    "문재인", "윤석열", "박근혜", "노무현", "이기야", "일베", "펨코", "민주당", "국민의힘", "교회", "예수", "하느님", "하나님", "신천지", "박정희", "이재명", "김정은", "수령동지"
  ];
  
const bannedPatterns = [
    // 🔹 개인정보
    /\d{3}-\d{4}-\d{4}/,      // 전화번호 (010-1234-5678)
    /\d{11}/,                 // 연속된 숫자 11자리 (주민번호/전화번호)
    /\d{2,4}-\d{2,4}-\d{2,4}/, // 계좌번호 패턴
    /\S+@\S+\.\S+/,           // 이메일
  
    // 🔹 외부 홍보/링크
    /(http|https):\/\/\S+/,   // URL
    /www\.\S+/,               // www.로 시작하는 주소
    /@[a-zA-Z0-9_]+/,         // SNS 아이디 (인스타/트위터 등)
  
    // 🔹 보안위험/도배
    /<script.*?>.*?<\/script>/i, // XSS 스크립트 태그
    /select\s+\*\s+from/i,       // SQL injection
    /drop\s+table/i,             // SQL injection
    /(.)\1{15,}/,                 // 같은 문자 16회 이상 반복 (!!!!!!!, ㅋㅋㅋㅋㅋㅋ)
    /\p{C}+/u,                   // 제어문자 (zero-width space 등)
  ];
  
  function filterMessage(message) {
    let filtered = message;
    for (const word of bannedWords) {
      const regex = new RegExp(word, "gi");
      filtered = filtered.replace(regex, "***");
    }
    for (const pattern of bannedPatterns) {
      if (pattern.test(filtered)) {
        filtered = filtered.replace(pattern, "***");
      }
    }
    return filtered;
  }
  
  module.exports = {
    bannedWords,
    bannedPatterns,
    filterMessage,
  };