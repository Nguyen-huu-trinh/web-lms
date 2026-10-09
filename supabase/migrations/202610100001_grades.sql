begin;

create table public.grades (
  code text primary key,
  name text not null
);

insert into public.grades (code, name) values
  ('2k9', '2k9'),
  ('2k8', '2k8'),
  ('student', 'Sinh viên');

alter table public.grades enable row level security;
revoke all on public.grades from anon, authenticated;
grant select, insert, update, delete on public.grades to authenticated;
grant all on public.grades to service_role;

create policy admin_all on public.grades for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy catalog_grades on public.grades for select to authenticated
using ((select private.is_admin()) or (select private.is_student()));

-- Keep existing values and the default; replace the fixed list with a lookup.
alter table public.subjects
  drop constraint subjects_grade_valid,
  add constraint subjects_grade_fkey foreign key (grade)
    references public.grades (code) on update restrict on delete restrict;

create index subjects_grade_idx on public.subjects (grade);

commit;
