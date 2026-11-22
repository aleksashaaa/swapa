-- SWAPA: Items and item images

create type public.item_category as enum ('clothing', 'books', 'home');
create type public.item_condition as enum ('like_new', 'good', 'fair', 'used');
create type public.item_status as enum ('available', 'reserved', 'completed', 'paused');

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  category    public.item_category not null,
  title       text not null check (char_length(title) between 2 and 80),
  description text not null check (char_length(description) between 10 and 1000),
  condition   public.item_condition not null,
  status      public.item_status not null default 'available',
  attributes  jsonb not null default '{}',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index items_owner on public.items (owner_id);
create index items_category_status on public.items (category, status) where deleted_at is null;

create table public.item_images (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items (id) on delete cascade,
  url        text not null,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

create index item_images_item on public.item_images (item_id, position);

alter table public.items       enable row level security;
alter table public.item_images enable row level security;

-- Items: all authenticated users can read available/non-deleted items
create policy items_read on public.items for select to authenticated
  using (deleted_at is null);

-- Only owner can insert
create policy items_insert on public.items for insert to authenticated
  with check (owner_id = auth.uid());

-- Only owner can update
create policy items_update on public.items for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Soft delete: owner sets deleted_at
create policy items_delete on public.items for update to authenticated
  using (owner_id = auth.uid());

-- Item images: readable by all authenticated
create policy item_images_read on public.item_images for select to authenticated using (true);

create policy item_images_insert on public.item_images for insert to authenticated
  with check (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));

create policy item_images_delete on public.item_images for delete to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));
