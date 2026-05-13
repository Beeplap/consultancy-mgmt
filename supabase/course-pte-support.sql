-- Add PTE requirement support for course imports, editing, and matching.

alter table public.courses add column if not exists min_pte text;

create index if not exists courses_min_pte_idx on public.courses (min_pte);
