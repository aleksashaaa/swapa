-- SWAPA: Swipes table (item-pair based)

create type public.swipe_action as enum ('skip', 'like');

create table public.swipes (
  id               uuid primary key default gen_random_uuid(),
  actor_id         uuid not null references public.profiles (id) on delete cascade,
  offering_item_id uuid not null references public.items (id) on delete cascade,
  target_item_id   uuid not null references public.items (id) on delete cascade,
  action           public.swipe_action not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Can't swipe on own items (enforced by trigger below too)
  check (offering_item_id <> target_item_id)
);

create unique index swipes_triple on public.swipes (actor_id, offering_item_id, target_item_id);
create index swipes_actor on public.swipes (actor_id);
create index swipes_target on public.swipes (target_item_id);

alter table public.swipes enable row level security;

-- Actors see only their own swipes
create policy swipes_read on public.swipes for select to authenticated
  using (actor_id = auth.uid());

create policy swipes_insert on public.swipes for insert to authenticated
  with check (actor_id = auth.uid());

create policy swipes_update on public.swipes for update to authenticated
  using (actor_id = auth.uid()) with check (actor_id = auth.uid());
