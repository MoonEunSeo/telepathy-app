// config/socket.ts 의 io 인스턴스에 적용할 타입 (클라 전용 — socket.io-client 의존).
// 이벤트 맵(ServerToClientEvents/ClientToServerEvents)은 @shared/socketEvents 가 단일 출처.
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/socketEvents';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
