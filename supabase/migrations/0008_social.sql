-- SWAPA: notifications, reviews, blocking, reports, analytics events and
-- hardened RLS. Builds on the item/match/chat/exchange tables from 0001-0006.

-- --------------------------------------------------------------------- events
-- Used by the match trigger and the server-side analytics helper.
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles (id) on delete set null,
  name       text not null check (name ~ '^[a-z_]{3,40}$'),
  props      jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists events_name_created on public.events (name, created_at);
alter table public.events enable row level security;

drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (user_id = auth.uid());

-- --------------------------------------------------------------------- helpers
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------- privacy flags
alter table public.profiles add column if not exists show_city   boolean not null default true;
alter table public.profiles add column if not exists show_rating boolean not null default true;

-- Column-level privacy: authenticated clients may read public profile fields,
-- but never the private email column. Owners can edit only public fields.
revoke all on public.profiles from anon, authenticated;
grant select (
  id, full_name, avatar_url, city, bio, interests,
  completed_exchanges, avg_rating, review_count, is_admin,
  onboarding_completed, show_city, show_rating, created_at, updated_at
) on public.profiles to authenticated;
grant update (
  full_name, avatar_url, city, bio, interests,
  onboarding_completed, show_city, show_rating, updated_at
) on public.profiles to authenticated;

