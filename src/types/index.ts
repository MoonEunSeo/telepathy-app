// 타입 배럴 — `import { X } from '../types'` 로 일괄 사용.
// 공유 계약(domain/socket 이벤트/api)은 repo 루트 shared/ 를 단일 출처로 사용(@shared).
// front 전용 타입(AppSocket, localStorage 스키마/헬퍼)만 로컬에서 재노출.
export type * from '@shared/domain';
export type * from '@shared/socketEvents';
export type * from '@shared/api';
export type * from './socket'; // AppSocket (socket.io-client 의존, 클라 전용)
export * from './storage'; // localStorage 스키마 + 런타임 헬퍼
