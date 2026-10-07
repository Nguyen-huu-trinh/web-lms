begin;

alter table public.profiles
  add column must_change_password boolean not null default true,
  add column provisioned_by_admin boolean not null default false;
update public.profiles set must_change_password = false where role = 'ADMIN';
-- Preserve previously authorized students; never change existing Auth passwords.
update public.profiles p set provisioned_by_admin = true
where p.role = 'STUDENT' and (
  exists (select 1 from public.student_subject_access a where a.student_id = p.id) or
  exists (select 1 from public.student_teacher_access a where a.student_id = p.id));
create index profiles_email_normalized_idx on public.profiles(lower(email));

-- Only an actual Auth password update clears this flag. Neither user_metadata nor
-- client profile writes can bypass the first-password requirement.
create function private.password_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(old.encrypted_password, '') <> ''
     and coalesce(new.encrypted_password, '') <> ''
     and old.encrypted_password is distinct from new.encrypted_password then
    update public.profiles set must_change_password = false where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.password_changed() from public, anon, authenticated;
create trigger lms_password_changed after update of encrypted_password on auth.users
for each row execute function private.password_changed();

create or replace function private.is_student() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active() and exists (select 1 from public.profiles
    where id = auth.uid() and role = 'STUDENT'
      and provisioned_by_admin and not must_change_password);
$$;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active() and exists (select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and not must_change_password);
$$;
drop policy catalog_subjects on public.subjects;
drop policy catalog_teachers on public.teachers;
drop policy read_menus on public.menus;
create policy catalog_subjects on public.subjects for select to authenticated
using ((select private.is_admin()) or (select private.is_student()));
create policy catalog_teachers on public.teachers for select to authenticated
using ((select private.is_admin()) or (select private.is_student()));
create policy read_menus on public.menus for select to authenticated
using ((select private.is_admin()) or (select private.is_student()));

-- Exact case-insensitive lookup also detects legacy profile/Auth mismatches.
-- Never expose account enumeration or password state to browser clients.
create function public.find_student_account(account_email text)
returns table(id uuid, profile_id uuid, role text, has_password boolean, auth_exists boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(u.id, p.id), p.id, p.role,
    coalesce(u.encrypted_password, '') <> '', u.id is not null
  from auth.users u full join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(account_email)) or lower(p.email) = lower(trim(account_email));
$$;
revoke all on function public.find_student_account(text) from public, anon, authenticated;
grant execute on function public.find_student_account(text) to service_role;

-- One DB transaction finalizes profile + access. Auth creation is external;
-- if finalization fails, retry reuses that account, never resets its password.
create function public.grant_student_access(
  actor_id uuid, actor_session uuid, student uuid, target_kind text, target_id uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare account_email text; existing_role text;
begin
  if not exists (select 1 from public.profiles p join public.active_sessions s on s.user_id=p.id
    where p.id=actor_id and p.role='ADMIN' and not p.must_change_password and s.session_id=actor_session) then
    raise exception 'Admin session required' using errcode='42501';
  end if;
  select email into account_email from auth.users where id=student
    and coalesce(encrypted_password, '') <> '' for update;
  if not found then raise exception 'Account requires manual migration'; end if;
  select role into existing_role from public.profiles where id=student for update;
  if existing_role is not null and existing_role <> 'STUDENT' then
    raise exception 'Not a student account';
  end if;
  insert into public.profiles(id,email,role,must_change_password,provisioned_by_admin)
    values(student,account_email,'STUDENT',true,true)
  on conflict(id) do update set email=excluded.email, provisioned_by_admin=true;
  if target_kind='subject' then
    insert into public.student_subject_access(student_id,subject_id) values(student,target_id)
    on conflict(student_id,subject_id) do nothing;
  elsif target_kind='teacher' then
    insert into public.student_teacher_access(student_id,teacher_id) values(student,target_id)
    on conflict(student_id,teacher_id) do nothing;
  else raise exception 'Invalid access target';
  end if;
end;
$$;
revoke all on function public.grant_student_access(uuid,uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.grant_student_access(uuid,uuid,uuid,text,uuid) to service_role;
commit;
