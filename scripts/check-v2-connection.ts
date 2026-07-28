/**
 * v2-dev 연결 점검 (일회성)
 *
 * auth.repository.ts 의 findLoginCredential 과 동일한 질의를 실행해
 * 1) .env 가 v2-dev 를 보는지 2) service_role 키가 유효한지
 * 3) 중첩 임베드가 객체로 오는지 배열로 오는지 를 확인한다.
 *
 * 개인정보·해시는 마스킹해서 출력한다.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

// v2-dev 전용 테스트 계정. 실제 회원 해시는 마이그레이션 때 마스킹돼(33자)
// bcrypt 대조가 항상 실패하므로, 성공 경로는 이 계정으로만 확인할 수 있다.
//
// 이 저장소는 PUBLIC 이라 비밀번호를 파일에 두지 않는다.
// 값은 Linear 이슈에 적어 뒀다. 실행 시 환경변수로 넘긴다.
//   V2_TEST_PASSWORD=... npx tsx scripts/check-v2-connection.ts
const TEST_USERNAME = process.env.V2_TEST_USERNAME ?? 'testuser';
const TEST_PASSWORD = process.env.V2_TEST_PASSWORD;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  process.exit(1);
}

const supabase = createClient(url, key);
const mask = (s: string) => (s.length <= 2 ? '**' : `${s[0]}***${s.slice(-1)}`);

const SELECT = `user_id, password_hash, password_algorithm, failed_attempt_count, locked_until,
                users!inner ( actors!inner ( status ) )`;

async function main() {
  console.log(`\n📍 대상: ${url}`);
  console.log(`   프로젝트: ${url!.includes('gczftwqeulqzedcirqrr') ? 'v2-dev ✅' : '⚠️ 운영'}\n`);

  // 1. 테이블 접근 + 행 수
  const { count, error: countErr } = await supabase
    .from('user_credentials')
    .select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('❌ user_credentials 접근 실패:', countErr.message);
    process.exit(1);
  }
  console.log(`1️⃣  user_credentials 접근 OK — ${count} 행`);

  // 2. 테스트 계정 존재 확인
  const { data: sample, error: sampleErr } = await supabase
    .from('user_credentials')
    .select('username')
    .eq('username', TEST_USERNAME)
    .maybeSingle();
  if (sampleErr || !sample) {
    console.error(`❌ 테스트 계정(${TEST_USERNAME}) 없음:`, sampleErr?.message ?? '행 없음');
    process.exit(1);
  }
  const username = sample.username as string;
  console.log(`2️⃣  테스트 계정 확인 — ${username}`);

  // 3. repository 와 동일한 중첩 질의
  const { data, error } = await supabase
    .from('user_credentials')
    .select(SELECT)
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('❌ 중첩 질의 실패:', error.code, error.message);
    process.exit(1);
  }
  if (!data) {
    console.error('❌ 존재하는 username 인데 결과가 없다');
    process.exit(1);
  }

  const row = data as Record<string, unknown>;
  console.log('3️⃣  중첩 질의 OK — 반환 형태:');
  console.log(
    JSON.stringify(
      {
        ...row,
        password_hash: `${String(row.password_hash).slice(0, 7)}... (마스킹, 길이 ${String(row.password_hash).length})`,
        user_id: mask(String(row.user_id)),
      },
      null,
      2,
    ),
  );

  // 4. 임베드가 객체인지 배열인지 — 코드에서 row.users.actors.status 가 되는지 결정한다
  const users = row.users;
  const usersIsArray = Array.isArray(users);
  const actors = usersIsArray ? (users as any[])[0]?.actors : (users as any)?.actors;
  const actorsIsArray = Array.isArray(actors);
  console.log(
    `\n4️⃣  임베드 형태 — users: ${usersIsArray ? '배열 ⚠️' : '객체 ✅'} / actors: ${actorsIsArray ? '배열 ⚠️' : '객체 ✅'}`,
  );

  // 5. 없는 username 은 error 가 아니라 data=null 이어야 한다
  const { data: none, error: noneErr } = await supabase
    .from('user_credentials')
    .select(SELECT)
    .eq('username', '__없는_아이디__')
    .maybeSingle();
  console.log(
    `5️⃣  없는 아이디 — data: ${none === null ? 'null ✅' : '값 있음 ⚠️'} / error: ${noneErr === null ? 'null ✅' : `${noneErr.code} ⚠️`}`,
  );

  // 6. service 가 검사하는 값들
  console.log(
    `\n6️⃣  service 판단 재료 — algorithm: ${row.password_algorithm} / failed: ${row.failed_attempt_count} / locked: ${row.locked_until ?? 'null'}`,
  );

  // 7. service 의 bcrypt.compare 재현 — 로그인 성공 경로
  const hash = String(row.password_hash);
  let matched = false;
  let wrongRejected = false;
  if (TEST_PASSWORD) {
    matched = await bcrypt.compare(TEST_PASSWORD, hash);
    wrongRejected = !(await bcrypt.compare('틀린비밀번호', hash));
    console.log(
      `7️⃣  비밀번호 대조 — 정답: ${matched ? 'true ✅' : 'false ❌'} / 오답 거부: ${wrongRejected ? 'true ✅' : 'false ❌'}`,
    );
  } else {
    console.log('7️⃣  비밀번호 대조 — 건너뜀 (V2_TEST_PASSWORD 미설정)');
  }

  // 8. actors.status 가 ACTIVE 여야 service 를 통과한다
  const status = (row.users as any)?.actors?.status;
  console.log(`8️⃣  actors.status — ${status} ${status === 'ACTIVE' ? '✅' : '⚠️ 로그인 차단됨'}`);

  const ok = (!TEST_PASSWORD || (matched && wrongRejected)) && status === 'ACTIVE';
  console.log(`\n${ok ? '✅ 로그인 경로 전 구간 정상' : '❌ 문제 있음'}\n`);
  if (!ok) process.exit(1);
}

main();
