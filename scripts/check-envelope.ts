/**
 * 공통 응답 규약 동작 확인 (TEL-27 / 계획안 §35)
 *
 * 다른 check-*-flow 스크립트는 service 를 직접 부르지만, 이 스크립트는
 * **HTTP 응답의 모양**을 봐야 해서 라우터를 메모리에서 띄우고 실제로 요청한다.
 *
 * DB 를 쓰지 않는다. 봉투를 만드는 곳은 sendOk 와 errorHandler 둘뿐이고,
 * 컨트롤러가 그 둘을 계약대로 쓰는지는 제네릭이 컴파일 시점에 잡는다.
 * 그래서 여기서는 두 함수의 출력만 확인한다.
 *
 * 확인 항목
 *   ① 성공 응답      success: true · data 존재
 *   ② 과도기 필드    최상위 message 가 아직 있다 (없으면 레거시 프론트가 깨진다)
 *   ③ 검증 실패      실제 라우트 → 400 · VALIDATION_FAILED
 *   ④ 오류 필드      error 에 code · message · requestId 가 모두 있다
 *   ⑤ 추적 가능      X-Request-Id 헤더와 error.requestId 가 같다
 *   ⑥ 요청마다 고유  두 번 호출하면 requestId 가 다르다
 *   ⑦ AppError 전달  던진 status·code 가 그대로 나온다
 *   ⑧ 내부 은닉      처리되지 않은 오류는 500 · INTERNAL_ERROR, 내부 메시지 미노출
 *   ⑨ 로그 연결      응답의 requestId 로 서버 로그를 찾을 수 있다   ← 이 기능의 목적
 *
 *   npx tsx scripts/check-envelope.ts
 */
import 'dotenv/config';
import express from 'express';
import type { AddressInfo } from 'node:net';

import { requestId } from '../server/src/middleware/requestId';
import { errorHandler } from '../server/src/middleware/errorHandler';
import { sendOk } from '../server/src/utils/respond';
import { AppError } from '../server/src/errors/AppError';
import authRoute from '../server/src/modules/auth/auth.route';
import type { ApiSuccess } from '../shared/api';

let failed = 0;

function check(label: string, ok: boolean, detail?: string): void {
  console.log(`   ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed += 1;
}

// 서버가 실제로 내려준 것을 그대로 본다.
// 타입을 씌우면 없는 필드가 있는 것처럼 보여 검사의 의미가 사라진다.
type Json = Record<string, unknown>;

async function get(base: string, path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, init);
  return { res, body: (await res.json()) as Json };
}

function errorOf(body: Json): Json | null {
  const e = body.error;
  return e !== null && typeof e === 'object' ? (e as Json) : null;
}

async function main(): Promise<void> {
  const app = express();
  app.use(requestId);
  app.use(express.json());

  // 실제 라우트 — validateBody 실패가 errorHandler 까지 가는 경로를 그대로 태운다
  app.use('/api/auth', authRoute);

  // 봉투 자체를 확인하기 위한 임시 경로. 운영 코드에 넣지 않는다.
  const probe = express.Router();
  probe.get('/ok', (_req, res) =>
    sendOk<ApiSuccess<{ hello: string }>>(res, 200, { hello: 'world' }, 'probe 성공'),
  );
  probe.get('/app-error', () => {
    throw new AppError(403, 'RECOVERY_NOT_VERIFIED', '휴대폰 인증이 확인되지 않았습니다.');
  });
  probe.get('/boom', () => {
    throw new Error('내부 사정 — 이 문구가 응답에 나오면 안 된다');
  });
  probe.use(errorHandler);
  app.use('/probe', probe);

  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    console.log('\n① ② 성공 응답');
    {
      const { res, body } = await get(base, '/probe/ok');
      check('200', res.status === 200, String(res.status));
      check('success: true', body.success === true);
      check('data 존재', JSON.stringify(body.data) === '{"hello":"world"}', JSON.stringify(body.data));
      check('최상위 message 병기 (과도기)', body.message === 'probe 성공');
      check('error 없음', body.error === undefined);
    }

    console.log('\n③ ④ ⑤ 검증 실패 — 실제 라우트');
    {
      const { res, body } = await get(base, '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // username·password 없음
      });
      const err = errorOf(body);
      check('400', res.status === 400, String(res.status));
      check('success: false', body.success === false);
      check('error.code = VALIDATION_FAILED', err?.code === 'VALIDATION_FAILED', String(err?.code));
      check('error.message 존재', typeof err?.message === 'string' && err.message.length > 0);
      check('error.requestId 존재', typeof err?.requestId === 'string');
      check(
        'X-Request-Id 헤더와 일치',
        res.headers.get('x-request-id') === err?.requestId,
        `헤더 ${res.headers.get('x-request-id')}`,
      );
      check('최상위 message 병기 (과도기)', typeof body.message === 'string');
    }

    console.log('\n⑥ 요청마다 다른 requestId');
    {
      const a = await get(base, '/probe/app-error');
      const b = await get(base, '/probe/app-error');
      const idA = errorOf(a.body)?.requestId;
      const idB = errorOf(b.body)?.requestId;
      check('두 요청의 requestId 가 다르다', Boolean(idA) && idA !== idB);
    }

    console.log('\n⑦ AppError 가 그대로 전달된다');
    {
      const { res, body } = await get(base, '/probe/app-error');
      const err = errorOf(body);
      check('403', res.status === 403, String(res.status));
      check('error.code = RECOVERY_NOT_VERIFIED', err?.code === 'RECOVERY_NOT_VERIFIED');
      check('message 가 던진 그대로', err?.message === '휴대폰 인증이 확인되지 않았습니다.');
    }

    console.log('\n⑧ ⑨ 처리되지 않은 오류는 내부를 숨기고, 로그로는 찾을 수 있다');
    {
      // errorHandler 가 실제로 출력하는 것을 가로챈다.
      // 응답과 로그를 잇는 것이 requestId 의 존재 이유라, 그 연결을 직접 확인한다.
      const logs: string[] = [];
      const originalError = console.error.bind(console);
      console.error = (...args: unknown[]) => void logs.push(args.map(String).join(' '));

      let res: Response;
      let body: Json;
      try {
        ({ res, body } = await get(base, '/probe/boom'));
      } finally {
        console.error = originalError;
      }

      const err = errorOf(body);
      check('500', res.status === 500, String(res.status));
      check('error.code = INTERNAL_ERROR', err?.code === 'INTERNAL_ERROR');
      check('내부 문구 미노출', !JSON.stringify(body).includes('내부 사정'));
      check(
        '응답의 requestId 로 서버 로그를 찾을 수 있다',
        typeof err?.requestId === 'string' && logs.some((l) => l.includes(err.requestId as string)),
        `로그 ${logs.length}줄`,
      );
      check('로그에는 내부 문구가 남는다', logs.some((l) => l.includes('내부 사정')));
    }
  } finally {
    server.close();
  }

  console.log(failed === 0 ? '\n✅ 전부 통과' : `\n❌ ${failed}건 실패`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('\n💥 예기치 못한 실패:');
  console.error(e);
  process.exitCode = 1;
});
