-- Adds a branch-scoped Backup Approver role.
-- Backup approvers can review branch vehicle requests without receiving full
-- branch management permissions granted to the main approver role.

insert into public.roles (id, name, description) values
  ('00000000-0000-0000-0000-000000000007', 'backup_approver', 'Backup branch request approver')
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

drop function if exists public.resolve_branch_main_approver(uuid, uuid);

create or replace function public.resolve_branch_main_approver(branch_uuid uuid, requester_uuid uuid default null)
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
  where r.name = 'approver'
    and ur.branch_id = branch_uuid
    and p.branch_id = branch_uuid
    and (requester_uuid is null or p.id <> requester_uuid)
    and p.is_active is distinct from false
    and p.deleted_at is null
  order by ur.created_at asc, p.created_at asc, p.id asc
  limit 1;
$$;

grant execute on function public.resolve_branch_main_approver(uuid, uuid) to authenticated;

create or replace function public.has_request_reviewer_role(branch_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or public.has_role('approver', branch_uuid)
    or public.has_role('backup_approver', branch_uuid);
$$;

grant execute on function public.has_request_reviewer_role(uuid) to authenticated;

create or replace function public.prevent_vehicle_request_self_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.requested_by = auth.uid()
     and new.status in ('Approved', 'Rejected')
     and not public.has_role('admin') then
    if TG_OP = 'INSERT' then
      raise exception 'Users cannot approve or reject their own vehicle request.';
    end if;

    if old.status is distinct from new.status
       or old.approver_id is distinct from new.approver_id
       or old.approved_at is distinct from new.approved_at
       or old.rejection_reason is distinct from new.rejection_reason then
      raise exception 'Users cannot approve or reject their own vehicle request.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_vehicle_request_self_review on public.vehicle_requests;
create trigger prevent_vehicle_request_self_review
before insert or update on public.vehicle_requests
for each row
execute function public.prevent_vehicle_request_self_review();

drop policy if exists "vehicle requests update by approver or admin" on public.vehicle_requests;
create policy "vehicle requests update by approver or admin"
on public.vehicle_requests
for update
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
    and not public.has_role('pump_station')
    and (
      public.has_request_reviewer_role(branch_id)
      or requested_by = auth.uid()
    )
  )
)
with check (
  public.has_role('admin')
  or (
    not public.has_role('guard')
    and not public.has_role('pump_station')
    and (
      public.has_request_reviewer_role(branch_id)
      or requested_by = auth.uid()
    )
  )
);
