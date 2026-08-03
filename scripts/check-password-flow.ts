/**
 * 비밀번호 변경·재설정 동작 확인 (TEL-15 §2.1)
 *
 * auth.route 가 app.ts 에 마운트돼 있지 않아 HTTP 로는 칠 수 없다.
 * service 를 직접 호출해 v2-dev 를 향한 동작을 확인한다.
 *
 * 확인 항목
 *   ① 변경   현재 비밀번호 틀림      401 + 실패 카운터 증가
 *   ② 변경   새 = 기존               400
 *   ③ 변경   정상                    changed_at 갱신 · 카운터·잠금 해제 · 새 비번 로그인
 *   ④ 재설정 인증 없음               403
 *   ⑤ 재설정 남의 번호로 인증 후 타 계정   403   ← 이번 작업의 핵심 회귀 항목
 *   ⑥ 재설정 정상                    성공 · consumed_at 설정 · 잠금 해제
 *   ⑦ 재설정 같은 인증 재사용        403
 *
 * 만든 데이터는 finally 에서 전부 지운다.
 *
 *   npx tsx scripts/check-password-flow.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as authService from '../server/src/modules/auth/auth.service';
import { AppError } from '../server/src/errors/AppError';

// A = 피해자 / B = 공격자. ⑤ 에서 B 의 인증으로 A 를 노린다.
const PHONE_A = '010-9999-0011';
const PHONE_B = '010-9999-0012';
const USERNAME_A = 'pwcheck_victim_zzz';
const USERNAME_B = 'pwcheck_other_zzz';

const PASSWORD = 'checkflow1234!';
const CHANGED = 'changed5678!';
const RESET = 'resetme9012!';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  process.exit(1);
}
const db = createClient(url, key);

/** 검증 완료 상태의 인증 challenge 를 만든다 (앱에 아직 발급 흐름이 없다) */
async function issueChallenge(phone: string, purpose: 'SIGNUP' | 'ACCOUNT_RECOVERY') {
  const { error } = await db.from('phone_verification_challenges').insert({
    phone,
    purpose,
    code_hash: 'dummy',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    verified_at: new Date().toISOString(),
  });
  if (error) throw new Error(`인증 생성 실패: ${error.message}`);
}

/** AppError 를 "상태 메시지" 문자열로. 성공하면 null */
async function attempt(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof AppError) return `${err.status} "${err.message}"`;
    throw err;
  }
}

async function actorIdOf(username: string): Promise<string> {
  const { data } = await db
    .from('user_credentials')
    .select('actor_id')
    .eq('username', username)
    .maybeSingle();
  if (!data) throw new Error(`계정을 찾을 수 없다: ${username}`);
  return data.actor_id;
}

async function credentialOf(username: string) {
  const { data } = await db
    .from('user_credentials')
    .select('password_changed_at, failed_attempt_count, locked_until')
    .eq('username', username)
    .maybeSingle();
  return data;
}

/** 로그인이 되는지만 본다 */
async function canLogin(username: string, password: string): Promise<boolean> {
  return (await attempt(() => authService.login({ username, password }))) === null;
}

