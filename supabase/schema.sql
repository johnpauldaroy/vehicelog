create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      updated_at = now();

  return new;
end;
$$;

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

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  service_region text not null default 'other' check (service_region in ('other', 'panay')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  branch_id uuid references public.branches(id),
  employee_no text unique,
  full_name text not null,
  email text not null unique,
  contact_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  branch_id uuid references public.branches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (user_id, role_id, branch_id)
);

create table if not exists public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_type_id uuid references public.vehicle_types(id),
  assigned_branch_id uuid not null references public.branches(id),
  plate_number text not null unique,
  vehicle_name text not null,
  brand text,
  model text,
  year_model integer,
  color text,
  chassis_number text,
  engine_number text,
  status text not null default 'available' check (status in ('available', 'reserved', 'in_use', 'maintenance', 'inactive')),
  fuel_type text,
  seating_capacity integer,
  odometer_current numeric(12,2) not null default 0,
  is_odo_defective boolean not null default false,
  oil_change_reminder_enabled boolean not null default false,
  oil_change_interval_km integer check (oil_change_interval_km is null or oil_change_interval_km >= 0),
  oil_change_interval_months integer check (oil_change_interval_months is null or oil_change_interval_months >= 0),
  oil_change_last_odometer numeric(12,2),
  oil_change_last_changed_on date,
  registration_expiry date,
  insurance_expiry date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  branch_id uuid not null references public.branches(id),
  employee_id text not null unique,
  full_name text not null,
  contact_number text,
  license_number text not null,
  license_restrictions text,
  license_expiry date not null,
  status text not null default 'available' check (status in ('available', 'assigned', 'on_trip', 'inactive', 'leave')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.driver_licenses (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  license_number text not null,
  restrictions text,
  issue_date date,
  expiry_date date not null,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.vehicle_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  requested_by uuid not null references public.profiles(id),
  branch_id uuid not null references public.branches(id),
  purpose text not null,
  destination text not null,
  departure_datetime timestamptz not null,
  expected_return_datetime timestamptz not null,
  passenger_count integer not null default 1,
  notes text,
  status text not null default 'Draft' check (status in ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled', 'Ready for Release')),
  approver_id uuid references public.profiles(id),
  assigned_vehicle_id uuid references public.vehicles(id),
  assigned_driver_id uuid references public.drivers(id),
  approved_at timestamptz,
  rejection_reason text,
  supporting_attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

alter table public.vehicle_requests
  add column if not exists fuel_requested boolean not null default false,
  add column if not exists fuel_amount numeric(12,2) not null default 0,
  add column if not exists fuel_liters numeric(12,2) not null default 0,
  add column if not exists estimated_kms numeric(12,2) not null default 0,
  add column if not exists fuel_remarks text,
  add column if not exists fuel_product text,
  add column if not exists fuel_quote_price_per_liter numeric(12,4),
  add column if not exists fuel_quote_source text,
  add column if not exists fuel_quote_observed_at timestamptz,
  add column if not exists fuel_quote_location text,
  add column if not exists fuel_quote_province text,
  add column if not exists fuel_quote_municipality text;

create table if not exists public.fuel_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  municipality text not null,
  station_name text not null,
  fuel_type text not null check (fuel_type in ('diesel', 'gasoline_regular', 'gasoline_premium')),
  price_per_liter numeric(12,4) not null check (price_per_liter > 0),
  currency text not null default 'PHP',
  observed_at timestamptz not null,
  source text not null,
  confidence numeric(5,4) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.fuel_price_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null check (status in ('running', 'completed', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_upserted integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.request_passengers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.vehicle_requests(id) on delete cascade,
  passenger_name text not null,
  passenger_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

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

create table if not exists public.trip_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.vehicle_requests(id),
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.drivers(id),
  branch_id uuid not null references public.branches(id),
  date_out timestamptz,
  expected_return_datetime timestamptz,
  date_in timestamptz,
  odometer_out numeric(12,2),
  odometer_in numeric(12,2),
  fuel_out text,
  fuel_in text,
  condition_out text,
  condition_in text,
  actual_destination text,
  actual_return_datetime timestamptz,
  trip_status text not null default 'Scheduled' check (trip_status in ('Scheduled', 'Ready for Release', 'Checked Out', 'In Transit', 'Returned', 'Overdue', 'Incident Reported', 'Closed')),
  remarks text,
  mileage_computed numeric(12,2) generated always as (
    case
      when odometer_in is not null and odometer_out is not null then odometer_in - odometer_out
      else null
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.trip_checklists (
  id uuid primary key default gen_random_uuid(),
  trip_log_id uuid not null references public.trip_logs(id) on delete cascade,
  checklist_type text not null check (checklist_type in ('check_out', 'check_in')),
  item_name text not null,
  item_value text,
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

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

create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  trip_log_id uuid not null references public.trip_logs(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  receipt_no text,
  liters numeric(10,2),
  amount numeric(12,2),
  odometer numeric(12,2),
  station_name text,
  receipt_attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create unique index if not exists idx_fuel_price_snapshots_unique_station_point
  on public.fuel_price_snapshots(province, municipality, station_name, fuel_type, observed_at);

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  branch_id uuid not null references public.branches(id),
  maintenance_type text not null,
  schedule_date date not null,
  completed_date date,
  provider text,
  amount numeric(12,2),
  remarks text,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  provider text not null,
  policy_number text not null,
  start_date date not null,
  expiry_date date not null,
  coverage_type text,
  attachment_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.registration_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  or_number text,
  cr_number text,
  registration_date date not null,
  expiry_date date not null,
  attachment_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  trip_log_id uuid references public.trip_logs(id),
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid references public.drivers(id),
  branch_id uuid not null references public.branches(id),
  incident_datetime timestamptz not null,
  location text,
  description text not null,
  action_taken text,
  attachment_urls jsonb not null default '[]'::jsonb,
  status text not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz
);

create table if not exists public.maintenance_automation_settings (
  id text primary key default 'global',
  enabled boolean not null default true,
  oil_change_lead_days integer not null default 7 check (oil_change_lead_days >= 0 and oil_change_lead_days <= 60),
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  branch_id uuid references public.branches(id),
  title text not null,
  message text not null,
  notification_type text not null,
  source_key text,
  source_date date,
  is_read boolean not null default false,
  read_at timestamptz,
  push_dispatched_at timestamptz,
  push_dispatch_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

alter table public.notifications
  add column if not exists source_key text,
  add column if not exists source_date date,
  add column if not exists push_dispatched_at timestamptz,
  add column if not exists push_dispatch_error text;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  content_encoding text not null default 'aes128gcm',
  expiration_time timestamptz,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  branch_id uuid references public.branches(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  target_label text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_branch on public.profiles(branch_id);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_vehicles_branch_status on public.vehicles(assigned_branch_id, status);
create index if not exists idx_branches_service_region on public.branches(service_region);
create index if not exists idx_vehicle_requests_branch_status_departure on public.vehicle_requests(branch_id, status, departure_datetime);
create index if not exists idx_vehicle_requests_fuel_quote_observed on public.vehicle_requests(fuel_quote_observed_at desc);
create index if not exists idx_trip_logs_vehicle_status_return on public.trip_logs(vehicle_id, trip_status, expected_return_datetime);
create index if not exists idx_fuel_price_snapshots_lookup on public.fuel_price_snapshots(province, municipality, fuel_type, observed_at desc);
create index if not exists idx_fuel_price_sync_runs_started on public.fuel_price_sync_runs(started_at desc);
create index if not exists idx_maintenance_logs_vehicle_status_schedule on public.maintenance_logs(vehicle_id, status, schedule_date);
create index if not exists idx_insurance_policies_vehicle_expiry on public.insurance_policies(vehicle_id, expiry_date);
create index if not exists idx_registration_records_vehicle_expiry on public.registration_records(vehicle_id, expiry_date);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
create unique index if not exists idx_notifications_daily_source_dedupe
  on public.notifications(user_id, source_key, source_date)
  where source_key is not null and source_date is not null;
create index if not exists idx_notifications_push_pending
  on public.notifications(push_dispatched_at, created_at desc)
  where push_dispatched_at is null;
create unique index if not exists idx_web_push_subscriptions_endpoint_unique
  on public.web_push_subscriptions(endpoint);
create index if not exists idx_web_push_subscriptions_user_active
  on public.web_push_subscriptions(user_id, is_active, last_seen_at desc);
create index if not exists idx_audit_logs_target_created on public.audit_logs(target_table, target_id, created_at desc);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at before update on public.roles for each row execute function public.set_updated_at();

drop trigger if exists set_branches_updated_at on public.branches;
create trigger set_branches_updated_at before update on public.branches for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_user_roles_updated_at on public.user_roles;
create trigger set_user_roles_updated_at before update on public.user_roles for each row execute function public.set_updated_at();

drop trigger if exists set_vehicle_types_updated_at on public.vehicle_types;
create trigger set_vehicle_types_updated_at before update on public.vehicle_types for each row execute function public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();

drop trigger if exists set_vehicle_documents_updated_at on public.vehicle_documents;
create trigger set_vehicle_documents_updated_at before update on public.vehicle_documents for each row execute function public.set_updated_at();

drop trigger if exists set_drivers_updated_at on public.drivers;
create trigger set_drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();

drop trigger if exists set_driver_licenses_updated_at on public.driver_licenses;
create trigger set_driver_licenses_updated_at before update on public.driver_licenses for each row execute function public.set_updated_at();

drop trigger if exists set_vehicle_requests_updated_at on public.vehicle_requests;
create trigger set_vehicle_requests_updated_at before update on public.vehicle_requests for each row execute function public.set_updated_at();

drop trigger if exists set_request_passengers_updated_at on public.request_passengers;
create trigger set_request_passengers_updated_at before update on public.request_passengers for each row execute function public.set_updated_at();

drop trigger if exists set_trip_logs_updated_at on public.trip_logs;
create trigger set_trip_logs_updated_at before update on public.trip_logs for each row execute function public.set_updated_at();

drop trigger if exists set_trip_checklists_updated_at on public.trip_checklists;
create trigger set_trip_checklists_updated_at before update on public.trip_checklists for each row execute function public.set_updated_at();

drop trigger if exists set_fuel_logs_updated_at on public.fuel_logs;
create trigger set_fuel_logs_updated_at before update on public.fuel_logs for each row execute function public.set_updated_at();

drop trigger if exists set_fuel_price_snapshots_updated_at on public.fuel_price_snapshots;
create trigger set_fuel_price_snapshots_updated_at before update on public.fuel_price_snapshots for each row execute function public.set_updated_at();

drop trigger if exists set_fuel_price_sync_runs_updated_at on public.fuel_price_sync_runs;
create trigger set_fuel_price_sync_runs_updated_at before update on public.fuel_price_sync_runs for each row execute function public.set_updated_at();

drop trigger if exists set_maintenance_logs_updated_at on public.maintenance_logs;
create trigger set_maintenance_logs_updated_at before update on public.maintenance_logs for each row execute function public.set_updated_at();

drop trigger if exists set_maintenance_automation_settings_updated_at on public.maintenance_automation_settings;
create trigger set_maintenance_automation_settings_updated_at before update on public.maintenance_automation_settings for each row execute function public.set_updated_at();

drop trigger if exists set_insurance_policies_updated_at on public.insurance_policies;
create trigger set_insurance_policies_updated_at before update on public.insurance_policies for each row execute function public.set_updated_at();

drop trigger if exists set_registration_records_updated_at on public.registration_records;
create trigger set_registration_records_updated_at before update on public.registration_records for each row execute function public.set_updated_at();

drop trigger if exists set_incident_reports_updated_at on public.incident_reports;
create trigger set_incident_reports_updated_at before update on public.incident_reports for each row execute function public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at before update on public.notifications for each row execute function public.set_updated_at();

drop trigger if exists set_web_push_subscriptions_updated_at on public.web_push_subscriptions;
create trigger set_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row execute function public.set_updated_at();
