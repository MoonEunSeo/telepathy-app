import supabase from '../../config/supabase.v2';
import { AppError } from '../../errors/AppError';
import type { PhoneVerificationPurpose } from '@shared/api';

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

/**
 * 최근 windowMinutes 분 안에 발급된 건수.
 *
 * error 를 확인하지 않으면 count 가 null 로 와서 0 이 된다.
 * 그러면 제한이 통째로 사라진 채 조용히 통과한다 — 하필 DB 가 흔들릴 때
 * 발송이 무제한이 되므로, 실패를 열어 두면 안 되는 자리다.
 */
async function countSends(
  column: 'phone' | 'request_ip_hash',
  value: string,
  windowMinutes: number,
): Promise<number> {
  const { count, error } = await supabase
    .from('phone_verification_challenges')
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
    .gte('created_at', minutesAgo(windowMinutes));

  if (error) {
    console.error('❌ 발송 건수 조회 실패:', error.message);
    throw new AppError(500, '서버 오류가 발생했습니다.');
  }

  return count ?? 0;
}

export function countSendsByPhone(phone: string, windowMinutes: number): Promise<number> {
  return countSends('phone', phone, windowMinutes);
}

export function countSendsByIp(ipHash: string, windowMinutes: number): Promise<number> {
  return countSends('request_ip_hash', ipHash, windowMinutes);
}

export interface CreateChallengeParams {
  phone: string;
  purpose: PhoneVerificationPurpose;
  codeHash: string;
  ipHash: string;
  ttlMinutes: number;
}

export async function createChallenge(params: CreateChallengeParams): Promise<string> {
  const { data, error } = await supabase
    .from('phone_verification_challenges')
    .insert({
      phone: params.phone,
      purpose: params.purpose,
      code_hash: params.codeHash,
      request_ip_hash: params.ipHash,
      expires_at: new Date(Date.now() + params.ttlMinutes * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ 인증 생성 실패:', error.message);
    throw new AppError(500, '서버 오류가 발생했습니다.');
  }

  return data.id;
}

/**
 * 발송이 실패했을 때 방금 만든 행을 죽인다.
 * 남겨 두면 사용자는 코드를 못 받았는데 재발송 횟수만 갉아먹는 유령 인증이 된다.
 */
export async function expireChallenge(id: string): Promise<void> {
  const { error } = await supabase
    .from('phone_verification_challenges')
    .update({ expires_at: new Date().toISOString() })
    .eq('id', id);

  // 이미 발송 실패를 응답할 참이라 여기서 또 던지지 않는다. 흔적만 남긴다.
  if (error) console.error('❌ 인증 무효화 실패:', error.message);
}

export interface ActiveChallenge {
  id: string;
  codeHash: string;
}

/** 아직 살아 있는 가장 최근 인증. 여러 번 발송했다면 마지막 것만 유효하게 다룬다. */
export async function findActiveChallenge(
  phone: string,
  purpose: PhoneVerificationPurpose,
): Promise<ActiveChallenge | null> {
  const { data, error } = await supabase
    .from('phone_verification_challenges')
    .select('id, code_hash')
    .eq('phone', phone)
    .eq('purpose', purpose)
    .is('verified_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ 인증 조회 실패:', error.message);
    throw new AppError(500, '서버 오류가 발생했습니다.');
  }
  if (!data) return null;

  return { id: data.id, codeHash: data.code_hash };
}

/** 틀린 횟수를 원자적으로 올린다. 한도에 닿으면 RPC 가 그 인증을 만료시킨다. */
export async function recordAttempt(id: string, maxAttempts: number): Promise<void> {
  const { error } = await supabase.rpc('record_challenge_attempt', {
    p_id: id,
    p_max: maxAttempts,
  });

  // 기록에 실패해도 응답은 그대로 "불일치" 다.
  // 여기서 던지면 "인증번호 틀림" 이 "서버 오류" 로 바뀌어 버린다.
  if (error) console.error('❌ 시도 횟수 기록 실패:', error.message);
}

/** 검증 확정. 조회와 확정 사이에 만료·소비됐다면 false 가 온다. */
export async function markVerified(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('mark_challenge_verified', { p_id: id });

  if (error) {
    console.error('❌ 인증 확정 실패:', error.message);
    throw new AppError(500, '서버 오류가 발생했습니다.');
  }

  return data === true;
}
