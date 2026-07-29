/**
 * 회원가입 수직 슬라이스 동작 확인 (TEL-15)
 *
 * auth.route 가 app.ts 에 마운트돼 있지 않아 HTTP 로는 칠 수 없다.
 * service 를 직접 호출해 v2-dev 를 향한 동작을 확인한다.
 *
 * 확인 항목
 *   ① 인증 없이 가입      403 PHONE_NOT_VERIFIED
 *   ② 정상 가입           4테이블에 모두 기록 · 불변식 · 토큰 발급
 *   ③ 가입 계정으로 로그인 signup → login 이 이어지는가
 *   ④ 인증 재사용         403 (consumed_at 설정됨)
 *   ⑤ username 중복       409 + 롤백 (고아 행 0)
 *   ⑥ 닉네임 충돌 번역    RPC 를 직접 불러 NICKNAME_TAKEN 확인
 *
 * 만든 데이터는 finally 에서 전부 지운다.
 *
 *   V2_TEST_PASSWORD 는 필요 없다. 이 스크립트는 자체 계정을 만든다.
 *   npx tsx scripts/check-signup-flow.ts
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import * as authService from '../server/src/modules/auth/auth.service';
import { AppError } from '../server/src/errors/AppError';

const PHONE = '010-9999-0002';
// ⑤⑥ 은 다른 번호를 쓴다. RPC 가 users(phone) 를 user_credentials(username) 보다
// 먼저 넣어서, 같은 번호를 재사용하면 전화번호 충돌이 먼저 터진다.
const PHONE2 = '010-9999-0003';
const USERNAME = 'signupcheck_zzz';
const PASSWORD = 'checkflow1234!';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  process.exit(1);
}
const db = createClient(url, key);

/** 검증 완료 상태의 인증 challenge 를 만든다 (앱에 아직 발급 흐름이 없다) */
async function issueVerifiedChallenge(phone = PHONE) {
  const { error } = await db.from('phone_verification_challenges').insert({
    phone,
    purpose: 'SIGNUP',
    code_hash: 'dummy',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    verified_at: new Date().toISOString(),
  });
  if (error) throw new Error(`인증 생성 실패: ${error.message}`);
}

/** signup 을 호출해 실패 시 "상태 메시지" 문자열을 돌려준다. 성공하면 null */
async function attemptSignup(username: string, phone = PHONE): Promise<string | null> {
  try {
    await authService.signup({ username, password: PASSWORD, phone });
    return null;
  } catch (err) {
    if (err instanceof AppError) return `${err.status} "${err.message}"`;
    throw err;
  }
}

/** 만들어진 신원의 4테이블 상태를 모아 본다 */
async function inspect(username: string) {
  const { data: cred } = await db
    .from('user_credentials')
    .select('actor_id, username, password_algorithm, failed_attempt_count')
    .eq('username', username)
    .maybeSingle();
  if (!cred) return null;

  const { data: user } = await db
    .from('users')
    .select('phone, nickname, gender, birthdate')
    .eq('actor_id', cred.actor_id)
    .maybeSingle();
  const { data: actor } = await db
    .from('actors')
    .select('actor_type, status')
    .eq('id', cred.actor_id)
    .maybeSingle();
  const { data: hist } = await db
    .from('nickname_histories')
    .select('nickname, ended_at, change_reason')
    .eq('actor_id', cred.actor_id);

  return { cred, user, actor, hist: hist ?? [] };
}

async function cleanup() {
  const { data: cred } = await db
    .from('user_credentials')
    .select('actor_id')
    .eq('username', USERNAME)
    .maybeSingle();

  if (cred) {
    await db.from('nickname_histories').delete().eq('actor_id', cred.actor_id);
    await db.from('user_credentials').delete().eq('actor_id', cred.actor_id);
    await db.from('users').delete().eq('actor_id', cred.actor_id);
    await db.from('actors').delete().eq('id', cred.actor_id);
  }
  await db.from('phone_verification_challenges').delete().in('phone', [PHONE, PHONE2]);
  await db.from('users').delete().in('phone', [PHONE, PHONE2]);
}

