// server/index.ts
import './env'; // ⚠️ 반드시 최상단 — 라우트/설정보다 먼저 .env 로드

import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socketEvents';
import { expireRound } from './src/modules/matching/matching.service';
import { getCurrentRound } from './src/utils/round';
import { registerSocketHandlers, type SocketData } from './src/config/chat.socket';
import { createOriginDelegate } from './src/config/cors';
import { serverRuntimeConfig } from './src/config/runtime';
import app from './app';
import { decodeToken } from './src/middleware/auth';

// V2 매칭 모듈은 match_attempts·match_rounds 를 요구한다.
// 운영 DB 에는 아직 없어 호출하면 15초마다 실패한다 (TEL-18).
// 스키마가 붙은 환경에서만 켠다 — 계획안 §4 의 Feature Flag.
const V2_MATCHING_ENABLED = process.env.V2_MATCHING_ENABLED === 'true';

// ✅ HTTP 서버 생성
// CORS 는 app.ts 에서 /api 에만 건다. 여기에 있던 app.use(cors(...)) 는 실행되지 않았다 —
// app.ts 의 SPA 폴백이 모든 요청을 받아 응답을 끝내므로 이 뒤로 내려오지 않는다.
// 아래 Socket.IO 의 cors 는 new Server(...) 의 옵션이라 별개다.
const server = createServer(app);

// 제네릭 4개로 맞춰야 chat.socket.ts 와 타입이 일치
interface InterServerEvents {}

// ✅ Socket.IO 설정
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  server,
  {
    cors: {
      origin: createOriginDelegate(serverRuntimeConfig.webOrigins),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket'],
    path: '/socket.io',
  },
);

// 쿠키 헤더에서 token만 뽑는다 (coookie 패키지는 cookie-parser의 전이 의존성이라 직접 import 지양)
function readToken(raw?: string): string | undefined {
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'token') return decodeURIComponent(v.join('='));
  }
  return undefined;
}

// ✅ 소켓 인증 - 토큰이 있으면 통과
io.use((socket, next) => {
  const user = decodeToken(readToken(socket.handshake.headers.cookie));
  if (!user) return next(new Error('인증 필요'));
  socket.data.user = user;
  next();
});

// ✅ WebSocket 연결 수 카운트
let onlineUsers = 0;
io.on('connection', (socket) => {
  onlineUsers++;
  console.log('🟢 유저 접속, 현재 인원:', onlineUsers);
  io.emit('onlineCount', onlineUsers);

  socket.on('disconnect', () => {
    onlineUsers--;
    console.log('🔴 유저 종료, 현재 인원:', onlineUsers);
    io.emit('onlineCount', onlineUsers);
  });
});

// ✅ 채팅 관련 소켓 핸들러 등록
registerSocketHandlers(io);

// ✅ 라운드 경계(15초) 감시 → 전환 시 전 클라이언트에 push (클라이언트 1초 폴링 대체)
// 서버에 타이머 1개만 존재하며(유저 수와 무관), 라운드가 바뀔 때만 emit(15초에 1회).
let lastRound = getCurrentRound().round;
setInterval(() => {
  const { round } = getCurrentRound();
  if (round !== lastRound) {
    // lastRound 를 덮어쓰기 전에 잡아둔다. 순서가 바뀌면 방금 시작한 라운드를 지운다.
    const endedRound = lastRound;
    lastRound = round;
    // 폴링 대체용 push 라 V2 여부와 무관하게 항상 보낸다.
    io.emit('round:change', { round });
    if (V2_MATCHING_ENABLED) {
      // 타이머 콜백은 await 할 수 없다. expireRound 가 내부에서 모든 예외를 잡으므로
      // unhandled rejection 은 나지 않으며, void 로 "의도적으로 안 기다린다" 를 명시한다.
      void expireRound(endedRound);
    }
  }
}, 1000);

// ✅ 포트 설정 및 서버 실행
server.listen(serverRuntimeConfig.port, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${serverRuntimeConfig.port}`);
  console.log(`   웹 정적 파일 제공: ${serverRuntimeConfig.serveWebStatic ? 'ON' : 'OFF'}`);
  console.log(`   V2 매칭 만료 처리: ${V2_MATCHING_ENABLED ? 'ON' : 'OFF (운영 스키마 미적용)'}`);
});
