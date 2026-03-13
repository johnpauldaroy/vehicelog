alter table public.vehicle_requests
  add column if not exists fuel_requested boolean not null default false,
  add column if not exists fuel_amount numeric(12,2) not null default 0,
  add column if not exists fuel_liters numeric(12,2) not null default 0,
  add column if not exists estimated_kms numeric(12,2) not null default 0,
  add column if not exists fuel_remarks text;
