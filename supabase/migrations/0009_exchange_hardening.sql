-- SWAPA: concurrency-safe exchange workflow.
-- Replaces the MVP functions from 0006 with locked reads, availability checks,
-- reservation conflict prevention and match reconciliation.

create or replace function public.agree_to_exchange(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user        uuid := auth.uid();
  v_match       record;
  v_agreement   record;
  v_is_a        boolean;
  v_is_b        boolean;
  v_both        boolean;
  v_a_status    public.item_status;
  v_b_status    public.item_status;
begin
  if v_user is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;

  -- Lock the match so two participants cannot race each other.
  select m.*, ia.owner_id as a_owner, ib.owner_id as b_owner
    into v_match
  from public.matches m
  join public.items ia on ia.id = m.item_a_id
  join public.items ib on ib.id = m.item_b_id
  where m.id = p_match_id
    and m.status in ('active', 'reserved')
  for update of m;

  if not found then
    return jsonb_build_object('error', 'Match not found or no longer active');
  end if;

  v_is_a := (v_match.a_owner = v_user);
  v_is_b := (v_match.b_owner = v_user);
  if not (v_is_a or v_is_b) then
    return jsonb_build_object('error', 'Not a participant');
  end if;
  if public.is_blocked(v_match.a_owner, v_match.b_owner) then
    return jsonb_build_object('error', 'This conversation is blocked');
  end if;

  -- Lock both items, then verify they are still available. This is the critical
  -- section that prevents one item being reserved by two exchanges.
  perform 1 from public.items
   where id in (v_match.item_a_id, v_match.item_b_id)
   for update;

  select status into v_a_status from public.items where id = v_match.item_a_id;
  select status into v_b_status from public.items where id = v_match.item_b_id;

  if v_a_status <> 'available' or v_b_status <> 'available' then
    return jsonb_build_object('error', 'One of the items is no longer available for exchange');
  end if;

  insert into public.exchange_agreements (match_id, user_a_id, user_b_id)
  values (p_match_id, v_match.a_owner, v_match.b_owner)
  on conflict (match_id) do nothing;

  select * into v_agreement
    from public.exchange_agreements
   where match_id = p_match_id
   for update;

  if v_agreement.status = 'completed' then
    return jsonb_build_object('error', 'This exchange is already completed');
  end if;

  -- A cancelled agreement can be restarted from the same match. Clear the old
  -- flags so both participants have to agree again.
  if v_agreement.status = 'cancelled' then
    update public.exchange_agreements
       set status = 'pending',
           user_a_agreed = false,
           user_b_agreed = false,
           user_a_completed = false,
           user_b_completed = false,
           agreed_at = null,
           completed_at = null,
           cancelled_at = null,
           updated_at = now()
     where match_id = p_match_id;
  end if;

  if v_is_a then
    update public.exchange_agreements
       set user_a_agreed = true, updated_at = now()
     where match_id = p_match_id and status = 'pending';
  else
    update public.exchange_agreements
       set user_b_agreed = true, updated_at = now()
     where match_id = p_match_id and status = 'pending';
  end if;

  select * into v_agreement from public.exchange_agreements where match_id = p_match_id;
  v_both := v_agreement.user_a_agreed and v_agreement.user_b_agreed;

  if v_both and v_agreement.status = 'pending' then
    -- Close competing matches and their pending agreements before reserving.
    update public.exchange_agreements ea
       set status = 'cancelled', cancelled_at = now(), updated_at = now()
     where ea.status in ('pending', 'agreed')
       and ea.match_id <> p_match_id
       and ea.match_id in (
         select m.id from public.matches m
         where m.status in ('active', 'reserved')
           and (m.item_a_id in (v_match.item_a_id, v_match.item_b_id)
                or m.item_b_id in (v_match.item_a_id, v_match.item_b_id))
       );

    update public.matches
       set status = 'cancelled'
     where id <> p_match_id
       and status in ('active', 'reserved')
       and (item_a_id in (v_match.item_a_id, v_match.item_b_id)
            or item_b_id in (v_match.item_a_id, v_match.item_b_id));

    update public.exchange_agreements
       set status = 'agreed', agreed_at = now(), updated_at = now()
     where match_id = p_match_id;

    perform set_config('swapa.internal_status', 'on', true);
    update public.items
       set status = 'reserved', updated_at = now()
     where id in (v_match.item_a_id, v_match.item_b_id);
    perform set_config('swapa.internal_status', 'off', true);

    update public.matches set status = 'reserved' where id = p_match_id;

    perform public.notify(v_match.a_owner, 'exchange_agreed',
      jsonb_build_object('match_id', p_match_id));
    perform public.notify(v_match.b_owner, 'exchange_agreed',
      jsonb_build_object('match_id', p_match_id));

    return jsonb_build_object('status', 'agreed', 'both_agreed', true);
  end if;

  return jsonb_build_object('status', 'pending', 'both_agreed', false);
end;
$$;

create or replace function public.complete_exchange(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_agreement record;
  v_is_a      boolean;
  v_both      boolean;
begin
  if v_user is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;

  select ea.*, ia.owner_id as a_owner, ib.owner_id as b_owner
    into v_agreement
  from public.exchange_agreements ea
  join public.matches m on m.id = ea.match_id
  join public.items ia on ia.id = m.item_a_id
  join public.items ib on ib.id = m.item_b_id
  where ea.match_id = p_match_id
    and ea.status = 'agreed'
  for update of ea;

  if not found then
    return jsonb_build_object('error', 'Agreement not found or not in agreed state');
  end if;

  v_is_a := (v_agreement.a_owner = v_user);
  if not (v_is_a or v_agreement.b_owner = v_user) then
    return jsonb_build_object('error', 'Not a participant');
  end if;

  if v_is_a then
    update public.exchange_agreements
       set user_a_completed = true, updated_at = now()
     where match_id = p_match_id;
  else
    update public.exchange_agreements
       set user_b_completed = true, updated_at = now()
     where match_id = p_match_id;
  end if;

  select * into v_agreement from public.exchange_agreements where match_id = p_match_id;
  v_both := v_agreement.user_a_completed and v_agreement.user_b_completed;

  if v_both then
    update public.exchange_agreements
       set status = 'completed', completed_at = now(), updated_at = now()
     where match_id = p_match_id;

    perform set_config('swapa.internal_status', 'on', true);
    update public.items
       set status = 'completed', updated_at = now()
     where id in (
       select m.item_a_id from public.matches m where m.id = p_match_id
       union all
       select m.item_b_id from public.matches m where m.id = p_match_id
     );
    perform set_config('swapa.internal_status', 'off', true);

    update public.matches set status = 'completed' where id = p_match_id;

    update public.profiles
       set completed_exchanges = completed_exchanges + 1, updated_at = now()
     where id in (v_agreement.user_a_id, v_agreement.user_b_id);

    perform public.notify(v_agreement.user_a_id, 'exchange_completed',
      jsonb_build_object('match_id', p_match_id));
    perform public.notify(v_agreement.user_b_id, 'exchange_completed',
      jsonb_build_object('match_id', p_match_id));

    return jsonb_build_object('status', 'completed', 'both_completed', true);
  end if;

  return jsonb_build_object('status', 'agreed', 'both_completed', false);
end;
$$;

create or replace function public.cancel_exchange(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_agreement record;
  v_item_a    uuid;
  v_item_b    uuid;
begin
  if v_user is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;

  select ea.*, m.item_a_id, m.item_b_id
    into v_agreement
  from public.exchange_agreements ea
  join public.matches m on m.id = ea.match_id
  where ea.match_id = p_match_id
    and ea.status in ('pending', 'agreed')
    and (ea.user_a_id = v_user or ea.user_b_id = v_user)
  for update of ea;

  if not found then
    return jsonb_build_object('error', 'Agreement not found or cannot be cancelled');
  end if;

  v_item_a := v_agreement.item_a_id;
  v_item_b := v_agreement.item_b_id;

  update public.exchange_agreements
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where match_id = p_match_id;

  if v_agreement.status = 'agreed' then
    perform set_config('swapa.internal_status', 'on', true);
    update public.items
       set status = 'available', updated_at = now()
     where id in (v_item_a, v_item_b) and status = 'reserved';
    perform set_config('swapa.internal_status', 'off', true);

    -- The conversation stays alive; the items become discoverable again.
    update public.matches
       set status = 'active'
     where id = p_match_id and status = 'reserved';

    -- Reconcile matches that were closed by this reservation, but only while
    -- both of their items are genuinely available again.
    update public.matches m
       set status = 'active'
     where m.status = 'cancelled'
       and (m.item_a_id in (v_item_a, v_item_b) or m.item_b_id in (v_item_a, v_item_b))
       and exists (select 1 from public.items i where i.id = m.item_a_id and i.status = 'available')
       and exists (select 1 from public.items i where i.id = m.item_b_id and i.status = 'available');
  end if;

  return jsonb_build_object('status', 'cancelled');
end;
$$;

revoke execute on function public.agree_to_exchange(uuid) from public, anon;
grant execute on function public.agree_to_exchange(uuid) to authenticated;
revoke execute on function public.complete_exchange(uuid) from public, anon;
grant execute on function public.complete_exchange(uuid) to authenticated;
revoke execute on function public.cancel_exchange(uuid) from public, anon;
grant execute on function public.cancel_exchange(uuid) to authenticated;
