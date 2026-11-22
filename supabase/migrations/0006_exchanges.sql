-- SWAPA: Exchange agreements with safe state transitions

create type public.exchange_status as enum ('pending', 'agreed', 'completed', 'cancelled');

create table public.exchange_agreements (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null unique references public.matches (id) on delete cascade,
  user_a_id       uuid not null references public.profiles (id),
  user_b_id       uuid not null references public.profiles (id),
  user_a_agreed   boolean not null default false,
  user_b_agreed   boolean not null default false,
  user_a_completed boolean not null default false,
  user_b_completed boolean not null default false,
  status          public.exchange_status not null default 'pending',
  agreed_at       timestamptz,
  completed_at    timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index exchange_agreements_match on public.exchange_agreements (match_id);
create index exchange_agreements_user_a on public.exchange_agreements (user_a_id);
create index exchange_agreements_user_b on public.exchange_agreements (user_b_id);

alter table public.exchange_agreements enable row level security;

create policy exchange_read on public.exchange_agreements for select to authenticated
  using (user_a_id = auth.uid() or user_b_id = auth.uid());

-- ---- RPC: initiate or update agreement
create function public.agree_to_exchange(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_match       record;
  v_agreement   record;
  v_user_id     uuid := auth.uid();
  v_item_a_owner uuid;
  v_item_b_owner uuid;
  v_is_a        boolean;
  v_is_b        boolean;
  v_both_agreed boolean;
begin
  -- Load match and validate participation
  select m.*, ia.owner_id as a_owner, ib.owner_id as b_owner
  into v_match
  from public.matches m
  join public.items ia on ia.id = m.item_a_id
  join public.items ib on ib.id = m.item_b_id
  where m.id = p_match_id and m.status = 'active';

  if not found then
    return jsonb_build_object('error', 'Match not found or not active');
  end if;

  v_is_a := (v_match.a_owner = v_user_id);
  v_is_b := (v_match.b_owner = v_user_id);

  if not (v_is_a or v_is_b) then
    return jsonb_build_object('error', 'Not a participant');
  end if;

  -- Upsert agreement
  insert into public.exchange_agreements (match_id, user_a_id, user_b_id)
  values (p_match_id, v_match.a_owner, v_match.b_owner)
  on conflict (match_id) do nothing;

  -- Set this user's agreement
  if v_is_a then
    update public.exchange_agreements
    set user_a_agreed = true, updated_at = now()
    where match_id = p_match_id and status = 'pending';
  else
    update public.exchange_agreements
    set user_b_agreed = true, updated_at = now()
    where match_id = p_match_id and status = 'pending';
  end if;

  -- Check if both agreed
  select * into v_agreement from public.exchange_agreements where match_id = p_match_id;
  v_both_agreed := v_agreement.user_a_agreed and v_agreement.user_b_agreed;

  if v_both_agreed and v_agreement.status = 'pending' then
    -- Reserve both items atomically
    update public.exchange_agreements
    set status = 'agreed', agreed_at = now(), updated_at = now()
    where match_id = p_match_id;

    update public.items set status = 'reserved', updated_at = now()
    where id in (v_match.item_a_id, v_match.item_b_id);

    -- Log notification for both users
    insert into public.notifications (user_id, type, payload)
    values
      (v_match.a_owner, 'exchange_agreed', jsonb_build_object('match_id', p_match_id)),
      (v_match.b_owner, 'exchange_agreed', jsonb_build_object('match_id', p_match_id));

    return jsonb_build_object('status', 'agreed', 'both_agreed', true);
  end if;

  return jsonb_build_object('status', 'pending', 'both_agreed', false);
end;
$$;

-- ---- RPC: confirm completion
create function public.complete_exchange(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_agreement   record;
  v_match       record;
  v_user_id     uuid := auth.uid();
  v_is_a        boolean;
  v_both_done   boolean;
begin
  select ea.*, m.item_a_id, m.item_b_id, ia.owner_id as a_owner, ib.owner_id as b_owner
  into v_agreement
  from public.exchange_agreements ea
  join public.matches m on m.id = ea.match_id
  join public.items ia on ia.id = m.item_a_id
  join public.items ib on ib.id = m.item_b_id
  where ea.match_id = p_match_id and ea.status = 'agreed';

  if not found then
    return jsonb_build_object('error', 'Agreement not found or not in agreed state');
  end if;

  v_is_a := (v_agreement.a_owner = v_user_id);
  if not (v_is_a or v_agreement.b_owner = v_user_id) then
    return jsonb_build_object('error', 'Not a participant');
  end if;

  if v_is_a then
    update public.exchange_agreements set user_a_completed = true, updated_at = now() where match_id = p_match_id;
  else
    update public.exchange_agreements set user_b_completed = true, updated_at = now() where match_id = p_match_id;
  end if;

  select * into v_agreement from public.exchange_agreements where match_id = p_match_id;
  v_both_done := v_agreement.user_a_completed and v_agreement.user_b_completed;

  if v_both_done then
    update public.exchange_agreements
    set status = 'completed', completed_at = now(), updated_at = now()
    where match_id = p_match_id;

    update public.items set status = 'completed', updated_at = now()
    where id in (v_agreement.item_a_id, v_agreement.item_b_id);

    update public.profiles
    set completed_exchanges = completed_exchanges + 1, updated_at = now()
    where id in (v_agreement.user_a_id, v_agreement.user_b_id);

    insert into public.notifications (user_id, type, payload)
    values
      (v_agreement.user_a_id, 'exchange_completed', jsonb_build_object('match_id', p_match_id)),
      (v_agreement.user_b_id, 'exchange_completed', jsonb_build_object('match_id', p_match_id));

    return jsonb_build_object('status', 'completed', 'both_completed', true);
  end if;

  return jsonb_build_object('status', 'agreed', 'both_completed', false);
end;
$$;

-- ---- RPC: cancel agreement
create function public.cancel_exchange(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_agreement record;
  v_user_id   uuid := auth.uid();
begin
  select ea.*, m.item_a_id, m.item_b_id
  into v_agreement
  from public.exchange_agreements ea
  join public.matches m on m.id = ea.match_id
  where ea.match_id = p_match_id
    and ea.status in ('pending', 'agreed')
    and (ea.user_a_id = v_user_id or ea.user_b_id = v_user_id);

  if not found then
    return jsonb_build_object('error', 'Agreement not found or cannot be cancelled');
  end if;

  update public.exchange_agreements
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where match_id = p_match_id;

  -- Restore items to available
  update public.items set status = 'available', updated_at = now()
  where id in (v_agreement.item_a_id, v_agreement.item_b_id)
    and status = 'reserved';

  return jsonb_build_object('status', 'cancelled');
end;
$$;

-- Grant RPC execution to authenticated users
revoke execute on function public.agree_to_exchange(uuid) from public, anon;
grant execute on function public.agree_to_exchange(uuid) to authenticated;
revoke execute on function public.complete_exchange(uuid) from public, anon;
grant execute on function public.complete_exchange(uuid) to authenticated;
revoke execute on function public.cancel_exchange(uuid) from public, anon;
grant execute on function public.cancel_exchange(uuid) to authenticated;
