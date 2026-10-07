-- Read-only. Run in SQL Editor; do not publish these account details.
select coalesce(p.id,u.id) as id, coalesce(p.email,u.email) as email,
  case
    when u.id is null then 'Profile without Auth user: reconcile manually'
    when p.id is null then 'Auth user without profile: review account role'
    when p.role='STUDENT' and coalesce(u.encrypted_password,'')='' then 'Student without password: manual migration required'
  end as issue
from public.profiles p full join auth.users u on u.id=p.id
where u.id is null or p.id is null or (p.role='STUDENT' and coalesce(u.encrypted_password,'')='');

select lower(email) as normalized_email, count(*) as profile_count
from public.profiles group by lower(email) having count(*) > 1;
