alter table public.branches
  add column if not exists service_region text not null default 'other';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'branches_service_region_check'
      and conrelid = 'public.branches'::regclass
  ) then
    alter table public.branches
      add constraint branches_service_region_check
      check (service_region in ('other', 'panay'));
  end if;
end;
$$;

alter table public.vehicle_requests
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

create unique index if not exists idx_fuel_price_snapshots_unique_station_point
  on public.fuel_price_snapshots(province, municipality, station_name, fuel_type, observed_at);
create index if not exists idx_branches_service_region on public.branches(service_region);
create index if not exists idx_vehicle_requests_fuel_quote_observed on public.vehicle_requests(fuel_quote_observed_at desc);
create index if not exists idx_fuel_price_snapshots_lookup on public.fuel_price_snapshots(province, municipality, fuel_type, observed_at desc);
create index if not exists idx_fuel_price_sync_runs_started on public.fuel_price_sync_runs(started_at desc);
