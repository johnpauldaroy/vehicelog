# Recommended Edge Functions

## `create-user`
- Triggered from the admin settings user modal.
- Verifies the caller is an authenticated admin.
- Creates the Supabase Auth user, updates the linked profile, and assigns the selected workspace role.
- Requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the function runtime.

## `delete-user`
- Triggered from the admin settings user table.
- Verifies the caller is an authenticated admin.
- Deletes the Supabase Auth user so the linked profile and role records cascade cleanly.
- Requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the function runtime.

## `notify-request-status`
- Triggered after approval or rejection.
- Sends email to requester and assigned driver.
- Payload: request number, status, schedule, vehicle, driver, approver remarks.

## `notify-overdue-trips`
- Scheduled job every 15 minutes.
- Flags overdue trips and creates notification rows.
- Optional email or SMS escalation for admin and branch approver.

## `notify-expiring-documents`
- Daily scheduled job.
- Scans insurance and registration expiries within 30 days.
- Creates in-app notifications and optional renewal emails.

## Suggested Provider
- Resend for email delivery.
- Supabase cron plus Edge Functions for scheduled jobs.
