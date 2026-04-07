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
    password?: string;
    role?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
  }

  const email = String(payload.email ?? '').trim().toLowerCase();
  const password = String(payload.password ?? '');
  const fullName = String(payload.fullName ?? '').trim();
  const roleName = String(payload.role ?? '').trim().toLowerCase();
  const branchId = String(payload.branchId ?? '').trim();

  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'A valid email is required.' }, 400);
  }

  if (!fullName) {
    return jsonResponse({ error: 'Full name is required.' }, 400);
  }

  if (password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters long.' }, 400);
  }

  if (!allowedRoles.has(roleName)) {
    return jsonResponse({ error: 'Select a valid role.' }, 400);
  }

  if (!branchId) {
    return jsonResponse({ error: 'Select a branch for the new user.' }, 400);
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

  let createdUserId = '';

  try {
    const { data: createdUserData, error: createUserError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createUserError) {
      return jsonResponse({ error: createUserError.message || 'Unable to create the auth user.' }, 400);
    }

    createdUserId = createdUserData.user?.id ?? '';

    if (!createdUserId) {
      return jsonResponse({ error: 'Supabase did not return a user id for the new account.' }, 500);
    }

    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({
        branch_id: branchId,
        email,
        full_name: fullName,
        created_by: caller.id,
      })
      .eq('id', createdUserId);

    if (profileError) {
      throw profileError;
    }

  if (roleName !== 'requester') {
    const { error: roleInsertError } = await serviceClient
      .from('user_roles')
      .insert({
        user_id: createdUserId,
        role_id: roleRecord.id,
        branch_id: branchId,
        created_by: caller.id,
      });

    if (roleInsertError) {
      throw roleInsertError;
    }
  }

    return jsonResponse(
      {
        branchId,
        email,
        role: roleRecord.name,
        userId: createdUserId,
      },
      201
    );
  } catch (error) {
    if (createdUserId) {
      await serviceClient.auth.admin.deleteUser(createdUserId);
    }

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unable to finish creating the user account.',
      },
      500
    );
  }
});
