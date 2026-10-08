begin;

-- Auth may populate app_metadata after the initial INSERT. Handle both events,
-- and preserve the original creation-based deadline on every later update.
create or replace function private.register_student_trial() returns trigger
language plpgsql security definer set search_path = '' as $$
declare deadline timestamptz;
begin
  if new.raw_app_meta_data->>'lms_trial' = 'true'
    and exists (select 1 from public.profiles where id=new.id and role='STUDENT') then
    insert into private.student_trials(user_id, expires_at)
      values(new.id, new.created_at + interval '30 minutes')
      on conflict(user_id) do nothing;
    select expires_at into deadline from private.student_trials where user_id=new.id;
    update public.profiles
      set trial_expires_at=deadline, must_change_password=false
      where id=new.id and role='STUDENT';
  end if;
  return new;
end;
$$;
revoke all on function private.register_student_trial() from public, anon, authenticated;
drop trigger if exists z_register_student_trial on auth.users;
create trigger z_register_student_trial after insert or update of raw_app_meta_data on auth.users
for each row execute function private.register_student_trial();

-- Repair accounts whose trial metadata arrived after INSERT.
insert into private.student_trials(user_id, expires_at)
select u.id, u.created_at + interval '30 minutes'
from auth.users u join public.profiles p on p.id=u.id
where u.raw_app_meta_data->>'lms_trial'='true' and p.role='STUDENT'
on conflict(user_id) do nothing;

update public.profiles p
set must_change_password=false, trial_expires_at=t.expires_at
from private.student_trials t
where t.user_id=p.id and p.role='STUDENT';

-- Finalize the password flag in the same transaction as granting access.
create or replace function public.grant_student_username_access_batch(
  actor_id uuid, actor_session uuid, student uuid, target_kind text,
  target_ids uuid[], student_username text
) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if target_ids is null or cardinality(target_ids)<1 or cardinality(target_ids)>100 then
    raise exception 'Choose between 1 and 100 targets';
  end if;
  foreach target in array target_ids loop
    if target is null then raise exception 'Invalid target'; end if;
    perform public.grant_student_username_access(actor_id, actor_session, student, target_kind, target, student_username);
  end loop;
  update public.profiles p
    set must_change_password=false, trial_expires_at=t.expires_at
    from private.student_trials t
    where p.id=student and t.user_id=p.id and p.role='STUDENT';
end;
$$;
revoke all on function public.grant_student_username_access_batch(uuid,uuid,uuid,text,uuid[],text) from public, anon, authenticated;
grant execute on function public.grant_student_username_access_batch(uuid,uuid,uuid,text,uuid[],text) to service_role;
commit;
