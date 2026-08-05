import supabase from '../../config/supabase.v2';
import { AppError } from '../../errors/AppError';

export type NicknameFailure = 'NICKNAME_TAKEN' | 'PROFILE_NOT_FOUND';
export type NicknameOutcome = { ok: true } | { ok: false; reason: NicknameFailure };

const NICKNAME_FAILURES: readonly string[] = ['NICKNAME_TAKEN', 'PROFILE_NOT_FOUND'];

/**
 * 닉네임 변경 — users 갱신 + 열린 이력 닫기 + 새 이력 열기
 *
 * 셋이 한 트랜잭션이어야 해서 RPC 다. 레거시는 이 셋을 따로 했고
 * 이력 INSERT 실패를 삼켰다("절대 throw 하지 않음"). 그래서 v2-dev 에
 * 이력이 실제와 어긋난 계정이 94건 있었다.
 *
 * 중복 검사도 RPC 안에 있다. 미리 조회해서 검사하면 조회와 UPDATE 사이에
 * 남이 같은 이름을 선점할 수 있다.
 */
export async function changeNickname(actorId: string, nickname: string): Promise<NicknameOutcome> {
  const { error } = await supabase.rpc('change_nickname', {
    p_actor_id: actorId,
    p_nickname: nickname,
  });

  if (error) {
    // P0001 = 함수가 raise exception 으로 의도해서 던진 것
    if (error.code === 'P0001' && NICKNAME_FAILURES.includes(error.message)) {
      return { ok: false, reason: error.message as NicknameFailure };
    }
    console.error('❌ 닉네임 변경 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }

  return { ok: true };
}

export interface Profile {
  actorId: string;
  username: string;
  nickname: string;
}

/**
 * 프로필 조회
 *
 * username 은 users 가 아니라 user_credentials 에 있다 —
 * V2 가 프로필과 자격증명을 분리했기 때문이다. 한 번의 조회로 끝내려고 조인한다.
 *
 * !inner 는 연결된 행이 없으면 결과에서 제외한다. 자격증명이 없는 프로필은
 * 로그인할 수 없는 상태라 "없음" 으로 다루는 편이 맞다.
 */
export async function findProfile(actorId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('actor_id, nickname, user_credentials!inner ( username )')
    .eq('actor_id', actorId)
    .maybeSingle();

  if (error) {
    console.error('❌ 프로필 조회 실패:', error.message);
    throw new AppError(500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다.');
  }
  if (!data) return null;

  return {
    actorId: data.actor_id,
    username: data.user_credentials.username,
    nickname: data.nickname,
  };
}
