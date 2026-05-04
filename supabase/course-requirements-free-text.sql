-- Make course requirement fields accept any text format.
-- Example values: "2.5", "60%", "5.5 overall, 5.0 each", "case by case".

alter table public.courses
  alter column min_gpa type text using min_gpa::text,
  alter column min_ielts type text using min_ielts::text;
