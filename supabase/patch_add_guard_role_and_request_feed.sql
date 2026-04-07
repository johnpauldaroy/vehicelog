-- Add guard role catalog entry.
insert into public.roles (id, name, description)
values (
  '00000000-0000-0000-0000-000000000005',
  'guard',
  'Branch guard request monitor'
)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

-- Restricted request feed for guard users.
drop function if exists public.get_guard_request_feed();

create or replace function public.get_guard_request_feed()
returns table (
  request_id uuid,
  request_no text,
  status text,
  requester_id uuid,
  requester_name text,
  branch_id uuid,
  branch_name text,
  departure_datetime timestamptz,
  expected_return_datetime timestamptz,
  passenger_count integer,
  passenger_names text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with guard_profile as (
    select p.id as user_id, p.branch_id
    from public.profiles p
    where p.id = auth.uid()
      and p.branch_id is not null
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = p.id
          and r.name = 'guard'
          and (ur.branch_id is null or ur.branch_id = p.branch_id)
      )
    limit 1
  )
  select
    vr.id as request_id,
    vr.request_no,
    vr.status,
    vr.requested_by as requester_id,
    coalesce(requester.full_name, 'Unknown') as requester_name,
    vr.branch_id,
    coalesce(branch.name, 'Unknown') as branch_name,
    vr.departure_datetime,
    vr.expected_return_datetime,
    coalesce(vr.passenger_count, 1)::integer as passenger_count,
    coalesce(
      array_agg(rp.passenger_name order by rp.created_at)
        filter (where rp.passenger_name is not null and btrim(rp.passenger_name) <> ''),
      '{}'::text[]
    ) as passenger_names,
    vr.created_at
  from guard_profile gp
  join public.vehicle_requests vr on vr.branch_id = gp.branch_id
  left join public.profiles requester on requester.id = vr.requested_by
  left join public.branches branch on branch.id = vr.branch_id
  left join public.request_passengers rp on rp.request_id = vr.id
  group by
    vr.id,
    vr.request_no,
    vr.status,
    vr.requested_by,
    requester.full_name,
    vr.branch_id,
    branch.name,
    vr.departure_datetime,
    vr.expected_return_datetime,
    vr.passenger_count,
    vr.created_at
  order by coalesce(vr.created_at, vr.departure_datetime) desc, vr.request_no desc;
$$;

drop function if exists public.get_guard_trip_feed();

create or replace function public.get_guard_trip_feed()
returns table (
  trip_id uuid,
  request_id uuid,
  request_no text,
  requester_name text,
  driver_name text,
  vehicle_name text,
  branch_id uuid,
  branch_name text,
  trip_status text,
  date_out timestamptz,
  expected_return_datetime timestamptz,
  date_in timestamptz,
  passenger_count integer,
  passenger_names text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with guard_profile as (
    select p.id as user_id, p.branch_id
    from public.profiles p
    where p.id = auth.uid()
      and p.branch_id is not null
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = p.id
          and r.name = 'guard'
          and (ur.branch_id is null or ur.branch_id = p.branch_id)
      )
    limit 1
  )
  select
    tl.id as trip_id,
    tl.request_id,
    coalesce(vr.request_no, 'Unlinked request') as request_no,
    coalesce(requester.full_name, 'Unknown') as requester_name,
    coalesce(driver.full_name, 'Unknown driver') as driver_name,
    coalesce(vehicle.vehicle_name, 'Unknown vehicle') as vehicle_name,
    tl.branch_id,
    coalesce(branch.name, 'Unknown') as branch_name,
    tl.trip_status,
    tl.date_out,
    tl.expected_return_datetime,
    tl.date_in,
    coalesce(vr.passenger_count, 1)::integer as passenger_count,
    coalesce(
      array_agg(rp.passenger_name order by rp.created_at)
        filter (where rp.passenger_name is not null and btrim(rp.passenger_name) <> ''),
      '{}'::text[]
    ) as passenger_names
  from guard_profile gp
  join public.trip_logs tl on tl.branch_id = gp.branch_id
  left join public.vehicle_requests vr on vr.id = tl.request_id
  left join public.profiles requester on requester.id = vr.requested_by
  left join public.drivers driver on driver.id = tl.driver_id
  left join public.vehicles vehicle on vehicle.id = tl.vehicle_id
  left join public.branches branch on branch.id = tl.branch_id
  left join public.request_passengers rp on rp.request_id = tl.request_id
  group by
    tl.id,
    tl.request_id,
    vr.request_no,
    requester.full_name,
    driver.full_name,
    vehicle.vehicle_name,
    tl.branch_id,
    branch.name,
    tl.trip_status,
    tl.date_out,
    tl.expected_return_datetime,
    tl.date_in,
    vr.passenger_count
  order by coalesce(tl.date_out, tl.expected_return_datetime) desc, coalesce(vr.request_no, '') desc;
$$;

-- Keep full vehicle request rows hidden from guard users.
drop policy if exists "vehicle requests select scoped" on public.vehicle_requests;
create policy "vehicle requests select scoped"
on public.vehicle_requests
for select
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
    and (
      requested_by = auth.uid()
      or approver_id = auth.uid()
      or public.same_branch(branch_id)
    )
  )
);

-- Guard users are request-read-only (no inserts).
drop policy if exists "vehicle requests create self" on public.vehicle_requests;
create policy "vehicle requests create self"
on public.vehicle_requests
for insert
with check (
  requested_by = auth.uid()
  and (public.same_branch(branch_id) or public.has_role('admin'))
  and (public.has_role('admin') or not public.has_role('guard'))
);

-- Guard users are request-read-only (no updates).
drop policy if exists "vehicle requests update by approver or admin" on public.vehicle_requests;
create policy "vehicle requests update by approver or admin"
on public.vehicle_requests
for update
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
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
    and (
      public.has_role('approver', branch_id)
      or requested_by = auth.uid()
    )
  )
);

-- Guard users are request-read-only (no passenger list writes).
drop policy if exists "request passengers scoped manage" on public.request_passengers;
create policy "request passengers scoped manage"
on public.request_passengers
for all
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
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

-- Keep full trip rows hidden from guard users.
drop policy if exists "trip logs select scoped" on public.trip_logs;
create policy "trip logs select scoped"
on public.trip_logs
for select
using (
  public.has_role('admin')
  or (
    not public.has_role('guard')
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
