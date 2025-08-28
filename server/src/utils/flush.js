const { supabase } = require('../config/supabase');
const { getCurrentRound } = require('./round');

async function flushRound() {
  try {
    const { round: nowRound } = getCurrentRound();
    const targetRound = nowRound - 1; // 직전 라운드만 flush

    console.log(`♻️ Flush 시작: 라운드 ${targetRound}`);

    // 1. 직전 라운드 데이터 가져오기
    const { data: queueData, error: queueError } = await supabase
      .from('telepathy_sessions_queue')
      .select('*')
      .eq('round', targetRound);

    if (queueError) throw queueError;
    if (!queueData || queueData.length === 0) {
      console.log(`ℹ️ 라운드 ${targetRound} 데이터 없음`);
      return;
    }

    // 2. 로그 변환 (ended 는 제외 → 이미 /end API에서 log 처리함)
    const logs = queueData.map((row) => ({
      user_id: row.user_id,
      username: row.username,
      nickname: row.nickname,
      word: row.word,
      round: row.round,
      result: row.status === 'matched' ? 'matched' : 'unmatched',
      partner_id: row.partner_id,
      partner_username: row.partner_username,
      partner_nickname: row.partner_nickname,
      room_id: row.room_id,    // ✅ 추가
      created_at: new Date()
    }));

    // 3. 로그 테이블에 insert
    const { error: insertError } = await supabase
      .from('telepathy_sessions_log')
      .insert(logs);

    if (insertError) throw insertError;

    // 4. 큐에서 삭제 (ended 포함해서 싹 비움)
    const { error: deleteError } = await supabase
      .from('telepathy_sessions_queue')
      .delete()
      .eq('round', targetRound);

    if (deleteError) throw deleteError;

    console.log(`✅ 라운드 ${targetRound} flush 완료 (총 ${logs.length}건)`);
  } catch (err) {
    console.error('❌ flushRound 오류:', err.message);
  }
}

module.exports = { flushRound };
