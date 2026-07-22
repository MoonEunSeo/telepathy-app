// src/utils/validatePassword.ts
// RHF validate 규약: 통과하면 true, 실패하면 에러 메시지 문자열
export function validatePassword(value: string): true | string {
  if (value.length < 8) return '비밀번호는 8자 이상이어야 합니다.';

  const combo = [/[a-zA-Z]/, /[0-9]/, /[!@#$%^&*(),.?":{}|<>]/].filter((re) =>
    re.test(value),
  ).length;

  return combo >= 2 || '영문/숫자/특수문자 중 2가지 이상을 포함해야 합니다.';
}
