create or replace function public.has_role(role_name text, branch_uuid uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
      and (
        branch_uuid is null
        or ur.branch_id is null
        or ur.branch_id = branch_uuid
      )
  );
$$;

create or replace function public.same_branch(branch_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.branch_id = branch_uuid
  );
$$;

create or replace function public.is_panay_branch_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.branches b on b.id = p.branch_id
    where p.id = auth.uid()
      and b.service_region = 'panay'
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.branches enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_licenses enable row level security;
alter table public.vehicle_requests enable row level security;
alter table public.request_passengers enable row level security;
alter table public.trip_logs enable row level security;
alter table public.trip_checklists enable row level security;
alter table public.fuel_logs enable row level security;
alter table public.fuel_price_snapshots enable row level security;
alter table public.fuel_price_sync_runs enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.registration_records enable row level security;
alter table public.incident_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles self or admin" on public.profiles;
create policy "profiles self or admin"
on public.profiles
for select
using (
  id = auth.uid()
  or public.has_role('admin')
  or public.same_branch(branch_id)
);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles
for update
using (id = auth.uid() or public.has_role('admin'))
with check (id = auth.uid() or public.has_role('admin'));

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
on public.profiles
for insert
with check (id = auth.uid() or public.has_role('admin'));

drop policy if exists "user roles own or admin" on public.user_roles;
create policy "user roles own or admin"
on public.user_roles
for select
using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "user roles manage by admin" on public.user_roles;
create policy "user roles manage by admin"
on public.user_roles
for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "branches visible to authenticated" on public.branches;
create policy "branches visible to authenticated"
on public.branches
for select
using (auth.role() = 'authenticated');

drop policy if exists "branches manage by admin" on public.branches;
create policy "branches manage by admin"
on public.branches
for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "vehicles select by branch or admin" on public.vehicles;
create policy "vehicles select by branch or admin"
on public.vehicles
for select
using (public.has_role('admin') or public.same_branch(assigned_branch_id));

drop policy if exists "vehicles manage by admin or approver" on public.vehicles;
create policy "vehicles manage by admin or approver"
on public.vehicles
for all
using (
  public.has_role('admin')
  or public.has_role('approver', assigned_branch_id)
)
with check (
  public.has_role('admin')
  or public.has_role('approver', assigned_branch_id)
);

drop policy if exists "documents scoped select" on public.vehicle_documents;
create policy "documents scoped select"
on public.vehicle_documents
for select
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and public.same_branch(v.assigned_branch_id)
  )
);

drop policy if exists "documents scoped manage" on public.vehicle_documents;
create policy "documents scoped manage"
on public.vehicle_documents
for all
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and public.has_role('approver', v.assigned_branch_id)
  )
)
with check (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and public.has_role('approver', v.assigned_branch_id)
  )
);

drop policy if exists "drivers select by branch or admin" on public.drivers;
create policy "drivers select by branch or admin"
on public.drivers
for select
using (
  public.has_role('admin')
  or public.same_branch(branch_id)
  or profile_id = auth.uid()
);

drop policy if exists "drivers manage by admin or approver" on public.drivers;
create policy "drivers manage by admin or approver"
on public.drivers
for all
using (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
)
with check (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
);

drop policy if exists "driver licenses scoped select" on public.driver_licenses;
create policy "driver licenses scoped select"
on public.driver_licenses
for select
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.drivers d
    where d.id = driver_licenses.driver_id
      and (
        d.profile_id = auth.uid()
        or public.same_branch(d.branch_id)
      )
  )
);

drop policy if exists "driver licenses scoped manage" on public.driver_licenses;
create policy "driver licenses scoped manage"
on public.driver_licenses
for all
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.drivers d
    where d.id = driver_licenses.driver_id
      and public.has_role('approver', d.branch_id)
  )
)
with check (
  public.has_role('admin')
  or exists (
    select 1
    from public.drivers d
    where d.id = driver_licenses.driver_id
      and public.has_role('approver', d.branch_id)
  )
);

drop policy if exists "vehicle requests select scoped" on public.vehicle_requests;
create policy "vehicle requests select scoped"
on public.vehicle_requests
for select
using (
  public.has_role('admin')
  or requested_by = auth.uid()
  or approver_id = auth.uid()
  or public.same_branch(branch_id)
);

