-- Permissions required by the SWAPA application

grant select
on table public.matches
to authenticated;

grant select, insert, update, delete
on table public.items
to authenticated;

grant select, insert, update, delete
on table public.item_images
to authenticated;