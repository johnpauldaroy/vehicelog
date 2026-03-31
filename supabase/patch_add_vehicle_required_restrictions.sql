-- Add required_restrictions column to vehicles table
alter table public.vehicles
  add column if not exists required_restrictions text;

-- Add a comment for documentation
comment on column public.vehicles.required_restrictions is 'Specific license restrictions required to drive this vehicle (e.g., B2). Overrides type-based defaults if set.';
