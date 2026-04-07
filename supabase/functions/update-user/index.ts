import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedRoles = new Set(['admin', 'approver', 'guard', 'pump_station', 'driver', 'requester']);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
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

  const { data: callerRoles, error: callerRolesError } = await serviceClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', caller.id);

  if (callerRolesError) {
    return jsonResponse({ error: 'Unable to verify admin permissions.' }, 500);
  }

  const isAdmin = (callerRoles ?? []).some((entry) => entry.roles?.name === 'admin');

  if (!isAdmin) {
    return jsonResponse({ error: 'Admin access is required.' }, 403);
  }

  let payload: {
    branchId?: string | null;
    email?: string;
    fullName?: string;
    role?: string;
    userId?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
  }

  const userId = String(payload.userId ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const fullName = String(payload.fullName ?? '').trim();
  const roleName = String(payload.role ?? '').trim().toLowerCase();
  const branchId = String(payload.branchId ?? '').trim();

  if (!userId) {
    return jsonResponse({ error: 'User id is required.' }, 400);
  }

  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'A valid email is required.' }, 400);
  }

  if (!fullName) {
    return jsonResponse({ error: 'Full name is required.' }, 400);
  }

  if (!allowedRoles.has(roleName)) {
    return jsonResponse({ error: 'Select a valid role.' }, 400);
  }

  if (!branchId) {
    return jsonResponse({ error: 'Select a branch for the user.' }, 400);
  }

  const { data: branchRecord, error: branchError } = await serviceClient
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .single();

  if (branchError || !branchRecord) {
    return jsonResponse({ error: 'Selected branch was not found.' }, 400);
  }

  const { data: roleRecord, error: roleError } = await serviceClient
    .from('roles')
    .select('id, name')
    .eq('name', roleName)
    .single();

  if (roleError || !roleRecord) {
    return jsonResponse({ error: 'Selected role was not found.' }, 400);
  }

  const { data: existingUser, error: existingUserError } = await serviceClient.auth.admin.getUserById(userId);

  if (existingUserError || !existingUser.user) {
    return jsonResponse({ error: 'The selected auth user was not found.' }, 404);
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({
      branch_id: branchId,
      email,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    return jsonResponse({ error: profileError.message || 'Unable to update the profile.' }, 500);
  }

  const { error: deleteRolesError } = await serviceClient
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (deleteRolesError) {
    return jsonResponse({ error: deleteRolesError.message || 'Unable to replace the role assignment.' }, 500);
  }

  if (roleName !== 'requester') {
    const { error: insertRoleError } = await serviceClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleRecord.id,
        branch_id: branchId,
        created_by: caller.id,
      });

    if (insertRoleError) {
      return jsonResponse({ error: insertRoleError.message || 'Unable to save the new role assignment.' }, 500);
    }
  }

  return jsonResponse(
    {
      branchId,
      email,
      role: roleRecord.name,
      userId,
    },
    200
  );
});
