import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';
import * as authRepository from './auth.repository';
import type { LoginInput, SignupInput } from './auth.schema';
import getRandomNickname from '../../utils/randomNickname';

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
    throw new AppError(status, SIGNUP_MESSAGE[outcome.reason]);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError(500, '서버 설정 오류가 발생했습니다.');

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
  if (!credential) throw new AppError(401, INVALID_CREDENTIAL);

  // 잠금은 해시 대조보다 먼저 본다 (잠긴 계정에 bcrypt 비용을 쓰지 않는다.)
  if (credential.lockedUntil && new Date(credential.lockedUntil) > new Date()) {
    throw new AppError(401, INVALID_CREDENTIAL);
  }

  // 정지·탈퇴 계정 차단 (actors.status)
  if (credential.actorStatus !== 'ACTIVE') {
    throw new AppError(401, INVALID_CREDENTIAL);
  }

  // 사용된 알고리즘 종류 검사. Argon2id는 별도 진행
  if (credential.passwordAlgorithm !== 'bcrypt') {
    throw new AppError(500, '지원하지 않는 인증 방식입니다.');
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

    throw new AppError(401, INVALID_CREDENTIAL);
  }

  await authRepository.markLoginSuccess(credential.userId);

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError(500, '서버 설정 오류가 발생했습니다.');

  // user_id가 users.id에서 actors.id로 바뀐다.
  // 페이로드 형태는 유지해 기존 middleware/auth.ts와 호환시킨다.
  const token = jwt.sign({ user_id: credential.userId, username, role: 'member' }, secret, {
    expiresIn: TOKEN_TTL,
  });

  return { token, maxAgeMs: TOKEN_MAX_AGE_MS };
}
