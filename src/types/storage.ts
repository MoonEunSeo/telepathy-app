// localStorage 타입 스키마 + 타입 안전 헬퍼
// 원본 setItem/getItem 호출부를 읽고 각 키가 JSON 객체인지 평문 문자열인지 구분했다.
//  · JSON 객체 저장: chatInfo, feedbackInfo
//  · 평문 문자열 저장: 그 외 전부 (nickname/username/... 및 'true' 플래그)

import type { ChatInfo, FeedbackInfo } from '@shared/domain';

// 키 → 저장(파싱 후) 값 타입
export interface LocalStorageSchema {
  chatInfo: ChatInfo; // JSON.stringify(chatInfo)
  feedbackInfo: FeedbackInfo; // JSON.stringify(chatInfo 복사본)
  nickname: string; // NicknameModal
  username: string; // Register (본인인증 이관용)
  password: string; // Register (본인인증 이관용)
  signup_username: string; // Register(legacy)
  signup_password: string; // Register(legacy)
  signup_idvId: string; // Register(legacy)
  needNicknameSetup: string; // 'true' 플래그
  seenMegaphoneIntro: string; // 'true' 플래그 (MainPage)
  megaphoneIntroShown: string; // 'true' 플래그 (MegaphoneButton)
  guestId: string; // 게스트 신원 id
  guestNickname: string; // 게스트 닉네임
  wordFavorites: string[]; // 즐겨찾기한 카드 key 목록
  wordMemos: Record<string, string>; // 카드 key -> 메모 텍스트
}

// JSON 으로 직렬화/역직렬화해야 하는 키 집합. 나머지는 평문 문자열.
const JSON_KEYS: ReadonlySet<keyof LocalStorageSchema> = new Set<keyof LocalStorageSchema>([
  'chatInfo',
  'feedbackInfo',
  'wordFavorites',
  'wordMemos',
]);

// 값 읽기: 없으면 null. JSON 키는 parse, 실패 시 null.
export function getStorage<K extends keyof LocalStorageSchema>(
  key: K,
): LocalStorageSchema[K] | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;

  if (JSON_KEYS.has(key)) {
    try {
      return JSON.parse(raw) as LocalStorageSchema[K];
    } catch {
      return null;
    }
  }
  // 평문 문자열 키: string → 제네릭 인덱스 타입은 unknown 경유로 단언
  return raw as unknown as LocalStorageSchema[K];
}

// 값 쓰기: JSON 키는 stringify, 그 외는 문자열 그대로 저장.
export function setStorage<K extends keyof LocalStorageSchema>(
  key: K,
  value: LocalStorageSchema[K],
): void {
  if (JSON_KEYS.has(key)) {
    localStorage.setItem(key, JSON.stringify(value));
  } else {
    // 평문 문자열 키: 제네릭 인덱스 타입 → string 은 unknown 경유로 단언
    localStorage.setItem(key, value as unknown as string);
  }
}

// 값 삭제
export function removeStorage(key: keyof LocalStorageSchema): void {
  localStorage.removeItem(key);
}
