import supabase from '../../config/supabase.v2';
import { AppError } from '../../errors/AppError';

export interface LoginCredential {
  userId: string; // actors.id (JWT의 user_id 가 이 값이 된다)
  passwordHash: string;
  passwordAlgorithm: string;
  lockedUntil: string | null;
  actorStatus: string;
}

export async function findLoginCredential(username: string): Promise<LoginCredential | null> {
  // user_credentials -> users -> actors 로 FK가 이어져 있어 중첩 조회가 된다.
  // !inner는 연결된 행이 없으면 결과에서 제외 - 고아 자격증명을 걸러낸다.
  const { data, error } = await supabase
    .from('user_credentials')
    .select(
      `actor_id, password_hash, password_algorithm, locked_until,users!inner ( actors!inner ( status ))`,
    )
    .eq('username', username)
    .maybeSingle();

  // Supabase는 DB 오류를 예외가 아니라 error 필드로 준다.
  // 확인하지 않으면 data 가 null 이 되어 "없는 사용자"로 둔갑한다.
  if (error) {
    console.error('❌ 자격증명 조회 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }
  if (!data) return null;

  //   DB 언어 (snake_case) 를 도메인 언어(camelCase) 로 번역한다.
  // 이 경계 덕분에 service 는 컬럼이 어느 테이블에 있는지 모른다.
  return {
    userId: data.actor_id,
    passwordHash: data.password_hash,
    passwordAlgorithm: data.password_algorithm,
    lockedUntil: data.locked_until,
    actorStatus: data.users.actors.status,
  };
}

export interface FailureRecord {
  failedAttemptCount: number;
  lockedUntil: string | null;
}

/**
 * 로그인 실패를 원자적으로 기록한다.
 *
 * 읽고 +1 해서 쓰면 동시 요청에서 증가가 유실된다
 * RPC 안의 단일 UPDATE가 행을 잠가 순서를 보장한다.
 *
 * 잠금 판정도 DB가 한다. 다만 정책 (횟수·분)은 service 가 넘긴다
 * 규칙은 앱에 남기고 DB는 원자적 실행만 담당한다.
 */

export async function recordLoginFailure(
  actorId: string,
  maxAttempts: number,
  lockMinutes: number,
): Promise<FailureRecord | null> {
  const { data, error } = await supabase.rpc('record_login_failure', {
    p_actor_id: actorId,
    p_max_attempts: maxAttempts,
    p_lock_minutes: lockMinutes,
  });

  // 기록에 실패해도 로그인 실패 응답은 그대로 내보낸다.
  // 여기서 던지면 "비밀번호 틀림"이 "서버 오류"로 바뀌어 버린다.
  if (error) {
    console.error('❌ 실패 횟수 기록 실패:', error.message);
    return null;
  }

  const row = data?.[0];
  if (!row) return null;

  // 생성 타입은 new_locked_until을 string으로 본다.
  // RETURNS TABLE이 NULL 허용 여부를 담지 못하기 때문이다.
  // 잠기지 않았을 때 실제 값은 null이다.
  return {
    failedAttemptCount: row.new_failed_count,
    lockedUntil: row.new_locked_until,
  };
}

// 로그인 성공 - 실패 카운터 초기화 + 최근 로그인 시각 갱신
export async function markLoginSuccess(userId: string): Promise<void> {
  // 두 테이블을 각각 갱신한다. 트랜잭션이 아니므로 한쪽만 반영될 수 있다.
  // 로그인 자체를 막을 정도는 아니라 로그만 남긴다.
  const { error: credErr } = await supabase
    .from('user_credentials')
    .update({ failed_attempt_count: 0, locked_until: null })
    .eq('actor_id', userId);
  if (credErr) console.error('❌ 실패 카운터 초기화 실패:', credErr.message);

  // users의 PK는 id가 아닐 actor_id다
  const { error: userErr } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('actor_id', userId);
  if (userErr) console.error('❌ 최근 로그인 갱신 실패:', userErr.message);
}

export type SignupFailure =
  'USERNAME_TAKEN' | 'PHONE_TAKEN' | 'NICKNAME_TAKEN' | 'PHONE_NOT_VERIFIED';

const SIGNUP_FAILURES: readonly string[] = [
  'USERNAME_TAKEN',
  'PHONE_TAKEN',
  'NICKNAME_TAKEN',
  'PHONE_NOT_VERIFIED',
];

export type SignupOutcome = { ok: true; actorId: string } | { ok: false; reason: SignupFailure };

export interface SignupParams {
  username: string;
  passwordHash: string;
  phone: string;
  nickname: string;
  gender?: string;
  birthdate?: string;
}

/**
 * 회원가입 — actors·users·user_credentials·nickname_histories
 *
 * supabase-js 에 트랜잭션 API가 없어서 RPC로 처리
 * 함수 호출 = 트랜잭션, 중도 실패 시 전부 취소됨
 *
 * 중복은 미리 조회하지 않는다. 조회와 INSERT 사이에 남이 끼어들기 때문이다.
 * 검사를 UNIQUE 제약에 맡기고 어느 제약에 걸렸는지만 돌려받는다.
 */
export async function signup(params: SignupParams): Promise<SignupOutcome> {
  const { data, error } = await supabase.rpc('signup_user', {
    p_username: params.username,
    p_password_hash: params.passwordHash,
    p_phone: params.phone,
    p_nickname: params.nickname,
    p_gender: params.gender,
    p_birthdate: params.birthdate,
  });

  if (error) {
    // P0001 = 함수가 raise exception으로 의도해서 던진 것
    // 그 외(연결 실패·제약 위반 등)는 진짜 오류다
    if (error.code === 'P0001' && SIGNUP_FAILURES.includes(error.message)) {
      return { ok: false, reason: error.message as SignupFailure };
    }
    console.error('❌ 회원가입 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }

  return { ok: true, actorId: data };
}

export interface ActorCredential {
  passwordHash: string;
  passwordAlgorithm: string;
  actorStatus: string;
}

/**
 * 로그인한 사용자의 자격증명.
 * findLoginCredential은 username이 키라 여기 못 쓴다.
 * 우리가 가진 건 토큰 속 actor_id다
 */
export async function findCredentialByActorId(actorId: string): Promise<ActorCredential | null> {
  const { data, error } = await supabase
    .from('user_credentials')
    .select(`password_hash, password_algorithm,users!inner ( actors!inner ( status ))`)
    .eq('actor_id', actorId)
    .maybeSingle();

  if (error) {
    console.error('❌ 자격증명 조회 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }
  if (!data) return null;

  return {
    passwordHash: data.password_hash,
    passwordAlgorithm: data.password_algorithm,
    actorStatus: data.users.actors.status,
  };
}

/**
 * 비밀번호 교체 (로그인 상태)
 *
 * 한 테이블 한 UPDATE라 RPC 가 필요 없다.
 * 잠금을 함께 푸는 이유 - 현재 비밀번호를 맞힌 본인이다.
 * 남겨 두면 방금 바꾼 비밀번호로도 로그인이 막히고, 사용자는 이유를 모른다.
 */
export async function updatePassword(actorId: string, passwordHash: string): Promise<void> {
  const { error } = await supabase
    .from('user_credentials')
    .update({
      password_hash: passwordHash,
      password_algorithm: 'bcrypt',
      password_changed_at: new Date().toISOString(),
      failed_attempt_count: 0,
      locked_until: null,
    })
    .eq('actor_id', actorId);

  if (error) {
    console.error('❌ 비밀번호 변경 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }
}

export type ResetFailure = 'RECOVERY_NOT_VERIFIED';
export type ResetOutcome = { ok: true } | { ok: false; reason: ResetFailure };

const RESET_FAILURES: readonly string[] = ['RECOVERY_NOT_VERIFIED'];

/**
 * 비밀번호 재설정 (비로그인)
 *
 * 인증 확인·비밀번호 교체·인증 소비 셋이 한 트랜잭션이어야 해서 RPC 다.
 * 나뉘면 인증만 소비되고 비밀번호는 그대로인 상태가 생긴다.
 *
 * 전화번호를 인자로 받지 않는다. 계정에서 끌어오는 일을 RPC 안에서 해야
 * 앱이 넘김 값으로 남의 계정을 가리킬 수 없다.
 */
export async function resetPassword(username: string, passwordHash: string): Promise<ResetOutcome> {
  const { error } = await supabase.rpc('reset_password', {
    p_username: username,
    p_password_hash: passwordHash,
  });

  if (error) {
    // P0001 함수가 raise exception 으로 의도해 던진 것
    if (error.code === 'P0001' && RESET_FAILURES.includes(error.message)) {
      return { ok: false, reason: error.message as ResetFailure };
    }
    console.error('❌ 비밀번호 재설정 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }

  return { ok: true };
}

export type WithdrawFailure = 'WITHDRAW_SUSPENDED';
export type WithdrawOutcome = { ok: true } | { ok: false; reason: WithdrawFailure };

const WITHDRAW_FAILURES: readonly string[] = ['WITHDRAW_SUSPENDED'];

/**
 * 회원 탈퇴 — actors 상태 전이 + users 삭제
 *
 * 두 테이블이 한 트랜잭션이어야 해서 RPC 다.
 * 나뉘면 프로필만 사라지고 상태는 ACTIVE 로 남는 계정이 생긴다.
 *
 * 레거시는 users 행만 지웠다. actors 를 남기는 것이 이 전환의 핵심이다 —
 * 매칭·채팅·결제가 actors 를 참조하므로, 지우면 활동 이력이 전부 유령이 된다.
 */
export async function withdraw(actorId: string): Promise<WithdrawOutcome> {
  const { error } = await supabase.rpc('withdraw_user', { p_actor_id: actorId });

  if (error) {
    if (error.code === 'P0001' && WITHDRAW_FAILURES.includes(error.message)) {
      return { ok: false, reason: error.message as WithdrawFailure };
    }
    console.error('❌ 회원탈퇴 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }

  // RPC 의 반환값(false = 이미 탈퇴된 계정)은 보지 않는다.
  // 사용자가 원한 상태에 이미 도달해 있으므로 성공과 구분할 이유가 없다.
  return { ok: true };
}
