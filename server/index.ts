import './env'; // 반드시 최상단 — 설정과 라우트보다 먼저 .env 로드

import { startServer } from './src/bootstrap/server';

void startServer().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.message : '알 수 없는 오류';
  console.error(`[Server] 시작 실패: ${errorName}`);
  process.exitCode = 1;
});