drop policy if exists "vehicle requests create self" on public.vehicle_requests;
create policy "vehicle requests create self"
on public.vehicle_requests
for insert
with check (
  requested_by = auth.uid()
  and (public.same_branch(branch_id) or public.has_role('admin'))
);

drop policy if exists "vehicle requests update by approver or admin" on public.vehicle_requests;
create policy "vehicle requests update by approver or admin"
on public.vehicle_requests
for update
using (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or requested_by = auth.uid()
)
with check (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or requested_by = auth.uid()
);

drop policy if exists "request passengers scoped select" on public.request_passengers;
create policy "request passengers scoped select"
on public.request_passengers
for select
using (
  exists (
    select 1
    from public.vehicle_requests vr
    where vr.id = request_passengers.request_id
      and (
        public.has_role('admin')
        or vr.requested_by = auth.uid()
        or vr.approver_id = auth.uid()
        or public.same_branch(vr.branch_id)
      )
  )
);

drop policy if exists "request passengers scoped manage" on public.request_passengers;
create policy "request passengers scoped manage"
on public.request_passengers
for all
using (
  exists (
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
with check (
  exists (
    select 1
    from public.vehicle_requests vr
    where vr.id = request_passengers.request_id
      and (
        public.has_role('admin')
        or public.has_role('approver', vr.branch_id)
        or vr.requested_by = auth.uid()
      )
  )
);

drop policy if exists "trip logs select scoped" on public.trip_logs;
create policy "trip logs select scoped"
on public.trip_logs
for select
using (
  public.has_role('admin')
  or public.same_branch(branch_id)
  or exists (
    select 1
    from public.drivers d
    where d.id = trip_logs.driver_id
      and d.profile_id = auth.uid()
  )
);

drop policy if exists "trip logs manage by admin approver driver" on public.trip_logs;
create policy "trip logs manage by admin approver driver"
on public.trip_logs
for all
using (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or exists (
    select 1
    from public.drivers d
    where d.id = trip_logs.driver_id
      and d.profile_id = auth.uid()
  )
)
with check (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or exists (
    select 1
    from public.drivers d
    where d.id = trip_logs.driver_id
      and d.profile_id = auth.uid()
  )
);

drop policy if exists "trip checklists scoped select" on public.trip_checklists;
create policy "trip checklists scoped select"
on public.trip_checklists
for select
using (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    where tl.id = trip_checklists.trip_log_id
      and (
        public.has_role('admin')
        or public.same_branch(tl.branch_id)
        or d.profile_id = auth.uid()
      )
  )
);

drop policy if exists "trip checklists scoped manage" on public.trip_checklists;
create policy "trip checklists scoped manage"
on public.trip_checklists
for all
using (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    where tl.id = trip_checklists.trip_log_id
      and (
        public.has_role('admin')
        or public.has_role('approver', tl.branch_id)
        or d.profile_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    where tl.id = trip_checklists.trip_log_id
      and (
        public.has_role('admin')
        or public.has_role('approver', tl.branch_id)
        or d.profile_id = auth.uid()
      )
  )
);

drop policy if exists "fuel logs scoped select" on public.fuel_logs;
create policy "fuel logs scoped select"
on public.fuel_logs
for select
using (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    where tl.id = fuel_logs.trip_log_id
      and (
        public.has_role('admin')
        or public.same_branch(tl.branch_id)
        or d.profile_id = auth.uid()
      )
  )
);

drop policy if exists "fuel logs scoped manage" on public.fuel_logs;
create policy "fuel logs scoped manage"
on public.fuel_logs
for all
using (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    where tl.id = fuel_logs.trip_log_id
      and (
        public.has_role('admin')
        or public.has_role('approver', tl.branch_id)
        or d.profile_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    where tl.id = fuel_logs.trip_log_id
      and (
        public.has_role('admin')
        or public.has_role('approver', tl.branch_id)
        or d.profile_id = auth.uid()
      )
  )
);

drop policy if exists "fuel price snapshots scoped select" on public.fuel_price_snapshots;
create policy "fuel price snapshots scoped select"
on public.fuel_price_snapshots
for select
using (
  public.has_role('admin')
  or public.is_panay_branch_user()
);

