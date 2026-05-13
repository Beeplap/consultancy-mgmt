-- Allow CSV waiver values like "Yes", "Yes with conditions", "B", "C", or "C+".
-- Course Match treats any non-empty value except No/None as waiver available.

alter table public.courses drop constraint if exists courses_ielts_waiver_check;

alter table public.courses alter column ielts_waiver set default 'none';
