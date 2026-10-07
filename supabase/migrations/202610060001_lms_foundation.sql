begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique,
  role text not null default 'STUDENT' check (role in ('ADMIN', 'STUDENT')),
  created_at timestamptz not null default now(),
  check ((role = 'STUDENT' and username is null) or
    (role = 'ADMIN' and username ~ '^[a-z0-9_]{3,50}$')),
  check (role <> 'ADMIN' or username is not null)
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default now()
);
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects on delete cascade,
  name text not null check (length(trim(name)) > 0),
  bio text,
  created_at timestamptz not null default now()
);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  created_at timestamptz not null default now()
);
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  title text not null check (length(trim(title)) > 0),
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters on delete cascade,
  title text not null check (length(trim(title)) > 0),
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now()
);
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons on delete cascade,
  title text not null check (length(trim(title)) > 0),
  type text not null check (type in ('pdf', 'video')),
  provider text not null check (provider in ('drive', 'youtube')),
  url text not null,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  check (type <> 'pdf' or provider = 'drive'),
  check ((provider = 'drive' and url ~ '^https://drive[.]google[.]com/') or
    (provider = 'youtube' and url ~ '^https://(www[.]youtube[.]com/|youtube[.]com/|youtu[.]be/)'))
);
create table public.student_subject_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  subject_id uuid not null references public.subjects on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, subject_id)
);
create table public.student_teacher_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  teacher_id uuid not null references public.teachers on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, teacher_id)
);
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  is_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  price numeric(12,2) not null check (price >= 0),
  created_at timestamptz not null default now()
);
create table public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles on delete cascade,
  session_id uuid not null,
  updated_at timestamptz not null default now()
);

create index on public.teachers(subject_id);
create index on public.courses(teacher_id);
create index on public.chapters(course_id, order_index);
create index on public.lessons(chapter_id, order_index);
create index on public.materials(lesson_id, order_index);
create index on public.student_subject_access(subject_id);
create index on public.student_teacher_access(teacher_id);
create index on public.user_progress(lesson_id);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger progress_updated before update on public.user_progress
for each row execute function private.touch_updated_at();
create trigger session_updated before update on public.active_sessions
for each row execute function private.touch_updated_at();

-- Never trust user-editable metadata for roles.
create function private.sync_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
create trigger sync_auth_profile after insert or update of email on auth.users
for each row execute function private.sync_profile();
insert into public.profiles(id, email) select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;

create function private.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.active_sessions a
    where a.user_id = auth.uid() and a.session_id::text = auth.jwt()->>'session_id');
$$;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active() and exists
    (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN');
$$;
create function private.is_student() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active() and exists
    (select 1 from public.profiles where id = auth.uid() and role = 'STUDENT');
$$;
create function private.can_teacher(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or (private.is_student() and (
    exists (select 1 from public.student_teacher_access where student_id = auth.uid() and teacher_id = target)
    or exists (select 1 from public.student_subject_access a join public.teachers t on t.subject_id = a.subject_id
      where a.student_id = auth.uid() and t.id = target)));
$$;
create function private.can_course(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.courses where id = target and private.can_teacher(teacher_id));
$$;
create function private.can_chapter(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.chapters where id = target and private.can_course(course_id));
$$;
create function private.can_lesson(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.lessons where id = target and private.can_chapter(chapter_id));
$$;

-- An old/replaced JWT can inspect the current session, but cannot change it.
-- Activation is performed only by the server after a fresh Auth login.
create function public.session_is_active() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.is_active(); $$;
create function public.end_session() returns void
language sql security definer set search_path = '' as $$
  delete from public.active_sessions where user_id = auth.uid()
    and session_id::text = auth.jwt()->>'session_id';
$$;
revoke all on function public.end_session() from public, anon;
grant execute on function public.end_session() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','subjects','teachers','courses','chapters','lessons','materials',
    'student_subject_access','student_teacher_access','user_progress','menus','active_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    if t <> 'active_sessions' then
      execute format('create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    end if;
  end loop;
end $$;
revoke insert, update, delete on public.active_sessions from authenticated;
create policy own_session on public.active_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy own_profile on public.profiles for select to authenticated
using (id = (select auth.uid()) and (select private.is_active()));
create policy catalog_subjects on public.subjects for select to authenticated using ((select private.is_active()));
create policy catalog_teachers on public.teachers for select to authenticated using ((select private.is_active()));
create policy read_menus on public.menus for select to authenticated using ((select private.is_active()));
create policy read_courses on public.courses for select to authenticated using (private.can_teacher(teacher_id));
create policy read_chapters on public.chapters for select to authenticated using (private.can_course(course_id));
create policy read_lessons on public.lessons for select to authenticated using (private.can_chapter(chapter_id));
create policy read_materials on public.materials for select to authenticated using (private.can_lesson(lesson_id));
create policy own_subject_access on public.student_subject_access for select to authenticated
using (student_id = (select auth.uid()) and (select private.is_student()));
create policy own_teacher_access on public.student_teacher_access for select to authenticated
using (student_id = (select auth.uid()) and (select private.is_student()));
create policy own_progress_read on public.user_progress for select to authenticated
using (student_id = (select auth.uid()) and (select private.is_student()));
create policy own_progress_insert on public.user_progress for insert to authenticated
with check (student_id = (select auth.uid()) and (select private.is_student()) and private.can_lesson(lesson_id));
create policy own_progress_update on public.user_progress for update to authenticated
using (student_id = (select auth.uid()) and (select private.is_student()) and private.can_lesson(lesson_id))
with check (student_id = (select auth.uid()) and (select private.is_student()) and private.can_lesson(lesson_id));

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_active(), private.is_admin(), private.is_student(),
  private.can_teacher(uuid), private.can_course(uuid), private.can_chapter(uuid), private.can_lesson(uuid) to authenticated;
revoke all on function public.session_is_active() from public, anon;
grant execute on function public.session_is_active() to authenticated;

-- Only publish session changes; polling remains available if Realtime disconnects.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.active_sessions;
  end if;
end $$;
commit;
