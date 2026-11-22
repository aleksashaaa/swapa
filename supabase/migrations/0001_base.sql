-- SWAPA: Base profiles table
-- Run in Supabase SQL Editor after creating a new project

create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  email                    text not null,
  full_name                text not null check (char_length(full_name) between 1 and 80),
  avatar_url               text,
  city                     text not null default '',
  bio                      text not null default '' check (char_length(bio) <= 500),
  interests                text[] not null default '{}',
  completed_exchanges      integer not null default 0,
  avg_rating               numeric(3,2) not null default 0,
  review_count             integer not null default 0,
  is_admin                 boolean not null default false,
  onboarding_completed     boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Allow any authenticated user to read basic public profile info
create policy profiles_select_public on public.profiles
  for select to authenticated using (true);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
