import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

async function callerIsAdmin(serviceClient: ReturnType<typeof createClient>, callerUserId: string) {
  const { data: adminRole, error: adminRoleError } = await serviceClient
    .from('roles')
    .select('id')
    .eq('name', 'admin')
    .maybeSingle();

  if (adminRoleError) {
    throw adminRoleError;
  }

  if (!adminRole?.id) {
    return false;
  }

  const { data: assignment, error: assignmentError } = await serviceClient
    .from('user_roles')
    .select('id')
    .eq('user_id', callerUserId)
    .eq('role_id', adminRole.id)
    .limit(1)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  return Boolean(assignment?.id);
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

  let isAdmin = false;
  try {
    isAdmin = await callerIsAdmin(serviceClient, caller.id);
  } catch {
    return jsonResponse({ error: 'Unable to verify admin permissions.' }, 500);
  }

  if (!isAdmin) {
    return jsonResponse({ error: 'Admin access is required.' }, 403);
  }

  let payload: {
    userId?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
  }

  const userId = String(payload.userId ?? '').trim();

  if (!userId) {
    return jsonResponse({ error: 'User id is required.' }, 400);
  }

  if (userId === caller.id) {
    return jsonResponse({ error: 'You cannot delete the account you are currently using.' }, 400);
  }

  const timestamp = new Date().toISOString();

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({
      is_active: false,
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', userId);

  if (profileError) {
    return jsonResponse({ error: profileError.message || 'Unable to archive the selected profile.' }, 500);
  }

  const { error: roleDeleteError } = await serviceClient
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (roleDeleteError) {
    return jsonResponse({ error: roleDeleteError.message || 'Unable to remove the user role assignment.' }, 500);
  }

  return jsonResponse({ userId, archived: true }, 200);
});
