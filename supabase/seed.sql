-- Create these users first in Supabase Auth, then run this seed:
-- admin@bmpc.local
-- admin.ops@bmpc.local
-- approver.main@bmpc.local
-- driver.lara@bmpc.local
-- driver.joel@bmpc.local
-- requester.nina@bmpc.local

do $$
declare
  missing_users text;
begin
  select string_agg(email, ', ' order by email)
  into missing_users
  from (
    select required.email
    from (
      values
        ('admin@bmpc.local'),
        ('admin.ops@bmpc.local'),
        ('approver.main@bmpc.local'),
        ('driver.lara@bmpc.local'),
        ('driver.joel@bmpc.local'),
        ('requester.nina@bmpc.local')
    ) as required(email)
    where not exists (
      select 1
      from auth.users u
      where lower(u.email) = lower(required.email)
    )
  ) missing;

  if missing_users is not null then
    raise exception 'Create these Supabase Auth users before running seed.sql: %', missing_users;
  end if;
end;
$$;

insert into public.roles (id, name, description) values
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Full fleet administrator'),
  ('00000000-0000-0000-0000-000000000002', 'approver', 'Branch approver or manager'),
  ('00000000-0000-0000-0000-000000000005', 'guard', 'Branch guard request monitor'),
  ('00000000-0000-0000-0000-000000000006', 'pump_station', 'Pump station fuel authorization portal'),
  ('00000000-0000-0000-0000-000000000003', 'driver', 'Authorized driver'),
  ('00000000-0000-0000-0000-000000000004', 'requester', 'Vehicle requester')
on conflict (id) do nothing;

insert into public.branches (id, code, name, address, service_region) values
  ('10000000-0000-0000-0000-000000000001', 'MAIN', 'Main Office', 'Calamba, Laguna', 'panay'),
  ('10000000-0000-0000-0000-000000000002', 'NORTH', 'North Cluster', 'San Pablo, Laguna', 'other'),
  ('10000000-0000-0000-0000-000000000003', 'SOUTH', 'South Cluster', 'Sta. Rosa, Laguna', 'other')
on conflict (id) do nothing;

update public.branches
set service_region = case when code = 'MAIN' then 'panay' else 'other' end
where code in ('MAIN', 'NORTH', 'SOUTH');

insert into public.vehicle_types (id, name, description) values
  ('20000000-0000-0000-0000-000000000001', 'Pickup', 'Utility pickup'),
  ('20000000-0000-0000-0000-000000000002', 'SUV', 'Field response vehicle'),
  ('20000000-0000-0000-0000-000000000003', 'MPV', 'Passenger shuttle'),
  ('20000000-0000-0000-0000-000000000004', 'Sedan', 'City service unit'),
  ('20000000-0000-0000-0000-000000000005', 'Van', 'Cargo or service van'),
  ('20000000-0000-0000-0000-000000000006', 'Motorcycle', 'Motorcycle or utility bike')
on conflict (id) do nothing;

insert into public.profiles (id, branch_id, employee_no, full_name, email, contact_number)
select
  u.id,
  seed.branch_id,
  seed.employee_no,
  seed.full_name,
  u.email,
  seed.contact_number
