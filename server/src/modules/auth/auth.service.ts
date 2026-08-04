import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';
import * as authRepository from './auth.repository';
import type {
  LoginInput,
  SignupInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from './auth.schema';
import getRandomNickname from '../../utils/randomNickname';
import type { ErrorCode } from '@shared/api';

// 리터럴이어야 한다. `${60}d` 는 string 으로 넓어져 expiresIn 타입을 만족하지 못한다.
const TOKEN_TTL = '60d';
const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 60;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 5;

const BCRYPT_ROUNDS = 10;
const NICKNAME_MAX_ATTEMPTS = 5;

const SIGNUP_MESSAGE: Record<authRepository.SignupFailure, string> = {
  USERNAME_TAKEN: '이미 사용 중인 아이디입니다.',
  PHONE_TAKEN: '이미 가입된 휴대폰 번호입니다.',
  NICKNAME_TAKEN: '닉네임 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
  PHONE_NOT_VERIFIED: '휴대폰 인증이 필요합니다.',
};

// 문구와 코드를 나란히 둔다. 한쪽만 늘어나면 여기서 타입 에러가 난다.
const SIGNUP_CODE: Record<authRepository.SignupFailure, ErrorCode> = {
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  PHONE_TAKEN: 'PHONE_TAKEN',
  // 닉네임은 서버가 짓는다. 사용자가 고른 게 아니므로 "중복" 이 아니라 "생성 실패" 다.
  NICKNAME_TAKEN: 'NICKNAME_GENERATION_FAILED',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED',
};

const CURRENT_PASSWORD_MISMATCH = '현재 비밀번호가 올바르지 않습니다.';
const SAME_PASSWORD = '새 비밀번호가 기존 비밀번호와 같습니다.';
// 아이디 존재 여부와 인증 여부를 구분해 흘리지 않는다.
const RECOVERY_FAILED = '휴대폰 인증이 확인되지 않았습니다.';

export async function signup(input: SignupInput): Promise<LoginResult> {
  // 해시는 비싼 연산이라 재시도 밖에서 한 번만 한다.
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const attempt = () =>
    authRepository.signup({
      username: input.username,
      passwordHash,
      phone: input.phone,
      // 닉네임은 서버가 짓는다. 8000가지 뿐이라 기존 회원과 겹칠 수 있는데
      // 그건 가입자 잘못이 아니다. 실패하면 RPC 전체가 롤백되므로
      // (인증도 소비되지 않는다.) 다른 이름으로 다시 시도해도 안전하다.
      nickname: getRandomNickname(),
      gender: input.gender,
      birthdate: input.birthdate,
    });

  let outcome = await attempt();
  for (
    let i = 1;
    i < NICKNAME_MAX_ATTEMPTS && !outcome.ok && outcome.reason === 'NICKNAME_TAKEN';
    i += 1
  ) {
    outcome = await attempt();
  }

  if (!outcome.ok) {
    const status = outcome.reason === 'PHONE_NOT_VERIFIED' ? 403 : 409;
    throw new AppError(status, SIGNUP_CODE[outcome.reason], SIGNUP_MESSAGE[outcome.reason]);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError(500, 'SERVER_MISCONFIGURED', '서버 설정 오류가 발생했습니다.');

  // 가입 직후 자동 로그인
  const token = jwt.sign(
    { user_id: outcome.actorId, username: input.username, role: 'member' },
    secret,
    { expiresIn: TOKEN_TTL },
  );

  return { token, maxAgeMs: TOKEN_MAX_AGE_MS };
}

// 아이디 존재 여부를 흘리지 않도록 실패는 전부 같은 문구다.
const INVALID_CREDENTIAL = '아이디 또는 비밀번호가 올바르지 않습니다.';

export interface LoginResult {
  token: string;
  maxAgeMs: number;
}

export async function login({ username, password }: LoginInput): Promise<LoginResult> {
  const credential = await authRepository.findLoginCredential(username);
  if (!credential) throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIAL);

  // 잠금은 해시 대조보다 먼저 본다 (잠긴 계정에 bcrypt 비용을 쓰지 않는다.)
  if (credential.lockedUntil && new Date(credential.lockedUntil) > new Date()) {
    throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIAL);
  }

  // 정지·탈퇴 계정 차단 (actors.status)
  if (credential.actorStatus !== 'ACTIVE') {
    throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIAL);
  }

  // 사용된 알고리즘 종류 검사. Argon2id는 별도 진행
  if (credential.passwordAlgorithm !== 'bcrypt') {
    throw new AppError(500, 'UNSUPPORTED_PASSWORD_ALGORITHM', '지원하지 않는 인증 방식입니다.');
  }

  const matched = await bcrypt.compare(password, credential.passwordHash);
  if (!matched) {
    // 카운터 증가·잠금 판정을 DB 가 원자적으로 처리한다.
    const record = await authRepository.recordLoginFailure(
      credential.userId,
      MAX_FAILED_ATTEMPTS,
      LOCK_DURATION_MINUTES,
    );

    // 기록이 안 되면 이번 시도는 잠금 카운트에 반영되지 않는다.
    // 응답은 그대로 401이지만, 방어가 한 번 헛돈 사실은 남긴다.
    if (!record) {
      console.warn('⚠️ 로그인 실패 기록 누락 — 잠금 방어가 이번엔 작동하지 않음');
    }

    throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIAL);
  }

  await authRepository.markLoginSuccess(credential.userId);

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError(500, 'SERVER_MISCONFIGURED', '서버 설정 오류가 발생했습니다.');

  // user_id가 users.id에서 actors.id로 바뀐다.
  // 페이로드 형태는 유지해 기존 middleware/auth.ts와 호환시킨다.
  const token = jwt.sign({ user_id: credential.userId, username, role: 'member' }, secret, {
    expiresIn: TOKEN_TTL,
  });

  return { token, maxAgeMs: TOKEN_MAX_AGE_MS };
}

