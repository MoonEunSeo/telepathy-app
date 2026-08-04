/**
 * 닉네임 변경 동작 확인 (TEL-29)
 *
 * users.route 가 app.ts 에 마운트돼 있지 않아 HTTP 로는 칠 수 없다.
 * service 를 직접 호출해 v2-dev 를 향한 동작을 확인한다.
 *
 * 가입부터 태워서 진짜 계정을 만든다. 손으로 넣은 행으로는
 * 가입 시 자동 생성되는 이력(SIGNUP_AUTO)과의 연결을 확인할 수 없다.
 *
 * 확인 항목
 *   ① 변경 성공    users.nickname 갱신
 *   ② 이력 연속    닫힌 ended_at 과 새 started_at 이 정확히 같다
 *   ③ 사슬        연속 2회 변경 → 이력 3개 · 열린 것 정확히 1개
 *   ④ 중복        남이 쓰는 이름 → 409 NICKNAME_TAKEN (레거시는 500 이었다)
 *   ⑤ 같은 이름    이력이 늘지 않는다
 *   ⑥ DB 안전망   부분 UNIQUE 인덱스가 직접 INSERT 도 막는다
 *   ⑦ 탈퇴 계정    401
 *   ⑧ 프로필      actorId · username · nickname
 *
 * 만든 데이터는 finally 에서 전부 지운다.
 *
 *   npx tsx scripts/check-nickname-flow.ts
 */
process.env.SMS_DRIVER = 'console'; // service 를 import 하기 전에 정해야 한다

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as phoneService from '../server/src/modules/phone/phone.service';
import * as authService from '../server/src/modules/auth/auth.service';
import * as usersService from '../server/src/modules/users/users.service';
import { AppError } from '../server/src/errors/AppError';

const PHONE_A = '01099950001';
const PHONE_B = '01099950002';
const ALL_PHONES = [PHONE_A, PHONE_B];

const USER_A = 'nickcheck_a';
const USER_B = 'nickcheck_b';
const ALL_USERS = [USER_A, USER_B];

const PASSWORD = 'checkflow1234!';
const NICK_1 = '검증닉네임하나';
const NICK_2 = '검증닉네임둘';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  process.exit(1);
}
const db = createClient(url, key);

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

/** AppError 면 "status CODE", 아니면 null (통과했다는 뜻) */
async function attempt(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof AppError) return `${e.status} ${e.code}`;
    throw e;
  }
}

const actorIds: string[] = [];

async function signup(phone: string, username: string, tag: string): Promise<string> {
  await phoneService.sendCode({ phone, purpose: 'SIGNUP' }, `iphash-nick-${tag}`);
  if (!lastCode) throw new Error(`인증번호를 가로채지 못했다 (${tag})`);
  await phoneService.verifyCode({ phone, purpose: 'SIGNUP', code: lastCode });
  await authService.signup({ username, password: PASSWORD, phone });

  const { data, error } = await db
    .from('user_credentials')
    .select('actor_id')
    .eq('username', username)
    .single();
  if (error || !data) throw new Error(`가입 직후 자격증명을 못 찾았다 (${username})`);

  const id = data.actor_id as string;
  actorIds.push(id);
  return id;
}

interface HistoryRow {
  nickname: string;
  started_at: string;
  ended_at: string | null;
  change_reason: string;
}

async function histories(actorId: string): Promise<HistoryRow[]> {
  const { data } = await db
    .from('nickname_histories')
    .select('nickname, started_at, ended_at, change_reason')
    .eq('actor_id', actorId)
    .order('started_at', { ascending: true });
  return (data ?? []) as HistoryRow[];
}

async function currentNickname(actorId: string): Promise<string | null> {
  const { data } = await db.from('users').select('nickname').eq('actor_id', actorId).maybeSingle();
  return data?.nickname ?? null;
}

async function cleanup(): Promise<void> {
  const { data: creds } = await db
    .from('user_credentials')
    .select('actor_id')
    .in('username', ALL_USERS);
  const { data: profiles } = await db
    .from('users')
    .select('actor_id')
    .or(`phone.in.(${ALL_PHONES.join(',')}),nickname.in.(${NICK_1},${NICK_2})`);

  const ids = new Set<string>([
    ...(creds ?? []).map((r) => r.actor_id as string),
    ...(profiles ?? []).map((r) => r.actor_id as string),
    ...actorIds,
  ]);

  if (ids.size > 0) {
    const list = [...ids];
    // users -> actors 는 RESTRICT 라 프로필을 먼저 지운다.
    // nickname_histories 는 actors CASCADE 로 따라간다.
    await db.from('users').delete().in('actor_id', list);
    await db.from('actors').delete().in('id', list);
  }
  await db.from('phone_verification_challenges').delete().in('phone', ALL_PHONES);
}

