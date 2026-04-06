import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-oil-reminder-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_TIMEZONE = 'Asia/Manila';

type VehicleOilReminderRow = {
  id: string;
  assigned_branch_id: string | null;
  vehicle_name: string | null;
  plate_number: string | null;
  odometer_current: number | string | null;
  oil_change_interval_km: number | string | null;
  oil_change_interval_months: number | string | null;
  oil_change_last_odometer: number | string | null;
  oil_change_last_changed_on: string | null;
};

type DueVehicleEntry = {
  vehicle: VehicleOilReminderRow;
  dueByKm: boolean;
  dueByMonths: boolean;
  intervalKm: number | null;
  intervalMonths: number | null;
  currentOdometer: number | null;
  lastOilOdometer: number | null;
  lastOilChangeDate: string;
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

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveInteger(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

function addMonths(dateText: string, monthsToAdd: number) {
  const [year, month, day] = String(dateText).split('-').map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
  date.setUTCMonth(date.getUTCMonth() + monthsToAdd);
  return date.toISOString().slice(0, 10);
}

function isMissingVehicleOilReminderColumnsError(error: unknown) {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    (
      message.includes('vehicles.oil_change_')
      || message.includes("'oil_change_")
      || message.includes('oil_change_reminder_enabled')
      || message.includes('oil_change_interval_km')
      || message.includes('oil_change_interval_months')
      || message.includes('oil_change_last_odometer')
      || message.includes('oil_change_last_changed_on')
    )
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

function createVehicleLabel(vehicle: VehicleOilReminderRow) {
  const vehicleName = String(vehicle.vehicle_name || 'Vehicle');
  const plateNumber = String(vehicle.plate_number || '').trim();
  return plateNumber ? `${vehicleName} (${plateNumber})` : vehicleName;
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
  const reminderTimezone = String(Deno.env.get('OIL_CHANGE_REMINDER_TIMEZONE') || DEFAULT_TIMEZONE);

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
    const today = toDateInTimezone(reminderTimezone);
    const { data: vehicleRows, error: vehicleError } = await serviceClient
      .from('vehicles')
      .select(`
        id,
        assigned_branch_id,
        vehicle_name,
        plate_number,
        odometer_current,
        oil_change_interval_km,
        oil_change_interval_months,
        oil_change_last_odometer,
        oil_change_last_changed_on
      `)
      .eq('oil_change_reminder_enabled', true)
      .is('deleted_at', null);

    if (vehicleError) {
      if (isMissingVehicleOilReminderColumnsError(vehicleError)) {
        return jsonResponse({
          ok: true,
          summary: {
            scanned: 0,
            due: 0,
            recipients: 0,
            inserted: 0,
            skipped_deduped: 0,
            errors: [],
            reason: 'vehicle_oil_settings_not_migrated',
            today,
            timezone: reminderTimezone,
          },
        });
      }

      throw vehicleError;
    }

    const enabledVehicles = (vehicleRows || []) as VehicleOilReminderRow[];
    const dueVehicles: DueVehicleEntry[] = enabledVehicles
      .map((vehicle) => {
        const intervalKm = toPositiveInteger(vehicle.oil_change_interval_km);
        const intervalMonths = toPositiveInteger(vehicle.oil_change_interval_months);
        const currentOdometer = toFiniteNumber(vehicle.odometer_current);
        const lastOilOdometer = toFiniteNumber(vehicle.oil_change_last_odometer);
        const lastOilChangeDate = String(vehicle.oil_change_last_changed_on || '').trim();
        const dueByKm = Boolean(
          intervalKm
          && currentOdometer !== null
          && lastOilOdometer !== null
          && currentOdometer >= (lastOilOdometer + intervalKm)
        );
        const dueByMonths = Boolean(
          intervalMonths
          && lastOilChangeDate
          && addMonths(lastOilChangeDate, intervalMonths) <= today
        );

        if (!dueByKm && !dueByMonths) {
          return null;
        }

        return {
          vehicle,
          dueByKm,
          dueByMonths,
          intervalKm,
          intervalMonths,
          currentOdometer,
          lastOilOdometer,
          lastOilChangeDate,
        };
      })
      .filter((entry): entry is DueVehicleEntry => Boolean(entry));

    if (!dueVehicles.length) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: enabledVehicles.length,
          due: 0,
          recipients: 0,
          inserted: 0,
          skipped_deduped: 0,
          errors: [],
          today,
          timezone: reminderTimezone,
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

    for (const dueEntry of dueVehicles) {
      const {
        vehicle,
        dueByKm,
        dueByMonths,
        intervalKm,
        intervalMonths,
        currentOdometer,
        lastOilOdometer,
        lastOilChangeDate,
      } = dueEntry;
      const reasons: string[] = [];

      if (dueByKm && intervalKm && currentOdometer !== null && lastOilOdometer !== null) {
        const targetOdometer = lastOilOdometer + intervalKm;
        reasons.push(`Mileage reached ${Math.round(currentOdometer)} km (target ${Math.round(targetOdometer)} km)`);
      }

      if (dueByMonths && intervalMonths && lastOilChangeDate) {
        const dueDate = addMonths(lastOilChangeDate, intervalMonths);
        reasons.push(`Time interval reached on ${dueDate}`);
      }

      const vehicleLabel = createVehicleLabel(vehicle);
      const title = 'Oil change due';
      const message = `${vehicleLabel} needs oil change. ${reasons.join(' | ')}`;
      const tone: 'warning' | 'danger' = 'warning';
      const recipientIds = new Set<string>(adminIds);

      if (vehicle.assigned_branch_id && approverIdsByBranch.has(vehicle.assigned_branch_id)) {
        for (const approverId of approverIdsByBranch.get(vehicle.assigned_branch_id) || []) {
          recipientIds.add(approverId);
        }
      }

      for (const userId of recipientIds) {
        uniqueRecipients.add(userId);
        notificationsToInsert.push({
          user_id: userId,
          branch_id: vehicle.assigned_branch_id,
          title,
          message,
          notification_type: tone,
          source_key: `oil-change-vehicle:${vehicle.id}`,
          source_date: today,
        });
      }
    }

    if (!notificationsToInsert.length) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: enabledVehicles.length,
          due: dueVehicles.length,
          recipients: 0,
          inserted: 0,
          skipped_deduped: 0,
          errors: [],
          today,
          timezone: reminderTimezone,
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
        scanned: enabledVehicles.length,
        due: dueVehicles.length,
        recipients: uniqueRecipients.size,
        inserted: insertedCount,
        skipped_deduped: attemptedCount - insertedCount,
        errors: [],
        today,
        timezone: reminderTimezone,
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
