begin;

-- Existing grades and assignments remain valid. New subjects must choose a grade.
alter table public.subjects alter column grade drop default;
alter table public.grades
  alter column code set default gen_random_uuid()::text,
  add constraint grades_name_not_blank check (length(btrim(name)) between 1 and 200),
  add constraint grades_code_not_blank check (length(btrim(code)) between 1 and 200);

commit;
