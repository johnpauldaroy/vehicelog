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

## `notify-oil-change-reminders`
- Scheduled job (hourly trigger, daily dedupe).
- Scans `vehicles` with `oil_change_reminder_enabled = true`.
- Sends reminders when a vehicle is due by:
  - mileage (`odometer_current >= oil_change_last_odometer + oil_change_interval_km`)
  - month interval (`today >= oil_change_last_changed_on + oil_change_interval_months`)
- Creates in-app notifications for:
  - all admins
  - branch approvers of the vehicle branch
- Uses daily dedupe via notification keys:
  - `source_key = oil-change-vehicle:<vehicle_id>`
  - `source_date = <today in configured timezone>`
- Returns run summary payload:
  - `scanned`, `due`, `recipients`, `inserted`, `skipped_deduped`, `errors`

### Required runtime secrets for `notify-oil-change-reminders`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OIL_CHANGE_REMINDER_TOKEN` (optional shared secret for scheduled/manual trigger auth)
- `OIL_CHANGE_REMINDER_TIMEZONE` (optional; defaults to `Asia/Manila`)

### Suggested schedule
- Hourly invocation via Supabase cron:
  - `0 * * * *`
- SQL helper script: `supabase/schedule_notify_oil_change_reminders.sql`

## `notify-driver-license-expirations`
- Scheduled job (daily trigger, daily dedupe).
- Scans active drivers and flags licenses that are:
  - already expired
  - expiring within a configurable lead window (`DRIVER_LICENSE_REMINDER_LEAD_DAYS`, default `30`)
- Creates in-app notifications for:
  - all admins
  - branch approvers of the driver branch
  - the linked driver account (`drivers.profile_id`) when present
- Uses daily dedupe via notification keys:
  - `source_key = driver-license:<driver_id>:expiry:<license_expiry>`
  - `source_date = <today in configured timezone>`
- Returns run summary payload:
  - `scanned`, `due`, `expired`, `expiring_soon`, `recipients`, `inserted`, `skipped_deduped`, `errors`

### Required runtime secrets for `notify-driver-license-expirations`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DRIVER_LICENSE_REMINDER_TOKEN` (optional shared secret for scheduled/manual trigger auth)
- `DRIVER_LICENSE_REMINDER_TIMEZONE` (optional; defaults to `Asia/Manila`)
- `DRIVER_LICENSE_REMINDER_LEAD_DAYS` (optional; defaults to `30`)

### Suggested schedule
- Daily invocation via Supabase cron:
  - `30 0 * * *`
- SQL helper script: `supabase/schedule_notify_driver_license_expirations.sql`

## Suggested Provider
- Resend for email delivery.
- Supabase cron plus Edge Functions for scheduled jobs.

## `sync-panay-fuel-prices`
- Scheduled hourly job for Panay station pricing snapshots.
- Uses a provider adapter flow:
  - `fetchStationsAndPrices()`
  - `normalizeToSnapshotRows()`
  - `upsertSnapshots()`
- Writes station-level snapshots to `fuel_price_snapshots` and run diagnostics to `fuel_price_sync_runs`.
- If provider requirements are missing, it records a `skipped` run and keeps the last good snapshot.

### Required runtime secrets for `sync-panay-fuel-prices`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PANAY_FUEL_PROVIDER` (`gaswatch`, `metrofueltracker`, `mock`, or your private provider key)
- `PANAY_FUEL_API_BASE_URL` (optional for `gaswatch`; defaults to `https://gaswatchph.com`)
- `PANAY_FUEL_API_KEY` (required for private provider adapters; not used by `gaswatch` or `mock`)
- `PANAY_FUEL_SYNC_TOKEN` (optional shared secret for manual/scheduled trigger auth)

Notes:
- `PANAY_FUEL_PROVIDER` is required. If unset, the function records a `skipped` run and does not mutate snapshots.
- `mock` is for local/testing only and should not be used for production price displays.
- `gaswatch` reads from public `data.js` + `station-overrides.js` and then filters to Panay municipalities.
- `metrofueltracker` fetches real-time JSON data from `metrofueltracker.com/api/stations` using Panay region coordinates.
- If a provider returns no Panay stations, the run is marked `skipped` to avoid overwriting with misleading data.

### Suggested schedule
- Hourly invocation via Supabase cron:
  - `0 * * * *`
- SQL helper script: `supabase/schedule_sync_panay_fuel_prices.sql`
