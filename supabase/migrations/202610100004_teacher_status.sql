begin;

alter table public.teachers
  add column status text,
  add constraint teachers_status_length check (status is null or char_length(status) <= 2000);

commit;
