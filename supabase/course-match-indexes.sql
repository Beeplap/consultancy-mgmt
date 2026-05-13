-- Performance indexes for Course Match page after bulk CSV imports.
-- Safe to run multiple times.

create extension if not exists pg_trgm;

create index if not exists courses_university_id_idx on public.courses (university_id);
create index if not exists courses_fee_idx on public.courses (fee);
create index if not exists courses_min_gpa_idx on public.courses (min_gpa);
create index if not exists courses_min_ielts_idx on public.courses (min_ielts);
create index if not exists courses_min_pte_idx on public.courses (min_pte);
create index if not exists courses_name_trgm_idx on public.courses using gin (lower(coalesce(name, '')) gin_trgm_ops);
create index if not exists courses_field_trgm_idx on public.courses using gin (lower(coalesce(field, '')) gin_trgm_ops);
create index if not exists universities_name_trgm_idx on public.universities using gin (lower(coalesce(name, '')) gin_trgm_ops);
create index if not exists universities_location_trgm_idx on public.universities using gin (lower(coalesce(location, '')) gin_trgm_ops);
create index if not exists intakes_course_intake_status_idx on public.intakes (course_id, intake, status);
