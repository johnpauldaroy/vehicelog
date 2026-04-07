-- Resolve a canonical admin approver ID for request assignment.
drop function if exists public.resolve_admin_approver(uuid);

create or replace function public.resolve_admin_approver(branch_uuid uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  join public.roles r on r.id = ur.role_id
  where r.name = 'admin'
    and p.is_active is distinct from false
    and p.deleted_at is null
  order by
    case
      when branch_uuid is not null and (ur.branch_id = branch_uuid or p.branch_id = branch_uuid) then 0
      when ur.branch_id is null then 1
      else 2
    end,
    p.created_at asc,
    p.id asc
  limit 1;
$$;

grant execute on function public.resolve_admin_approver(uuid) to authenticated;
