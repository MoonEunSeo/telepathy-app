import { z } from 'zod';

/**
 * 휴대폰 번호를 저장 형식으로 정규화한다 — 숫자만 남기고, +82 는 0 으로.
 *
 *   010-1234-5678  ·  010 1234 5678  ·  +821012345678  →  01012345678
 *
 * 두 곳이 같은 규칙을 써야 하는 이유가 있다.
 *
 * 1. `users.phone` 이 UNIQUE 다. 형식이 갈리면 `010-1234-5678` 과 `01012345678` 이
 *    다른 행이 되어 같은 사람이 두 번 가입할 수 있다. 운영에 실제로 3쌍 있다.
 * 2. `signup_user`·`reset_password` RPC 가 `phone_verification_challenges` 를
 *    phone 으로 조회한다. 인증할 때와 가입할 때 형식이 다르면 인증 기록을 못 찾아
 *    항상 PHONE_NOT_VERIFIED 로 실패한다.
 *
 * 운영 실측(2026-08-04): 1,191건 중 숫자만 1,137 · 공백 41 · 하이픈 12 · 국가번호 1.
 * 이미 95.5% 가 이 형식이라 나머지를 여기에 맞춘다.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // 82 로 시작하는 국내 번호는 없다. 010 은 0 으로 시작하므로 충돌하지 않는다.
  return digits.startsWith('82') ? `0${digits.slice(2)}` : digits;
}

/**
 * 가입·인증 양쪽이 공유하는 휴대폰 번호 필드.
 *
 * transform 을 검사보다 **먼저** 돌린다. 사용자가 어떤 형식으로 넣든 받아들이되
 * 저장되는 값은 항상 숫자만이 되도록 하기 위해서다.
 */
export const phoneField = z
  .string({ message: '휴대폰 번호를 입력해주세요.' })
  .trim()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^01[016-9]\d{7,8}$/, '휴대폰 번호 형식이 올바르지 않습니다.'));
