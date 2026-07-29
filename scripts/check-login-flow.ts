/**
 * 로그인 수직 슬라이스 동작 확인 (TEL-15)
 *
 * auth.route 가 app.ts 에 마운트돼 있지 않아 HTTP 로는 칠 수 없다.
 * 대신 service 를 직접 호출해 v2-dev 를 향한 동작을 확인한다.
 * 회원가입·비밀번호 변경을 붙일 때마다 회귀 확인용으로 재사용한다.
 *
 * 확인 항목
 *   ① 정상 로그인          토큰 발급 · user_id 가 actors.id 인가 · last_login_at 갱신
 *   ② 오답 1회             401 · failed_attempt_count 증가
 *   ③ 재로그인             카운터 0 복구
 *   ④ 정지 계정            actors.status != ACTIVE 면 정답이어도 거부
 *   ⑤ 잠금                 5회 실패 시 locked_until 설정 · 정답이어도 거부
 *   ⑥ 없는 아이디          ②와 응답이 동일한가 (사용자 열거 방지)
 *
 * ④⑤ 는 DB 상태를 변경한다. finally 에서 반드시 원복한다.
 *
 * 이 저장소는 PUBLIC 이라 비밀번호를 파일에 두지 않는다.
 *   V2_TEST_PASSWORD=... npx tsx scripts/check-login-flow.ts
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import * as authService from '../server/src/modules/auth/auth.service';
import { AppError } from '../server/src/errors/AppError';

const USERNAME = process.env.V2_TEST_USERNAME ?? 'testuser';
const PASSWORD = process.env.V2_TEST_PASSWORD;

if (!PASSWORD) {
  console.error('❌ V2_TEST_PASSWORD 가 없습니다.');
  console.error('   V2_TEST_PASSWORD=... npx tsx scripts/check-login-flow.ts');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  process.exit(1);
}
const db = createClient(url, key);

/** 자격증명·계정 상태를 직접 조회한다 (service 를 거치지 않는 검증용 경로) */
async function readState() {
  const { data: cred } = await db
    .from('user_credentials')
    .select('user_id, failed_attempt_count, locked_until')
    .eq('username', USERNAME)
    .maybeSingle();
  if (!cred) return null;

  const { data: user } = await db
    .from('users')
    .select('last_login_at')
    .eq('actor_id', cred.user_id)
    .maybeSingle();

  const { data: actor } = await db
    .from('actors')
    .select('status')
    .eq('id', cred.user_id)
    .maybeSingle();

  return {
    actorId: cred.user_id as string,
    failed: cred.failed_attempt_count as number,
    lockedUntil: cred.locked_until as string | null,
    lastLoginAt: (user?.last_login_at ?? null) as string | null,
    status: (actor?.status ?? null) as string | null,
  };
}

/** 시험 전 상태로 되돌린다 */
async function restore(actorId: string) {
  await db
    .from('user_credentials')
    .update({ failed_attempt_count: 0, locked_until: null })
    .eq('user_id', actorId);
  await db.from('actors').update({ status: 'ACTIVE' }).eq('id', actorId);
}

/** login 을 호출해 AppError 를 문자열로 돌려준다. 성공하면 null */
async function attempt(password: string): Promise<string | null> {
  try {
    await authService.login({ username: USERNAME, password });
    return null;
  } catch (err) {
    if (err instanceof AppError) return `${err.status} "${err.message}"`;
    throw err;
  }
}

