alter table public.vehicles
  add column if not exists is_odo_defective boolean not null default false;

comment on column public.vehicles.is_odo_defective is 'Marks vehicles with broken odometers so trip odometer capture can be skipped.';
