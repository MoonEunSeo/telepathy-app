import { z } from 'zod';
import { phoneField } from '../../utils/phone';

// DB 의 CHECK 제약과 같은 값이다 (phone_verification_challenges_purpose_check)
const purposeField = z.enum(['SIGNUP', 'ACCOUNT_RECOVERY', 'PHONE_CHANGE'], {
  message: '인증 용도가 올바르지 않습니다.',
});

// phone 필드는 utils/phone.ts 로 옮겼다. signupSchema 와 반드시 같은 값이 저장돼야
// signup_user·reset_password RPC 가 이 테이블에서 인증 기록을 찾을 수 있다.

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