drop policy if exists "fuel price snapshots manage by admin" on public.fuel_price_snapshots;
create policy "fuel price snapshots manage by admin"
on public.fuel_price_snapshots
for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "fuel price sync runs scoped select" on public.fuel_price_sync_runs;
create policy "fuel price sync runs scoped select"
on public.fuel_price_sync_runs
for select
using (
  public.has_role('admin')
  or public.is_panay_branch_user()
);

drop policy if exists "fuel price sync runs manage by admin" on public.fuel_price_sync_runs;
create policy "fuel price sync runs manage by admin"
on public.fuel_price_sync_runs
for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "maintenance select scoped" on public.maintenance_logs;
create policy "maintenance select scoped"
on public.maintenance_logs
for select
using (public.has_role('admin') or public.same_branch(branch_id));

drop policy if exists "maintenance manage by admin approver driver" on public.maintenance_logs;
drop policy if exists "maintenance manage by admin approver" on public.maintenance_logs;
create policy "maintenance manage by admin approver driver"
on public.maintenance_logs
for all
using (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or public.has_role('driver', branch_id)
)
with check (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or public.has_role('driver', branch_id)
);

drop policy if exists "insurance scoped select" on public.insurance_policies;
create policy "insurance scoped select"
on public.insurance_policies
for select
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = insurance_policies.vehicle_id
      and public.same_branch(v.assigned_branch_id)
  )
);

drop policy if exists "insurance scoped manage" on public.insurance_policies;
create policy "insurance scoped manage"
on public.insurance_policies
for all
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = insurance_policies.vehicle_id
      and public.has_role('approver', v.assigned_branch_id)
  )
)
with check (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = insurance_policies.vehicle_id
      and public.has_role('approver', v.assigned_branch_id)
  )
);

drop policy if exists "registration scoped select" on public.registration_records;
create policy "registration scoped select"
on public.registration_records
for select
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = registration_records.vehicle_id
      and public.same_branch(v.assigned_branch_id)
  )
);

drop policy if exists "registration scoped manage" on public.registration_records;
create policy "registration scoped manage"
on public.registration_records
for all
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = registration_records.vehicle_id
      and public.has_role('approver', v.assigned_branch_id)
  )
)
with check (
  public.has_role('admin')
  or exists (
    select 1
    from public.vehicles v
    where v.id = registration_records.vehicle_id
      and public.has_role('approver', v.assigned_branch_id)
  )
);

drop policy if exists "incident select scoped" on public.incident_reports;
create policy "incident select scoped"
on public.incident_reports
for select
using (
  public.has_role('admin')
  or public.same_branch(branch_id)
  or created_by = auth.uid()
);

drop policy if exists "incident insert by driver approver admin" on public.incident_reports;
create policy "incident insert by driver approver admin"
on public.incident_reports
for insert
with check (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or created_by = auth.uid()
);

drop policy if exists "incident update by creator branch approver admin" on public.incident_reports;
create policy "incident update by creator branch approver admin"
on public.incident_reports
for update
using (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or created_by = auth.uid()
)
with check (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or created_by = auth.uid()
);

drop policy if exists "notifications own or admin" on public.notifications;
create policy "notifications own or admin"
on public.notifications
for select
using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update"
on public.notifications
for update
using (user_id = auth.uid() or public.has_role('admin'))
with check (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "notifications admin or branch approver insert" on public.notifications;
create policy "notifications admin or branch approver insert"
on public.notifications
for insert
with check (
  public.has_role('admin')
  or (
    branch_id is not null
    and public.has_role('approver', branch_id)
  )
);

drop policy if exists "audit visible to approver admin" on public.audit_logs;
create policy "audit visible to approver admin"
on public.audit_logs
for select
using (
  public.has_role('admin')
  or (
    branch_id is not null
    and public.has_role('approver', branch_id)
  )
);

drop policy if exists "audit insert by actor branch approver admin" on public.audit_logs;
create policy "audit insert by actor branch approver admin"
on public.audit_logs
for insert
with check (
  public.has_role('admin')
  or (
    branch_id is not null
    and public.has_role('approver', branch_id)
  )
  or actor_id = auth.uid()
);