async function main() {
  console.log(`🎯 대상: ${url}`);
  await cleanup(); // 이전 실행의 잔재 제거

  const actorsBefore = (await db.from('actors').select('id', { count: 'exact', head: true })).count;

  // ① 인증 없이 가입
  console.log('\n1️⃣ 인증 없이 가입');
  console.log(`   ${(await attemptSignup(USERNAME)) ?? '❌ 통과해버렸다'}`);

  // ② 정상 가입
  console.log('\n2️⃣ 정상 가입');
  await issueVerifiedChallenge();
  const result = await authService.signup({
    username: USERNAME,
    password: PASSWORD,
    phone: PHONE,
    gender: '남성',
    birthdate: '1995-03-01',
  });
  const payload = jwt.decode(result.token) as Record<string, unknown>;
  const state = await inspect(USERNAME);

  console.log(`   토큰      ${result.token.slice(0, 18)}… (${result.token.length}자)`);
  console.log(`   user_id   ${payload.user_id}`);
  console.log(`   actor     ${state?.actor?.actor_type} / ${state?.actor?.status}`);
  console.log(`   users     ${state?.user?.phone} · ${state?.user?.nickname} · ${state?.user?.gender}`);
  console.log(`   자격증명   ${state?.cred.username} · ${state?.cred.password_algorithm}`);
  console.log(`   이력       ${state?.hist.length}건 · ${state?.hist[0]?.change_reason}`);
  console.log(
    `   불변식     현재 닉네임 = 열린 이력 행: ${
      state?.hist.filter((h) => h.ended_at === null).length === 1 &&
      state?.hist[0]?.nickname === state?.user?.nickname
        ? '✅'
        : '❌'
    }`,
  );
  console.log(`   JWT user_id = actors.id: ${payload.user_id === state?.cred.actor_id ? '✅' : '❌'}`);

  // ③ 가입한 계정으로 로그인
  console.log('\n3️⃣ 가입한 계정으로 로그인');
  const login = await authService.login({ username: USERNAME, password: PASSWORD });
  console.log(`   ✅ 성공 — user_id ${(jwt.decode(login.token) as Record<string, unknown>).user_id}`);

  // ④ 인증 재사용
  console.log('\n4️⃣ 같은 인증으로 또 가입');
  console.log(`   ${(await attemptSignup('another_user_zzz')) ?? '❌ 통과해버렸다'}`);

  // ⑤ username 중복 + 롤백
  console.log('\n5️⃣ username 중복 — 롤백 확인');
  await issueVerifiedChallenge(PHONE2);
  const actorsMid = (await db.from('actors').select('id', { count: 'exact', head: true })).count;
  console.log(`   ${(await attemptSignup(USERNAME, PHONE2)) ?? '❌ 통과해버렸다'}`);
  const actorsAfter = (await db.from('actors').select('id', { count: 'exact', head: true })).count;
  console.log(`   actors 증가분 ${(actorsAfter ?? 0) - (actorsMid ?? 0)} (기대: 0)`);
  const { data: ch } = await db
    .from('phone_verification_challenges')
    .select('consumed_at')
    .eq('phone', PHONE2)
    .is('consumed_at', null)
    .maybeSingle();
  console.log(`   인증 보존됨: ${ch ? '✅ 미소비' : '❌ 소비돼버림'}`);

  // ⑥ 닉네임 충돌 번역 (RPC 직접 호출)
  console.log('\n6️⃣ 닉네임 충돌 — RPC 가 번역하는가');
  const taken = state?.user?.nickname as string;
  const { error: nickErr } = await db.rpc('signup_user', {
    p_username: 'yet_another_zzz',
    p_password_hash: 'x',
    p_phone: PHONE2,
    p_nickname: taken,
  });
  console.log(`   기존 닉네임 "${taken}" 으로 시도 → ${nickErr?.message ?? '❌ 통과해버렸다'}`);

  const actorsEnd = (await db.from('actors').select('id', { count: 'exact', head: true })).count;
  console.log(`   전체 actors 증가분 ${(actorsEnd ?? 0) - (actorsBefore ?? 0)} (기대: 1 — ②에서 만든 것)`);
}

main()
  .catch((e) => {
    console.error('\n💥 예기치 못한 실패:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    const left = await inspect(USERNAME);
    console.log(`\n🧹 정리 — 남은 계정: ${left ? '❌ 있음' : '없음'}`);
  });
