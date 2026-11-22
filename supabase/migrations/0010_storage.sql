-- SWAPA: Supabase Storage buckets and access policies.
-- item-images and avatars are public-read; chat-images are private and readable
-- only by participants of the corresponding match.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('item-images', 'item-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('avatars',     'avatars',     true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('chat-images', 'chat-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets: anyone can read, authenticated users upload into their own folder.
drop policy if exists swapa_item_images_read on storage.objects;
create policy swapa_item_images_read on storage.objects
  for select using (bucket_id = 'item-images');

drop policy if exists swapa_item_images_insert on storage.objects;
create policy swapa_item_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists swapa_item_images_delete on storage.objects;
create policy swapa_item_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists swapa_avatars_read on storage.objects;
create policy swapa_avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists swapa_avatars_insert on storage.objects;
create policy swapa_avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists swapa_avatars_delete on storage.objects;
create policy swapa_avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Chat images: path is {matchId}/{userId}/{uuid}.{ext}
drop policy if exists swapa_chat_images_read on storage.objects;
create policy swapa_chat_images_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.matches m
      where m.id::text = (storage.foldername(name))[1]
        and public.is_match_participant(m.item_a_id, m.item_b_id)
    )
  );

drop policy if exists swapa_chat_images_insert on storage.objects;
create policy swapa_chat_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.matches m
      where m.id::text = (storage.foldername(name))[1]
        and public.is_match_participant(m.item_a_id, m.item_b_id)
    )
  );

drop policy if exists swapa_chat_images_delete on storage.objects;
create policy swapa_chat_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
