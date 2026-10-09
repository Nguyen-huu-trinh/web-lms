begin;

alter table public.grades
  add column order_index integer not null default 0
  constraint grades_order_index_nonnegative check (order_index >= 0);

create index grades_order_idx on public.grades (order_index, name, code);

commit;
