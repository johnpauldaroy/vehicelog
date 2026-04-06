alter table public.vehicles
  add column if not exists oil_change_reminder_enabled boolean not null default false,
  add column if not exists oil_change_interval_km integer,
  add column if not exists oil_change_interval_months integer,
  add column if not exists oil_change_last_odometer numeric(12,2),
  add column if not exists oil_change_last_changed_on date;

alter table public.vehicles
  drop constraint if exists vehicles_oil_change_interval_km_check,
  add constraint vehicles_oil_change_interval_km_check
    check (oil_change_interval_km is null or oil_change_interval_km >= 0);

alter table public.vehicles
  drop constraint if exists vehicles_oil_change_interval_months_check,
  add constraint vehicles_oil_change_interval_months_check
    check (oil_change_interval_months is null or oil_change_interval_months >= 0);

comment on column public.vehicles.oil_change_reminder_enabled is 'Enables per-vehicle oil-change reminders.';
comment on column public.vehicles.oil_change_interval_km is 'Oil-change reminder interval in kilometers.';
comment on column public.vehicles.oil_change_interval_months is 'Oil-change reminder interval in months.';
comment on column public.vehicles.oil_change_last_odometer is 'Odometer reading recorded at the last oil change.';
comment on column public.vehicles.oil_change_last_changed_on is 'Date of last oil change.';
