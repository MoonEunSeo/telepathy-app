const supabase = require('../config/supabase');
const { getCurrentRound } = require('./round');

async function flushRound() {
  try {
    const { round: nowRound } = getCurrentRound();
    const targetRound = nowRound - 1; // 직전 라운드만 flush
    console.log("🧪 flushRound supabase 객체:", typeof supabase);
    console.log(`♻️ Flush 시작: 라운드 ${targetRound}`);

    // 1. 직전 라운드 데이터 가져오기 (ended 제외)
    const { data: queueData, error: queueError } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('round', targetRound)
      .neq('status', 'ended');   // ✅ ended는 빼버림


    // 2. 로그 변환 (ended 제외)
    const logs = queueData
      .filter((row) => row.status !== 'ended')   // ✅ ended 빼기
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
        created_at: new Date()
      }));

    // 3. 로그 테이블에 insert
    const { error: insertError } = await supabase
      .from('telepathy_sessions_log')
      .insert(logs);

    if (insertError) throw insertError;

    // 4. 큐에서 삭제 (ended는 유지)
    const { error: deleteError } = await supabase
      .from('telepathy_sessions_queue')
      .delete()
      .eq('round', targetRound)
      .neq('status', 'ended');   // ✅ ended는 지우지 않음

    if (deleteError) throw deleteError;

    console.log(`✅ 라운드 ${targetRound} flush 완료 (총 ${logs.length}건)`);
  } catch (err) {
    console.error('❌ flushRound 오류:', err.message);
  }
}

module.exports = { flushRound };
