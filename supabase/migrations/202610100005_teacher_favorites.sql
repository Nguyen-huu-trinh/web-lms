-- Personal bookmarks are independent of course access permissions.
create table public.student_teacher_favorites (
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, teacher_id)
);
create index student_teacher_favorites_teacher_idx on public.student_teacher_favorites(teacher_id);
alter table public.student_teacher_favorites enable row level security;
revoke all on public.student_teacher_favorites from anon, authenticated;
grant select, insert, delete on public.student_teacher_favorites to authenticated;
grant all on public.student_teacher_favorites to service_role;

create policy favorites_read on public.student_teacher_favorites for select to authenticated
using (student_id = (select auth.uid()) and (select private.is_student()));
create policy favorites_insert on public.student_teacher_favorites for insert to authenticated
with check (student_id = (select auth.uid()) and (select private.is_student()));
create policy favorites_delete on public.student_teacher_favorites for delete to authenticated
using (student_id = (select auth.uid()) and (select private.is_student()));
