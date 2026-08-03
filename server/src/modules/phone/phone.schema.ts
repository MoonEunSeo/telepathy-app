import { z } from 'zod';

// DB 의 CHECK 제약과 같은 값이다 (phone_verification_challenges_purpose_check)
const purposeField = z.enum(['SIGNUP', 'ACCOUNT_RECOVERY', 'PHONE_CHANGE'], {
  message: '인증 용도가 올바르지 않습니다.',
});

// signupSchema 의 phone 과 같은 규칙이다.
const phoneField = z
  .string({ message: '휴대폰 번호를 입력해주세요.' })
  .trim()
  .regex(/^01[016-9]-?\d{3,4}-?\d{4}$/, '휴대폰 번호 형식이 올바르지 않습니다.');

export const sendCodeSchema = z.object({
  phone: phoneField,
  purpose: purposeField,
});

export type SendCodeInput = z.infer<typeof sendCodeSchema>;

export const verifyCodeSchema = z.object({
  phone: phoneField,
  purpose: purposeField,
  // 6자리 숫자만 받는다. 형식이 틀린 값에 bcrypt 비용을 쓰지 않는다.
  code: z
    .string({ message: '인증번호를 입력해주세요.' })
    .regex(/^\d{6}$/, '인증번호는 숫자 6자리입니다.'),
});

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
