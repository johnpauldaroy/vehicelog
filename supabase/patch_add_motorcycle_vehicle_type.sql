insert into public.vehicle_types (id, name, description)
values (
  '20000000-0000-0000-0000-000000000006',
  'Motorcycle',
  'Motorcycle or utility bike'
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
