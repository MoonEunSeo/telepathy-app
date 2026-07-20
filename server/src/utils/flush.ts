import supabase from '../config/supabase';
import { getCurrentRound } from './round';

export async function flushRound(): Promise<void> {
  try {
    const { round: nowRound } = getCurrentRound();
    const targetRound = nowRound - 1; // 직전 라운드만 flush
    console.log('🧪 flushRound supabase 객체:', typeof supabase);
    console.log(`♻️ Flush 시작: 라운드 ${targetRound}`);

    // 1. 직전 라운드 데이터 가져오기 (ended 제외)
    const { data: queueData, error: queueError } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('round', targetRound)
      .neq('status', 'ended'); // ✅ ended는 빼버림

    // ⚠️ [마이그레이션 시 추가] 원본은 queueError 미검사로 오류 시 null.filter 크래시 →
    //     다른 단계처럼 명시적으로 throw 하도록 보강
    if (queueError) throw queueError;

    // 2. 로그 변환 (ended 제외)
    const logs = (queueData ?? [])
      .filter((row) => row.status !== 'ended') // ✅ ended 빼기
      .map((row) => ({
        user_id: row.user_id,
        username: row.username,
        nickname: row.nickname,
        word: row.word,
        round: row.round,
        result: row.status === 'matched' ? 'matched' : 'unmatched',
        partner_id: row.partner_id,
        partner_username: row.partner_username,
        partner_nickname: row.partner_nickname,
        room_id: row.room_id,
        created_at: new Date(),
      }));

    // 3. 로그 테이블에 insert
    const { error: insertError } = await supabase.from('telepathy_sessions_log').insert(logs);

    if (insertError) throw insertError;

    // 4. 큐에서 삭제 (ended는 유지)
    const { error: deleteError } = await supabase
      .from('telepathy_sessions_queue')
      .delete()
      .eq('round', targetRound)
      .neq('status', 'ended'); // ✅ ended는 지우지 않음

    if (deleteError) throw deleteError;
  } catch (err) {
    console.error('❌ flushRound 오류:', (err as Error).message);
  }
}
