-- Manual scheduler setup for the Panay fuel sync Edge Function.
-- Run this in Supabase SQL Editor AFTER:
-- 1) deploying `sync-panay-fuel-prices`
-- 2) setting runtime env vars (`PANAY_FUEL_PROVIDER`, `PANAY_FUEL_API_BASE_URL`, `PANAY_FUEL_API_KEY` for private providers)
--
-- Replace placeholders before execution.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_project_url text := 'https://YOUR_PROJECT_REF.supabase.co';
  v_service_role_key text := 'YOUR_SERVICE_ROLE_KEY';
  v_sync_token text := 'YOUR_OPTIONAL_PANAY_SYNC_TOKEN';
begin
  if v_project_url like '%YOUR_PROJECT_REF%' then
    raise exception 'Set v_project_url before running this script.';
  end if;

  if v_service_role_key like '%YOUR_SERVICE_ROLE_KEY%' then
    raise exception 'Set v_service_role_key before running this script.';
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'sync-panay-fuel-prices-hourly';

  perform cron.schedule(
    'sync-panay-fuel-prices-hourly',
    '0 * * * *',
    format(
      $stmt$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'x-panay-sync-token', %L
          ),
          body := '{}'::jsonb
        ) as request_id;
      $stmt$,
      v_project_url || '/functions/v1/sync-panay-fuel-prices',
      v_service_role_key,
      v_sync_token
    )
  );
end;
$$;
