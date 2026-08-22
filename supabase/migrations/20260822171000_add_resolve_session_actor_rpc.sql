-- 레거시 JWT user_id와 V2 actors.id를 하나의 경계에서 해석한다.
create or replace function public.resolve_session_actor(
  p_session_id uuid,
  p_role       text,
  p_nickname   text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor_id   uuid;
  v_actor_type text;
begin
  if p_session_id is null or p_role not in ('member', 'guest') then
    raise exception 'INVALID_SESSION_ACTOR_INPUT';
  end if;

  select id, actor_type into v_actor_id, v_actor_type
    from public.actors
   where id = p_session_id
     and status = 'ACTIVE';

  if found then
    if (p_role = 'member' and v_actor_type <> 'USER')
       or (p_role = 'guest' and v_actor_type <> 'GUEST') then
      raise exception 'SESSION_ACTOR_ROLE_CONFLICT';
    end if;
    return v_actor_id;
  end if;

  if p_role = 'member' then
    select id into v_actor_id
      from public.actors
     where legacy_user_id = p_session_id
       and actor_type = 'USER'
       and status = 'ACTIVE';

    if v_actor_id is null then
      raise exception 'SESSION_ACTOR_NOT_FOUND';
    end if;
    return v_actor_id;
  end if;

  insert into public.actors (id, actor_type, status, legacy_guest_id)
       values (p_session_id, 'GUEST', 'ACTIVE', p_session_id)
  on conflict (id) do nothing;

  select id, actor_type into v_actor_id, v_actor_type
    from public.actors
   where id = p_session_id
     and status = 'ACTIVE'
     for update;

  if v_actor_id is null or v_actor_type <> 'GUEST' then
    raise exception 'SESSION_ACTOR_ROLE_CONFLICT';
  end if;

  insert into public.guest_profiles (actor_id, nickname, last_seen_at, expires_at)
       values (v_actor_id, p_nickname, now(), now() + interval '7 days')
  on conflict (actor_id) do update
    set nickname = coalesce(excluded.nickname, guest_profiles.nickname),
        last_seen_at = excluded.last_seen_at,
        expires_at = greatest(guest_profiles.expires_at, excluded.expires_at);

  return v_actor_id;
end;
$$;

revoke all on function public.resolve_session_actor(uuid, text, text) from public;
revoke execute on function public.resolve_session_actor(uuid, text, text) from anon, authenticated;
grant execute on function public.resolve_session_actor(uuid, text, text) to service_role;
