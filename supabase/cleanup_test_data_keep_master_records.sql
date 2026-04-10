-- Cleanup script: remove transactional/test data while keeping master/settings records.
-- Keeps: roles, branches, profiles, user_roles, vehicle_types, vehicles, drivers, driver_licenses,
--        maintenance_automation_settings.
-- Deletes: requests, trips, checklists, fuel logs, incidents, maintenance/compliance logs,
--          notifications, audit logs, and fuel-pricing sync data.
--
-- Run in Supabase SQL Editor (preferably during off-hours).

begin;

-- Trip/request flow data
delete from public.trip_checklists;
delete from public.fuel_logs;
delete from public.incident_reports;
delete from public.trip_logs;
delete from public.request_passengers;
delete from public.vehicle_requests;

-- Operational logs/data
delete from public.maintenance_logs;
delete from public.insurance_policies;
delete from public.registration_records;
delete from public.vehicle_documents;
delete from public.notifications;
delete from public.audit_logs;
delete from public.fuel_price_snapshots;
delete from public.fuel_price_sync_runs;

-- Normalize master-record statuses after removing live operations.
update public.vehicles
set status = 'available',
    updated_at = now()
where status in ('reserved', 'in_use');

update public.drivers
set status = 'available',
    updated_at = now()
where status in ('assigned', 'on_trip');

commit;
