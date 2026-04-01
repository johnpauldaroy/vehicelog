-- Grant Panay visibility to an existing account so Panay UI features appear.
-- Use this when you already have a user in Auth (can log in) but cannot see Panay widgets/selectors.
--
-- Steps:
-- 1) Replace v_user_email with your login email.
-- 2) Keep v_role_name as 'approver' or switch to 'admin'.
-- 3) Run in Supabase SQL Editor.

do $$
declare
  v_user_email text := 'REPLACE_WITH_LOGIN_EMAIL@example.com';
  v_role_name text := 'approver'; -- 'approver' or 'admin'
  v_user_id uuid;
  v_role_id uuid;
  v_branch_id uuid;
begin
  if v_user_email like 'REPLACE_WITH_LOGIN_EMAIL%' then
    raise exception 'Set v_user_email before running this script.';
  end if;

  if v_role_name not in ('approver', 'admin') then
    raise exception 'v_role_name must be approver or admin.';
  end if;

  -- Ensure the MAIN branch is tagged as Panay.
  update public.branches
  set service_region = 'panay'
  where code = 'MAIN';

  select id into v_branch_id
  from public.branches
  where code = 'MAIN'
  limit 1;

  if v_branch_id is null then
    raise exception 'Branch with code MAIN was not found.';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_user_email)
  limit 1;

  if v_user_id is null then
    raise exception 'Auth user not found for email %.', v_user_email;
  end if;

  select id into v_role_id
  from public.roles
  where name = v_role_name
  limit 1;

  if v_role_id is null then
    raise exception 'Role % was not found in public.roles.', v_role_name;
  end if;

  -- Keep profile aligned to MAIN branch.
  update public.profiles
  set branch_id = v_branch_id,
      updated_at = now()
  where id = v_user_id;

  -- Replace all old role links with exactly one elevated role for MAIN.
  delete from public.user_roles
  where user_id = v_user_id;

  insert into public.user_roles (user_id, role_id, branch_id)
  values (v_user_id, v_role_id, v_branch_id)
  on conflict (user_id, role_id, branch_id) do update
  set updated_at = now();
end;
$$;

-- Verification
select
  u.email,
  p.full_name,
  b.code as branch_code,
  b.service_region,
  r.name as role
from auth.users u
join public.profiles p on p.id = u.id
left join public.user_roles ur on ur.user_id = p.id
left join public.roles r on r.id = ur.role_id
left join public.branches b on b.id = p.branch_id
where lower(u.email) = lower('REPLACE_WITH_LOGIN_EMAIL@example.com');