/** 계정을 잠긴 상태로 만든다 — 재설정이 풀어 주는지 보기 위해 */
async function lockAccount(username: string) {
  await db
    .from('user_credentials')
    .update({
      failed_attempt_count: 3,
      locked_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    .eq('username', username);
}

async function createAccount(username: string, phone: string) {
  await issueChallenge(phone, 'SIGNUP');
  await authService.signup({ username, password: PASSWORD, phone });
}

async function cleanup() {
  for (const username of [USERNAME_A, USERNAME_B]) {
    const { data: cred } = await db
      .from('user_credentials')
      .select('actor_id')
      .eq('username', username)
      .maybeSingle();
    if (!cred) continue;
    await db.from('nickname_histories').delete().eq('actor_id', cred.actor_id);
    await db.from('user_credentials').delete().eq('actor_id', cred.actor_id);
    await db.from('users').delete().eq('actor_id', cred.actor_id);
    await db.from('actors').delete().eq('id', cred.actor_id);
  }
  await db.from('phone_verification_challenges').delete().in('phone', [PHONE_A, PHONE_B]);
  await db.from('users').delete().in('phone', [PHONE_A, PHONE_B]);
}

async function main() {
  console.log(`🎯 대상: ${url}`);
  await cleanup(); // 이전 실행의 잔재 제거

  await createAccount(USERNAME_A, PHONE_A);
  await createAccount(USERNAME_B, PHONE_B);
  const actorA = await actorIdOf(USERNAME_A);
  console.log(`   계정 준비 — A(${USERNAME_A}) · B(${USERNAME_B})`);

  // ① 현재 비밀번호 틀림
  console.log('\n1️⃣ 변경 — 현재 비밀번호 틀림');
  const before = await credentialOf(USERNAME_A);
  console.log(
    `   ${await attempt(() =>
      authService.changePassword(actorA, {
        currentPassword: '아무거나1234!',
        newPassword: CHANGED,
      }),
    ) ?? '❌ 통과해버렸다'}`,
  );
  const afterFail = await credentialOf(USERNAME_A);
  console.log(
    `   실패 카운터 ${before?.failed_attempt_count} → ${afterFail?.failed_attempt_count} (기대: 증가)`,
  );
  console.log(`   비밀번호 그대로: ${(await canLogin(USERNAME_A, PASSWORD)) ? '✅' : '❌'}`);

  // ② 새 = 기존
  console.log('\n2️⃣ 변경 — 새 비밀번호가 기존과 같음');
  console.log(
    `   ${await attempt(() =>
      authService.changePassword(actorA, { currentPassword: PASSWORD, newPassword: PASSWORD }),
    ) ?? '❌ 통과해버렸다'}`,
  );

  // ③ 정상 변경 — 잠긴 상태에서 시작해 잠금이 풀리는지 함께 본다
  console.log('\n3️⃣ 변경 — 정상');
  await lockAccount(USERNAME_A);
  await authService.changePassword(actorA, { currentPassword: PASSWORD, newPassword: CHANGED });
  const afterChange = await credentialOf(USERNAME_A);
  console.log(`   password_changed_at ${afterChange?.password_changed_at ? '✅ 기록됨' : '❌ 비어 있음'}`);
  console.log(
    `   카운터·잠금 해제 ${
      afterChange?.failed_attempt_count === 0 && afterChange?.locked_until === null ? '✅' : '❌'
    }`,
  );
  console.log(`   새 비밀번호로 로그인 ${(await canLogin(USERNAME_A, CHANGED)) ? '✅' : '❌'}`);
  console.log(`   옛 비밀번호 거부   ${(await canLogin(USERNAME_A, PASSWORD)) ? '❌ 되어버림' : '✅'}`);

  // ④ 인증 없이 재설정
  console.log('\n4️⃣ 재설정 — 인증 없음');
  console.log(
    `   ${await attempt(() =>
      authService.resetPassword({ username: USERNAME_A, newPassword: RESET }),
    ) ?? '❌ 통과해버렸다'}`,
  );

  // ⑤ 핵심 — 내 번호로 인증하고 남의 계정을 노린다
  console.log('\n5️⃣ 재설정 — B 의 번호로 인증한 뒤 A 를 노림  ← 핵심');
  await issueChallenge(PHONE_B, 'ACCOUNT_RECOVERY');
  console.log(
    `   ${await attempt(() =>
      authService.resetPassword({ username: USERNAME_A, newPassword: RESET }),
    ) ?? '❌❌ 뚫렸다 — 남의 계정을 바꿀 수 있다'}`,
  );
  console.log(`   A 비밀번호 그대로: ${(await canLogin(USERNAME_A, CHANGED)) ? '✅' : '❌'}`);

  // ⑥ 정상 재설정 — 잠긴 상태에서 시작
  console.log('\n6️⃣ 재설정 — 정상');
  await lockAccount(USERNAME_A);
  await issueChallenge(PHONE_A, 'ACCOUNT_RECOVERY');
  await authService.resetPassword({ username: USERNAME_A, newPassword: RESET });
  const afterReset = await credentialOf(USERNAME_A);
  console.log(`   새 비밀번호로 로그인 ${(await canLogin(USERNAME_A, RESET)) ? '✅' : '❌'}`);
  console.log(
    `   카운터·잠금 해제 ${
      afterReset?.failed_attempt_count === 0 && afterReset?.locked_until === null ? '✅' : '❌'
    }`,
  );
  const { count: unconsumed } = await db
    .from('phone_verification_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('phone', PHONE_A)
    .eq('purpose', 'ACCOUNT_RECOVERY')
    .is('consumed_at', null);
  console.log(`   인증 소비됨 ${unconsumed === 0 ? '✅' : `❌ 미소비 ${unconsumed}건`}`);

  // ⑦ 같은 인증 재사용
  console.log('\n7️⃣ 재설정 — 같은 인증으로 또');
  console.log(
    `   ${await attempt(() =>
      authService.resetPassword({ username: USERNAME_A, newPassword: '또바꾼다1234!' }),
    ) ?? '❌ 통과해버렸다'}`,
  );
  console.log(`   비밀번호 그대로: ${(await canLogin(USERNAME_A, RESET)) ? '✅' : '❌'}`);
}

main()
  .catch((e) => {
    console.error('\n💥 예기치 못한 실패:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    const { data } = await db
      .from('user_credentials')
      .select('username')
      .in('username', [USERNAME_A, USERNAME_B]);
    console.log(`\n🧹 정리 — 남은 계정: ${data?.length ? '❌ 있음' : '없음'}`);
  });
