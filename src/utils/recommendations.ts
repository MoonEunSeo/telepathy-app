interface Recommendation {
  topic: string;
  words: string[];
  paid: 0 | 1;
}

export const recommendations: Recommendation[] = [
  { topic: '감정', words: ['화남', '슬픔', '기쁨', '잔잔'], paid: 0 },
  { topic: '날씨', words: ['흐림', '맑음', '번개', '비'], paid: 0 },
  { topic: '과일', words: ['복숭아', '포도', '사과', '귤'], paid: 0 },
  // TODO: 원본 recommendations.js의 나머지 항목들은 마지막 '데이터 이관' 단계에서 그대로 복사
];
