-- Manual scheduler setup for web push dispatch.
-- Run this in Supabase SQL Editor AFTER:
-- 1) deploying `dispatch-web-push-notifications`
-- 2) setting runtime env vars (`WEB_PUSH_DISPATCH_TOKEN` optional)
--
-- Replace placeholders before execution.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_project_url text := 'https://YOUR_PROJECT_REF.supabase.co';
  v_service_role_key text := 'YOUR_SERVICE_ROLE_KEY';
  v_dispatch_token text := 'YOUR_OPTIONAL_WEB_PUSH_DISPATCH_TOKEN';
begin
  if v_project_url like '%YOUR_PROJECT_REF%' then
    raise exception 'Set v_project_url before running this script.';
  end if;

  if v_service_role_key like '%YOUR_SERVICE_ROLE_KEY%' then
    raise exception 'Set v_service_role_key before running this script.';
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'dispatch-web-push-notifications-every-minute';

  perform cron.schedule(
    'dispatch-web-push-notifications-every-minute',
    '* * * * *',
    format(
      $stmt$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'x-web-push-dispatch-token', %L
          ),
          body := jsonb_build_object('limit', 50)
        ) as request_id;
      $stmt$,
      v_project_url || '/functions/v1/dispatch-web-push-notifications',
      v_service_role_key,
      v_dispatch_token
    )
  );
end;
$$;
