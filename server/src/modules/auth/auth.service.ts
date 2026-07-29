import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';
import * as authRepository from './auth.repository';
import type { LoginInput } from './auth.schema';

// 리터럴이어야 한다. `${60}d` 는 string 으로 넓어져 expiresIn 타입을 만족하지 못한다.
const TOKEN_TTL = '60d';
const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 60;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;

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
    const next = credential.failedAttemptCount + 1;
    const shouldLock = next >= MAX_FAILED_ATTEMPTS;
    await authRepository.updateFailedAttempt(
      credential.userId,
      shouldLock ? 0 : next,
      shouldLock ? new Date(Date.now() + LOCK_DURATION_MS).toISOString() : null,
    );
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
