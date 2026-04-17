import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UpsertPayload = {
  action?: 'upsert' | 'deactivate';
  endpoint?: string;
  userAgent?: string;
  subscription?: {
    endpoint?: string;
    expirationTime?: number | string | null;
    contentEncoding?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
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

function normalizeTimestamptz(value: unknown) {
  const rawValue = String(value ?? '').trim();

  if (!rawValue || rawValue === 'null' || rawValue === 'undefined') {
    return null;
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeEpochMillis(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return new Date(parsed).toISOString();
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Supabase edge function secrets are not configured.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();

  if (callerError || !caller) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  let payload: UpsertPayload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
  }

  const action = payload.action === 'deactivate' ? 'deactivate' : 'upsert';
  const nowIso = new Date().toISOString();

  if (action === 'deactivate') {
    const normalizedEndpoint = String(payload.endpoint || '').trim();
    let query = serviceClient
      .from('web_push_subscriptions')
      .update({
        is_active: false,
        deactivated_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', caller.id)
      .eq('is_active', true);

    if (normalizedEndpoint) {
      query = query.eq('endpoint', normalizedEndpoint);
    }

    const { data, error } = await query.select('id');

    if (error) {
      return jsonResponse({ error: error.message || 'Unable to deactivate push subscription.' }, 500);
    }

    return jsonResponse({
      ok: true,
      summary: {
        action,
        deactivated: Number(data?.length || 0),
      },
    });
  }

  const subscription = payload.subscription || {};
  const endpoint = String(subscription.endpoint || payload.endpoint || '').trim();
  const p256dh = String(subscription.keys?.p256dh || '').trim();
  const auth = String(subscription.keys?.auth || '').trim();
  const contentEncoding = String(subscription.contentEncoding || 'aes128gcm').trim().toLowerCase() || 'aes128gcm';
  const userAgent = String(payload.userAgent || '').trim() || null;
  const expirationTimeIso = normalizeEpochMillis(subscription.expirationTime) || normalizeTimestamptz(subscription.expirationTime);

  if (!endpoint || !p256dh || !auth) {
    return jsonResponse({ error: 'A complete web push subscription is required.' }, 400);
  }

  const { data, error } = await serviceClient
    .from('web_push_subscriptions')
    .upsert({
      user_id: caller.id,
      endpoint,
      p256dh_key: p256dh,
      auth_key: auth,
      content_encoding: contentEncoding,
      expiration_time: expirationTimeIso,
      user_agent: userAgent,
      is_active: true,
      last_seen_at: nowIso,
      deactivated_at: null,
      updated_at: nowIso,
    }, {
      onConflict: 'endpoint',
      ignoreDuplicates: false,
    })
    .select('id, endpoint, is_active, last_seen_at')
    .single();

  if (error) {
    return jsonResponse({ error: error.message || 'Unable to save push subscription.' }, 500);
  }

  return jsonResponse({
    ok: true,
    summary: {
      action,
      subscription: data,
    },
  });
});
