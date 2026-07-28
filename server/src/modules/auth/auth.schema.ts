import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string({ message: '아이디를 입력해주세요.' }).trim().min(1, '아이디를 입력해주세요.'),
});
