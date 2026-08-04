import supabase from '../../config/supabase.v2';

// id 목록을 URL 쿼리로 싣기 때문에 한 번에 보내는 개수를 제한한다.
const ID_BATCH_SIZE = 1_000;

// PostgREST 응답 행 상한과 맞춘 조회 페이지 크기.
const PAGE_SIZE = 1_000;

/**
 * 끝난 라운드에 속한 WAITING 시도의 id 를 모은다.
 *
 * round_key 는 15초 단위 정수 키이므로 `<= 끝난 라운드` 가 곧
 * "이미 끝난 모든 라운드" 다. 과거에 만료되지 않고 남은 시도까지 함께 걷힌다.
 *
 * v3 처럼 created_at 나이 조건을 함께 걸 필요가 없다.
 * 그쪽은 클라이언트가 보낸 round 를 그대로 저장해 미래 라운드 값이 들어올 수 있었지만,
 * V2 는 round_id 가 match_rounds 를 가리키는 FK 라서 서버가 정한 값만 존재한다.
 */
export async function findExpirableAttemptIds(endedRoundKey: number): Promise<string[]> {
  const ids: string[] = [];

  // PostgREST 는 한 응답의 행 수에 상한을 둔다(이 프로젝트는 1,000).
  // 한 번만 조회하면 그보다 많이 쌓였을 때 **조용히 잘린다** — 오류도 경고도 없다.
  // 실제로 EXPIRED 18,493건을 조건 없이 조회했을 때 1,000건만 돌아왔다.
  // range 로 끝까지 훑는다. order 가 없으면 페이지 경계가 흔들려 누락·중복이 난다.
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('match_attempts')
      .select('id, match_rounds!inner ( round_key )')
      .eq('status', 'WAITING')
      .lte('match_rounds.round_key', endedRoundKey)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    // Supabase는 DB 오류를 예외가 아니라 error 필드로 준다.
    // 확인하지 않으면 data 가 null 이 되어 "만료할 게 없다"로 둔갑한다.
    if (error) {
      console.error('❌ 만료 대상 조회 실패:', error.message);
      throw error;
    }

    ids.push(...data.map((row) => row.id));
    if (data.length < PAGE_SIZE) break;
  }

  return ids;
}

/**
 * WAITING → EXPIRED 로 전이한다. 행을 지우지 않는다.
 *
 * 삭제가 아닌 이유는 §15.2 가 EXPIRED 를 상태로 정의했기 때문이고,
 * 실무적으로도 match_attempts 는 큐이자 기록이라 지우면 실패 이력이 사라진다.
 *
 * .eq('status','WAITING') 을 UPDATE 에 한 번 더 거는 이유 —
 * 조회와 갱신 사이에 상대가 나타나 MATCHED 로 바뀌었을 수 있다.
 * 이 조건이 없으면 성사된 매칭을 만료로 덮어쓴다.
 */
export async function expireAttempts(ids: string[], finishedAt: string): Promise<number> {
  let expired = 0;

  for (let offset = 0; offset < ids.length; offset += ID_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + ID_BATCH_SIZE);

    const { data, error } = await supabase
      .from('match_attempts')
      .update({ status: 'EXPIRED', finished_at: finishedAt })
      .in('id', batch)
      .eq('status', 'WAITING')
      .select('id');

    if (error) {
      console.error('❌ 만료 전이 실패:', error.message, `(${batch.length}건)`);
      continue;
    }
    expired += data?.length ?? 0;
  }

  return expired;
}

/**
 * 끝난 라운드를 ENDED 로 닫는다. 이미 ENDED 인 행은 건드리지 않는다.
 *
 * 반환값은 로그용이며 PostgREST 행 상한(1,000)에 걸릴 수 있다.
 * 갱신 자체는 조건에 맞는 행 전부에 적용되므로 정확성에는 영향이 없다.
 * 라운드 경계마다 도는 구조라 실제로 한 번에 전이되는 건 한 자릿수다.
 */
export async function markRoundsEnded(endedRoundKey: number): Promise<number> {
  const { data, error } = await supabase
    .from('match_rounds')
    .update({ status: 'ENDED' })
    .lte('round_key', endedRoundKey)
    .neq('status', 'ENDED')
    .select('id');

  if (error) {
    console.error('❌ 라운드 종료 처리 실패:', error.message);
    throw error;
  }

  return data?.length ?? 0;
}
