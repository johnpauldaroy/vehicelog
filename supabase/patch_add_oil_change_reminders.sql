create table if not exists public.maintenance_automation_settings (
  id text primary key default 'global',
  enabled boolean not null default true,
  oil_change_lead_days integer not null default 7 check (oil_change_lead_days >= 0 and oil_change_lead_days <= 60),
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.maintenance_automation_settings (id, enabled, oil_change_lead_days, timezone)
values ('global', true, 7, 'Asia/Manila')
on conflict (id) do nothing;

alter table public.notifications
  add column if not exists source_key text,
  add column if not exists source_date date;

create unique index if not exists idx_notifications_daily_source_dedupe
  on public.notifications(user_id, source_key, source_date)
  where source_key is not null and source_date is not null;

alter table public.maintenance_automation_settings enable row level security;

drop policy if exists "maintenance automation settings select authenticated" on public.maintenance_automation_settings;
create policy "maintenance automation settings select authenticated"
on public.maintenance_automation_settings
for select
using (auth.role() = 'authenticated');

drop policy if exists "maintenance automation settings update by admin" on public.maintenance_automation_settings;
create policy "maintenance automation settings update by admin"
on public.maintenance_automation_settings
for update
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "maintenance automation settings insert by admin" on public.maintenance_automation_settings;
create policy "maintenance automation settings insert by admin"
on public.maintenance_automation_settings
for insert
with check (public.has_role('admin'));

drop trigger if exists set_maintenance_automation_settings_updated_at on public.maintenance_automation_settings;
create trigger set_maintenance_automation_settings_updated_at
before update on public.maintenance_automation_settings
for each row execute function public.set_updated_at();