export async function changePassword(
  actorId: string,
  { currentPassword, newPassword }: ChangePasswordInput,
): Promise<void> {
  if (currentPassword === newPassword) throw new AppError(400, 'SAME_PASSWORD', SAME_PASSWORD);

  const credential = await authRepository.findCredentialByActorId(actorId);

  // 토큰 수명이 60일이라 그 사이 탈퇴·정지된 계정의 토큰이 살아 있을 수 있다.
  // 서명이 유효하다는 것과 계정이 살아 있다는 것은 다른 얘기다.
  if (!credential || credential.actorStatus !== 'ACTIVE') {
    throw new AppError(401, 'UNAUTHENTICATED', '로그인이 필요합니다.');
  }

  if (credential.passwordAlgorithm !== 'bcrypt') {
    throw new AppError(500, 'UNSUPPORTED_PASSWORD_ALGORITHM', '지원하지 않는 인증 방식입니다.');
  }

  const matched = await bcrypt.compare(currentPassword, credential.passwordHash);
  if (!matched) {
    // 쿠키를 훔친 쪽에서 현재 비밀번호를 무제한 대입할 수 있으면
    // 이 엔드포인트가 비밀번호 오라클이 된다. 로그인과 같은 카운터를 쓴다.
    await authRepository.recordLoginFailure(actorId, MAX_FAILED_ATTEMPTS, LOCK_DURATION_MINUTES);
    throw new AppError(401, 'CURRENT_PASSWORD_MISMATCH', CURRENT_PASSWORD_MISMATCH);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await authRepository.updatePassword(actorId, passwordHash);
}

export async function resetPassword({ username, newPassword }: ResetPasswordInput): Promise<void> {
  // 성공 여부를 알기 전에 해시한다 — 인증 확인과 교체가 한 트랜잭션이라
  // 해시를 미리 넘겨야 한다. 비로그인 경로라 bcrypt 비용이 그대로 노출되므로
  // 레이트 리밋이 붙기 전까지는 이 지점이 부하 창구다.
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  const outcome = await authRepository.resetPassword(username, passwordHash);
  if (!outcome.ok) throw new AppError(403, 'RECOVERY_NOT_VERIFIED', RECOVERY_FAILED);
}
