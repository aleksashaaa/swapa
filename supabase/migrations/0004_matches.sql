-- SWAPA: Matches (item-pair, created by trigger on mutual like)

create type public.match_status as enum ('active', 'cancelled');

create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  item_a_id  uuid not null references public.items (id) on delete cascade,
  item_b_id  uuid not null references public.items (id) on delete cascade,
  status     public.match_status not null default 'active',
  created_at timestamptz not null default now(),
  -- Normalize: always store smaller UUID first to ensure uniqueness
  check (item_a_id < item_b_id),
  unique (item_a_id, item_b_id)
);

create index matches_item_a on public.matches (item_a_id);
create index matches_item_b on public.matches (item_b_id);

alter table public.matches enable row level security;

-- Helper: is the current user an owner of one of the matched items?
create function public.is_match_participant(p_item_a uuid, p_item_b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.items i
    where i.id in (p_item_a, p_item_b) and i.owner_id = auth.uid()
  );
$$;

create policy matches_read on public.matches for select to authenticated
  using (public.is_match_participant(item_a_id, item_b_id));

-- Matches are created only by the trigger
-- No insert/update policy for authenticated users

-- ---------------------------------------------------------------- match trigger
-- After every like swipe, check for mutual like. If found, create match.
create function public.handle_swipe()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_offering_owner  uuid;
  v_target_owner    uuid;
  v_target_category public.item_category;
  v_offering_category public.item_category;
  v_reciprocal_exists boolean;
  v_match_id        uuid;
  v_a               uuid;
  v_b               uuid;
begin
  if new.action <> 'like' then
    return new;
  end if;

  -- Verify same category (belt-and-suspenders; app layer also enforces)
  select category, owner_id into v_offering_category, v_offering_owner
    from public.items where id = new.offering_item_id;
  select category, owner_id into v_target_category, v_target_owner
    from public.items where id = new.target_item_id;

  if v_offering_category <> v_target_category then
    return new; -- silently ignore cross-category likes
  end if;

  -- Check for reciprocal: target_owner liked offering_item with their own item
  select exists (
    select 1 from public.swipes s
    where s.actor_id = v_target_owner
      and s.offering_item_id = new.target_item_id
      and s.target_item_id = new.offering_item_id
      and s.action = 'like'
  ) into v_reciprocal_exists;

  if not v_reciprocal_exists then
    return new;
  end if;

  -- Normalize IDs for unique constraint
  if new.offering_item_id < new.target_item_id then
    v_a := new.offering_item_id; v_b := new.target_item_id;
  else
    v_a := new.target_item_id; v_b := new.offering_item_id;
  end if;

  -- Create match (idempotent)
  insert into public.matches (item_a_id, item_b_id)
  values (v_a, v_b)
  on conflict (item_a_id, item_b_id) do nothing
  returning id into v_match_id;

  -- Log event if new match created
  if v_match_id is not null then
    insert into public.events (user_id, name, props)
    values (new.actor_id, 'match_created',
            jsonb_build_object('match_id', v_match_id,
                               'offering_item_id', new.offering_item_id,
                               'target_item_id', new.target_item_id));
  end if;

  return new;
end;
$$;

create trigger on_swipe_like
  after insert or update of action on public.swipes
  for each row execute function public.handle_swipe();
