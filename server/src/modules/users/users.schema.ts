import { z } from 'zod';

/**
 * 닉네임 변경 입력
 *
 * 레거시(nickname.routes.ts)는 `!nickname || nickname.length > 20` 만 봤다.
 * 1자 닉네임과 공백 조합이 통과했는데, 둘 다 눈으로 구분되지 않는 이름을
 * 만들기 쉬워 사칭에 쓰인다.
 */
export const setNicknameSchema = z.object({
  nickname: z
    .string({ message: '닉네임을 입력해주세요.' })
    .trim()
    .min(2, '닉네임은 2글자 이상입니다.')
    .max(20, '닉네임은 20자 이하입니다.')
    // 공백이 섞이면 "고 양이" 와 "고양이" 처럼 비슷해 보이는 이름을 만들 수 있다.
    .regex(/^\S+$/, '닉네임에 공백을 쓸 수 없습니다.'),
});

export type SetNicknameInput = z.infer<typeof setNicknameSchema>;
