# Vehicle Log Blueprint

## 1. System Architecture
- Client: React frontend for requesters, drivers, approvers, and admins.
- API and data: Supabase Postgres, Auth, Storage, Realtime, and optional Edge Functions for email notifications.
- Security: Supabase Auth plus role-based route guards on the client and RLS in the database.
- Files: Supabase Storage buckets for fuel receipts, incident photos, insurance files, registration files, and request attachments.
- Auditability: all approvals, releases, returns, updates, and exceptions write to `audit_logs`.

## 2. Database Relationships
- `profiles` 1-to-many `user_roles`
- `branches` 1-to-many `vehicles`, `drivers`, `vehicle_requests`
- `vehicle_types` 1-to-many `vehicles`
- `vehicles` 1-to-many `vehicle_documents`, `trip_logs`, `maintenance_logs`, `insurance_policies`, `registration_records`
- `drivers` 1-to-many `driver_licenses`, `trip_logs`, `incident_reports`
- `vehicle_requests` 1-to-many `request_passengers`, 1-to-1 or 1-to-many `trip_logs`
- `trip_logs` 1-to-many `trip_checklists`, `fuel_logs`, `incident_reports`
- `profiles` 1-to-many `notifications`, `audit_logs`

## 3. Frontend Structure
The target production stack in the prompt is React + Vite + Tailwind + shadcn/ui. This repository started as CRA, so the implemented MVP is a React frontend foundation inside the current stack. Recommended production structure:

```text
src/
  app/
  components/
  features/
    auth/
    dashboard/
    requests/
    trips/
    vehicles/
    drivers/
    maintenance/
    insurance/
    registration/
    incidents/
    reports/
    users/
    notifications/
  hooks/
  lib/
  routes/
  services/
  types/
```

## 4. Pages and Routing
- `/login`, `/forgot-password`, `/reset-password`
- `/dashboard`
- `/calendar`
- `/requests`
- `/requests/:id`
- `/approvals`
- `/assigned-trips`
- `/trip-log`
- `/check-out`
- `/check-in`
- `/vehicles`
- `/drivers`
- `/maintenance`
- `/insurance`
- `/registration`
- `/incidents`
- `/reports`
- `/users`
- `/settings`
- `/audit-logs`

## 5. Reusable Component List
- App shell with sidebar, topbar, notifications, and profile menu
- KPI cards
- Status badge
- Data table with search/filter/export hooks
- Drawer or modal form shell
- Section card
- Timeline and activity feed
- Calendar booking cell
- Compliance alert list
- Approval stepper
- Upload field with attachment preview

## 6. Approval Workflow Recommendation
- Step 1: requester submits draft to branch approver.
- Step 2: approver validates purpose, schedule, and passenger count.
- Step 3: fleet admin assigns vehicle and authorized driver.
- Step 4: driver completes release checklist before checkout.
- Step 5: return closes only after check-in, mileage computation, and issue remarks.

## 7. Dashboard KPIs
- Total fleet, available fleet, active trips, overdue trips
- Trips pending approval
- Same-day release success rate
- Vehicles in maintenance
- Insurance expiring within 30 days
- Registration expiring within 30 days
- Fuel cost per kilometer
- Incident count by branch and driver

## 8. Indexing Strategy
- Index all foreign keys.
- Composite indexes:
  - `vehicle_requests(branch_id, status, departure_datetime)`
  - `trip_logs(vehicle_id, trip_status, expected_return_datetime)`
  - `maintenance_logs(vehicle_id, status, schedule_date)`
  - `insurance_policies(vehicle_id, expiry_date)`
  - `registration_records(vehicle_id, expiry_date)`
  - `audit_logs(target_table, target_id, created_at desc)`
- Unique indexes:
  - `vehicles(plate_number)`
  - `drivers(employee_id)`
  - `vehicle_requests(request_no)`

## 9. Audit Log Practices
- Record actor, action, target table, target id, branch context, and JSON snapshots.
- Log approval decisions, reassignment, status transitions, and file uploads.
- Never overwrite audit rows.
- Use database triggers for critical tables so logs are not bypassed by client bugs.

## 10. File Attachment Practices
- Use private buckets by document type.
- Store only metadata and storage path in Postgres.
- Enforce content type, size, and path conventions.
- Use signed URLs for controlled viewing and short-lived access.

## 11. Branch-Level Access Control
- Every branch-owned row should carry `branch_id`.
- Admin can view all branches.
- Branch admins see only their own branch rows.
- Drivers and requesters see only their own records plus assigned trips.
- RLS should rely on membership in `user_roles` and branch mapping from `profiles`.

## 12. MVP Scope
- Auth, roles, vehicles, drivers, requests, approvals, trip check-out/check-in, dashboard, compliance alerts, audit logs.

## 13. Phase 2 Scope
- Realtime notifications
- Email notifications with Edge Functions and Resend
- Advanced report exports
- Rich calendar drag/drop scheduling
- Preventive maintenance automation
- OCR or metadata extraction for receipts and documents

## 14. MVP Timeline
- Week 1: schema, auth, roles, base UI shell
- Week 2: vehicles, drivers, requests, approval flow
- Week 3: trip operations, check-out/check-in, mileage, alerts
- Week 4: reports, audit hardening, UAT, deployment

## 15. Deployment Guide
1. Create a Supabase project and enable Auth providers.
2. Run `supabase/schema.sql`, then `supabase/rls.sql`, then `supabase/seed.sql`.
3. Create storage buckets from `supabase/storage-strategy.md`.
4. Add frontend environment variables for Supabase URL and anon key.
5. Deploy frontend to Vercel or Netlify.
6. Add Edge Functions for email alerts if branch approval emails are required.

## 16. Current Repo Status
- The implemented frontend in this repo is an MVP shell with dashboard, requests, trips, vehicles, drivers, compliance, reports, audit, and role-aware navigation.
- Data is mocked in `src/data/mockData.js`.
- The next production step is wiring the UI to Supabase and migrating the stack to the prompt's preferred Vite/Tailwind/shadcn baseline.
