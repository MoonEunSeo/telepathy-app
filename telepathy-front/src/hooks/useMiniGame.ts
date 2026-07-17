import { useEffect, useRef, useState } from 'react';
import { socket } from '../config/socket';
import type { GameEvent } from '@shared/domain';
import type { GameCtx } from '../games/types';
import { getGame } from '../games/registry';

export function useMiniGame(ctx: GameCtx | null) {
  const [active, setActive] = useState<{ gameId: string; state: unknown } | null>(null);
  const ref = useRef(active);
  ref.current = active;

  // 이벤트 1개를 상태에 반영 (수신·발신 공통)
  const apply = (ev: GameEvent) => {
    const game = getGame(ev.gameId);
    if (!game || !ctx) return;
    setActive((cur) => {
      const base = cur?.gameId === ev.gameId ? cur.state : game.createInitialState(ctx);
      return { gameId: ev.gameId, state: game.reduce(base, ev, ctx) };
    });
  };

  useEffect(() => {
    if (!ctx) return;
    const on = (ev: GameEvent) => apply(ev);
    socket.on('game:event', on);
    return () => {
      socket.off('game:event', on);
    };
  }, [ctx?.roomId]);

  const emit = (type: string, payload: unknown) => {
    // 내 액션
    const cur = ref.current;
    if (!ctx || !cur) return;
    const ev: GameEvent = {
      gameId: cur.gameId,
      type,
      roomId: ctx.roomId,
      senderId: ctx.myId,
      payload,
    };
    socket.emit('game:event', ev); // 상대에게
    apply(ev); // 나에게
  };
  const start = (gameId: string) => {
    if (ctx && getGame(gameId))
      setActive({
        gameId,
        state: getGame(gameId)!.createInitialState(ctx),
      });
  };
  const close = () => setActive(null);
  return { active, start, emit, close };
}
