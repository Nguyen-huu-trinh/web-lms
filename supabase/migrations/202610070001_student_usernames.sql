begin;

-- Replace the original constraint that only permitted usernames for admins.
do $$
declare item record;
begin
  for item in select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%username%'
      and pg_get_constraintdef(oid) like '%STUDENT%'
  loop
    execute format('alter table public.profiles drop constraint %I', item.conname);
  end loop;
end;
$$;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,50}$');

-- Preserve existing Auth emails, passwords, IDs and access. Resolve name collisions.
do $$
declare item record; base text; candidate text; suffix integer;
begin
  for item in select id,email from public.profiles where role='STUDENT' and username is null order by created_at,id
  loop
    base := left(regexp_replace(lower(split_part(item.email,'@',1)), '[^a-z0-9_]', '_', 'g'),40);
    if length(base) < 3 then base := 'student_' || base; end if;
    candidate := base;
    suffix := 1;
    while exists(select 1 from public.profiles where username=candidate) loop
      candidate := base || '_' || suffix::text;
      suffix := suffix + 1;
    end loop;
    update public.profiles set username=candidate where id=item.id;
  end loop;
end;
$$;

-- Finalize username and access in the same transaction. Only the server can call.
create function public.grant_student_username_access(
  actor_id uuid, actor_session uuid, student uuid, target_kind text, target_id uuid,
  student_username text
) returns void
language plpgsql security definer set search_path = '' as $$
declare current_username text; current_email text;
begin
  if student_username is null or student_username !~ '^[a-z0-9_]{3,50}$' then
    raise exception 'Invalid username';
  end if;
  perform public.grant_student_access(actor_id, actor_session, student, target_kind, target_id);
  select username,email into current_username,current_email from public.profiles where id=student for update;
  if current_username is not null and current_username <> student_username then
    raise exception 'Username does not match existing account';
  end if;
  if current_username is null and current_email <> student_username || '@students.lms.invalid' then
    raise exception 'Internal email does not match username';
  end if;
  update public.profiles set username=student_username where id=student and role='STUDENT';
end;
$$;
revoke all on function public.grant_student_username_access(uuid,uuid,uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.grant_student_username_access(uuid,uuid,uuid,text,uuid,text) to service_role;
commit;
