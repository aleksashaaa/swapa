-- SWAPA: server-side Discover feed.
-- Validates that the offering item belongs to the caller, is available, and
-- returns eligible same-category items only. Skips reappear after a cooldown.

create or replace function public.discover_feed(
  p_offering_item_id uuid,
  p_skip_cooldown_hours integer default 24
)
returns table (
  id          uuid,
  title       text,
  description text,
  condition   public.item_condition,
  category    public.item_category,
  attributes  jsonb,
  created_at  timestamptz,
  images      jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_owner    uuid;
  v_category public.item_category;
  v_status   public.item_status;
  v_hours    integer := greatest(coalesce(p_skip_cooldown_hours, 24), 0);
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select i.owner_id, i.category, i.status
    into v_owner, v_category, v_status
  from public.items i
  where i.id = p_offering_item_id
    and i.deleted_at is null;

  if not found or v_owner <> v_user then
    raise exception 'invalid offering item' using errcode = '42501';
  end if;

  if v_status <> 'available' then
    return;
  end if;

  return query
  select i.id,
         i.title,
         i.description,
         i.condition,
         i.category,
         i.attributes,
         i.created_at,
         coalesce((
           select jsonb_agg(jsonb_build_object('url', img.url, 'position', img.position) order by img.position)
           from public.item_images img
           where img.item_id = i.id
         ), '[]'::jsonb) as images
  from public.items i
  where i.category = v_category
    and i.status = 'available'
    and i.deleted_at is null
    and i.owner_id <> v_user
    and not public.is_blocked(v_user, i.owner_id)
    and not exists (
      select 1
      from public.swipes s
      where s.actor_id = v_user
        and s.offering_item_id = p_offering_item_id
        and s.target_item_id = i.id
        and (
          s.action = 'like'
          or (s.action = 'skip' and s.updated_at > now() - make_interval(hours => v_hours))
        )
    )
  order by random()
  limit 40;
end;
$$;

revoke execute on function public.discover_feed(uuid, integer) from public, anon;
grant execute on function public.discover_feed(uuid, integer) to authenticated;
