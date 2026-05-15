-- Optional performance helpers for the Course Match page.
-- Run in Supabase SQL Editor. These are safe to run more than once.

create index if not exists courses_university_id_idx
  on public.courses (university_id);

create index if not exists courses_fee_idx
  on public.courses (fee)
  where fee is not null;

create index if not exists courses_university_fee_idx
  on public.courses (university_id, fee)
  where fee is not null;

create index if not exists intakes_course_status_intake_idx
  on public.intakes (course_id, status, intake);

create index if not exists university_photos_university_id_idx
  on public.university_photos (university_id);

create index if not exists universities_location_idx
  on public.universities (location)
  where location is not null;

-- Speeds fuzzy text filters if you later move course search fully into Postgres.
create extension if not exists pg_trgm;

create index if not exists courses_match_text_trgm_idx
  on public.courses
  using gin ((coalesce(name, '') || ' ' || coalesce(field, '') || ' ' || coalesce(degree, '') || ' ' || coalesce(duration, '')) gin_trgm_ops);

create index if not exists universities_name_location_trgm_idx
  on public.universities
  using gin ((coalesce(name, '') || ' ' || coalesce(location, '')) gin_trgm_ops);
