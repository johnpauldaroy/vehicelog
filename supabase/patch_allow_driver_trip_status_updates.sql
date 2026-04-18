-- Allow assigned drivers to update status rows needed for checkout/check-in
-- and reconcile stale fleet/driver statuses left by earlier RLS-denied writes.

drop policy if exists "vehicles update by assigned driver active trip" on public.vehicles;
create policy "vehicles update by assigned driver active trip"
on public.vehicles
for update
using (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    join public.profiles p on p.id = auth.uid()
    where tl.vehicle_id = vehicles.id
      and (
        d.profile_id = auth.uid()
        or lower(regexp_replace(coalesce(d.full_name, ''), '[^a-z0-9]+', '', 'g'))
          = lower(regexp_replace(coalesce(p.full_name, ''), '[^a-z0-9]+', '', 'g'))
      )
      and tl.trip_status in ('Ready for Release', 'Checked Out', 'In Transit', 'Overdue')
  )
)
with check (
  exists (
    select 1
    from public.trip_logs tl
    join public.drivers d on d.id = tl.driver_id
    join public.profiles p on p.id = auth.uid()
    where tl.vehicle_id = vehicles.id
      and (
        d.profile_id = auth.uid()
        or lower(regexp_replace(coalesce(d.full_name, ''), '[^a-z0-9]+', '', 'g'))
          = lower(regexp_replace(coalesce(p.full_name, ''), '[^a-z0-9]+', '', 'g'))
      )
      and tl.trip_status in ('Ready for Release', 'Checked Out', 'In Transit', 'Overdue')
  )
);

drop policy if exists "drivers self update during active trip" on public.drivers;
create policy "drivers self update during active trip"
on public.drivers
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        drivers.profile_id = auth.uid()
        or lower(regexp_replace(coalesce(drivers.full_name, ''), '[^a-z0-9]+', '', 'g'))
          = lower(regexp_replace(coalesce(p.full_name, ''), '[^a-z0-9]+', '', 'g'))
      )
  )
  and exists (
    select 1
    from public.trip_logs tl
    where tl.driver_id = drivers.id
      and tl.trip_status in ('Ready for Release', 'Checked Out', 'In Transit', 'Overdue')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        drivers.profile_id = auth.uid()
        or lower(regexp_replace(coalesce(drivers.full_name, ''), '[^a-z0-9]+', '', 'g'))
          = lower(regexp_replace(coalesce(p.full_name, ''), '[^a-z0-9]+', '', 'g'))
      )
  )
);

drop policy if exists "trip logs manage by admin approver driver" on public.trip_logs;
create policy "trip logs manage by admin approver driver"
on public.trip_logs
for all
using (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = auth.uid()
    where d.id = trip_logs.driver_id
      and (
        d.profile_id = auth.uid()
        or lower(regexp_replace(coalesce(d.full_name, ''), '[^a-z0-9]+', '', 'g'))
          = lower(regexp_replace(coalesce(p.full_name, ''), '[^a-z0-9]+', '', 'g'))
      )
  )
)
with check (
  public.has_role('admin')
  or public.has_role('approver', branch_id)
  or exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = auth.uid()
    where d.id = trip_logs.driver_id
      and (
        d.profile_id = auth.uid()
        or lower(regexp_replace(coalesce(d.full_name, ''), '[^a-z0-9]+', '', 'g'))
          = lower(regexp_replace(coalesce(p.full_name, ''), '[^a-z0-9]+', '', 'g'))
      )
  )
);

-- One-time cleanup for stale statuses where no active trip exists anymore.
update public.vehicles v
set status = 'available',
    updated_at = now()
where v.status = 'in_use'
  and not exists (
    select 1
    from public.trip_logs tl
    where tl.vehicle_id = v.id
      and tl.trip_status in ('Checked Out', 'In Transit', 'Overdue')
  );

update public.drivers d
set status = 'available',
    updated_at = now()
where d.status = 'on_trip'
  and not exists (
    select 1
    from public.trip_logs tl
    where tl.driver_id = d.id
      and tl.trip_status in ('Checked Out', 'In Transit', 'Overdue')
  );
