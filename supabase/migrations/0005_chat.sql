-- SWAPA: Messages (one conversation per match)

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  image_url  text,
  created_at timestamptz not null default now()
);

create index messages_match_created on public.messages (match_id, created_at);

alter table public.messages enable row level security;

create policy messages_read on public.messages for select to authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = match_id
    and public.is_match_participant(m.item_a_id, m.item_b_id)
  ));

create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'active'
        and public.is_match_participant(m.item_a_id, m.item_b_id)
    )
  );