-- ------------------------------------------------------------ notification prefs
create table if not exists public.notification_preferences (
  user_id              uuid primary key references public.profiles (id) on delete cascade,
  new_match            boolean not null default true,
  new_message          boolean not null default true,
  exchange_agreed      boolean not null default true,
  exchange_completed   boolean not null default true,
  new_review           boolean not null default true,
  item_status          boolean not null default true,
  updated_at           timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
drop policy if exists notification_prefs_read on public.notification_preferences;
create policy notification_prefs_read on public.notification_preferences
  for select to authenticated using (user_id = auth.uid());
drop policy if exists notification_prefs_update on public.notification_preferences;
create policy notification_prefs_update on public.notification_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------- notifications
do $$ begin
  create type public.notification_type as enum (
    'match', 'message', 'exchange_agreed', 'exchange_completed', 'review', 'item_status'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Create default preferences for every profile (existing and new).
insert into public.notification_preferences (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;

create or replace function public.create_notification_preferences()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_prefs on public.profiles;
create trigger on_profile_created_prefs
  after insert on public.profiles
  for each row execute function public.create_notification_preferences();

-- Respect each user's preference before inserting an in-app notification.
create or replace function public.notify(
  p_user_id uuid,
  p_type public.notification_type,
  p_payload jsonb default '{}'
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_enabled boolean;
begin
  if p_user_id is null then return; end if;

  select case p_type
           when 'match'             then new_match
           when 'message'           then new_message
           when 'exchange_agreed'   then exchange_agreed
           when 'exchange_completed' then exchange_completed
           when 'review'            then new_review
           when 'item_status'       then item_status
         end
    into v_enabled
    from public.notification_preferences
   where user_id = p_user_id;

  if v_enabled is null or v_enabled then
    insert into public.notifications (user_id, type, payload)
    values (p_user_id, p_type, coalesce(p_payload, '{}'::jsonb));
  end if;
end;
$$;

revoke execute on function public.notify(uuid, public.notification_type, jsonb) from public, anon, authenticated;

-- --------------------------------------------------------------------- blocks
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;
drop policy if exists blocks_read on public.user_blocks;
create policy blocks_read on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());
drop policy if exists blocks_insert on public.user_blocks;
create policy blocks_insert on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists blocks_delete on public.user_blocks;
create policy blocks_delete on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

create or replace function public.is_match_blocked(p_match_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    join public.items ia on ia.id = m.item_a_id
    join public.items ib on ib.id = m.item_b_id
    join public.user_blocks b
      on (b.blocker_id = ia.owner_id and b.blocked_id = ib.owner_id)
      or (b.blocker_id = ib.owner_id and b.blocked_id = ia.owner_id)
    where m.id = p_match_id
  );
$$;

-- -------------------------------------------------------------------- reviews
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.exchange_agreements (id) on delete cascade,
  match_id     uuid not null references public.matches (id) on delete cascade,
  reviewer_id  uuid not null references public.profiles (id) on delete cascade,
  reviewee_id  uuid not null references public.profiles (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  body         text not null default '' check (char_length(body) <= 1000),
  created_at   timestamptz not null default now(),
  unique (agreement_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index if not exists reviews_reviewee on public.reviews (reviewee_id, created_at desc);
create index if not exists reviews_match on public.reviews (match_id);

alter table public.reviews enable row level security;
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select to authenticated using (true);
-- Inserts only through submit_review(); no insert policy for clients.

create or replace function public.recalculate_profile_rating()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles p
     set avg_rating = coalesce((
           select round(avg(r.rating)::numeric, 2)
           from public.reviews r where r.reviewee_id = new.reviewee_id
         ), 0),
         review_count = (
           select count(*) from public.reviews r where r.reviewee_id = new.reviewee_id
         ),
         updated_at = now()
   where p.id = new.reviewee_id;
  return new;
end;
$$;

drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.recalculate_profile_rating();

create or replace function public.submit_review(
  p_match_id uuid,
  p_rating integer,
  p_body text default ''
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_agreement record;
  v_reviewee uuid;
  v_id uuid;
  v_body text := coalesce(btrim(p_body), '');
begin
  if v_user is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('error', 'Rating must be between 1 and 5');
  end if;
  if char_length(v_body) > 1000 then
    return jsonb_build_object('error', 'Review is too long');
  end if;

  select ea.*, ia.owner_id as a_owner, ib.owner_id as b_owner
    into v_agreement
  from public.exchange_agreements ea
  join public.matches m on m.id = ea.match_id
  join public.items ia on ia.id = m.item_a_id
  join public.items ib on ib.id = m.item_b_id
  where ea.match_id = p_match_id
    and ea.status = 'completed';

  if not found then
    return jsonb_build_object('error', 'Reviews are only available after a completed exchange');
  end if;
  if v_user not in (v_agreement.a_owner, v_agreement.b_owner) then
    return jsonb_build_object('error', 'Not a participant');
  end if;

  v_reviewee := case when v_user = v_agreement.a_owner then v_agreement.b_owner else v_agreement.a_owner end;

  insert into public.reviews (agreement_id, match_id, reviewer_id, reviewee_id, rating, body)
  values (v_agreement.id, p_match_id, v_user, v_reviewee, p_rating, v_body)
  on conflict (agreement_id, reviewer_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('error', 'You have already reviewed this exchange');
  end if;

  perform public.notify(v_reviewee, 'review', jsonb_build_object('match_id', p_match_id, 'review_id', v_id, 'rating', p_rating));
  return jsonb_build_object('ok', true, 'review_id', v_id);
end;
$$;

revoke execute on function public.submit_review(uuid, integer, text) from public, anon;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;

-- --------------------------------------------------------------------- reports
do $$ begin
  create type public.report_target as enum ('user', 'item', 'message', 'review');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null;
end $$;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 3 and 80),
  details     text not null default '' check (char_length(details) <= 1000),
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now()
);
create index if not exists reports_status_created on public.reports (status, created_at desc);
create index if not exists reports_reporter on public.reports (reporter_id);

alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
  for select to authenticated using (reporter_id = auth.uid());
drop policy if exists reports_read_admin on public.reports;
create policy reports_read_admin on public.reports
  for select to authenticated using (public.is_admin());
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------- item status protection
create or replace function public.protect_item_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'Item ownership cannot be changed';
  end if;

  if new.category <> old.category
     and exists (select 1 from public.matches m where m.item_a_id = old.id or m.item_b_id = old.id) then
    raise exception 'Category cannot be changed after the item has matches';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('reserved', 'completed')
       and coalesce(current_setting('swapa.internal_status', true), '') <> 'on' then
      raise exception 'This item status is managed by the exchange workflow';
    end if;
    if old.status in ('reserved', 'completed')
       and coalesce(current_setting('swapa.internal_status', true), '') <> 'on' then
      raise exception 'This item status is managed by the exchange workflow';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_item_status_protect on public.items;
create trigger on_item_status_protect
  before update on public.items
  for each row execute function public.protect_item_status();

create or replace function public.notify_item_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform public.notify(new.owner_id, 'item_status',
      jsonb_build_object('item_id', new.id, 'status', new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists on_item_status_notify on public.items;
create trigger on_item_status_notify
  after update of status on public.items
  for each row execute function public.notify_item_status();

-- ------------------------------------------------------------------ match trigger
create or replace function public.handle_swipe()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_offering_owner   uuid;
  v_target_owner     uuid;
  v_offering_category public.item_category;
  v_target_category  public.item_category;
  v_offering_status  public.item_status;
  v_target_status    public.item_status;
  v_reciprocal       boolean;
  v_match_id         uuid;
  v_a                uuid;
  v_b                uuid;
begin
  if new.action <> 'like' then
    return new;
  end if;

  select category, owner_id, status
    into v_offering_category, v_offering_owner, v_offering_status
    from public.items where id = new.offering_item_id;

  select category, owner_id, status
    into v_target_category, v_target_owner, v_target_status
    from public.items where id = new.target_item_id;

  if v_offering_owner is null or v_target_owner is null then return new; end if;
  if v_offering_owner <> new.actor_id then return new; end if;
  if v_target_owner = new.actor_id then return new; end if;
  if v_offering_category <> v_target_category then return new; end if;
  if v_offering_status <> 'available' or v_target_status <> 'available' then return new; end if;
  if public.is_blocked(v_offering_owner, v_target_owner) then return new; end if;

  select exists (
    select 1 from public.swipes s
    where s.actor_id = v_target_owner
      and s.offering_item_id = new.target_item_id
      and s.target_item_id = new.offering_item_id
      and s.action = 'like'
  ) into v_reciprocal;

  if not v_reciprocal then return new; end if;

  if new.offering_item_id < new.target_item_id then
    v_a := new.offering_item_id; v_b := new.target_item_id;
  else
    v_a := new.target_item_id; v_b := new.offering_item_id;
  end if;

  insert into public.matches (item_a_id, item_b_id, status)
  values (v_a, v_b, 'active')
  on conflict (item_a_id, item_b_id) do nothing
  returning id into v_match_id;

  -- Re-open a previously cancelled match only while both items are available.
  if v_match_id is null then
    update public.matches
       set status = 'active'
     where item_a_id = v_a and item_b_id = v_b and status = 'cancelled'
    returning id into v_match_id;
  end if;

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

drop trigger if exists on_swipe_like on public.swipes;
create trigger on_swipe_like
  after insert or update of action on public.swipes
  for each row execute function public.handle_swipe();

-- New match notification for both owners.
create or replace function public.notify_new_match()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_a_owner uuid;
  v_b_owner uuid;
begin
  select owner_id into v_a_owner from public.items where id = new.item_a_id;
  select owner_id into v_b_owner from public.items where id = new.item_b_id;

  perform public.notify(v_a_owner, 'match',
    jsonb_build_object('match_id', new.id, 'item_id', new.item_a_id, 'other_item_id', new.item_b_id));
  perform public.notify(v_b_owner, 'match',
    jsonb_build_object('match_id', new.id, 'item_id', new.item_b_id, 'other_item_id', new.item_a_id));
  return new;
end;
$$;

drop trigger if exists on_match_created_notify on public.matches;
create trigger on_match_created_notify
  after insert on public.matches
  for each row execute function public.notify_new_match();

-- New message notification for the other participant.
create or replace function public.notify_new_message()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_a_owner uuid;
  v_b_owner uuid;
  v_recipient uuid;
begin
  select ia.owner_id, ib.owner_id
    into v_a_owner, v_b_owner
  from public.matches m
  join public.items ia on ia.id = m.item_a_id
  join public.items ib on ib.id = m.item_b_id
  where m.id = new.match_id;

  v_recipient := case when new.sender_id = v_a_owner then v_b_owner else v_a_owner end;
  if v_recipient is not null and v_recipient <> new.sender_id then
    perform public.notify(v_recipient, 'message',
      jsonb_build_object('match_id', new.match_id, 'message_id', new.id));
  end if;
  return new;
end;
$$;

drop trigger if exists on_message_created_notify on public.messages;
create trigger on_message_created_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ------------------------------------------------------------- RLS hardening
-- Swipes: the actor must own the offering item, both items must be available,
-- in the same category, and neither owner may have blocked the other.
drop policy if exists swipes_insert on public.swipes;
create policy swipes_insert on public.swipes for insert to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.items o
      where o.id = offering_item_id
        and o.owner_id = auth.uid()
        and o.status = 'available'
        and o.deleted_at is null
    )
    and exists (
      select 1 from public.items t
      where t.id = target_item_id
        and t.owner_id <> auth.uid()
        and t.status = 'available'
        and t.deleted_at is null
        and t.category = (select o.category from public.items o where o.id = offering_item_id)
    )
    and not public.is_blocked(
      auth.uid(),
      (select t.owner_id from public.items t where t.id = target_item_id)
    )
  );

drop policy if exists swipes_update on public.swipes;
create policy swipes_update on public.swipes for update to authenticated
  using (actor_id = auth.uid())
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.items o
      where o.id = offering_item_id
        and o.owner_id = auth.uid()
        and o.status = 'available'
        and o.deleted_at is null
    )
    and exists (
      select 1 from public.items t
      where t.id = target_item_id
        and t.owner_id <> auth.uid()
        and t.status = 'available'
        and t.deleted_at is null
        and t.category = (select o.category from public.items o where o.id = offering_item_id)
    )
  );

-- Messages: keep working during an active/reserved exchange, but not after a
-- block or once the match is completed/cancelled.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status in ('active', 'reserved')
        and public.is_match_participant(m.item_a_id, m.item_b_id)
    )
    and not public.is_match_blocked(match_id)
  );

-- Items: one clean owner-update policy (the old "delete" policy was an update).
drop policy if exists items_delete on public.items;

-- Match participants can see each other's public profile fields via profiles RLS.
