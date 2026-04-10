import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-driver-license-reminder-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_TIMEZONE = 'Asia/Manila';
const DEFAULT_LEAD_DAYS = 30;

type DriverLicenseRow = {
  id: string;
  profile_id: string | null;
  branch_id: string | null;
  full_name: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: string | null;
};

type DueDriverEntry = {
  driver: DriverLicenseRow;
  daysRemaining: number;
  isExpired: boolean;
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

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
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

function toUtcMidnight(dateText: string) {
  const [year, month, day] = String(dateText || '').split('-').map((value) => Number.parseInt(value, 10));
  return Date.UTC(year || 1970, (month || 1) - 1, day || 1);
}

function diffDays(targetDate: string, fromDate: string) {
  const target = toUtcMidnight(targetDate);
  const base = toUtcMidnight(fromDate);
  return Math.floor((target - base) / (1000 * 60 * 60 * 24));
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

function createDriverLabel(driver: DriverLicenseRow) {
  const driverName = String(driver.full_name || 'Driver');
  const licenseNumber = String(driver.license_number || '').trim();
  return licenseNumber ? `${driverName} (${licenseNumber})` : driverName;
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
  const expectedReminderToken = Deno.env.get('DRIVER_LICENSE_REMINDER_TOKEN');
  const reminderTimezone = String(Deno.env.get('DRIVER_LICENSE_REMINDER_TIMEZONE') || DEFAULT_TIMEZONE);
  const leadDays = toPositiveInteger(Deno.env.get('DRIVER_LICENSE_REMINDER_LEAD_DAYS'), DEFAULT_LEAD_DAYS);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Supabase edge function secrets are not configured.' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const suppliedReminderToken = request.headers.get('x-driver-license-reminder-token') ?? '';

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

    const { data: driverRows, error: driverError } = await serviceClient
      .from('drivers')
      .select('id, profile_id, branch_id, full_name, license_number, license_expiry, status')
      .neq('status', 'inactive');

    if (driverError) {
      throw driverError;
    }

    const scannedDrivers = (driverRows || []) as DriverLicenseRow[];
    const dueDrivers: DueDriverEntry[] = scannedDrivers
      .map((driver) => {
        const expiryDate = String(driver.license_expiry || '').trim();

        if (!expiryDate) {
          return null;
        }

        const daysRemaining = diffDays(expiryDate, today);

        if (daysRemaining > leadDays) {
          return null;
        }

        return {
          driver,
          daysRemaining,
          isExpired: daysRemaining <= 0,
        };
      })
      .filter((entry): entry is DueDriverEntry => Boolean(entry));

    if (!dueDrivers.length) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: scannedDrivers.length,
          due: 0,
          expired: 0,
          expiring_soon: 0,
          recipients: 0,
          inserted: 0,
          skipped_deduped: 0,
          lead_days: leadDays,
          today,
          timezone: reminderTimezone,
          errors: [],
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

    for (const dueEntry of dueDrivers) {
      const { driver, daysRemaining, isExpired } = dueEntry;
      const expiryDate = String(driver.license_expiry || '').trim();
      const driverLabel = createDriverLabel(driver);
      const title = isExpired ? 'Driver license expired' : 'Driver license expiring soon';
      const message = isExpired
        ? `${driverLabel} license expired on ${expiryDate}.`
        : `${driverLabel} license expires on ${expiryDate} (${daysRemaining} day(s) left).`;
      const tone: 'warning' | 'danger' = isExpired ? 'danger' : 'warning';
      const recipientIds = new Set<string>(adminIds);

      if (driver.branch_id && approverIdsByBranch.has(driver.branch_id)) {
        for (const approverId of approverIdsByBranch.get(driver.branch_id) || []) {
          recipientIds.add(approverId);
        }
      }

      const linkedProfileId = String(driver.profile_id || '').trim();
      if (linkedProfileId) {
        recipientIds.add(linkedProfileId);
      }

      for (const userId of recipientIds) {
        uniqueRecipients.add(userId);
        notificationsToInsert.push({
          user_id: userId,
          branch_id: driver.branch_id,
          title,
          message,
          notification_type: tone,
          source_key: `driver-license:${driver.id}:expiry:${expiryDate}`,
          source_date: today,
        });
      }
    }

    if (!notificationsToInsert.length) {
      return jsonResponse({
        ok: true,
        summary: {
          scanned: scannedDrivers.length,
          due: dueDrivers.length,
          expired: dueDrivers.filter((entry) => entry.isExpired).length,
          expiring_soon: dueDrivers.filter((entry) => !entry.isExpired).length,
          recipients: 0,
          inserted: 0,
          skipped_deduped: 0,
          lead_days: leadDays,
          today,
          timezone: reminderTimezone,
          errors: [],
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
    const expiredCount = dueDrivers.filter((entry) => entry.isExpired).length;

    return jsonResponse({
      ok: true,
      summary: {
        scanned: scannedDrivers.length,
        due: dueDrivers.length,
        expired: expiredCount,
        expiring_soon: dueDrivers.length - expiredCount,
        recipients: uniqueRecipients.size,
        inserted: insertedCount,
        skipped_deduped: attemptedCount - insertedCount,
        lead_days: leadDays,
        today,
        timezone: reminderTimezone,
        errors: [],
      },
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      summary: {
        scanned: 0,
        due: 0,
        expired: 0,
        expiring_soon: 0,
        recipients: 0,
        inserted: 0,
        skipped_deduped: 0,
        errors: [error instanceof Error ? error.message : 'Unexpected error'],
      },
    }, 500);
  }
});
