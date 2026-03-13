Build a production-ready web-based Vehicle Trip and Fleet Monitoring System for BMPC, inspired by an existing AppSheet app, using the following stack:

- Frontend: React JS + Vite
- Styling: Tailwind CSS + shadcn/ui
- Backend: Supabase
- Database: PostgreSQL via Supabase
- Authentication: Supabase Auth
- File Uploads: Supabase Storage
- Realtime Updates: Supabase Realtime
- Optional email notifications: Resend or Supabase Edge Functions

## Project Goal
Create a modern responsive web application that monitors the in and out movement of cooperative vehicles, manages vehicle requests and approvals, tracks daily trip logs, maintenance, registrations, insurance, fuel, and overdue/unreturned vehicles.

The system must replace and improve the current AppSheet workflow and support multi-role access with a clean professional dashboard.

## Core Users / Roles

### 1. Requester / Employee
- Can request vehicle usage
- Can view available vehicles
- Can track their own requests
- Can see request approval status
- Can view assigned vehicle and driver details
- Can upload supporting documents if needed

### 2. Driver
- Can view assigned trips
- Can perform vehicle check-out and check-in
- Can log trip details
- Can encode start and end odometer
- Can record fuel usage and receipts
- Can report incidents or vehicle issues
- Can update trip progress and return status

### 3. Approver / Admin / Manager
- Can review and approve/reject requests
- Can assign vehicle and driver
- Can manage vehicles, drivers, users, and branches
- Can monitor active trips, returned trips, and overdue/unreturned vehicles
- Can manage maintenance, insurance, registration reminders
- Can view reports, dashboards, and audit logs

## Required Main Modules

1. Dashboard
2. Available Vehicles
3. Travel Calendar
4. Vehicle Request / Borrowing
5. Approval Workflow
6. Daily Trip Log
7. Vehicle Check-In / Check-Out
8. Maintenance Log
9. Insurance Records
10. Insurance Monitoring
11. Registration Reminder
12. Drivers Management
13. Vehicle Management
14. Users and Roles
15. Unreturned / Overdue Vehicles
16. Incident Reports
17. Fuel Logs
18. Notifications
19. Reports and Export
20. Audit Trail

## Business Rules
Follow these operational rules based on standard fleet management practice and BMPC vehicle policy:

- Only authorized users can request vehicles
- Only designated and authorized drivers can operate vehicles
- All trips must be approved before vehicle release
- Personal use is prohibited
- Each trip must contain purpose, destination, schedule, assigned vehicle, assigned driver, and approval details
- Vehicle release requires check-out details:
  - date/time out
  - odometer out
  - fuel level out
  - vehicle condition out
- Vehicle return requires check-in details:
  - date/time in
  - odometer in
  - fuel level in
  - vehicle condition in
  - remarks/issues
- System must calculate trip mileage automatically
- Unreturned or overdue vehicles must be flagged automatically
- Insurance and registration expiries must trigger alerts
- Maintenance schedules must be trackable
- Fuel receipts and incident photos must be uploadable
- All approvals, edits, and status changes must be recorded in audit logs
- Role-based permissions must be strictly enforced

## Recommended Status Flow

### Vehicle Request Status
- Draft
- Pending Approval
- Approved
- Rejected
- Cancelled

### Trip Status
- Scheduled
- Ready for Release
- Checked Out
- In Transit
- Returned
- Overdue
- Incident Reported
- Closed

### Maintenance Status
- Pending
- In Progress
- Completed
- Cancelled

## Database Design
Design a scalable normalized Supabase PostgreSQL schema with the following tables at minimum:

- profiles
- roles
- user_roles
- branches
- vehicles
- vehicle_types
- vehicle_documents
- drivers
- driver_licenses
- vehicle_requests
- request_passengers
- trip_logs
- trip_checklists
- fuel_logs
- maintenance_logs
- insurance_policies
- registration_records
- incident_reports
- notifications
- audit_logs

Include proper foreign keys, constraints, created_at, updated_at, created_by fields, and soft delete where appropriate.

## Suggested Key Fields

### vehicles
- id
- plate_number
- vehicle_name
- brand
- model
- year_model
- color
- chassis_number
- engine_number
- assigned_branch_id
- status (available, reserved, in_use, maintenance, inactive)
- fuel_type
- seating_capacity
- odometer_current
- registration_expiry
- insurance_expiry

### drivers
- id
- employee_id
- full_name
- contact_number
- license_number
- license_restrictions
- license_expiry
- status
- branch_id

### vehicle_requests
- id
- request_no
- requested_by
- branch_id
- purpose
- destination
- departure_datetime
- expected_return_datetime
- passenger_count
- notes
- status
- approver_id
- approved_at
- rejection_reason