async function main() {
  console.log(`🎯 대상: ${url}`);

  const before = await readState();
  if (!before) {
    console.error(`❌ '${USERNAME}' 계정이 없습니다.`);
    process.exit(1);
  }
  console.log(
    `\n0️⃣ 시작 상태 — 실패 ${before.failed} / 잠금 ${before.lockedUntil ?? '없음'} / status ${before.status}`,
  );

  try {
    // ① 정상 로그인
    const result = await authService.login({ username: USERNAME, password: PASSWORD! });
    const payload = jwt.decode(result.token) as Record<string, unknown>;
    console.log('\n1️⃣ 정상 로그인');
    console.log(`   토큰      ${result.token.slice(0, 18)}… (${result.token.length}자)`);
    console.log(`   user_id   ${payload.user_id}`);
    console.log(`   actors.id ${before.actorId}  ${payload.user_id === before.actorId ? '✅ 일치' : '❌ 불일치'}`);
    console.log(`   role      ${payload.role}`);
    console.log(`   만료      ${new Date((payload.exp as number) * 1000).toISOString()}`);
    console.log(`   last_login_at → ${(await readState())?.lastLoginAt}`);

    // ② 오답 1회
    console.log('\n2️⃣ 틀린 비밀번호 1회');
    const wrongMsg = await attempt('definitely-wrong-000');
    console.log(`   ${wrongMsg ?? '❌ 통과해버렸다'}`);
    console.log(`   실패횟수 → ${(await readState())?.failed}`);

    // ③ 재로그인으로 카운터 복구
    console.log('\n3️⃣ 재로그인 — 카운터 복구');
    await authService.login({ username: USERNAME, password: PASSWORD! });
    console.log(`   실패횟수 → ${(await readState())?.failed}`);

    // ④ 정지 계정
    console.log('\n4️⃣ 정지 계정 (actors.status = SUSPENDED)');
    await db.from('actors').update({ status: 'SUSPENDED' }).eq('id', before.actorId);
    console.log(`   status → ${(await readState())?.status}`);
    const suspendedMsg = await attempt(PASSWORD!);
    console.log(`   정답 비밀번호로 시도 → ${suspendedMsg ?? '❌ 통과해버렸다'}`);

    await db.from('actors').update({ status: 'ACTIVE' }).eq('id', before.actorId);
    console.log(`   status 복구 → ${(await readState())?.status}`);
    const revivedMsg = await attempt(PASSWORD!);
    console.log(`   다시 시도 → ${revivedMsg ?? '✅ 로그인 성공'}`);

    // ⑤ 잠금
    console.log('\n5️⃣ 잠금 (5회 실패)');
    for (let i = 1; i <= 5; i += 1) {
      const msg = await attempt(`wrong-${i}`);
      const s = await readState();
      console.log(`   ${i}회 → ${msg} · 카운터 ${s?.failed} · 잠금 ${s?.lockedUntil ?? '없음'}`);
    }
    const locked = await readState();
    console.log(`   잠금 설정됨: ${locked?.lockedUntil ? '✅' : '❌ 안 걸렸다'}`);

    const lockedMsg = await attempt(PASSWORD!);
    console.log(`   정답 비밀번호로 시도 → ${lockedMsg ?? '❌ 통과해버렸다 (잠금 무효)'}`);
    console.log(`   시도 후 카운터 ${(await readState())?.failed} (해시 대조 전에 막히므로 증가하지 않아야 한다)`);

    // ⑥ 없는 아이디
    console.log('\n6️⃣ 없는 아이디 — ②와 응답이 같은가');
    let unknownMsg: string | null = null;
    try {
      await authService.login({ username: 'no-such-user-zzz', password: 'whatever' });
    } catch (err) {
      if (err instanceof AppError) unknownMsg = `${err.status} "${err.message}"`;
    }
    console.log(`   ${unknownMsg}`);
    console.log(`   ②와 동일: ${unknownMsg === wrongMsg ? '✅' : '❌ 다르다 — 사용자 열거 가능'}`);
  } finally {
    await restore(before.actorId);
    const after = await readState();
    console.log(
      `\n🧹 원복 — 실패 ${after?.failed} / 잠금 ${after?.lockedUntil ?? '없음'} / status ${after?.status}`,
    );
  }

  console.log('\n✅ 완료');
}

main().catch((e) => {
  console.error('\n💥 예기치 못한 실패:', e);
  process.exit(1);
});
