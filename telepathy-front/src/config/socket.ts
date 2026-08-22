import { io } from 'socket.io-client';

import type { AppSocket } from '../types';
import { runtimeConfig } from './runtime';

export const socket: AppSocket = io(runtimeConfig.socketUrl, {
  withCredentials: true,
  transports: ['websocket'],
  autoConnect: false, // 세션 보장 후 수동 연결
});

// 연결 수명 가시화 — 소켓이 언제 붙고 끊기는지 콘솔에 남긴다.
// (채팅 종료 시 disconnect 로 끊긴 뒤 재연결 안 되면 join_match 등 emit 이
//  sendBuffer 에만 쌓여 서버에 도달하지 않으므로, 끊김 시점을 바로 확인하기 위함)
socket.on('connect', () => console.log('🔌 socket connected:', socket.id));
socket.on('disconnect', (reason) => console.warn('🔌 socket disconnected:', reason));
socket.on('connect_error', (err) => console.error('🔌 socket connect_error:', err.message));
