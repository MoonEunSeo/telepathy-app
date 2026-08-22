import { z } from 'zod';

import type { SessionUser } from '../../middleware/auth';

interface RpcError {
  message: string;
}

export interface SessionActorRpcClient {
  rpc: (
    name: 'resolve_session_actor',
    args: { p_nickname: string | null; p_role: SessionUser['role']; p_session_id: string },
  ) => PromiseLike<{ data: unknown; error: RpcError | null }>;
}

const actorIdSchema = z.string().uuid();
export function createSessionActorResolver(client: SessionActorRpcClient) {
  return async (user: SessionUser): Promise<string> => {
    const { data, error } = await client.rpc('resolve_session_actor', {
      p_nickname: user.role === 'guest' ? (user.nickname ?? null) : null,
      p_role: user.role,
      p_session_id: actorIdSchema.parse(user.user_id),
    });

    if (error !== null) throw new Error(`V2 actor 해석 실패: ${error.message}`);
    return actorIdSchema.parse(data);
  };
}
