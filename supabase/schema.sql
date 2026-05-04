create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'counsellor' check (role in ('admin', 'counsellor')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null,
  nationality text,
  qualification text not null,
  gpa numeric not null,
  backlogs integer not null default 0,
  year integer not null,
  english_grade text check (english_grade in ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E')),
  ielts numeric not null,
  preferred_course text not null,
  budget integer not null,
  intake text not null check (intake in ('Jan', 'May', 'Sep', 'Nov')),
  preferred_city text,
  scholarship boolean not null default false,
  status text not null default 'new' check (status in ('new', 'applied', 'offer', 'visa', 'enrolled')),
  created_at timestamptz not null default now()
);

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text,
  location text,
  ranking integer,
  description text,
  photo_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text,
  degree text,
  duration text,
  field text,
  min_gpa text,
  min_ielts text,
  ielts_waiver text default 'none' check (ielts_waiver is null or ielts_waiver in ('none', 'b_or_above', 'c_plus_limited')),
  fee integer,
  accepted_gap text,
  cas_deposit text not null default 'not_required' check (cas_deposit in ('not_required', 'required')),
  cas_deposit_amount integer,
  scholarship_upto integer,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  intake text not null check (intake in ('Jan', 'May', 'Sep', 'Nov')),
  status text not null default 'open' check (status in ('open', 'closed', 'closing')),
  created_at timestamptz not null default now(),
  unique (course_id, intake)
);

alter table public.students add column if not exists english_grade text;
alter table public.courses add column if not exists ielts_waiver text not null default 'none';

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'applied', 'offer', 'visa', 'enrolled')),
  created_at timestamptz not null default now()
);

-- --- Migrations for existing databases (idempotent) ---

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'tuition_fee'
  ) then
    alter table public.courses rename column tuition_fee to fee;
  end if;
end $$;

alter table public.courses add column if not exists ielts_waiver text default 'none';

alter table public.universities alter column name drop not null;
alter table public.universities alter column location drop not null;

alter table public.courses alter column name drop not null;
alter table public.courses alter column degree drop not null;
alter table public.courses alter column duration drop not null;
alter table public.courses alter column field drop not null;
alter table public.courses alter column min_gpa drop not null;
alter table public.courses alter column min_ielts drop not null;
alter table public.courses alter column min_gpa type text using min_gpa::text;
alter table public.courses alter column min_ielts type text using min_ielts::text;
alter table public.courses alter column ielts_waiver drop not null;
alter table public.courses alter column fee drop not null;

alter table public.courses add column if not exists accepted_gap text;
alter table public.courses add column if not exists cas_deposit_amount integer;
alter table public.courses add column if not exists scholarship_upto integer;

alter table public.universities add column if not exists description text;
alter table public.universities add column if not exists photo_path text;
alter table public.courses add column if not exists description text;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'students'
  ) then
    alter table public.students drop constraint if exists students_intake_check;
    alter table public.students
      add constraint students_intake_check check (intake in ('Jan', 'May', 'Sep', 'Nov'));
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'intakes'
  ) then
    alter table public.intakes drop constraint if exists intakes_intake_check;
    alter table public.intakes
      add constraint intakes_intake_check check (intake in ('Jan', 'May', 'Sep', 'Nov'));
  end if;
end $$;

create table if not exists public.custom_catalog_presets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('course_name', 'degree', 'duration', 'field')),
  label text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists custom_catalog_presets_kind_label_normalized
  on public.custom_catalog_presets (kind, (lower(trim(label))));

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'cas_deposit'
  ) then
    alter table public.courses add column cas_deposit text not null default 'not_required'
      check (cas_deposit in ('not_required', 'required'));
  end if;
end $$;

alter table public.courses alter column cas_deposit set default 'not_required';

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'role', 'counsellor'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.universities enable row level security;
alter table public.courses enable row level security;
alter table public.intakes enable row level security;
alter table public.applications enable row level security;
alter table public.custom_catalog_presets enable row level security;

create policy "users can read own profile" on public.users for select to authenticated using (id = auth.uid() or public.current_user_role() = 'admin');
create policy "admins can manage users" on public.users for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

create policy "staff can read students" on public.students for select to authenticated using (true);
create policy "staff can create students" on public.students for insert to authenticated with check (public.current_user_role() in ('admin', 'counsellor'));
create policy "staff can update students" on public.students for update to authenticated using (public.current_user_role() in ('admin', 'counsellor')) with check (public.current_user_role() in ('admin', 'counsellor'));

create policy "staff can read universities" on public.universities for select to authenticated using (true);
create policy "admins can manage universities" on public.universities for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

create policy "staff can read courses" on public.courses for select to authenticated using (true);
create policy "admins can manage courses" on public.courses for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

create policy "staff can read intakes" on public.intakes for select to authenticated using (true);
create policy "admins can manage intakes" on public.intakes for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

create policy "staff can read applications" on public.applications for select to authenticated using (true);
create policy "staff can manage applications" on public.applications for all to authenticated using (public.current_user_role() in ('admin', 'counsellor')) with check (public.current_user_role() in ('admin', 'counsellor'));

create policy "staff can read custom catalog presets" on public.custom_catalog_presets for select to authenticated using (true);
create policy "admins can manage custom catalog presets" on public.custom_catalog_presets for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Storage bucket + RLS for university cover uploads (requires public.current_user_role() / public.users — see schema above).
-- If you created the bucket in the Dashboard only, you still must apply policies or uploads fail with row-level security errors.
-- Run the full SQL in: supabase/storage-university-covers.sql (Supabase → SQL Editor).
