/**
 * 회원 탈퇴 동작 확인 (TEL-28)
 *
 * auth.route 가 app.ts 에 마운트돼 있지 않아 HTTP 로는 칠 수 없다.
 * service 를 직접 호출해 v2-dev 를 향한 동작을 확인한다.
 *
 * 가입부터 태워서 진짜 계정을 만든다. 손으로 넣은 행으로는
 * user_credentials CASCADE 나 닉네임 이력 생성 같은 실제 관계를 확인할 수 없다.
 *
 * 확인 항목
 *   ① 상태 전이    actors.status = DELETED · deleted_at 기록
 *   ② 프로필 삭제  users 행 소멸 · user_credentials 도 함께 (FK CASCADE)
 *   ③ 로그인 차단  탈퇴한 계정으로 로그인 불가
 *   ④ 이력 보존    nickname_histories 가 남는다      ← 이 전환의 존재 이유
 *   ⑤ 재가입      같은 전화번호로 다시 가입된다
 *   ⑥ 멱등        두 번 탈퇴해도 오류가 없다
 *   ⑦ 정지 차단   SUSPENDED 계정은 403
 *
 * 만든 데이터는 finally 에서 전부 지운다.
 *
 *   npx tsx scripts/check-withdraw-flow.ts
 */
process.env.SMS_DRIVER = 'console'; // service 를 import 하기 전에 정해야 한다

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as phoneService from '../server/src/modules/phone/phone.service';
import * as authService from '../server/src/modules/auth/auth.service';
import { AppError } from '../server/src/errors/AppError';

const PHONE_MAIN = '01099960001'; // ①~⑥
const PHONE_SUSPENDED = '01099960002'; // ⑦
const ALL_PHONES = [PHONE_MAIN, PHONE_SUSPENDED];

const USER_MAIN = 'withdrawcheck_a';
const USER_REJOIN = 'withdrawcheck_b'; // ⑤ 같은 번호로 다시 가입
const USER_SUSPENDED = 'withdrawcheck_c';
const ALL_USERS = [USER_MAIN, USER_REJOIN, USER_SUSPENDED];

const PASSWORD = 'checkflow1234!';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  process.exit(1);
}
const db = createClient(url, key);

// ConsoleSender 가 찍는 줄에서 인증번호를 가로챈다.
let lastCode: string | null = null;
const log = console.log.bind(console);
console.log = (...args: unknown[]) => {
  const matched = /인증번호는 (\d{6})입니다/.exec(args.join(' '));
  if (matched) lastCode = matched[1];
  else log(...args);
};