### trip_logs
- id
- request_id
- vehicle_id
- driver_id
- date_out
- date_in
- odometer_out
- odometer_in
- fuel_out
- fuel_in
- condition_out
- condition_in
- actual_destination
- actual_return_datetime
- trip_status
- remarks
- mileage_computed

### maintenance_logs
- id
- vehicle_id
- maintenance_type
- schedule_date
- completed_date
- provider
- amount
- remarks
- status

### insurance_policies
- id
- vehicle_id
- provider
- policy_number
- start_date
- expiry_date
- coverage_type
- attachment_url
- status

### registration_records
- id
- vehicle_id
- or_number
- cr_number
- registration_date
- expiry_date
- attachment_url
- status

### incident_reports
- id
- trip_log_id
- vehicle_id
- driver_id
- incident_datetime
- location
- description
- action_taken
- attachment_urls
- status

## UI/UX Requirements
Create a professional fleet management interface with:
- responsive sidebar navigation
- top header with notifications and user menu
- dashboard cards for:
  - total vehicles
  - available vehicles
  - active trips
  - overdue returns
  - maintenance due
  - insurance expiring soon
  - registrations expiring soon
- calendar view for schedules and bookings
- tables with search, filter, pagination, export
- status badges with color coding
- modal and drawer forms
- vehicle detail pages
- trip timeline / activity log
- mobile-friendly layout for drivers
- clean enterprise design using shadcn/ui components

## Pages to Build

### Public / Login
- Login page
- Forgot password
- Reset password

### Authenticated Pages
- Dashboard
- Available Vehicles
- Travel Calendar
- Vehicle Requests
- Request Details
- Approvals Queue
- Assigned Trips
- Daily Trip Log
- Vehicle Check-Out
- Vehicle Check-In
- Maintenance Logs
- Insurance Monitoring
- Registration Reminder
- Drivers
- Vehicles
- Users
- Unreturned Vehicles
- Incidents
- Reports
- Settings
- Audit Logs

## Features to Implement

### Authentication and Security
- Supabase Auth login/logout
- role-based route protection
- row-level security policies
- branch-based visibility if needed
- audit trail on create/update/delete/approve/reject

### Request and Approval Workflow
- create vehicle request
- submit for approval
- approve/reject with remarks
- assign vehicle and driver after approval
- notify requester and driver

### Trip Operations
- digital check-out form
- digital check-in form
- automatic mileage computation
- trip status updates
- overdue detection
- incident tagging

### Monitoring and Alerts
- expiring insurance alerts
- expiring registration alerts
- overdue trip alerts
- maintenance due alerts
- notification center

### Reports
- trip history report
- vehicle utilization report
- fuel consumption report
- maintenance cost report
- overdue vehicle report
- incident report summary
- export CSV / Excel / printable PDF

## Technical Requirements
- Use React Query or TanStack Query for server state
- Use React Hook Form + Zod for forms and validation
- Use Zustand or Context for light client state if needed
- Use TanStack Table for advanced tables
- Use date-fns for date handling
- Use reusable components and feature-based folder structure
- Use environment variables for config
- Follow clean architecture and scalable code practices

## Folder Structure
Use a scalable feature-based React project structure such as:

src/
  app/
  components/
  features/
    auth/
    dashboard/
    vehicles/
    drivers/
    requests/
    trips/
    maintenance/
    insurance/
    registration/
    incidents/
    reports/
    users/
    notifications/
  hooks/
  lib/
  services/
  types/
  routes/

## Supabase Requirements
Generate:
1. SQL schema
2. RLS policies
3. seed data
4. storage bucket strategy
5. edge functions if needed for email notifications
6. sample branch-admin-driver-requester users

## Deliverables
Generate the following in order:

1. Full system architecture
2. Database schema and relationships
3. Supabase SQL tables and RLS policies
4. React + Vite project structure
5. UI page list and routing
6. reusable component list
7. complete implementation plan
8. MVP scope vs Phase 2 scope
9. sample dashboard design
10. code for key modules:
   - auth
   - vehicle request form
   - approval workflow
   - trip log form
   - check-in/check-out
   - vehicle table
   - overdue monitoring dashboard
11. seed data
12. deployment guide

## Important Design Direction
The app should feel like a modern internal enterprise fleet management system, not a generic admin template. Prioritize:
- clarity
- speed
- accountability
- mobile usability for drivers
- auditability for management
- strong approval workflow
- easy monitoring of vehicle availability and trip status

## Extra Requirements
Please also suggest:
- the best approval structure
- best dashboard KPIs
- best database indexing strategy
- best practices for audit logs
- best practices for file attachments
- best practices for branch-level access control
- recommended MVP timeline