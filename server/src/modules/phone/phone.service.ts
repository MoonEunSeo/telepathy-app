import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { AppError } from '../../errors/AppError';
import { smsSender } from '../../infra/sms';
import * as phoneRepository from './phone.repository';
import type { SendCodeInput, VerifyCodeInput } from './phone.schema';

const CODE_TTL_MINUTES = 3;
const BCRYPT_ROUNDS = 10;
const MAX_VERIFY_ATTEMPTS = 5;

// 번호 기준. 로그인 잠금과 값은 같지만 상수를 공유하지 않는다 —
// 저쪽은 계정 탈취 방어, 이쪽은 SMS 요금 방어다.
// 묶어 두면 로그인 정책을 손볼 때 요금 노출이 조용히 따라 움직인다.
const SEND_WINDOW_MINUTES = 5;
const MAX_SEND_PER_WINDOW = 5;
const MAX_SEND_PER_DAY = 20;

// IP 기준. 모바일 캐리어 NAT·회사망은 수천 명이 한 IP 를 쓰므로 번호보다 느슨해야 한다.
// 자동화된 남용에만 닿게 하는 값이고, 정상 사용자 오탐이 보이면 올린다.
const MAX_SEND_PER_IP_WINDOW = 20;
const MAX_SEND_PER_IP_DAY = 100;

const DAY_MINUTES = 60 * 24;

const TOO_MANY = '인증번호를 너무 많이 요청했습니다. 잠시 후 다시 시도해주세요.';
const TOO_MANY_TODAY = '오늘 요청 한도를 초과했습니다. 고객센터로 문의해주세요.';
// 인증이 없는 것과 코드가 틀린 것을 구분해 알리지 않는다.
const MISMATCH = '인증번호가 올바르지 않거나 만료되었습니다.';

export async function sendCode({ phone, purpose }: SendCodeInput, ipHash: string): Promise<void> {
  const [byPhone, byPhoneDay, byIp, byIpDay] = await Promise.all([
    phoneRepository.countSendsByPhone(phone, SEND_WINDOW_MINUTES),
    phoneRepository.countSendsByPhone(phone, DAY_MINUTES),
    phoneRepository.countSendsByIp(ipHash, SEND_WINDOW_MINUTES),
    phoneRepository.countSendsByIp(ipHash, DAY_MINUTES),
  ]);

  // 제한에 걸린 사실은 알려준다. 이 번호는 요청자가 이미 알고 있어 숨길 게 없고,
  // 침묵하면 문자가 왜 안 오는지 모른 채 계속 누른다.
  if (byPhone >= MAX_SEND_PER_WINDOW || byIp >= MAX_SEND_PER_IP_WINDOW) {
    throw new AppError(429, 'TOO_MANY_REQUESTS', TOO_MANY);
  }
  if (byPhoneDay >= MAX_SEND_PER_DAY || byIpDay >= MAX_SEND_PER_IP_DAY) {
    throw new AppError(429, 'DAILY_LIMIT_EXCEEDED', TOO_MANY_TODAY);
  }

  // Math.random 은 예측 가능하다. 인증번호에는 암호학적 난수를 쓴다.
  const code = randomInt(100000, 1000000).toString();

  // 6자리는 100만 가지뿐이라, DB 가 유출되면 빠른 해시는 몇 초 만에 역산된다.
  // 유출 상황에서는 시도 횟수 제한이 의미가 없으므로 느린 해시를 쓴다.
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

  // 행을 먼저 만든다. 발송이 먼저면 사용자가 문자를 받았는데
  // 검증할 행이 없는 상태가 생긴다.
  const id = await phoneRepository.createChallenge({
    phone,
    purpose,
    codeHash,
    ipHash,
    ttlMinutes: CODE_TTL_MINUTES,
  });

  try {
    await smsSender().send(phone, `[텔레파시] 인증번호는 ${code}입니다.`);
  } catch (err) {
    // 외부 호출이라 DB 트랜잭션 안에 넣을 수 없다. 실패하면 직접 죽인다.
    await phoneRepository.expireChallenge(id);
    console.error('❌ 문자 발송 실패:', (err as Error).message);
    throw new AppError(502, 'SMS_SEND_FAILED', '문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

export async function verifyCode({ phone, purpose, code }: VerifyCodeInput): Promise<void> {
  const challenge = await phoneRepository.findActiveChallenge(phone, purpose);
  if (!challenge) throw new AppError(400, 'VERIFICATION_MISMATCH', MISMATCH);

  const matched = await bcrypt.compare(code, challenge.codeHash);
  if (!matched) {
    await phoneRepository.recordAttempt(challenge.id, MAX_VERIFY_ATTEMPTS);
    throw new AppError(400, 'VERIFICATION_MISMATCH', MISMATCH);
  }

  // 조회와 확정 사이에 만료되거나 다른 요청이 먼저 검증했을 수 있다.
  // 그 판정은 RPC 의 조건부 UPDATE 가 한다.
  const ok = await phoneRepository.markVerified(challenge.id);
  if (!ok) throw new AppError(400, 'VERIFICATION_MISMATCH', MISMATCH);
}
