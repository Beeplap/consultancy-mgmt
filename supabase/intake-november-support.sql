-- Enable November student intake values for existing databases.
-- Course intakes are intentionally free text so imported values like
-- September, Sep-26, or Spring 2026 can be stored exactly as given.

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
  end if;
end $$;
