-- Allow course intakes to keep exact imported text such as September, Sep-26, or Spring 2026.

alter table public.intakes drop constraint if exists intakes_intake_check;
