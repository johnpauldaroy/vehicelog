import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-oil-reminder-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_SETTINGS = {
  enabled: true,
  oilChangeLeadDays: 7,
  timezone: 'Asia/Manila',
};

type ReminderSettings = typeof DEFAULT_SETTINGS;

type DueMaintenanceRow = {
  id: string;
  branch_id: string | null;
  vehicle_id: string;
  maintenance_type: string;
  schedule_date: string;
  status: string;
  vehicles?: { vehicle_name?: string | null; plate_number?: string | null } | Array<{ vehicle_name?: string | null; plate_number?: string | null }> | null;
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

function toFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampLeadDays(value: unknown) {
  return Math.min(60, Math.max(0, Math.trunc(toFiniteNumber(value, DEFAULT_SETTINGS.oilChangeLeadDays))));
}

function toDateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((entry) => entry.type === 'year')?.value || '1970';
  const month = parts.find((entry) => entry.type === 'month')?.value || '01';
  const day = parts.find((entry) => entry.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function addDays(dateText: string, days: number) {
  const [year, month, day] = String(dateText).split('-').map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isMissingAutomationSettingsTableError(error: unknown) {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    message.includes('maintenance_automation_settings')
    && (message.includes('does not exist') || message.includes('schema cache') || message.includes('relation'))
  );
}

function extractRoleName(roleValue: unknown) {
  if (Array.isArray(roleValue)) {
    return String(roleValue[0]?.name || '').toLowerCase();
  }

  if (roleValue && typeof roleValue === 'object') {
    return String((roleValue as { name?: string }).name || '').toLowerCase();
  }

  return '';
}

function getVehicleDetails(entry: DueMaintenanceRow) {
  if (Array.isArray(entry.vehicles)) {
    return entry.vehicles[0] || {};
  }

  if (entry.vehicles && typeof entry.vehicles === 'object') {
    return entry.vehicles;
  }

  return {};
}

async function loadReminderSettings(serviceClient: ReturnType<typeof createClient>) {
  const { data, error } = await serviceClient
    .from('maintenance_automation_settings')
    .select('enabled, oil_change_lead_days, timezone')
    .eq('id', 'global')
    .limit(1);

  if (error) {
    if (isMissingAutomationSettingsTableError(error)) {
      return DEFAULT_SETTINGS;
    }

    throw error;
  }

  const row = data?.[0];

  if (!row) {
    return DEFAULT_SETTINGS;
  }

  return {
    enabled: Boolean(row.enabled),
    oilChangeLeadDays: clampLeadDays(row.oil_change_lead_days),
    timezone: String(row.timezone || DEFAULT_SETTINGS.timezone),
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
  const expectedReminderToken = Deno.env.get('OIL_CHANGE_REMINDER_TOKEN');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Supabase edge function secrets are not configured.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const suppliedReminderToken = request.headers.get('x-oil-reminder-token') ?? '';

  if (expectedReminderToken) {
    if (!suppliedReminderToken || suppliedReminderToken !== expectedReminderToken) {
      return jsonResponse({ error: 'Invalid reminder token.' }, 403);
    }
  } else if (!bearerToken || bearerToken !== supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const settings = await loadReminderSettings(serviceClient);

    const today = toDateInTimezone(settings.timezone);
    const dueWindowEnd = addDays(today, settings.oilChangeLeadDays);

    if (!settings.enabled) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: 0,
          due: 0,
          recipients: 0,
          inserted: 0,
          skipped_deduped: 0,
          errors: [],
          reason: 'disabled',
          settings,
          today,
          due_window_end: dueWindowEnd,
        },
      });
    }

    const { count: scannedCount, error: scannedError } = await serviceClient
      .from('maintenance_logs')
      .select('id', { count: 'exact', head: true })
      .ilike('maintenance_type', '%oil%')
      .in('status', ['Pending', 'In Progress'])
      .is('completed_date', null)
      .is('deleted_at', null);

    if (scannedError) {
      throw scannedError;
    }

    const { data: dueRows, error: dueError } = await serviceClient
      .from('maintenance_logs')
      .select(`
        id,
        branch_id,
        vehicle_id,
        maintenance_type,
        schedule_date,
        status,
        vehicles:vehicle_id (
          vehicle_name,
          plate_number
        )
      `)
      .ilike('maintenance_type', '%oil%')
      .in('status', ['Pending', 'In Progress'])
      .is('completed_date', null)
      .is('deleted_at', null)
      .lte('schedule_date', dueWindowEnd);

    if (dueError) {
      throw dueError;
    }

    const dueMaintenanceRows = (dueRows || []) as DueMaintenanceRow[];

    if (!dueMaintenanceRows.length) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: Number(scannedCount || 0),
          due: 0,
          recipients: 0,
          inserted: 0,
          skipped_deduped: 0,
          errors: [],
          settings,
          today,
          due_window_end: dueWindowEnd,
        },
      });
    }

    const { data: roleAssignments, error: roleError } = await serviceClient
      .from('user_roles')
      .select('user_id, branch_id, roles(name)');

    if (roleError) {
      throw roleError;
    }

    const adminIds = new Set<string>();
    const approverIdsByBranch = new Map<string, Set<string>>();

    for (const assignment of roleAssignments || []) {
      const roleName = extractRoleName((assignment as { roles?: unknown }).roles);
      const userId = String((assignment as { user_id?: string }).user_id || '');
      const branchId = String((assignment as { branch_id?: string | null }).branch_id || '');

      if (!userId || !roleName) {
        continue;
      }

      if (roleName === 'admin') {
        adminIds.add(userId);
      }

      if (roleName === 'approver' && branchId) {
        if (!approverIdsByBranch.has(branchId)) {
          approverIdsByBranch.set(branchId, new Set<string>());
        }
        approverIdsByBranch.get(branchId)?.add(userId);
      }
    }

    const notificationsToInsert: Array<{
      user_id: string;
      branch_id: string | null;
      title: string;
      message: string;
      notification_type: 'warning' | 'danger';
      source_key: string;
      source_date: string;
    }> = [];

    const uniqueRecipients = new Set<string>();

    for (const entry of dueMaintenanceRows) {
      const scheduleDate = String(entry.schedule_date || '');
      const isOverdue = Boolean(scheduleDate && scheduleDate < today);
      const tone: 'warning' | 'danger' = isOverdue ? 'danger' : 'warning';
      const title = isOverdue ? 'Oil change overdue' : 'Oil change due soon';
      const vehicleDetails = getVehicleDetails(entry);
      const vehicleName = String(vehicleDetails.vehicle_name || 'Vehicle');
      const plateNumber = String(vehicleDetails.plate_number || '').trim();
      const vehicleLabel = plateNumber ? `${vehicleName} (${plateNumber})` : vehicleName;
      const message = isOverdue
        ? `${vehicleLabel} has an overdue oil change scheduled for ${scheduleDate}.`
        : `${vehicleLabel} has an oil change scheduled for ${scheduleDate}.`;

      const recipientIds = new Set<string>(adminIds);

      if (entry.branch_id && approverIdsByBranch.has(entry.branch_id)) {
        for (const approverId of approverIdsByBranch.get(entry.branch_id) || []) {
          recipientIds.add(approverId);
        }
      }

      for (const userId of recipientIds) {
        uniqueRecipients.add(userId);
        notificationsToInsert.push({
          user_id: userId,
          branch_id: entry.branch_id,
          title,
          message,
          notification_type: tone,
          source_key: `oil-change:${entry.id}`,
          source_date: today,
        });
      }
    }

    if (!notificationsToInsert.length) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: Number(scannedCount || 0),
          due: dueMaintenanceRows.length,
          recipients: 0,
          inserted: 0,
          skipped_deduped: 0,
          errors: [],
          settings,
          today,
          due_window_end: dueWindowEnd,
        },
      });
    }

    const { data: insertedRows, error: insertError } = await serviceClient
      .from('notifications')
      .upsert(notificationsToInsert, {
        onConflict: 'user_id,source_key,source_date',
        ignoreDuplicates: true,
      })
      .select('id');

    if (insertError) {
      throw insertError;
    }

    const insertedCount = Number(insertedRows?.length || 0);
    const attemptedCount = notificationsToInsert.length;

    return jsonResponse({
      ok: true,
      summary: {
        scanned: Number(scannedCount || 0),
        due: dueMaintenanceRows.length,
        recipients: uniqueRecipients.size,
        inserted: insertedCount,
        skipped_deduped: attemptedCount - insertedCount,
        errors: [],
        settings,
        today,
        due_window_end: dueWindowEnd,
      },
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      summary: {
        scanned: 0,
        due: 0,
        recipients: 0,
        inserted: 0,
        skipped_deduped: 0,
        errors: [error instanceof Error ? error.message : 'Unexpected error'],
      },
    }, 500);
  }
});
