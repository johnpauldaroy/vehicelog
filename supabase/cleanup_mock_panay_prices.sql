-- Remove mock/demo Panay fuel rows so only credible provider data is shown.

delete from public.fuel_price_snapshots
where lower(source) in ('mock', 'mock_seed', 'seed', 'demo');

delete from public.fuel_price_sync_runs
where lower(provider) = 'mock';
