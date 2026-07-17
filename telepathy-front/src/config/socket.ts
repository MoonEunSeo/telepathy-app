import { io } from 'socket.io-client';

import type { AppSocket } from '../types';

// dev(vite)는 프론트/백엔드 포트가 달라 백엔드를 명시해야 하지만,
// 빌드본은 백엔드가 dist 를 정적 서빙하므로(= 프론트와 socket.io 가 동일 origin)
// 페이지를 서빙하는 그 서버(window.location.origin)에 붙어야 한다.
// (기존엔 VITE_REALSITE=onrender 를 하드코딩 → 로컬 서빙 시에도 소켓만 원격으로 나가 실패)
const socketURL =
  import.meta.env.MODE === 'development'
    ? `http://localhost:${import.meta.env.VITE_SERV_DEV}`
    : window.location.origin;

console.log('🌐 socketURL =', socketURL);

export const socket: AppSocket = io(socketURL, {
  withCredentials: true,
  transports: ['websocket'],
});

// 연결 수명 가시화 — 소켓이 언제 붙고 끊기는지 콘솔에 남긴다.
// (채팅 종료 시 disconnect 로 끊긴 뒤 재연결 안 되면 join_match 등 emit 이
//  sendBuffer 에만 쌓여 서버에 도달하지 않으므로, 끊김 시점을 바로 확인하기 위함)
socket.on('connect', () => console.log('🔌 socket connected:', socket.id));
socket.on('disconnect', (reason) => console.warn('🔌 socket disconnected:', reason));
socket.on('connect_error', (err) => console.error('🔌 socket connect_error:', err.message));
