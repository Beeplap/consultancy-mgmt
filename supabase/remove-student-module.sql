begin;

-- Remove student/applications RLS policies first.
drop policy if exists "staff can read applications" on public.applications;
drop policy if exists "staff can manage applications" on public.applications;
drop policy if exists "staff can read students" on public.students;
drop policy if exists "staff can create students" on public.students;
drop policy if exists "staff can update students" on public.students;

-- Drop dependent tables.
drop table if exists public.applications cascade;
drop table if exists public.students cascade;

commit;
