-- Manual scheduler setup for driver license expiration notifications.
-- Run this in Supabase SQL Editor AFTER:
-- 1) deploying `notify-driver-license-expirations`
-- 2) setting runtime env vars (`DRIVER_LICENSE_REMINDER_TOKEN` optional)
--
-- Replace placeholders before execution.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_project_url text := 'https://YOUR_PROJECT_REF.supabase.co';
  v_service_role_key text := 'YOUR_SERVICE_ROLE_KEY';
  v_reminder_token text := 'YOUR_OPTIONAL_DRIVER_LICENSE_REMINDER_TOKEN';
begin
  if v_project_url like '%YOUR_PROJECT_REF%' then
    raise exception 'Set v_project_url before running this script.';
  end if;

  if v_service_role_key like '%YOUR_SERVICE_ROLE_KEY%' then
    raise exception 'Set v_service_role_key before running this script.';
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'notify-driver-license-expirations-daily';

  perform cron.schedule(
    'notify-driver-license-expirations-daily',
    '30 0 * * *',
    format(
      $stmt$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'x-driver-license-reminder-token', %L
          ),
          body := '{}'::jsonb
        ) as request_id;
      $stmt$,
      v_project_url || '/functions/v1/notify-driver-license-expirations',
      v_service_role_key,
      v_reminder_token
    )
  );
end;
$$;
