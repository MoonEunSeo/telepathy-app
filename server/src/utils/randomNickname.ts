// utils/randomNickname.ts
const animals = ['고양이', '강아지', '돌고래', '호랑이', '펭귄', '사자', '여우', '낙타'];

function getRandomNickname(): string {
  const randAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randNum = Math.floor(Math.random() * 1000);
  return `닉넴없는 ${randAnimal}${randNum}`;
}

// ⚠️ 아직 .js 인 소비자가 `const x = require(...)` 로 부르므로 CJS 호환 위해 export =
export = getRandomNickname;
