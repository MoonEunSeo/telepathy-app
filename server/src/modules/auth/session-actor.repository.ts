import supabase from '../../config/supabase.v2';
import { createSessionActorResolver, type SessionActorRpcClient } from './session-actor';

const rpcClient = supabase as unknown as SessionActorRpcClient;

export const resolveSessionActor = createSessionActorResolver(rpcClient);
