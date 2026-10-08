begin;

-- Trial accounts keep their initial password; regular students are unchanged.
create or replace function private.register_student_trial() returns trigger
language plpgsql security definer set search_path = '' as $$
declare deadline timestamptz;
begin
  if new.raw_app_meta_data->>'lms_trial' = 'true' then
    deadline := new.created_at + interval '30 minutes';
    insert into private.student_trials(user_id, expires_at) values(new.id, deadline);
    update public.profiles
      set trial_expires_at = deadline, must_change_password = false
      where id = new.id and role = 'STUDENT';
  end if;
  return new;
end;
$$;
revoke all on function private.register_student_trial() from public, anon, authenticated;

-- Also update existing trial students without changing passwords or expiry times.
update public.profiles p
set must_change_password = false
where p.role = 'STUDENT' and p.must_change_password
  and exists (select 1 from private.student_trials t where t.user_id = p.id);

commit;
