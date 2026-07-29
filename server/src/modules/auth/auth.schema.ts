import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string({ message: '아이디를 입력해주세요.' }).trim().min(1, '아이디를 입력해주세요.'),
  password: z
    .string({ message: '비밀번호를 입력해주세요.' })
    .min(1, '비밀번호가 너무 짧습니다.')
    .max(72, '비밀번호가 너무 깁니다.'),
});

// 스키마에서 타입을 뽑는다 -> 타입과 검사 규칙이 어긋날 수 없다.
export type LoginInput = z.infer<typeof loginSchema>;
