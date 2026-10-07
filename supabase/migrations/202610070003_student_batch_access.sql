begin;

-- Each batch is atomic; the existing function checks the Admin session and target access.
create function public.grant_student_username_access_batch(
  actor_id uuid, actor_session uuid, student uuid, target_kind text,
  target_ids uuid[], student_username text
) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if target_ids is null or cardinality(target_ids) < 1 or cardinality(target_ids) > 100 then
    raise exception 'Choose between 1 and 100 targets';
  end if;
  foreach target in array target_ids loop
    if target is null then raise exception 'Invalid target'; end if;
    perform public.grant_student_username_access(actor_id, actor_session, student, target_kind, target, student_username);
  end loop;
end;
$$;
revoke all on function public.grant_student_username_access_batch(uuid,uuid,uuid,text,uuid[],text) from public, anon, authenticated;
grant execute on function public.grant_student_username_access_batch(uuid,uuid,uuid,text,uuid[],text) to service_role;
commit;
