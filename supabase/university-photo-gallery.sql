-- Multiple photo gallery support for universities.

create table if not exists public.university_photos (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now()
);

alter table public.university_photos enable row level security;

drop policy if exists "staff can read university photos" on public.university_photos;
create policy "staff can read university photos"
  on public.university_photos for select to authenticated using (true);

drop policy if exists "admins can manage university photos" on public.university_photos;
create policy "admins can manage university photos"
  on public.university_photos for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
