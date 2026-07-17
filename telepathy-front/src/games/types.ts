import type { ReactNode } from 'react';
import type { Id } from '../types';
import type { GameEvent } from '@shared/domain';

// Ctx == Context
export interface GameCtx {
  roomId: string;
  myId: Id;
  partnerId: Id;
  partnerNickname: string;
}
export interface GameRenderProps<S> {
  state: S;
  ctx: GameCtx;
  emit: (type: string, payload?: unknown) => void; // 소켓 전송 + 로컬 반영
  close: () => void; // 서피스 닫기
}
export interface MiniGame<S = unknown> {
  gameId: string;
  label: string;
  icon: string;
  createInitialState(ctx: GameCtx): S; // 게임 시작 시 초기 상태
  reduce(state: S, event: GameEvent, ctx: GameCtx): S; // 이벤트 1개 -> 수신 - 발신 공통 상태이전(리듀서)
  render(props: GameRenderProps<S>): ReactNode; // 상태 -> 화면
}