async function main(): Promise<void> {
  await cleanup(); // 이전 실행이 남긴 것 정리

  log('\n0️⃣ 준비 — 가입 2건');
  const actorA = await signup(PHONE_A, USER_A, 'a');
  const actorB = await signup(PHONE_B, USER_B, 'b');
  const initial = await histories(actorA);
  log(`   A ${actorA}`);
  log(`   가입 직후 이력 ${initial.length}건 (${initial[0]?.change_reason})`);

  log('\n1️⃣ 2️⃣ 변경 — 현재 이름과 이력 연속성');
  await usersService.changeNickname(actorA, { nickname: NICK_1 });

  check('users.nickname 갱신', (await currentNickname(actorA)) === NICK_1);

  const afterFirst = await histories(actorA);
  const closed = afterFirst.find((h) => h.ended_at !== null);
  const open = afterFirst.filter((h) => h.ended_at === null);
  check('열린 이력이 정확히 1개', open.length === 1, `${open.length}개`);
  check('열린 이력의 이름이 현재 이름과 같다', open[0]?.nickname === NICK_1);
  check('이전 이력이 닫혔다', Boolean(closed?.ended_at));
  check(
    '이력이 끊기지 않는다 (닫힌 ended_at = 새 started_at)',
    closed?.ended_at === open[0]?.started_at,
    `${closed?.ended_at} vs ${open[0]?.started_at}`,
  );
  check('change_reason = USER_CHANGE', open[0]?.change_reason === 'USER_CHANGE');

  log('\n3️⃣ 연속 2회 변경');
  await usersService.changeNickname(actorA, { nickname: NICK_2 });
  const afterSecond = await histories(actorA);
  check('이력 3건 (가입 1 + 변경 2)', afterSecond.length === 3, `${afterSecond.length}건`);
  check(
    '열린 것은 여전히 1개',
    afterSecond.filter((h) => h.ended_at === null).length === 1,
  );

  log('\n4️⃣ 남이 쓰는 이름');
  const taken = await attempt(() => usersService.changeNickname(actorB, { nickname: NICK_2 }));
  check('409 NICKNAME_TAKEN', taken === '409 NICKNAME_TAKEN', taken ?? '❌ 통과해 버림');
  check('B 의 이름은 그대로다', (await currentNickname(actorB)) !== NICK_2);

  log('\n5️⃣ 같은 이름으로 변경');
  await usersService.changeNickname(actorA, { nickname: NICK_2 });
  const afterSame = await histories(actorA);
  check('이력이 늘지 않았다', afterSame.length === 3, `${afterSame.length}건`);

  log('\n6️⃣ DB 안전망 — 열린 이력 2개를 직접 넣어 본다');
  const { error: dupError } = await db.from('nickname_histories').insert({
    actor_id: actorA,
    nickname: '직접넣은이름',
    started_at: new Date().toISOString(),
    change_reason: 'SYSTEM',
  });
  check('부분 UNIQUE 인덱스가 막는다', dupError !== null, dupError?.code ?? '❌ 들어가 버림');

  log('\n7️⃣ 탈퇴한 계정');
  await authService.withdraw(actorA);
  const gone = await attempt(() => usersService.changeNickname(actorA, { nickname: '아무거나' }));
  check('401 UNAUTHENTICATED', gone === '401 UNAUTHENTICATED', gone ?? '❌ 통과해 버림');

  log('\n8️⃣ 프로필 조회');
  const profile = await usersService.getProfile(actorB);
  check('actorId', profile.actorId === actorB);
  check('username', profile.username === USER_B, profile.username);
  check('nickname', typeof profile.nickname === 'string' && profile.nickname.length > 0);

  const goneProfile = await attempt(() => usersService.getProfile(actorA));
  check('탈퇴 계정 프로필 → 401', goneProfile === '401 UNAUTHENTICATED', goneProfile ?? '');
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
      .in('id', actorIds);
    log(`\n🧹 정리 — 남은 actor: ${count ?? 0}건`);
    log(failed === 0 ? '\n✅ 전부 통과' : `\n❌ ${failed}건 실패`);
    if (failed > 0) process.exitCode = 1;
  });
