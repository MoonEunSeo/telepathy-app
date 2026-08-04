import { expireAttempts, findExpirableAttemptIds, markRoundsEnded } from './matching.repository';

/**
 * 라운드가 끝나는 순간 호출된다.
 *
 * 짝을 만나지 못한 시도(WAITING)를 EXPIRED 로 닫고, 끝난 라운드를 ENDED 로 전환한다.
 * MATCHED 는 건드리지 않는다 — 채팅은 라운드보다 오래 살기 때문에,
 * 여기서 상태를 바꾸면 종료 처리가 대상 행을 잃는다.
 *
 * 호출자(index.ts 의 라운드 경계 타이머)가 "방금 끝난 라운드"를 넘겨준다.
 * 스스로 시각을 역산하지 않는 것이 이 변경의 핵심이다 —
 * 역산하면 호출 시점과 어긋나 특정 라운드를 구조적으로 건너뛰게 된다.
 */
export async function expireRound(endedRoundKey: number): Promise<void> {
  try {
    const finishedAt = new Date().toISOString();

    const ids = await findExpirableAttemptIds(endedRoundKey);
    const expired = ids.length ? await expireAttempts(ids, finishedAt) : 0;
    const endedRounds = await markRoundsEnded(endedRoundKey);

    // 트래픽이 없으면 15초마다 아무 일도 일어나지 않는다. 그때는 로그를 남기지 않는다.
    if (!expired && !endedRounds) return;

    // expired 가 ids.length 보다 작으면 그 차이는 조회 후 MATCHED 로 바뀐 건이다.
    const skipped = ids.length - expired;
    const skippedNote = skipped > 0 ? ` (조회 후 매칭됨 ${skipped}건 제외)` : '';

    console.log(
      `♻️ 라운드 ${endedRoundKey} 만료 — WAITING ${expired}건 EXPIRED, 라운드 ${endedRounds}건 ENDED${skippedNote}`,
    );
  } catch (err) {
    // 타이머 콜백이라 던져봐야 받을 곳이 없다. 여기서 끝낸다.
    console.error('❌ expireRound 오류:', (err as Error).message);
  }
}
