import { z } from 'zod';
import { phoneField } from '../../utils/phone';

export const loginSchema = z.object({
  username: z.string({ message: '아이디를 입력해주세요.' }).trim().min(1, '아이디를 입력해주세요.'),
  password: z
    .string({ message: '비밀번호를 입력해주세요.' })
    .min(1, '비밀번호가 너무 짧습니다.')
    .max(72, '비밀번호가 너무 깁니다.'),
});

// 스키마에서 타입을 뽑는다 -> 타입과 검사 규칙이 어긋날 수 없다.
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  username: z
    .string({ message: '아이디를 입력해주세요.' })
    .trim()
    .min(4, '아이디는 4글자 이상입니다.')
    .max(20, '아이디는 20자 이하입니다.'),
  password: z
    .string({ message: '비밀번호를 입력해주세요.' })
    .min(8, '비밀번호는 8자 이상입니다.')
    .max(72, '비밀번호가 너무 깁니다.'),
  // 저장 형식은 숫자만이다. utils/phone.ts 참조 — 인증 경로와 같은 규칙을 써야 한다.
  phone: phoneField,
  // DB의 CHECK 제약과 같은 값이다 (users_gender_check)
  gender: z.enum(['남성', '여성']).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일은 YYYY-MM-DD 형식입니다.')
    .optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

// 새 비밀번호에만 규칙을 건다.
// currentPassword는 규칙이 강해지기 전에 만들어졌을 수 있어 길이만 본다.
// 여기서 8자를 요구하면 예전 회원이 비밀번호를 바꾸지 못한다.
const newPasswordField = z
  .string({ message: '새 비밀번호를 입력해주세요.' })
  .min(8, '비밀번호는 8자 이상입니다.')
  .max(72, '비밀번호가 너무 깁니다.');

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: '현재 비밀번호를 입력해주세요.' })
    .min(1, '현재 비밀번호를 입력해주세요.')
    .max(72, '비밀번호가 너무 깁니다.'),
  newPassword: newPasswordField,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z.object({
  username: z
    .string({ message: '아이디를 입력해주세요.' })
    .trim()
    .min(1, '아이디를 입력해주세요.')
    .max(20, '아이디는 20자 이하입니다.'),
  newPassword: newPasswordField,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