let failed = 0;
function check(label: string, ok: boolean, detail?: string): void {
  log(`   ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed += 1;
}

/** AppError 면 "status 코드" 문자열, 아니면 null (통과했다는 뜻) */
async function attempt(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof AppError) return `${e.status} ${e.code}`;
    throw e;
  }
}

/** 가입까지 태우고 actor_id 를 돌려준다. */
async function signup(phone: string, username: string, tag: string): Promise<string> {
  await phoneService.sendCode({ phone, purpose: 'SIGNUP' }, `iphash-withdraw-${tag}`);
  if (!lastCode) throw new Error(`인증번호를 가로채지 못했다 (${tag})`);
  await phoneService.verifyCode({ phone, purpose: 'SIGNUP', code: lastCode });
  await authService.signup({ username, password: PASSWORD, phone });

  const { data, error } = await db
    .from('user_credentials')
    .select('actor_id')
    .eq('username', username)
    .single();
  if (error || !data) throw new Error(`가입 직후 자격증명을 못 찾았다 (${username})`);
  return data.actor_id as string;
}

async function cleanup(): Promise<void> {
  // users -> actors 는 RESTRICT 라 프로필을 먼저 지운다.
  // user_credentials 는 users CASCADE, nickname_histories 는 actors CASCADE 로 따라간다.
  const { data: creds } = await db
    .from('user_credentials')
    .select('actor_id')
    .in('username', ALL_USERS);
  const { data: profiles } = await db.from('users').select('actor_id').in('phone', ALL_PHONES);

  const actorIds = new Set<string>([
    ...(creds ?? []).map((r) => r.actor_id as string),
    ...(profiles ?? []).map((r) => r.actor_id as string),
    ...leaked,
  ]);

  if (actorIds.size > 0) {
    const ids = [...actorIds];
    await db.from('users').delete().in('actor_id', ids);
    await db.from('actors').delete().in('id', ids);
  }
  await db.from('phone_verification_challenges').delete().in('phone', ALL_PHONES);
}

// 탈퇴하면 users 로도 credentials 로도 찾을 수 없어진다. actor 를 따로 기억해 둔다.
const leaked: string[] = [];

async function main(): Promise<void> {
  await cleanup(); // 이전 실행이 남긴 것 정리

  log('\n0️⃣ 준비 — 가입');
  const actorId = await signup(PHONE_MAIN, USER_MAIN, 'main');
  leaked.push(actorId);
  const { count: historyBefore } = await db
    .from('nickname_histories')
    .select('id', { count: 'exact', head: true })
    .eq('actor_id', actorId);
  log(`   actor ${actorId}`);
  log(`   닉네임 이력 ${historyBefore ?? 0}건`);

  log('\n1️⃣ 2️⃣ 탈퇴 — 상태 전이와 프로필 삭제');
  await authService.withdraw(actorId);

  const { data: actor } = await db
    .from('actors')
    .select('status, deleted_at')
    .eq('id', actorId)
    .maybeSingle();
  check('actors.status = DELETED', actor?.status === 'DELETED', String(actor?.status));
  check('deleted_at 기록됨', Boolean(actor?.deleted_at));

  const { count: userLeft } = await db
    .from('users')
    .select('actor_id', { count: 'exact', head: true })
    .eq('actor_id', actorId);
  const { count: credLeft } = await db
    .from('user_credentials')
    .select('actor_id', { count: 'exact', head: true })
    .eq('actor_id', actorId);
  check('users 행 삭제됨', userLeft === 0, `${userLeft}건 남음`);
  check('user_credentials 도 삭제됨 (CASCADE)', credLeft === 0, `${credLeft}건 남음`);

  log('\n3️⃣ 로그인 차단');
  const loginResult = await attempt(() =>
    authService.login({ username: USER_MAIN, password: PASSWORD }),
  );
  check('로그인 실패', loginResult !== null, loginResult ?? '❌ 통과해 버림');

  log('\n4️⃣ 활동 이력 보존 — 이 전환의 존재 이유');
  const { count: historyAfter } = await db
    .from('nickname_histories')
    .select('id', { count: 'exact', head: true })
    .eq('actor_id', actorId);
  check(
    '닉네임 이력이 남아 있다',
    (historyAfter ?? 0) > 0 && historyAfter === historyBefore,
    `탈퇴 전 ${historyBefore} → 후 ${historyAfter}`,
  );

  log('\n5️⃣ 같은 전화번호로 재가입');
  const rejoinedId = await signup(PHONE_MAIN, USER_REJOIN, 'rejoin');
  leaked.push(rejoinedId);
  check('재가입 성공', Boolean(rejoinedId));
  check('새 actor 다 (옛 계정을 되살리지 않는다)', rejoinedId !== actorId);

  log('\n6️⃣ 멱등 — 이미 탈퇴한 계정을 또');
  const twice = await attempt(() => authService.withdraw(actorId));
  check('오류 없이 통과', twice === null, twice ?? '');

  log('\n7️⃣ 정지 계정은 탈퇴 불가');
  const suspendedId = await signup(PHONE_SUSPENDED, USER_SUSPENDED, 'suspended');
  leaked.push(suspendedId);
  await db.from('actors').update({ status: 'SUSPENDED' }).eq('id', suspendedId);

  const blocked = await attempt(() => authService.withdraw(suspendedId));
  check('403 WITHDRAW_SUSPENDED', blocked === '403 WITHDRAW_SUSPENDED', blocked ?? '❌ 통과해 버림');

  const { count: stillThere } = await db
    .from('users')
    .select('actor_id', { count: 'exact', head: true })
    .eq('actor_id', suspendedId);
  check('프로필이 그대로 있다', stillThere === 1, `${stillThere}건`);
}

main()
  .catch((e) => {
    log('\n💥 예기치 못한 실패:');
    log(e);
    failed += 1;
  })
  .finally(async () => {
    await cleanup();
    const { count } = await db
      .from('actors')
      .select('id', { count: 'exact', head: true })
      .in('id', leaked);
    log(`\n🧹 정리 — 남은 actor: ${count ?? 0}건`);
    log(failed === 0 ? '\n✅ 전부 통과' : `\n❌ ${failed}건 실패`);
    if (failed > 0) process.exitCode = 1;
  });
