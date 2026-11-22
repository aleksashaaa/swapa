-- SWAPA: safe item deletion and blocking operations that must close matches.
-- These run as security definer so clients cannot arbitrarily rewrite matches.

create or replace function public.delete_my_item(p_item_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_item   record;
begin
  if v_user is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;

  select * into v_item
  from public.items
  where id = p_item_id and owner_id = v_user and deleted_at is null
  for update;

  if not found then
    return jsonb_build_object('error', 'Item not found');
  end if;

  if v_item.status = 'reserved' then
    return jsonb_build_object('error', 'This item is part of an agreed exchange. Cancel the exchange before deleting it.');
  end if;

  -- Close active matches and pending agreements involving this item.
  update public.exchange_agreements ea
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where ea.status = 'pending'
     and ea.match_id in (
       select m.id from public.matches m
       where m.item_a_id = p_item_id or m.item_b_id = p_item_id
     );

  update public.matches
     set status = 'cancelled'
   where status in ('active', 'reserved')
     and (item_a_id = p_item_id or item_b_id = p_item_id);

  perform set_config('swapa.internal_delete', 'on', true);
  update public.items
     set deleted_at = now(),
         status = case when status = 'available' then 'paused'::public.item_status else status end,
         updated_at = now()
   where id = p_item_id;
  perform set_config('swapa.internal_delete', 'off', true);

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.delete_my_item(uuid) from public, anon;
grant execute on function public.delete_my_item(uuid) to authenticated;

create or replace function public.block_user(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;
  if p_user_id = v_user then
    return jsonb_build_object('error', 'You cannot block yourself');
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_user, p_user_id)
  on conflict do nothing;

  -- Release any items currently reserved by an open match between the two
  -- people. This runs before the matches are closed so only genuinely open
  -- matches are considered.
  perform set_config('swapa.internal_status', 'on', true);
  update public.items i
     set status = 'available', updated_at = now()
   where i.status = 'reserved'
     and exists (
       select 1
       from public.matches m
       join public.items ia on ia.id = m.item_a_id
       join public.items ib on ib.id = m.item_b_id
       where m.status in ('active', 'reserved')
         and i.id in (m.item_a_id, m.item_b_id)
         and ((ia.owner_id = v_user and ib.owner_id = p_user_id)
           or (ia.owner_id = p_user_id and ib.owner_id = v_user))
     );
  perform set_config('swapa.internal_status', 'off', true);

  -- Close open agreements between the two people; history stays readable.
  update public.exchange_agreements ea
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where ea.status in ('pending', 'agreed')
     and exists (
       select 1
       from public.matches m
       join public.items ia on ia.id = m.item_a_id
       join public.items ib on ib.id = m.item_b_id
       where m.id = ea.match_id
         and ((ia.owner_id = v_user and ib.owner_id = p_user_id)
           or (ia.owner_id = p_user_id and ib.owner_id = v_user))
     );

  update public.matches m
     set status = 'cancelled'
   where m.status in ('active', 'reserved')
     and exists (
       select 1
       from public.items ia
       join public.items ib on ib.id = m.item_b_id
       where ia.id = m.item_a_id
         and ((ia.owner_id = v_user and ib.owner_id = p_user_id)
           or (ia.owner_id = p_user_id and ib.owner_id = v_user))
     );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
