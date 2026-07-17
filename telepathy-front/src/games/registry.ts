import type { MiniGame } from './types';
import { balanceGame } from './balance';

export const GAMES: MiniGame[] = [balanceGame]; // 준비된 게임 리스트
export const getGame = (gameId: string) => GAMES.find((g) => g.gameId === gameId);
