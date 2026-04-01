-- Manual scheduler setup for oil-change reminder notifications.
-- Run this in Supabase SQL Editor AFTER:
-- 1) deploying `notify-oil-change-reminders`
-- 2) setting runtime env vars (`OIL_CHANGE_REMINDER_TOKEN` optional)
--
-- Replace placeholders before execution.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_project_url text := 'https://YOUR_PROJECT_REF.supabase.co';
  v_service_role_key text := 'YOUR_SERVICE_ROLE_KEY';
  v_reminder_token text := 'YOUR_OPTIONAL_OIL_REMINDER_TOKEN';
begin
  if v_project_url like '%YOUR_PROJECT_REF%' then
    raise exception 'Set v_project_url before running this script.';
  end if;

  if v_service_role_key like '%YOUR_SERVICE_ROLE_KEY%' then
    raise exception 'Set v_service_role_key before running this script.';
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'notify-oil-change-reminders-hourly';

  perform cron.schedule(
    'notify-oil-change-reminders-hourly',
    '0 * * * *',
    format(
      $stmt$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'x-oil-reminder-token', %L
          ),
          body := '{}'::jsonb
        ) as request_id;
      $stmt$,
      v_project_url || '/functions/v1/notify-oil-change-reminders',
      v_service_role_key,
      v_reminder_token
    )
  );
end;
$$;