from (
  values
    ('admin@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'BMPC-001', 'Marina Santos', '0917-200-1001'),
    ('admin.ops@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'BMPC-005', 'Alicia Reyes', '0917-200-1005'),
    ('approver.main@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'BMPC-002', 'Daniel Flores', '0917-200-1002'),
    ('driver.lara@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'BMPC-223', 'Lara Cruz', '0917-200-1102'),
    ('driver.joel@bmpc.local', '10000000-0000-0000-0000-000000000002'::uuid, 'BMPC-310', 'Joel Ramirez', '0917-200-1103'),
    ('requester.nina@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'BMPC-004', 'Nina Lopez', '0917-200-1004')
) as seed(email, branch_id, employee_no, full_name, contact_number)
join auth.users u on lower(u.email) = lower(seed.email)
on conflict (id) do update
set branch_id = excluded.branch_id,
    employee_no = excluded.employee_no,
    full_name = excluded.full_name,
    email = excluded.email,
    contact_number = excluded.contact_number,
    updated_at = now();

delete from public.user_roles ur
using public.profiles p
where ur.user_id = p.id
  and lower(p.email) in (
    'admin@bmpc.local',
    'admin.ops@bmpc.local',
    'approver.main@bmpc.local',
    'driver.lara@bmpc.local',
    'driver.joel@bmpc.local',
    'requester.nina@bmpc.local'
  );

insert into public.user_roles (user_id, role_id, branch_id)
select
  p.id,
  r.id,
  branch_map.branch_id
from (
  values
    ('admin@bmpc.local', 'admin', '10000000-0000-0000-0000-000000000001'::uuid),
    ('admin.ops@bmpc.local', 'admin', '10000000-0000-0000-0000-000000000001'::uuid),
    ('approver.main@bmpc.local', 'approver', '10000000-0000-0000-0000-000000000001'::uuid),
    ('driver.lara@bmpc.local', 'driver', '10000000-0000-0000-0000-000000000001'::uuid),
    ('driver.joel@bmpc.local', 'driver', '10000000-0000-0000-0000-000000000002'::uuid),
    ('requester.nina@bmpc.local', 'requester', '10000000-0000-0000-0000-000000000001'::uuid)
) as branch_map(email, role_name, branch_id)
join public.profiles p on lower(p.email) = lower(branch_map.email)
join public.roles r on r.name = branch_map.role_name
on conflict (user_id, role_id, branch_id) do update
set updated_at = now();

insert into public.vehicles (
  id,
  vehicle_type_id,
  assigned_branch_id,
  plate_number,
  vehicle_name,
  brand,
  model,
  year_model,
  color,
  status,
  fuel_type,
  seating_capacity,
  odometer_current,
  oil_change_reminder_enabled,
  oil_change_interval_km,
  oil_change_interval_months,
  oil_change_last_odometer,
  oil_change_last_changed_on,
  registration_expiry,
  insurance_expiry
) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'NAB-1024', 'Hilux Field Unit', 'Toyota', 'Hilux', 2023, 'White', 'available', 'Diesel', 5, 42155, true, 5000, 6, 38000, '2025-12-15', '2026-05-08', '2026-04-02'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'NCD-3401', 'Innova Shuttle', 'Toyota', 'Innova', 2022, 'Silver', 'reserved', 'Diesel', 7, 28311, true, 5000, 6, 25000, '2025-11-18', '2026-03-28', '2026-08-13'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'NEF-7730', 'Montero Response', 'Mitsubishi', 'Montero', 2021, 'Black', 'in_use', 'Diesel', 7, 58201, true, 7000, 6, 53000, '2025-10-01', '2026-06-20', '2026-03-18'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'NFK-5542', 'L300 Cargo', 'Mitsubishi', 'L300', 2020, 'White', 'maintenance', 'Diesel', 3, 90511, false, null, null, null, null, '2026-09-01', '2026-10-15')
on conflict (id) do nothing;

insert into public.drivers (
  id,
  profile_id,
  branch_id,
  employee_id,
  full_name,
  contact_number,
  license_number,
  license_restrictions,
  license_expiry,
  status
) values
  ('50000000-0000-0000-0000-000000000001', (select id from public.profiles where lower(email) = 'driver.lara@bmpc.local'), '10000000-0000-0000-0000-000000000001', 'BMPC-223', 'Lara Cruz', '0917-200-1102', 'D02-09-776655', 'B, B1', '2026-07-10', 'assigned'),
  ('50000000-0000-0000-0000-000000000002', (select id from public.profiles where lower(email) = 'driver.joel@bmpc.local'), '10000000-0000-0000-0000-000000000002', 'BMPC-310', 'Joel Ramirez', '0917-200-1103', 'D03-05-456123', 'B, B1, B2', '2026-04-11', 'on_trip')
on conflict (id) do nothing;

insert into public.vehicle_requests (
  id,
  request_no,
  requested_by,
  branch_id,
  purpose,
  destination,
  departure_datetime,
  expected_return_datetime,
  passenger_count,
  notes,
  status,
  approver_id,
  assigned_vehicle_id,
  assigned_driver_id,
  approved_at
) values
  (
    '60000000-0000-0000-0000-000000000001',
    'VR-2026-0311-001',
    (select id from public.profiles where lower(email) = 'requester.nina@bmpc.local'),
    '10000000-0000-0000-0000-000000000001',
    'Branch audit and treasury pickup',
    'Calamba and Los Banos',
    '2026-03-12 07:30:00+08',
    '2026-03-12 18:00:00+08',
    3,
    'Approved same-day operational trip',
    'Approved',
    (select id from public.profiles where lower(email) = 'approver.main@bmpc.local'),
    '40000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '2026-03-11 07:55:00+08'
  )
on conflict (id) do nothing;

insert into public.trip_logs (
  id,
  request_id,
  vehicle_id,
  driver_id,
  branch_id,
  date_out,
  expected_return_datetime,
  odometer_out,
  fuel_out,
  condition_out,
  actual_destination,
  trip_status,
  remarks
) values
  (
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '2026-03-12 07:38:00+08',
    '2026-03-12 18:00:00+08',
    28200,
    '7/8',
    'No visible issues at release',
    'Calamba and Los Banos',
    'In Transit',
    'Branch audit trip in progress'
  )
on conflict (id) do nothing;

-- Panay fuel rows are intentionally not seeded.
-- They should come from a real provider sync (DOE/partner API) via the edge function.

insert into public.maintenance_logs (
  id,
  vehicle_id,
  branch_id,
  maintenance_type,
  schedule_date,
  provider,
  amount,
  status
) values
  (
    '80000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    'Preventive maintenance',
    '2026-03-13',
    'Laguna Fleet Services',
    0,
    'Pending'
  )
on conflict (id) do nothing;

insert into public.maintenance_automation_settings (id, enabled, oil_change_lead_days, timezone)
values ('global', true, 7, 'Asia/Manila')
on conflict (id) do nothing;

insert into public.incident_reports (
  id,
  trip_log_id,
  vehicle_id,
  driver_id,
  branch_id,
  incident_datetime,
  location,
  description,
  action_taken,
  attachment_urls,
  status
) values
  (
    '90000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '2026-03-12 10:15:00+08',
    'Los Banos municipal road',
    'Door sensor warning triggered during the branch audit route.',
    'Driver inspected the latch and continued the trip with passenger confirmation.',
    '[]'::jsonb,
    'Open'
  )
on conflict (id) do nothing;

insert into public.notifications (user_id, branch_id, title, message, notification_type)
select
  p.id,
  seed.branch_id,
  seed.title,
  seed.message,
  seed.notification_type
from (
  values
    ('admin@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'Insurance expiring soon', 'Innova Shuttle insurance expires soon.', 'warning'),
    ('approver.main@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'Approval queue updated', 'One new request is ready for dispatch.', 'info')
) as seed(email, branch_id, title, message, notification_type)
join public.profiles p on lower(p.email) = lower(seed.email)
where not exists (
  select 1
  from public.notifications n
  where n.user_id = p.id
    and n.title = seed.title
    and n.message = seed.message
);

insert into public.audit_logs (actor_id, branch_id, action, target_table, target_id, target_label, after_data)
select
  p.id,
  seed.branch_id,
  seed.action,
  seed.target_table,
  seed.target_id,
  seed.target_label,
  seed.after_data
from (
  values
    ('approver.main@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'Approved request', 'vehicle_requests', '60000000-0000-0000-0000-000000000001'::uuid, 'VR-2026-0311-001', '{"status":"Approved"}'::jsonb),
    ('driver.lara@bmpc.local', '10000000-0000-0000-0000-000000000001'::uuid, 'Checked out vehicle', 'trip_logs', '70000000-0000-0000-0000-000000000001'::uuid, 'Innova Shuttle', '{"trip_status":"In Transit"}'::jsonb)
) as seed(email, branch_id, action, target_table, target_id, target_label, after_data)
join public.profiles p on lower(p.email) = lower(seed.email)
where not exists (
  select 1
  from public.audit_logs a
  where a.action = seed.action
    and a.target_table = seed.target_table
    and a.target_id = seed.target_id
);
