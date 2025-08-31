// utils/randomNickname.js
const animals = ["고양이", "강아지", "돌고래", "호랑이", "펭귄", "사자", "여우","낙타"];
function getRandomNickname() {
  const randAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randNum = Math.floor(Math.random() * 1000);
  return `닉넴없는 ${randAnimal}${randNum}`;
}
module.exports = getRandomNickname;