-- Add pump station role catalog entry.
insert into public.roles (id, name, description)
values (
  '00000000-0000-0000-0000-000000000006',
  'pump_station',
  'Pump station fuel authorization portal'
)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

-- Branch-scoped approved fuel authorization feed for pump station users.
drop function if exists public.get_pump_fuel_authorization_feed();

create or replace function public.get_pump_fuel_authorization_feed()
returns table (
  request_id uuid,
  request_no text,
  branch_id uuid,
  branch_name text,
  status text,
  approver_name text,
  approved_at timestamptz,
  fuel_product text,
  fuel_amount numeric(12,2),
  fuel_liters numeric(12,2),
  estimated_kms numeric(12,2),
  fuel_remarks text,
  fuel_quote_price_per_liter numeric(12,4),
  fuel_quote_source text,
  fuel_quote_observed_at timestamptz,
  fuel_quote_location text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with pump_profile as (
    select p.id as user_id, p.branch_id
    from public.profiles p
    where p.id = auth.uid()
      and p.branch_id is not null
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = p.id
          and r.name = 'pump_station'
          and (ur.branch_id is null or ur.branch_id = p.branch_id)
      )
    limit 1
  )
  select
    vr.id as request_id,
    vr.request_no,
    vr.branch_id,
    coalesce(branch.name, 'Unknown') as branch_name,
    vr.status,
    coalesce(approver.full_name, 'Pending') as approver_name,
    vr.approved_at,
    vr.fuel_product,
    vr.fuel_amount,
    vr.fuel_liters,
    vr.estimated_kms,
    vr.fuel_remarks,
    vr.fuel_quote_price_per_liter,
    vr.fuel_quote_source,
    vr.fuel_quote_observed_at,
    vr.fuel_quote_location,
    vr.created_at
  from pump_profile pp
  join public.vehicle_requests vr on vr.branch_id = pp.branch_id
  left join public.branches branch on branch.id = vr.branch_id
  left join public.profiles approver on approver.id = vr.approver_id
  where vr.fuel_requested = true
    and vr.status = 'Approved'
  order by coalesce(vr.approved_at, vr.created_at) desc, vr.request_no desc;
$$;

-- Keep full vehicle request rows hidden from pump station users.
drop policy if exists "vehicle requests select scoped" on public.vehicle_requests;
create policy "vehicle requests select scoped"
on public.vehicle_requests
for select
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
    and not public.has_role('pump_station')
    and (
      requested_by = auth.uid()
      or approver_id = auth.uid()
      or public.same_branch(branch_id)
    )
  )
);

drop policy if exists "vehicle requests create self" on public.vehicle_requests;
create policy "vehicle requests create self"
on public.vehicle_requests
for insert
with check (
  requested_by = auth.uid()
  and (public.same_branch(branch_id) or public.has_role('admin'))
  and (
    public.has_role('admin')
    or (
      not public.has_role('guard')
      and not public.has_role('pump_station')
    )
  )
);

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
      public.has_role('approver', branch_id)
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
      public.has_role('approver', branch_id)
      or requested_by = auth.uid()
    )
  )
);

-- Keep passenger manifests hidden from pump station users.
drop policy if exists "request passengers scoped select" on public.request_passengers;
create policy "request passengers scoped select"
on public.request_passengers
for select
using (
  public.has_role('admin')
  or (
    not public.has_role('pump_station')
    and exists (
      select 1
      from public.vehicle_requests vr
      where vr.id = request_passengers.request_id
        and (
          vr.requested_by = auth.uid()
          or vr.approver_id = auth.uid()
          or public.same_branch(vr.branch_id)
        )
    )
  )
);

drop policy if exists "request passengers scoped manage" on public.request_passengers;
create policy "request passengers scoped manage"
on public.request_passengers
for all
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
    and not public.has_role('pump_station')
    and exists (
      select 1
      from public.vehicle_requests vr
      where vr.id = request_passengers.request_id
        and (
          public.has_role('admin')
          or public.has_role('approver', vr.branch_id)
          or vr.requested_by = auth.uid()
        )
    )
  )
)
with check (
  public.has_role('admin')
  or (
    not public.has_role('guard')
    and not public.has_role('pump_station')
    and exists (
      select 1
      from public.vehicle_requests vr
      where vr.id = request_passengers.request_id
        and (
          public.has_role('admin')
          or public.has_role('approver', vr.branch_id)
          or vr.requested_by = auth.uid()
        )
    )
  )
);

-- Keep full trip rows hidden from pump station users.
drop policy if exists "trip logs select scoped" on public.trip_logs;
create policy "trip logs select scoped"
on public.trip_logs
for select
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
    and not public.has_role('pump_station')
    and (
      public.same_branch(branch_id)
      or exists (
        select 1
        from public.drivers d
        where d.id = trip_logs.driver_id
          and d.profile_id = auth.uid()
      )
    )
  )
);
