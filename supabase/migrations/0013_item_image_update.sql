-- SWAPA: allow owners to reorder item images.
-- 0002 granted select/insert/delete but not update, which the edit form needs
-- when positions change.

drop policy if exists item_images_update on public.item_images;
create policy item_images_update on public.item_images
  for update to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id = item_id and i.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.items i
      where i.id = item_id and i.owner_id = auth.uid()
    )
  );

-- Soft-deleted items stay readable to the participants of a match they were
-- part of, so conversations and exchange history do not lose their item data.
drop policy if exists items_read_matched on public.items;
create policy items_read_matched on public.items
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where (m.item_a_id = id or m.item_b_id = id)
        and public.is_match_participant(m.item_a_id, m.item_b_id)
    )
  );

-- Direct soft deletion would leave matches and agreements dangling. Only the
-- delete_my_item RPC may set deleted_at.
create or replace function public.protect_item_deletion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and coalesce(current_setting('swapa.internal_delete', true), '') <> 'on' then
    raise exception 'Items must be deleted through the app';
  end if;
  return new;
end;
$$;

drop trigger if exists on_item_delete_protect on public.items;
create trigger on_item_delete_protect
  before update on public.items
  for each row execute function public.protect_item_deletion();


