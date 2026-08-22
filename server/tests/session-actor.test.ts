import { describe, expect, it, vi } from 'vitest';

import {
  createSessionActorResolver,
  type SessionActorRpcClient,
} from '../src/modules/auth/session-actor';

const sessionId = '00000000-0000-4000-8000-000000000001';
const actorId = '10000000-0000-4000-8000-000000000001';

describe('V2 actor 신원 호환', () => {
  it('회원 세션 ID를 actor ID로 해석한다', async () => {
    const rpc = vi.fn<SessionActorRpcClient['rpc']>().mockResolvedValue({
      data: actorId,
      error: null,
    });
    const resolve = createSessionActorResolver({ rpc });

    await expect(resolve({ role: 'member', user_id: sessionId, username: 'member' })).resolves.toBe(
      actorId,
    );
    expect(rpc).toHaveBeenCalledWith('resolve_session_actor', {
      p_nickname: null,
      p_role: 'member',
      p_session_id: sessionId,
    });
  });

  it('게스트 닉네임을 프로필 생성에 전달한다', async () => {
    const rpc = vi.fn<SessionActorRpcClient['rpc']>().mockResolvedValue({
      data: sessionId,
      error: null,
    });
    const resolve = createSessionActorResolver({ rpc });

    await resolve({ nickname: '익명', role: 'guest', user_id: sessionId });
    expect(rpc).toHaveBeenCalledWith('resolve_session_actor', {
      p_nickname: '익명',
      p_role: 'guest',
      p_session_id: sessionId,
    });
  });

  it('RPC 오류를 인증 경계 실패로 전파한다', async () => {
    const rpc = vi.fn<SessionActorRpcClient['rpc']>().mockResolvedValue({
      data: null,
      error: { message: 'SESSION_ACTOR_NOT_FOUND' },
    });
    const resolve = createSessionActorResolver({ rpc });

    await expect(resolve({ role: 'member', user_id: sessionId })).rejects.toThrow(
      'SESSION_ACTOR_NOT_FOUND',
    );
  });
});
