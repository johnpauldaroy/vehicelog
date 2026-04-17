-- Adds browser push subscription storage and notification dispatch tracking.
-- Run this in Supabase SQL Editor before deploying the web push edge functions.

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  content_encoding text not null default 'aes128gcm',
  expiration_time timestamptz,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz
);

alter table public.notifications
  add column if not exists push_dispatched_at timestamptz,
  add column if not exists push_dispatch_error text;

-- Prevent historical notifications from being pushed after initial rollout.
update public.notifications
set push_dispatched_at = created_at
where push_dispatched_at is null;

create unique index if not exists idx_web_push_subscriptions_endpoint_unique
  on public.web_push_subscriptions(endpoint);

create index if not exists idx_web_push_subscriptions_user_active
  on public.web_push_subscriptions(user_id, is_active, last_seen_at desc);

create index if not exists idx_notifications_push_pending
  on public.notifications(push_dispatched_at, created_at desc)
  where push_dispatched_at is null;

alter table public.web_push_subscriptions enable row level security;

drop trigger if exists set_web_push_subscriptions_updated_at on public.web_push_subscriptions;
create trigger set_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row execute function public.set_updated_at();
