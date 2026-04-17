import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webPush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-web-push-dispatch-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;
const DEFAULT_PUSH_TTL_SECONDS = 3600;

type DispatchPayload = {
  limit?: number;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  notification_type: string | null;
  source_key: string | null;
  source_date: string | null;
  created_at: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  content_encoding: string | null;
  expiration_time: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function toBoundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function inferNotificationUrgency(tone: string) {
  switch (String(tone || '').toLowerCase()) {
    case 'danger':
      return 'high';
    case 'warning':
      return 'normal';
    default:
      return 'low';
  }
}

function inferNavigationUrl(sourceKey: string) {
  const normalizedSourceKey = String(sourceKey || '').trim().toLowerCase();

  if (normalizedSourceKey.includes('trip')) {
    return '/';
  }

  if (normalizedSourceKey.includes('request')) {
    return '/';
  }

  if (normalizedSourceKey.includes('incident') || normalizedSourceKey.includes('maintenance') || normalizedSourceKey.includes('vehicle')) {
    return '/';
  }

  return '/';
}

function toWebPushSubscription(record: PushSubscriptionRow) {
  return {
    endpoint: record.endpoint,
    expirationTime: record.expiration_time ? new Date(record.expiration_time).getTime() : null,
    keys: {
      p256dh: record.p256dh_key,
      auth: record.auth_key,
    },
  };
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublicKey = String(Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY') || '').trim();
  const vapidPrivateKey = String(Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY') || '').trim();
  const vapidSubject = String(Deno.env.get('WEB_PUSH_VAPID_SUBJECT') || 'mailto:ops@vehiclelog.local').trim();
  const expectedDispatchToken = String(Deno.env.get('WEB_PUSH_DISPATCH_TOKEN') || '').trim();

  if (!supabaseUrl || !supabaseServiceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: 'Supabase or VAPID runtime secrets are not configured.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const suppliedDispatchToken = String(request.headers.get('x-web-push-dispatch-token') || '').trim();

  if (expectedDispatchToken) {
    if (!suppliedDispatchToken || suppliedDispatchToken !== expectedDispatchToken) {
      return jsonResponse({ error: 'Invalid dispatch token.' }, 403);
    }
  } else if (!bearerToken || bearerToken !== supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  let payload: DispatchPayload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const batchSize = toBoundedInteger(payload.limit, DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE);
  const pushTtlSeconds = toBoundedInteger(Deno.env.get('WEB_PUSH_TTL_SECONDS'), DEFAULT_PUSH_TTL_SECONDS, 60, 86400);
  const runTimestamp = new Date().toISOString();

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data: pendingNotifications, error: pendingNotificationsError } = await serviceClient
      .from('notifications')
      .select('id, user_id, title, message, notification_type, source_key, source_date, created_at')
      .is('push_dispatched_at', null)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (pendingNotificationsError) {
      throw pendingNotificationsError;
    }

    const rows = (pendingNotifications || []) as NotificationRow[];

    if (!rows.length) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: 0,
          sent: 0,
          failed: 0,
          deactivated_subscriptions: 0,
          dispatched_notifications: 0,
          batch_size: batchSize,
        },
      });
    }

    const userIds = Array.from(
      new Set(rows.map((row) => String(row.user_id || '').trim()).filter(Boolean))
    );

    const { data: subscriptionRows, error: subscriptionError } = await serviceClient
      .from('web_push_subscriptions')
      .select('id, user_id, endpoint, p256dh_key, auth_key, content_encoding, expiration_time')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (subscriptionError) {
      throw subscriptionError;
    }

    const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();

    for (const rawSubscription of (subscriptionRows || []) as PushSubscriptionRow[]) {
      const userId = String(rawSubscription.user_id || '').trim();

      if (!userId) {
        continue;
      }

      if (!subscriptionsByUser.has(userId)) {
        subscriptionsByUser.set(userId, []);
      }

      subscriptionsByUser.get(userId)?.push(rawSubscription);
    }

    let sentCount = 0;
    let failedCount = 0;
    let deactivatedSubscriptionCount = 0;
    let dispatchedNotificationCount = 0;
    const dispatchErrors: string[] = [];

    for (const notification of rows) {
      const userId = String(notification.user_id || '').trim();
      const recipientSubscriptions = subscriptionsByUser.get(userId) || [];
      let notificationSentCount = 0;
      let notificationFailedCount = 0;
      const deactivatedSubscriptionIds: string[] = [];

      if (!recipientSubscriptions.length) {
        const { error: markNoSubscriptionError } = await serviceClient
          .from('notifications')
          .update({
            push_dispatched_at: runTimestamp,
            push_dispatch_error: 'no_active_subscriptions',
            updated_at: runTimestamp,
          })
          .eq('id', notification.id);

        if (markNoSubscriptionError) {
          dispatchErrors.push(`notification:${notification.id}:${markNoSubscriptionError.message}`);
        } else {
          dispatchedNotificationCount += 1;
        }

        continue;
      }

      const pushPayload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        tone: notification.notification_type || 'info',
        notificationId: notification.id,
        sourceKey: notification.source_key || '',
        sourceDate: notification.source_date || '',
        createdAt: notification.created_at,
        url: inferNavigationUrl(notification.source_key || ''),
      });

      for (const subscription of recipientSubscriptions) {
        try {
          await webPush.sendNotification(
            toWebPushSubscription(subscription),
            pushPayload,
            {
              TTL: pushTtlSeconds,
              urgency: inferNotificationUrgency(notification.notification_type || ''),
            },
          );
          notificationSentCount += 1;
        } catch (error) {
          notificationFailedCount += 1;
          const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
          const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown delivery error');

          if (statusCode === 404 || statusCode === 410) {
            deactivatedSubscriptionIds.push(subscription.id);
          } else {
            dispatchErrors.push(`notification:${notification.id}:subscription:${subscription.id}:${errorMessage}`);
          }
        }
      }

      if (deactivatedSubscriptionIds.length) {
        const { data: deactivatedRows, error: deactivateError } = await serviceClient
          .from('web_push_subscriptions')
          .update({
            is_active: false,
            deactivated_at: runTimestamp,
            updated_at: runTimestamp,
          })
          .in('id', deactivatedSubscriptionIds)
          .select('id');

        if (deactivateError) {
          dispatchErrors.push(`subscriptions:${deactivateError.message}`);
        } else {
          deactivatedSubscriptionCount += Number(deactivatedRows?.length || 0);
        }
      }

      const pushDispatchError = notificationSentCount > 0
        ? (notificationFailedCount > 0 ? `partial_failure:${notificationFailedCount}` : null)
        : `delivery_failed:${notificationFailedCount}`;
      const { error: markDispatchedError } = await serviceClient
        .from('notifications')
        .update({
          push_dispatched_at: runTimestamp,
          push_dispatch_error: pushDispatchError,
          updated_at: runTimestamp,
        })
        .eq('id', notification.id);

      if (markDispatchedError) {
        dispatchErrors.push(`notification:${notification.id}:${markDispatchedError.message}`);
      } else {
        dispatchedNotificationCount += 1;
      }

      sentCount += notificationSentCount;
      failedCount += notificationFailedCount;
    }

    return jsonResponse({
      ok: true,
      summary: {
        scanned: rows.length,
        sent: sentCount,
        failed: failedCount,
        deactivated_subscriptions: deactivatedSubscriptionCount,
        dispatched_notifications: dispatchedNotificationCount,
        batch_size: batchSize,
        push_ttl_seconds: pushTtlSeconds,
        errors: dispatchErrors,
      },
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      summary: {
        scanned: 0,
        sent: 0,
        failed: 0,
        deactivated_subscriptions: 0,
        dispatched_notifications: 0,
        batch_size: batchSize,
        errors: [error instanceof Error ? error.message : 'Unexpected error'],
      },
    }, 500);
  }
});
