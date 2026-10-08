begin;
create extension if not exists pg_cron;

alter table public.profiles add column trial_expires_at timestamptz;
create table private.student_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create index student_trials_expiry_idx on private.student_trials(expires_at);
revoke all on private.student_trials from public, anon, authenticated;

-- app_metadata is set by the server Admin API, never by student user_metadata.
-- Register the deadline in the same transaction as Auth creation, even if granting access later fails.
create function private.register_student_trial() returns trigger
language plpgsql security definer set search_path = '' as $$
declare deadline timestamptz;
begin
  if new.raw_app_meta_data->>'lms_trial' = 'true' then
    deadline := new.created_at + interval '30 minutes';
    insert into private.student_trials(user_id, expires_at) values(new.id, deadline);
    update public.profiles set trial_expires_at = deadline, must_change_password = false where id = new.id and role = 'STUDENT';
  end if;
  return new;
end;
$$;
revoke all on function private.register_student_trial() from public, anon, authenticated;
-- PostgreSQL executes same-event triggers by name, after sync_auth_profile.
create trigger z_register_student_trial after insert on auth.users
for each row execute function private.register_student_trial();

create or replace function private.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.active_sessions a
    where a.user_id = auth.uid() and a.session_id::text = auth.jwt()->>'session_id')
  and not exists (select 1 from private.student_trials t
    where t.user_id = auth.uid() and t.expires_at <= now());
$$;

create function private.delete_expired_student_trials() returns void
language plpgsql security definer set search_path = '' as $$
declare expired record;
begin
  for expired in select t.user_id from private.student_trials t
    join public.profiles p on p.id=t.user_id
    where t.expires_at <= now() and p.role='STUDENT'
  loop
    begin
      -- Existing foreign keys cascade to profile, access, progress and active sessions.
      delete from auth.users where id=expired.user_id;
    exception when others then
      raise warning 'Trial cleanup failed for %: %', expired.user_id, sqlerrm;
    end;
  end loop;
end;
$$;
revoke all on function private.delete_expired_student_trials() from public, anon, authenticated;
select cron.schedule('lms-delete-expired-trials', '* * * * *', 'select private.delete_expired_student_trials()');
-- Fail closed in the application if this migration/job has not been installed.
create function public.trial_cleanup_enabled() returns boolean
language sql security definer set search_path = '' as $$
  select exists (select 1 from cron.job where jobname='lms-delete-expired-trials' and active);
$$;
revoke all on function public.trial_cleanup_enabled() from public, anon, authenticated;
grant execute on function public.trial_cleanup_enabled() to service_role;
commit;
