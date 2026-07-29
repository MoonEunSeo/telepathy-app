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
    throw new AppError(500, '서버 오류가 발생했습니다.');
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
