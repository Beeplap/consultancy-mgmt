-- University cover images — Storage bucket + RLS policies
-- Run this in Supabase Dashboard → SQL Editor after creating the bucket (UI or SQL).
-- Required for uploads: without INSERT policies you get "new row violates row-level security policy".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'university-covers',
  'university-covers',
  true,
  2097152,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read university covers" on storage.objects;
create policy "Public read university covers"
  on storage.objects for select
  using (bucket_id = 'university-covers');

drop policy if exists "Admins upload university covers" on storage.objects;
create policy "Admins upload university covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'university-covers' and public.current_user_role() = 'admin');

drop policy if exists "Admins update university covers" on storage.objects;
create policy "Admins update university covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'university-covers' and public.current_user_role() = 'admin')
  with check (bucket_id = 'university-covers' and public.current_user_role() = 'admin');

drop policy if exists "Admins delete university covers" on storage.objects;
create policy "Admins delete university covers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'university-covers' and public.current_user_role() = 'admin');
