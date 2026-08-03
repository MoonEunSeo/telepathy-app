/**
 * 휴대폰 인증 챌린지 동작 확인 (TEL-15)
 *
 * phone.route 가 app.ts 에 마운트돼 있지 않아 HTTP 로는 칠 수 없다.
 * service 를 직접 호출해 v2-dev 를 향한 동작을 확인한다.
 *
 * 실제 문자는 보내지 않는다 — SMS_DRIVER=console 로 콘솔 출력만 하고,
 * 그 줄에서 인증번호를 가로채 검증에 쓴다.
 *
 * 확인 항목
 *   ① 발송        행 생성 · 코드가 평문으로 저장되지 않음
 *   ② 검증 실패    400 · attempt_count 증가
 *   ③ 5회 실패    인증이 만료돼 더는 잡히지 않음
 *   ④ 번호 제한    5분 5회 초과 → 429
 *   ⑤ IP 제한     같은 IP 로 다른 번호 20건 초과 → 429
 *   ⑥ 정상 검증    verified_at 기록
 *   ⑦ 재검증      400 (이미 검증된 인증은 다시 안 잡힌다)
 *   ⑧ 가입 연결    인증 → signup 성공 → consumed_at 기록   ← 이 슬라이스의 목적
 *
 * 만든 데이터는 finally 에서 전부 지운다.
 *
 *   npx tsx scripts/check-phone-flow.ts
 */
process.env.SMS_DRIVER = 'console'; // service 를 import 하기 전에 정해야 한다

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as phoneService from '../server/src/modules/phone/phone.service';
import * as authService from '../server/src/modules/auth/auth.service';
import { AppError } from '../server/src/errors/AppError';

const PHONE_FAIL = '010-9997-0001'; // ①②③
const PHONE_LIMIT = '010-9997-0002'; // ④
const PHONE_OK = '010-9997-0003'; // ⑥⑦
const PHONE_SIGNUP = '010-9997-0004'; // ⑧
const IP_PHONES = Array.from({ length: 22 }, (_, i) => `010-9998-${String(i + 1).padStart(4, '0')}`);
const ALL_PHONES = [PHONE_FAIL, PHONE_LIMIT, PHONE_OK, PHONE_SIGNUP, ...IP_PHONES];

const USERNAME = 'phonecheck_zzz';
const PASSWORD = 'checkflow1234!';

// 테스트마다 다른 IP 를 써서 서로의 IP 한도를 갉아먹지 않게 한다.
const ip = (tag: string) => `iphash-${tag}`;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  process.exit(1);
}
const db = createClient(url, key);

// ConsoleSender 가 찍는 줄에서 인증번호를 가로챈다.
let lastCode: string | null = null;
const originalLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
  const matched = /인증번호는 (\d{6})입니다/.exec(args.join(' '));
  if (matched) lastCode = matched[1];
  else originalLog(...args); // 발송 로그는 출력에서 감춘다
};

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

async function send(phone: string, purpose: 'SIGNUP' | 'ACCOUNT_RECOVERY', ipHash: string) {
  lastCode = null;
  await phoneService.sendCode({ phone, purpose }, ipHash);
  if (!lastCode) throw new Error('인증번호를 가로채지 못했다 — ConsoleSender 가 아닌가?');
  return lastCode;
}

async function challengeOf(phone: string) {
  const { data } = await db
    .from('phone_verification_challenges')
    .select(
      'id, code_hash, attempt_count, verified_at, consumed_at, expires_at, created_at, request_ip_hash',
    )
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
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
  await db.from('phone_verification_challenges').delete().in('phone', ALL_PHONES);
  await db.from('users').delete().in('phone', ALL_PHONES);
}

