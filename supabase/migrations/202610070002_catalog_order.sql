begin;

alter table public.menus
  add column order_index integer not null default 0
  constraint menus_order_index_nonnegative check (order_index >= 0);

alter table public.subjects
  add column order_index integer not null default 0
  constraint subjects_order_index_nonnegative check (order_index >= 0);

alter table public.teachers
  add column order_index integer not null default 0
  constraint teachers_order_index_nonnegative check (order_index >= 0);

alter table public.courses
  add column order_index integer not null default 0
  constraint courses_order_index_nonnegative check (order_index >= 0);

commit;