async function main() {
  originalLog(`🎯 대상: ${url}`);
  await cleanup();

  // ① 발송
  originalLog('\n1️⃣ 발송');
  const code = await send(PHONE_FAIL, 'ACCOUNT_RECOVERY', ip('fail'));
  const first = await challengeOf(PHONE_FAIL);
  originalLog(`   인증번호 ${code} (6자리 ${/^\d{6}$/.test(code) ? '✅' : '❌'})`);
  originalLog(
    `   저장된 값이 평문이 아님 ${first && first.code_hash !== code && first.code_hash.startsWith('$2') ? '✅' : '❌'}`,
  );
  originalLog(`   verified_at ${first?.verified_at === null ? '✅ 아직 없음' : '❌ 벌써 있음'}`);
  originalLog(`   IP 해시 기록 ${first?.request_ip_hash ? '✅' : '❌'}`);

  // ② 틀린 코드
  originalLog('\n2️⃣ 검증 — 틀린 코드');
  const wrong = code === '000000' ? '111111' : '000000';
  originalLog(
    `   ${(await attempt(() => phoneService.verifyCode({ phone: PHONE_FAIL, purpose: 'ACCOUNT_RECOVERY', code: wrong }))) ?? '❌ 통과해버렸다'}`,
  );
  originalLog(`   attempt_count ${(await challengeOf(PHONE_FAIL))?.attempt_count} (기대: 1)`);

  // ③ 5회 채우면 죽는다
  originalLog('\n3️⃣ 검증 — 5회 실패');
  for (let i = 0; i < 4; i += 1) {
    await attempt(() =>
      phoneService.verifyCode({ phone: PHONE_FAIL, purpose: 'ACCOUNT_RECOVERY', code: wrong }),
    );
  }
  const dead = await challengeOf(PHONE_FAIL);
  originalLog(`   attempt_count ${dead?.attempt_count} (기대: 5)`);

  // expires_at 을 로컬 시계와 비교하면 안 된다 — DB 시계와 수백 ms 어긋난다.
  // 둘 다 DB 가 찍은 값끼리 본다. RPC 가 안 걸렸다면 created_at + 3분이 그대로 남아 있다.
  const ttlSeconds = dead
    ? (new Date(dead.expires_at).getTime() - new Date(dead.created_at).getTime()) / 1000
    : -1;
  originalLog(
    `   만료 앞당겨짐 ${ttlSeconds < 60 ? '✅' : '❌ 아직 살아 있다'} (수명 ${ttlSeconds.toFixed(1)}초 · 원래 180초)`,
  );
  originalLog(
    `   맞는 코드로도 거부 ${
      (await attempt(() =>
        phoneService.verifyCode({ phone: PHONE_FAIL, purpose: 'ACCOUNT_RECOVERY', code }),
      )) ? '✅' : '❌ 통과해버렸다'
    }`,
  );

  // ④ 번호 기준 발송 제한 (5분 5회)
  originalLog('\n4️⃣ 발송 제한 — 같은 번호 5분 5회');
  for (let i = 0; i < 5; i += 1) await send(PHONE_LIMIT, 'ACCOUNT_RECOVERY', ip('limit'));
  originalLog(`   5건 발송 완료`);
  originalLog(
    `   6번째 ${(await attempt(() => send(PHONE_LIMIT, 'ACCOUNT_RECOVERY', ip('limit')))) ?? '❌ 통과해버렸다'}`,
  );

  // ⑤ IP 기준 발송 제한 (5분 20회) — 번호를 바꿔 가며 던진다
  originalLog('\n5️⃣ 발송 제한 — 같은 IP 로 다른 번호 20건');
  const attacker = ip('attacker');
  for (let i = 0; i < 20; i += 1) await send(IP_PHONES[i], 'SIGNUP', attacker);
  originalLog(`   20건 발송 완료 (번호는 전부 다름 → 번호 제한엔 안 걸린다)`);
  originalLog(
    `   21번째 ${(await attempt(() => send(IP_PHONES[20], 'SIGNUP', attacker))) ?? '❌ 통과해버렸다'}`,
  );

  // ⑥ 정상 검증
  originalLog('\n6️⃣ 검증 — 정상');
  const okCode = await send(PHONE_OK, 'ACCOUNT_RECOVERY', ip('ok'));
  await phoneService.verifyCode({ phone: PHONE_OK, purpose: 'ACCOUNT_RECOVERY', code: okCode });
  const verified = await challengeOf(PHONE_OK);
  originalLog(`   verified_at ${verified?.verified_at ? '✅ 기록됨' : '❌ 비어 있음'}`);
  originalLog(`   consumed_at ${verified?.consumed_at === null ? '✅ 아직 없음' : '❌ 벌써 있음'}`);

  // ⑦ 재검증
  originalLog('\n7️⃣ 검증 — 같은 인증으로 또');
  originalLog(
    `   ${(await attempt(() => phoneService.verifyCode({ phone: PHONE_OK, purpose: 'ACCOUNT_RECOVERY', code: okCode }))) ?? '❌ 통과해버렸다'}`,
  );

  // ⑧ 가입까지 이어지는가 — 이 슬라이스의 목적
  originalLog('\n8️⃣ 인증 → 회원가입 연결');
  const signupCode = await send(PHONE_SIGNUP, 'SIGNUP', ip('signup'));
  originalLog(
    `   가입 먼저 시도 ${(await attempt(() => authService.signup({ username: USERNAME, password: PASSWORD, phone: PHONE_SIGNUP }))) ?? '❌ 인증 전인데 통과'}`,
  );
  await phoneService.verifyCode({ phone: PHONE_SIGNUP, purpose: 'SIGNUP', code: signupCode });
  await authService.signup({ username: USERNAME, password: PASSWORD, phone: PHONE_SIGNUP });
  const consumed = await challengeOf(PHONE_SIGNUP);
  originalLog(`   인증 후 가입 ✅ 성공`);
  originalLog(`   consumed_at ${consumed?.consumed_at ? '✅ 기록됨' : '❌ 비어 있음'}`);
}

main()
  .catch((e) => {
    originalLog('\n💥 예기치 못한 실패:');
    originalLog(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    const { count } = await db
      .from('phone_verification_challenges')
      .select('id', { count: 'exact', head: true })
      .in('phone', ALL_PHONES);
    originalLog(`\n🧹 정리 — 남은 인증: ${count ?? 0}건`);
  });
