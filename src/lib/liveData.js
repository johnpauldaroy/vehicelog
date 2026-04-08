import { createTransientSupabaseClient } from './supabaseClient';

function normalizeRoleName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function titleCaseRole(value) {
  if (!value) {
    return 'Requester';
  }

  return normalizeRoleName(value)
    .split('_')
    .filter(Boolean)
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ');
}

const ROLE_PRIORITY = {
  admin: 6,
  approver: 5,
  guard: 4,
  pump_station: 3,
  driver: 2,
  requester: 1,
};

const ROLE_ID_TO_NAME = {
  '00000000-0000-0000-0000-000000000001': 'admin',
  '00000000-0000-0000-0000-000000000002': 'approver',
  '00000000-0000-0000-0000-000000000003': 'driver',
  '00000000-0000-0000-0000-000000000004': 'requester',
  '00000000-0000-0000-0000-000000000005': 'guard',
  '00000000-0000-0000-0000-000000000006': 'pump_station',
};

const EMPTY_PANAY_FUEL_PRICING = {
  rows: [],
  lastUpdatedAt: '',
  latestRun: null,
  stationCount: 0,
  topStations: [],
};

function extractEmbeddedRoleName(roleValue) {
  if (Array.isArray(roleValue)) {
    return String(roleValue[0]?.name || '').toLowerCase();
  }

  if (roleValue && typeof roleValue === 'object') {
    return String(roleValue.name || '').toLowerCase();
  }

  return '';
}

function extractRoleName(entry) {
  return normalizeRoleName(
    extractEmbeddedRoleName(entry?.roles)
    || ROLE_ID_TO_NAME[String(entry?.role_id || '').toLowerCase()]
    || ''
  );
}

function pickHighestRoleName(roleEntries = []) {
  return roleEntries.reduce((bestRole, entry) => {
    const candidate = extractRoleName(entry);

    if (!candidate) {
      return bestRole;
    }

    if (!bestRole) {
      return candidate;
    }

    return (ROLE_PRIORITY[candidate] || 0) > (ROLE_PRIORITY[bestRole] || 0)
      ? candidate
      : bestRole;
  }, '');
}

function deriveRequestStatus(request, trip) {
  if (trip?.trip_status) {
    return trip.trip_status;
  }

  return request.status;
}

function formatRequestNumber(date, sequenceNumber) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `VR-${year}-${month}${day}-${String(sequenceNumber).padStart(3, '0')}`;
}

function canSyncTripAssignment(tripStatus) {
  return !tripStatus || ['Scheduled', 'Ready for Release'].includes(tripStatus);
}

function normalizeRestrictionCodes(value) {
  return String(value || '')
    .split(/[,\s/]+/)
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

function getVehicleRestrictionRequirement(vehicleType) {
  const normalizedType = String(vehicleType || '').trim().toLowerCase();

  if (!normalizedType) {
    return null;
  }

  if (normalizedType.includes('van')) {
    return { requiredRestrictions: ['B2'], label: 'Van' };
  }

  if (normalizedType.includes('pickup') || normalizedType.includes('suv') || normalizedType.includes('mpv')) {
    return { requiredRestrictions: ['B1', 'B2'], label: String(vehicleType).trim() };
  }

  if (normalizedType.includes('sedan')) {
    return { requiredRestrictions: ['B', 'B1', 'B2'], label: 'Sedan' };
  }

  return null;
}

function inferAuditCategory(targetTable, action, afterData = {}) {
  const explicitCategory = String(afterData?.category || '').trim().toLowerCase();

  if (explicitCategory) {
    return explicitCategory;
  }

  const normalizedTable = String(targetTable || '').trim().toLowerCase();
  const normalizedAction = String(action || '').trim().toLowerCase();

  if (normalizedTable.includes('request')) {
    return 'request';
  }

  if (normalizedTable.includes('trip')) {
    return 'trip';
  }

  if (normalizedTable.includes('branch')) {
    return 'branch';
  }

  if (normalizedTable.includes('vehicle')) {
    return 'vehicle';
  }

  if (normalizedTable.includes('profile') || normalizedTable.includes('user')) {
    return 'user';
  }

  if (normalizedTable.includes('driver')) {
    return 'driver';
  }

  if (normalizedTable.includes('maintenance')) {
    return 'maintenance';
  }

  if (normalizedTable.includes('incident')) {
    return 'incident';
  }

  if (normalizedAction.includes('password') || normalizedAction.includes('security')) {
    return 'security';
  }

  if (normalizedAction.includes('login') || normalizedAction.includes('logout') || normalizedAction.includes('session')) {
    return 'session';
  }

  return normalizedTable || 'session';
}

function summarizeAuditDetails(afterData = {}) {
  if (!afterData || typeof afterData !== 'object') {
    return '';
  }

  if (typeof afterData.details === 'string' && afterData.details.trim()) {
    return afterData.details.trim();
  }

  const summaryEntries = Object.entries(afterData).filter(([key, value]) => (
    !['category', 'source', 'actorRole'].includes(key)
    && value !== null
    && value !== ''
    && typeof value !== 'undefined'
  ));

  return summaryEntries
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' | ');
}

async function getAuthenticatedUserId(client) {
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data?.user?.id || null;
}

async function getRequestTripContext(client, requestId) {
  const { data, error } = await client
    .from('vehicle_requests')
    .select(`
      id,
      status,
      branch_id,
      destination,
      expected_return_datetime,
      assigned_vehicle_id,
      assigned_driver_id
    `)
    .eq('id', requestId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getTripLogByRequestId(client, requestId) {
  const { data, error } = await client
    .from('trip_logs')
    .select('id, trip_status, vehicle_id, driver_id')
    .eq('request_id', requestId)
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

async function assertVehicleIsAvailable(client, vehicleId) {
  if (!vehicleId) {
    return;
  }

  const { data, error } = await client
    .from('vehicles')
    .select('id, status')
    .eq('id', vehicleId)
    .single();

  if (error) {
    throw error;
  }

  if (String(data?.status || '').toLowerCase() !== 'available') {
    throw new Error('The selected vehicle is no longer available.');
  }

  const { data: activeTrips, error: activeTripError } = await client
    .from('trip_logs')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .in('trip_status', ['Ready for Release', 'Checked Out', 'In Transit', 'Overdue'])
    .limit(1);

  if (activeTripError) {
    throw activeTripError;
  }

  if (activeTrips?.length) {
    throw new Error('The selected vehicle is already assigned to an active trip.');
  }
}

async function assertDriverIsAvailable(client, driverId) {
  if (!driverId) {
    return;
  }

  const { data, error } = await client
    .from('drivers')
    .select('id, status')
    .eq('id', driverId)
    .single();

  if (error) {
    throw error;
  }

  if (String(data?.status || '').toLowerCase() !== 'available') {
    throw new Error('The selected driver is no longer available.');
  }

  const { data: activeTrips, error: activeTripError } = await client
    .from('trip_logs')
    .select('id')
    .eq('driver_id', driverId)
    .in('trip_status', ['Ready for Release', 'Checked Out', 'In Transit', 'Overdue'])
    .limit(1);

  if (activeTripError) {
    throw activeTripError;
  }

  if (activeTrips?.length) {
    throw new Error('The selected driver is already assigned to an active trip.');
  }
}

async function assertDriverMatchesVehicleRestrictions(client, driverId, vehicleId) {
  if (!driverId || !vehicleId) {
    return;
  }

  const [{ data: driver, error: driverError }, { data: vehicle, error: vehicleError }] = await Promise.all([
    client
      .from('drivers')
      .select('id, full_name, license_restrictions, license_expiry')
      .eq('id', driverId)
      .single(),
    client
      .from('vehicles')
      .select('id, vehicle_name, vehicle_type_id, required_restrictions')
      .eq('id', vehicleId)
      .single(),
  ]);

  if (driverError) {
    throw driverError;
  }

  if (vehicleError) {
    throw vehicleError;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (driver.license_expiry) {
    const expiryDate = new Date(`${driver.license_expiry}T00:00:00`);

    if (expiryDate.getTime() < today.getTime()) {
      throw new Error(`The selected driver's license expired on ${driver.license_expiry}.`);
    }
  }

  const vehicleSpecificRestrictions = normalizeRestrictionCodes(vehicle.required_restrictions);
  let vehicleRequirement = vehicleSpecificRestrictions.length > 0
    ? {
        requiredRestrictions: vehicleSpecificRestrictions,
        label: vehicle.vehicle_name || 'Vehicle',
      }
    : null;

  if (!vehicleRequirement && vehicle.vehicle_type_id) {
    const { data: vehicleType, error: vehicleTypeError } = await client
      .from('vehicle_types')
      .select('name')
      .eq('id', vehicle.vehicle_type_id)
      .single();

    if (vehicleTypeError) {
      throw vehicleTypeError;
    }

    vehicleRequirement = getVehicleRestrictionRequirement(vehicleType?.name);
  }

  const requiredRestrictions = vehicleRequirement?.requiredRestrictions || [];

  if (!vehicleRequirement) {
    throw new Error('The selected vehicle does not have a configured type or required restriction profile yet. Edit the vehicle record first.');
  }

  if (!requiredRestrictions.length) {
    return;
  }

  const driverRestrictions = normalizeRestrictionCodes(driver.license_restrictions);

  if (!requiredRestrictions.every((restriction) => driverRestrictions.includes(restriction))) {
    throw new Error(
      `Driver restrictions (${driverRestrictions.length ? driverRestrictions.join(', ') : 'none'}) do not include the full ${vehicleRequirement?.label || 'vehicle'} requirement (${requiredRestrictions.join(', ')}).`
    );
  }
}

async function syncTripLogForRequest(client, requestId) {
  const requestContext = await getRequestTripContext(client, requestId);

  if (!requestContext.assigned_vehicle_id || !requestContext.assigned_driver_id) {
    return null;
  }

  if (requestContext.status !== 'Approved') {
    return null;
  }

  const existingTrip = await getTripLogByRequestId(client, requestId);

  if (existingTrip && !canSyncTripAssignment(existingTrip.trip_status)) {
    return existingTrip.id;
  }

  const payload = {
    request_id: requestContext.id,
    vehicle_id: requestContext.assigned_vehicle_id,
    driver_id: requestContext.assigned_driver_id,
    branch_id: requestContext.branch_id,
    expected_return_datetime: requestContext.expected_return_datetime,
    actual_destination: requestContext.destination,
    trip_status: existingTrip?.trip_status || 'Ready for Release',
  };

  if (existingTrip) {
    const { error } = await client
      .from('trip_logs')
      .update(payload)
      .eq('id', existingTrip.id);

    if (error) {
      throw error;
    }

    return existingTrip.id;
  }

  const { data, error } = await client
    .from('trip_logs')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data?.id || null;
}

async function getVehicleIncidentContext(client, vehicleId) {
  const [{ data: vehicle, error: vehicleError }, activeTrip] = await Promise.all([
    client
      .from('vehicles')
      .select('id, assigned_branch_id')
      .eq('id', vehicleId)
      .single(),
    client
      .from('trip_logs')
      .select('id, driver_id')
      .eq('vehicle_id', vehicleId)
      .in('trip_status', ['Checked Out', 'In Transit', 'Overdue'])
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  if (vehicleError) {
    throw vehicleError;
  }

  if (activeTrip.error) {
    throw activeTrip.error;
  }

  return {
    branchId: vehicle.assigned_branch_id,
    tripLogId: activeTrip.data?.[0]?.id || null,
    driverId: activeTrip.data?.[0]?.driver_id || null,
  };
}

function computeBranchUtilization(branches, vehicles, profiles, drivers) {
  return branches.map((branch) => {
    const branchVehicles = vehicles.filter((vehicle) => vehicle.assigned_branch_id === branch.id);
    const utilizedCount = branchVehicles.filter((vehicle) => vehicle.status !== 'available').length;
    const utilization = branchVehicles.length
      ? Math.round((utilizedCount / branchVehicles.length) * 100)
      : 0;
    const assignedUsers = profiles.filter((profile) => profile.branch_id === branch.id).length;
    const assignedDrivers = drivers.filter((driver) => driver.branch_id === branch.id).length;

    return {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      address: branch.address || '',
      serviceRegion: branch.service_region || 'other',
      isActive: branch.is_active !== false,
      utilization,
      assignedUsers,
      assignedDrivers,
      assignedVehicles: branchVehicles.length,
    };
  });
}

async function safeSelect(query, fallback = []) {
  const { data, error } = await query;
  if (error) {
    return fallback;
  }

  return data ?? fallback;
}

async function requiredSelect(label, query) {
  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load ${label}: ${error.message}`);
  }

  return data ?? [];
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isMissingVehicleRequestFuelColumnError(error) {
  const message = String(error?.message || '').toLowerCase();

  return (
    (
      message.includes('vehicle_requests.fuel_')
      || message.includes("'fuel_")
      || message.includes('vehicle_requests.fuel_product')
      || message.includes('vehicle_requests.fuel_quote_')
      || message.includes("'fuel_quote_")
    )
    && (message.includes('does not exist') || message.includes('schema cache'))
  );
}

function withVehicleRequestFuelDefaults(request) {
  return {
    ...request,
    fuel_requested: Boolean(request?.fuel_requested),
    fuel_amount: Number(request?.fuel_amount || 0),
    fuel_liters: Number(request?.fuel_liters || 0),
    estimated_kms: Number(request?.estimated_kms || 0),
    fuel_remarks: request?.fuel_remarks || '',
    fuel_product: request?.fuel_product || '',
    fuel_quote_price_per_liter: request?.fuel_quote_price_per_liter === null || typeof request?.fuel_quote_price_per_liter === 'undefined'
      ? null
      : Number(request?.fuel_quote_price_per_liter || 0),
    fuel_quote_source: request?.fuel_quote_source || '',
    fuel_quote_observed_at: request?.fuel_quote_observed_at || '',
    fuel_quote_location: request?.fuel_quote_location || '',
    fuel_quote_province: request?.fuel_quote_province || '',
    fuel_quote_municipality: request?.fuel_quote_municipality || '',
  };
}

function stripVehicleRequestFuelFields(payload) {
  const {
    fuel_requested,
    fuel_amount,
    fuel_liters,
    estimated_kms,
    fuel_remarks,
    fuel_product,
    fuel_quote_price_per_liter,
    fuel_quote_source,
    fuel_quote_observed_at,
    fuel_quote_location,
    fuel_quote_province,
    fuel_quote_municipality,
    ...rest
  } = payload;

  return rest;
}

function stripVehicleRequestQuoteFields(payload) {
  const {
    fuel_product,
    fuel_quote_price_per_liter,
    fuel_quote_source,
    fuel_quote_observed_at,
    fuel_quote_location,
    fuel_quote_province,
    fuel_quote_municipality,
    ...rest
  } = payload;

  return rest;
}

async function selectVehicleRequests(client) {
  const baseSelect = `
    id,
    created_at,
    request_no,
    requested_by,
    branch_id,
    purpose,
    destination,
    departure_datetime,
    expected_return_datetime,
    passenger_count,
    notes,
    status,
    rejection_reason,
    approver_id,
    assigned_vehicle_id,
    assigned_driver_id
  `;
  const fuelSelect = `
    fuel_requested,
    fuel_amount,
    fuel_liters,
    estimated_kms,
    fuel_remarks,
    fuel_product,
    fuel_quote_price_per_liter,
    fuel_quote_source,
    fuel_quote_observed_at,
    fuel_quote_location,
    fuel_quote_province,
    fuel_quote_municipality
  `;

  const { data, error } = await client
    .from('vehicle_requests')
    .select(`${baseSelect},${fuelSelect}`);

  if (!error) {
    return (data ?? []).map(withVehicleRequestFuelDefaults);
  }

  if (!isMissingVehicleRequestFuelColumnError(error)) {
    throw new Error(`Unable to load vehicle requests: ${error.message}`);
  }

  const legacyFuelSelect = `
    fuel_requested,
    fuel_amount,
    fuel_liters,
    estimated_kms,
    fuel_remarks
  `;

  const { data: legacyFuelData, error: legacyFuelError } = await client
    .from('vehicle_requests')
    .select(`${baseSelect},${legacyFuelSelect}`);

  if (!legacyFuelError) {
    return (legacyFuelData ?? []).map(withVehicleRequestFuelDefaults);
  }

  const { data: fallbackData, error: fallbackError } = await client
    .from('vehicle_requests')
    .select(baseSelect);

  if (fallbackError) {
    throw new Error(`Unable to load vehicle requests: ${fallbackError.message}`);
  }

  return (fallbackData ?? []).map(withVehicleRequestFuelDefaults);
}

async function selectGuardRequestFeed(client) {
  const { data, error } = await client.rpc('get_guard_request_feed');

  if (error) {
    throw new Error(`Unable to load guard request feed: ${error.message}`);
  }

  return data ?? [];
}

async function selectGuardTripFeed(client) {
  const { data, error } = await client.rpc('get_guard_trip_feed');

  if (error) {
    throw new Error(`Unable to load guard trip feed: ${error.message}`);
  }

  return data ?? [];
}

async function selectPumpFuelAuthorizationFeed(client) {
  const { data, error } = await client.rpc('get_pump_fuel_authorization_feed');

  if (error) {
    throw new Error(`Unable to load pump fuel authorization feed: ${error.message}`);
  }

  return data ?? [];
}

async function resolveAdminApproverId(client, branchId) {
  const { data, error } = await client.rpc('resolve_admin_approver', {
    branch_uuid: branchId || null,
  });

  if (error) {
    throw new Error(`Unable to resolve admin approver: ${error.message}`);
  }

  const resolvedId = String(data || '').trim();
  return resolvedId || null;
}

function mapGuardRequestRecord(entry) {
  const passengerNames = Array.isArray(entry?.passenger_names)
    ? entry.passenger_names
      .map((name) => String(name || '').trim())
      .filter(Boolean)
    : [];
  const rawPassengerCount = Number(entry?.passenger_count || 1);
  const passengerCount = Number.isFinite(rawPassengerCount) && rawPassengerCount > 0
    ? rawPassengerCount
    : Math.max(1, passengerNames.length + 1);
  const requestId = entry?.request_id || '';

  return {
    id: requestId,
    dbId: requestId,
    requestId,
    createdAt: entry?.created_at || '',
    requestNo: entry?.request_no || '',
    requestedBy: entry?.requester_name || 'Unknown',
    requestedById: entry?.requester_id || '',
    branch: entry?.branch_name || 'Unknown',
    branchId: entry?.branch_id || '',
    purpose: '',
    destination: '',
    departureDatetime: entry?.departure_datetime || '',
    expectedReturnDatetime: entry?.expected_return_datetime || '',
    passengerCount,
    passengerNames,
    passengers: passengerNames.map((name, index) => ({
      id: `${requestId || 'request'}-passenger-${index}`,
      name,
      role: 'Passenger',
    })),
    notes: '',
    fuelRequested: false,
    fuelAmount: 0,
    fuelLiters: 0,
    estimatedKms: 0,
    fuelRemarks: '',
    fuelProduct: '',
    fuelQuotePricePerLiter: null,
    fuelQuoteSource: '',
    fuelQuoteObservedAt: '',
    fuelQuoteLocation: '',
    fuelQuoteProvince: '',
    fuelQuoteMunicipality: '',
    status: entry?.status || 'Pending Approval',
    approvedAt: '',
    rejectionReason: '',
    approver: 'Pending',
    approverId: '',
    assignedVehicle: 'Unassigned',
    assignedVehicleId: '',
    assignedDriver: 'Unassigned',
    assignedDriverId: '',
  };
}

function mapPumpFuelAuthorizationRecord(entry) {
  const requestId = entry?.request_id || '';

  return {
    id: requestId,
    dbId: requestId,
    requestId,
    createdAt: entry?.created_at || '',
    requestNo: entry?.request_no || '',
    requestedBy: '',
    requestedById: '',
    branch: entry?.branch_name || 'Unknown',
    branchId: entry?.branch_id || '',
    purpose: '',
    destination: '',
    departureDatetime: '',
    expectedReturnDatetime: '',
    passengerCount: 0,
    passengerNames: [],
    passengers: [],
    notes: '',
    fuelRequested: true,
    fuelAmount: Number(entry?.fuel_amount || 0),
    fuelLiters: Number(entry?.fuel_liters || 0),
    estimatedKms: Number(entry?.estimated_kms || 0),
    fuelRemarks: entry?.fuel_remarks || '',
    fuelProduct: entry?.fuel_product || '',
    fuelQuotePricePerLiter: entry?.fuel_quote_price_per_liter === null || typeof entry?.fuel_quote_price_per_liter === 'undefined'
      ? null
      : Number(entry?.fuel_quote_price_per_liter || 0),
    fuelQuoteSource: entry?.fuel_quote_source || '',
    fuelQuoteObservedAt: entry?.fuel_quote_observed_at || '',
    fuelQuoteLocation: entry?.fuel_quote_location || '',
    fuelQuoteProvince: '',
    fuelQuoteMunicipality: '',
    status: entry?.status || 'Approved',
    approvedAt: entry?.approved_at || '',
    rejectionReason: '',
    approver: entry?.approver_name || 'Pending',
    approverId: '',
    assignedVehicle: 'Unassigned',
    assignedVehicleId: '',
    assignedDriver: 'Unassigned',
    assignedDriverId: '',
  };
}

function mapGuardTripRecord(entry) {
  const passengerNames = Array.isArray(entry?.passenger_names)
    ? entry.passenger_names
      .map((name) => String(name || '').trim())
      .filter(Boolean)
    : [];
  const rawPassengerCount = Number(entry?.passenger_count || 1);
  const passengerCount = Number.isFinite(rawPassengerCount) && rawPassengerCount > 0
    ? rawPassengerCount
    : Math.max(1, passengerNames.length + 1);
  const tripId = entry?.trip_id || entry?.request_id || '';

  return {
    id: tripId,
    dbId: tripId,
    requestId: entry?.request_id || '',
    requestNo: entry?.request_no || 'Unlinked request',
    requestedBy: entry?.requester_name || 'Unknown',
    vehicle: entry?.vehicle_name || 'Unknown vehicle',
    vehicleId: '',
    driver: entry?.driver_name || 'Unknown driver',
    driverId: '',
    origin: entry?.branch_name || 'Unknown branch',
    branchId: entry?.branch_id || '',
    destination: '',
    tripStatus: entry?.trip_status || 'Scheduled',
    dateOut: entry?.date_out || '',
    expectedReturn: entry?.expected_return_datetime || '',
    actualReturnDatetime: entry?.date_in || '',
    dateIn: entry?.date_in || '',
    odometerOut: null,
    odometerIn: null,
    fuelOut: '',
    fuelIn: '',
    conditionOut: '',
    mileageComputed: 0,
    remarks: '',
    passengerCount,
    passengerNames,
  };
}

async function insertVehicleRequest(client, payload) {
  let result = await client
    .from('vehicle_requests')
    .insert(payload)
    .select('id')
    .single();

  if (result.error && isMissingVehicleRequestFuelColumnError(result.error)) {
    result = await client
      .from('vehicle_requests')
      .insert(stripVehicleRequestQuoteFields(payload))
      .select('id')
      .single();
  }

  if (result.error && isMissingVehicleRequestFuelColumnError(result.error)) {
    result = await client
      .from('vehicle_requests')
      .insert(stripVehicleRequestFuelFields(payload))
      .select('id')
      .single();
  }

  return result;
}

async function updateVehicleRequest(client, requestId, payload) {
  let result = await client
    .from('vehicle_requests')
    .update(payload)
    .eq('id', requestId);

  if (result.error && isMissingVehicleRequestFuelColumnError(result.error)) {
    result = await client
      .from('vehicle_requests')
      .update(stripVehicleRequestQuoteFields(payload))
      .eq('id', requestId);
  }

  if (result.error && isMissingVehicleRequestFuelColumnError(result.error)) {
    result = await client
      .from('vehicle_requests')
      .update(stripVehicleRequestFuelFields(payload))
      .eq('id', requestId);
  }

  return result;
}

function isMissingPanayPricingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    (message.includes('fuel_price_snapshots') || message.includes('fuel_price_sync_runs'))
    && (message.includes('does not exist') || message.includes('schema cache') || message.includes('relation'))
  );
}

function isMissingBranchServiceRegionColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    (message.includes('branches.service_region') || message.includes("'service_region'"))
    && (message.includes('does not exist') || message.includes('schema cache'))
  );
}

function isMissingVehicleOdoDefectiveColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    (message.includes('vehicles.is_odo_defective') || message.includes("'is_odo_defective'"))
    && (message.includes('does not exist') || message.includes('schema cache'))
  );
}

function isMissingVehicleOilChangeColumnsError(error) {
  const message = String(error?.message || '').toLowerCase();
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
    && (message.includes('does not exist') || message.includes('schema cache'))
  );
}

async function selectVehicles(client) {
  const coreSelect = `
    id,
    vehicle_type_id,
    assigned_branch_id,
    plate_number,
    vehicle_name,
    status,
    fuel_type,
    seating_capacity,
    odometer_current,
    registration_expiry,
    insurance_expiry,
    required_restrictions
  `;
  const oilReminderSelect = `
    oil_change_reminder_enabled,
    oil_change_interval_km,
    oil_change_interval_months,
    oil_change_last_odometer,
    oil_change_last_changed_on
  `;

  let includeOdoDefective = true;
  let includeOilReminder = true;
  let rows = null;
  let attemptError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const selectParts = [coreSelect];

    if (includeOilReminder) {
      selectParts.push(oilReminderSelect);
    }

    if (includeOdoDefective) {
      selectParts.push('is_odo_defective');
    }

    const select = selectParts.join(', ');
    const { data, error } = await client.from('vehicles').select(select);

    if (!error) {
      rows = data ?? [];
      attemptError = null;
      break;
    }

    attemptError = error;
    let shouldRetry = false;

    if (includeOilReminder && isMissingVehicleOilChangeColumnsError(error)) {
      includeOilReminder = false;
      shouldRetry = true;
    }

    if (includeOdoDefective && isMissingVehicleOdoDefectiveColumnError(error)) {
      includeOdoDefective = false;
      shouldRetry = true;
    }

    if (!shouldRetry) {
      break;
    }
  }

  if (attemptError) {
    throw new Error(`Unable to load vehicles: ${attemptError.message}`);
  }

  return (rows ?? []).map((vehicle) => ({
    ...vehicle,
    is_odo_defective: includeOdoDefective ? Boolean(vehicle.is_odo_defective) : false,
    oil_change_reminder_enabled: includeOilReminder ? Boolean(vehicle.oil_change_reminder_enabled) : false,
    oil_change_interval_km: includeOilReminder
      ? (vehicle.oil_change_interval_km === null || typeof vehicle.oil_change_interval_km === 'undefined'
        ? null
        : Number(vehicle.oil_change_interval_km))
      : null,
    oil_change_interval_months: includeOilReminder
      ? (vehicle.oil_change_interval_months === null || typeof vehicle.oil_change_interval_months === 'undefined'
        ? null
        : Number(vehicle.oil_change_interval_months))
      : null,
    oil_change_last_odometer: includeOilReminder
      ? (vehicle.oil_change_last_odometer === null || typeof vehicle.oil_change_last_odometer === 'undefined'
        ? null
        : Number(vehicle.oil_change_last_odometer))
      : null,
    oil_change_last_changed_on: includeOilReminder
      ? (vehicle.oil_change_last_changed_on || null)
      : null,
  }));
}

function summarizePanayPricing(snapshotRows, syncRuns) {
  const normalizedRows = (snapshotRows || []).map((row) => ({
    province: row.province || '',
    municipality: row.municipality || '',
    stationName: row.station_name || '',
    fuelType: row.fuel_type || '',
    pricePerLiter: Number(row.price_per_liter || 0),
    currency: row.currency || 'PHP',
    observedAt: row.observed_at || '',
    source: row.source || '',
    confidence: Number(row.confidence || 0),
    ingestedAt: row.ingested_at || row.created_at || '',
  }));

  const latestObservedAt = normalizedRows
    .map((row) => row.observedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || '';
  const uniqueStations = new Set(normalizedRows.map((row) => `${row.province}|${row.municipality}|${row.stationName}`));
  const topStations = [...normalizedRows]
    .sort((left, right) => left.pricePerLiter - right.pricePerLiter)
    .slice(0, 5);

  return {
    rows: normalizedRows,
    lastUpdatedAt: latestObservedAt || syncRuns?.[0]?.finished_at || '',
    latestRun: syncRuns?.[0]
      ? {
          provider: syncRuns[0].provider,
          status: syncRuns[0].status,
          startedAt: syncRuns[0].started_at,
          finishedAt: syncRuns[0].finished_at,
          rowsUpserted: Number(syncRuns[0].rows_upserted || 0),
          error: syncRuns[0].error || '',
        }
      : null,
    stationCount: uniqueStations.size,
    topStations,
  };
}

async function selectPanayFuelPricing(client) {
  const [snapshotResult, syncRunResult] = await Promise.all([
    client
      .from('fuel_price_snapshots')
      .select(`
        province,
        municipality,
        station_name,
        fuel_type,
        price_per_liter,
        currency,
        observed_at,
        source,
        confidence,
        ingested_at,
        created_at
      `)
      .order('observed_at', { ascending: false })
      .limit(500),
    client
      .from('fuel_price_sync_runs')
      .select('provider, status, started_at, finished_at, rows_upserted, error')
      .order('started_at', { ascending: false })
      .limit(1),
  ]);

  if (snapshotResult.error || syncRunResult.error) {
    const cause = snapshotResult.error || syncRunResult.error;

    if (isMissingPanayPricingTableError(cause)) {
      return {
        rows: [],
        lastUpdatedAt: '',
        latestRun: null,
        stationCount: 0,
        topStations: [],
      };
    }

    throw new Error(cause.message || 'Unable to load Panay fuel pricing.');
  }

  return summarizePanayPricing(snapshotResult.data || [], syncRunResult.data || []);
}

async function selectFirst(label, query) {
  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load ${label}: ${error.message}`);
  }

  if (!data?.length) {
    return null;
  }

  return data[0];
}

function isEdgeFunctionUnavailable(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('failed to send a request to the edge function')
    || message.includes('failed to fetch')
    || message.includes('network')
  );
}

function isRecoverableUserRoleWriteError(message) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('user_roles') && normalized.includes('row-level security');
}

async function archiveLiveProfile(client, userId) {
  const timestamp = new Date().toISOString();

  const { error: profileError } = await client
    .from('profiles')
    .update({
      is_active: false,
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', userId);

  if (profileError) {
    throw profileError;
  }

  const { error: roleError } = await client
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (roleError) {
    throw roleError;
  }

  return { archived: true, userId };
}

async function createLiveUserFallback(client, profileForm) {
  const signupClient = createTransientSupabaseClient();

  if (!signupClient) {
    throw new Error('The create-user Edge Function is unavailable and no fallback auth client is configured.');
  }

  const email = profileForm.email.trim().toLowerCase();
  const password = profileForm.password;
  const fullName = profileForm.name.trim();
  const roleName = normalizeRoleName(profileForm.role);
  const branchId = profileForm.branchId || null;

  const [{ data: roleRecord, error: roleError }, { data: callerData }] = await Promise.all([
    client
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single(),
    client.auth.getUser(),
  ]);

  if (roleError || !roleRecord) {
    throw new Error('Unable to load the selected role.');
  }

  const callerId = callerData?.user?.id || null;

  const { data: signUpData, error: signUpError } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signUpError) {
    throw new Error(signUpError.message || 'Unable to create the auth user.');
  }

  const createdUserId = signUpData.user?.id;

  if (!createdUserId) {
    throw new Error('Supabase did not return a user id for the new account.');
  }

  const { error: profileError } = await client
    .from('profiles')
    .upsert({
      id: createdUserId,
      branch_id: branchId,
      email,
      full_name: fullName,
      is_active: true,
      deleted_at: null,
      created_by: callerId,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    throw profileError;
  }

  if (roleName !== 'requester') {
    const { error: roleInsertError } = await client
      .from('user_roles')
      .insert({
        user_id: createdUserId,
        role_id: roleRecord.id,
        branch_id: branchId,
        created_by: callerId,
      });

    if (roleInsertError) {
      throw roleInsertError;
    }
  }

  return {
    userId: createdUserId,
    email,
    role: roleName,
    branchId,
    requiresEmailConfirmation: !signUpData.session,
  };
}

async function updateLiveProfileFallback(client, payload) {
  const { data: roleRecord, error: roleError } = await client
    .from('roles')
    .select('id')
    .eq('name', payload.role)
    .single();

  if (roleError || !roleRecord) {
    throw new Error('Unable to load the selected role.');
  }

  const { error: profileError } = await client
    .from('profiles')
    .update({
      full_name: payload.fullName,
      email: payload.email,
      branch_id: payload.branchId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.userId);

  if (profileError) {
    throw profileError;
  }

  const { data: existingRoles, error: existingRolesError } = await client
    .from('user_roles')
    .select('id')
    .eq('user_id', payload.userId);

  if (existingRolesError) {
    throw existingRolesError;
  }

  if (payload.role === 'requester') {
    const { error: deleteRolesError } = await client
      .from('user_roles')
      .delete()
      .eq('user_id', payload.userId);

    if (deleteRolesError) {
      throw deleteRolesError;
    }
  } else if (existingRoles?.length) {
    const primaryRole = existingRoles[0];
    const extraRoleIds = existingRoles.slice(1).map((entry) => entry.id);

    const { error: updateRoleError } = await client
      .from('user_roles')
      .update({
        role_id: roleRecord.id,
        branch_id: payload.branchId,
      })
      .eq('id', primaryRole.id);

    if (updateRoleError) {
      throw updateRoleError;
    }

    if (extraRoleIds.length) {
      const { error: deleteExtraRolesError } = await client
        .from('user_roles')
        .delete()
        .in('id', extraRoleIds);

      if (deleteExtraRolesError) {
        throw deleteExtraRolesError;
      }
    }
  } else {
    const { error: insertRoleError } = await client
      .from('user_roles')
      .insert({
        user_id: payload.userId,
        role_id: roleRecord.id,
        branch_id: payload.branchId,
      });

    if (insertRoleError) {
      throw insertRoleError;
    }
  }

  return { userId: payload.userId, role: payload.role, branchId: payload.branchId };
}

export async function fetchLiveSessionUser(client, authUserId) {
  async function loadProfile() {
    return selectFirst(
      'your live profile',
      client
        .from('profiles')
        .select('id, full_name, email, branch_id, is_active, deleted_at')
        .eq('id', authUserId)
        .limit(1)
    );
  }

  let profile = await loadProfile();

  // A newly created account can briefly authenticate before its profile row is visible.
  if (!profile) {
    const profileRetryCount = 5;

    for (let attempt = 0; attempt < profileRetryCount && !profile; attempt += 1) {
      await sleep(400);
      profile = await loadProfile();
    }
  }

  if (!profile) {
    throw new Error('Your account profile is still being prepared. Please try again in a moment.');
  }

  if (profile.is_active === false || profile.deleted_at) {
    throw new Error('This account has been deactivated.');
  }

  const roles = await requiredSelect(
    'your live role assignments',
    client
      .from('user_roles')
      .select('user_id, role_id, roles(name)')
      .eq('user_id', authUserId),
  );

  const branch = await safeSelect(
    client
      .from('branches')
      .select('id, name, service_region')
      .eq('id', profile.branch_id)
      .limit(1),
    []
  );

  const roleName = pickHighestRoleName(roles) || 'requester';

  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: titleCaseRole(roleName),
    branch: branch[0]?.name || 'Unassigned',
    branchId: profile.branch_id,
    serviceRegion: branch[0]?.service_region || 'other',
  };
}

export async function fetchLiveAppData(client) {
  const authUserId = await getAuthenticatedUserId(client).catch(() => null);
  let sessionUser = null;

  if (authUserId) {
    sessionUser = await fetchLiveSessionUser(client, authUserId).catch(() => null);
  }

  const normalizedSessionRole = normalizeRoleName(sessionUser?.role);

  if (normalizedSessionRole === 'guard') {
    const [guardRequests, guardTrips] = await Promise.all([
      selectGuardRequestFeed(client),
      selectGuardTripFeed(client),
    ]);

    return {
      branches: sessionUser.branchId
        ? [{
            id: sessionUser.branchId,
            code: '',
            name: sessionUser.branch || 'Unassigned',
            address: '',
            serviceRegion: sessionUser.serviceRegion || 'other',
            isActive: true,
            utilization: 0,
            assignedUsers: 1,
            assignedDrivers: 0,
            assignedVehicles: 0,
          }]
        : [],
      requestRecords: guardRequests.map(mapGuardRequestRecord),
      tripRecords: guardTrips.map(mapGuardTripRecord),
      userRecords: [{
        id: sessionUser.id,
        dbId: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        branch: sessionUser.branch,
        branchId: sessionUser.branchId,
        serviceRegion: sessionUser.serviceRegion || 'other',
      }],
      vehicleRecords: [],
      vehicleTypeRecords: [],
      driverRecords: [],
      maintenanceRecords: [],
      incidentRecords: [],
      notificationFeed: [],
      auditRecords: [],
      panayFuelPricing: EMPTY_PANAY_FUEL_PRICING,
    };
  }

  if (normalizedSessionRole === 'pump_station') {
    const pumpRequests = await selectPumpFuelAuthorizationFeed(client);

    return {
      branches: sessionUser.branchId
        ? [{
            id: sessionUser.branchId,
            code: '',
            name: sessionUser.branch || 'Unassigned',
            address: '',
            serviceRegion: sessionUser.serviceRegion || 'other',
            isActive: true,
            utilization: 0,
            assignedUsers: 1,
            assignedDrivers: 0,
            assignedVehicles: 0,
          }]
        : [],
      requestRecords: pumpRequests.map(mapPumpFuelAuthorizationRecord),
      tripRecords: [],
      userRecords: [{
        id: sessionUser.id,
        dbId: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        branch: sessionUser.branch,
        branchId: sessionUser.branchId,
        serviceRegion: sessionUser.serviceRegion || 'other',
      }],
      vehicleRecords: [],
      vehicleTypeRecords: [],
      driverRecords: [],
      maintenanceRecords: [],
      incidentRecords: [],
      notificationFeed: [],
      auditRecords: [],
      panayFuelPricing: EMPTY_PANAY_FUEL_PRICING,
    };
  }

  const [
    branches,
    profiles,
    roleAssignments,
    vehicleTypes,
    vehicles,
    drivers,
    requests,
    requestPassengers,
    tripLogs,
    maintenanceLogs,
    notifications,
    incidents,
    auditLogs,
    panayFuelPricing,
  ] = await Promise.all([
    requiredSelect('branches', client.from('branches').select('id, code, name, address, service_region, is_active, deleted_at').order('name')),
    requiredSelect('profiles', client.from('profiles').select('id, full_name, email, branch_id, is_active, deleted_at')),
    requiredSelect('role assignments', client.from('user_roles').select('user_id, branch_id, role_id, roles(name)')),
    requiredSelect('vehicle types', client.from('vehicle_types').select('id, name')),
    selectVehicles(client),
    requiredSelect('drivers', client.from('drivers').select('id, profile_id, full_name, status, branch_id, license_number, license_restrictions, license_expiry, employee_id, contact_number')),
    selectVehicleRequests(client),
    requiredSelect(
      'request passengers',
      client
        .from('request_passengers')
        .select('id, request_id, passenger_name, passenger_role, created_at')
        .order('created_at', { ascending: true })
    ),
    requiredSelect(
      'trip logs',
      client.from('trip_logs').select(`
        id,
        request_id,
        vehicle_id,
        driver_id,
        branch_id,
        date_out,
        expected_return_datetime,
        date_in,
        odometer_out,
        odometer_in,
        fuel_out,
        fuel_in,
        condition_out,
        actual_destination,
        actual_return_datetime,
        trip_status,
        remarks,
        mileage_computed
      `)
    ),
    requiredSelect(
      'maintenance logs',
      client.from('maintenance_logs').select(`
        id,
        vehicle_id,
        branch_id,
        maintenance_type,
        schedule_date,
        completed_date,
        provider,
        amount,
        status
      `)
    ),
    requiredSelect(
      'notifications',
      client
        .from('notifications')
        .select('id, title, message, notification_type, source_key, source_date, created_at, branch_id')
        .order('created_at', { ascending: false })
    ),
    requiredSelect(
      'incident reports',
      client.from('incident_reports').select(`
        id,
        vehicle_id,
        branch_id,
        trip_log_id,
        driver_id,
        incident_datetime,
        location,
        description,
        status,
        attachment_urls
      `)
    ),
    requiredSelect(
      'audit logs',
      client.from('audit_logs').select(`
        id,
        actor_id,
        branch_id,
        action,
        target_table,
        target_id,
        target_label,
        after_data,
        created_at
      `).order('created_at', { ascending: false })
    ),
    selectPanayFuelPricing(client),
  ]);

  const visibleBranches = branches.filter((branch) => !branch.deleted_at);
  const visibleProfiles = profiles.filter((profile) => profile.is_active !== false && !profile.deleted_at);
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
  const roleByUserId = roleAssignments.reduce((map, entry) => {
    const candidate = extractRoleName(entry) || 'requester';
    const existing = map.get(entry.user_id) || '';
    const nextRole = !existing || (ROLE_PRIORITY[candidate] || 0) > (ROLE_PRIORITY[existing] || 0)
      ? candidate
      : existing;

    map.set(entry.user_id, nextRole);
    return map;
  }, new Map());
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const vehicleTypeMap = new Map(vehicleTypes.map((type) => [type.id, type]));
  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const driverMap = new Map(drivers.map((driver) => [driver.id, driver]));
  const tripByRequestId = new Map(tripLogs.map((trip) => [trip.request_id, trip]));
  const passengersByRequestId = requestPassengers.reduce((map, passenger) => {
    const entries = map.get(passenger.request_id) || [];
    entries.push({
      id: passenger.id,
      name: passenger.passenger_name,
      role: passenger.passenger_role || '',
    });
    map.set(passenger.request_id, entries);
    return map;
  }, new Map());

  const requestRecords = requests.map((request) => {
    const trip = tripByRequestId.get(request.id);
    const passengerEntries = passengersByRequestId.get(request.id) || [];

    return {
      id: request.id,
      dbId: request.id,
      requestId: request.id,
      createdAt: request.created_at || '',
      requestNo: request.request_no,
      requestedBy: profileMap.get(request.requested_by)?.full_name || 'Unknown',
      requestedById: request.requested_by,
      branch: branchMap.get(request.branch_id)?.name || 'Unknown',
      branchId: request.branch_id,
      purpose: request.purpose,
      destination: request.destination,
      departureDatetime: request.departure_datetime,
      expectedReturnDatetime: request.expected_return_datetime,
      passengerCount: request.passenger_count,
      passengerNames: passengerEntries.map((entry) => entry.name),
      passengers: passengerEntries,
      notes: request.notes || '',
      fuelRequested: Boolean(request.fuel_requested),
      fuelAmount: Number(request.fuel_amount || 0),
      fuelLiters: Number(request.fuel_liters || 0),
      estimatedKms: Number(request.estimated_kms || 0),
      fuelRemarks: request.fuel_remarks || '',
      fuelProduct: request.fuel_product || '',
      fuelQuotePricePerLiter: request.fuel_quote_price_per_liter === null || typeof request.fuel_quote_price_per_liter === 'undefined'
        ? null
        : Number(request.fuel_quote_price_per_liter || 0),
      fuelQuoteSource: request.fuel_quote_source || '',
      fuelQuoteObservedAt: request.fuel_quote_observed_at || '',
      fuelQuoteLocation: request.fuel_quote_location || '',
      fuelQuoteProvince: request.fuel_quote_province || '',
      fuelQuoteMunicipality: request.fuel_quote_municipality || '',
      status: deriveRequestStatus(request, trip),
      approvedAt: request.approved_at || '',
      rejectionReason: request.rejection_reason || '',
      approver: request.approver_id ? profileMap.get(request.approver_id)?.full_name || 'Pending' : 'Pending',
      approverId: request.approver_id,
      assignedVehicle: request.assigned_vehicle_id
        ? vehicleMap.get(request.assigned_vehicle_id)?.vehicle_name || 'Unassigned'
        : 'Unassigned',
      assignedVehicleId: request.assigned_vehicle_id,
      assignedDriver: request.assigned_driver_id
        ? driverMap.get(request.assigned_driver_id)?.full_name || 'Unassigned'
        : 'Unassigned',
      assignedDriverId: request.assigned_driver_id,
    };
  });

  const tripRecords = tripLogs.map((trip) => {
    const request = requests.find((entry) => entry.id === trip.request_id);

    return {
      id: trip.id,
      dbId: trip.id,
      requestId: trip.request_id,
      requestNo: request?.request_no || 'Unlinked request',
      requestedBy: profileMap.get(request?.requested_by)?.full_name || 'Unknown',
      vehicle: vehicleMap.get(trip.vehicle_id)?.vehicle_name || 'Unknown vehicle',
      vehicleId: trip.vehicle_id,
      driver: driverMap.get(trip.driver_id)?.full_name || 'Unknown driver',
      driverId: trip.driver_id,
      origin: branchMap.get(trip.branch_id)?.name || 'Unknown branch',
      branchId: trip.branch_id,
      destination: trip.actual_destination || request?.destination || 'Unknown destination',
      tripStatus: trip.trip_status,
      dateOut: trip.date_out,
      expectedReturn: trip.expected_return_datetime,
      actualReturnDatetime: trip.actual_return_datetime,
      dateIn: trip.date_in,
      odometerOut: trip.odometer_out,
      odometerIn: trip.odometer_in,
      fuelOut: trip.fuel_out || '',
      fuelIn: trip.fuel_in || '',
      conditionOut: trip.condition_out || '',
      mileageComputed: trip.mileage_computed || 0,
      remarks: trip.remarks || '',
    };
  });

  const activeTripByVehicle = new Map(
    tripRecords
      .filter((trip) => ['Ready for Release', 'Checked Out', 'In Transit', 'Overdue'].includes(trip.tripStatus))
      .map((trip) => [trip.vehicleId, trip])
  );
  const activeTripByDriver = new Map(
    tripRecords
      .filter((trip) => ['Ready for Release', 'Checked Out', 'In Transit', 'Overdue'].includes(trip.tripStatus))
      .map((trip) => [trip.driverId, trip])
  );
  const reservedVehicleIds = new Set(
    requestRecords
      .filter((request) => request.assignedVehicleId && ['Pending Approval', 'Approved'].includes(request.status))
      .map((request) => request.assignedVehicleId)
  );
  const assignedDriverIds = new Set(
    requestRecords
      .filter((request) => request.assignedDriverId && ['Pending Approval', 'Approved'].includes(request.status))
      .map((request) => request.assignedDriverId)
  );

  const vehicleRecords = vehicles.map((vehicle) => {
    const relatedTrip = activeTripByVehicle.get(vehicle.id);
    const derivedStatus = relatedTrip
      ? ['Checked Out', 'In Transit', 'Overdue'].includes(relatedTrip.tripStatus)
        ? 'in_use'
        : 'reserved'
      : reservedVehicleIds.has(vehicle.id)
        ? 'reserved'
        : vehicle.status;

    return {
      id: vehicle.id,
      dbId: vehicle.id,
      plateNumber: vehicle.plate_number,
      vehicleName: vehicle.vehicle_name,
      type: vehicleTypeMap.get(vehicle.vehicle_type_id)?.name || 'Vehicle',
      branch: branchMap.get(vehicle.assigned_branch_id)?.name || 'Unknown',
      branchId: vehicle.assigned_branch_id,
      status: derivedStatus,
      fuelType: vehicle.fuel_type || '-',
      seatingCapacity: vehicle.seating_capacity || 0,
      odometerCurrent: Number(vehicle.odometer_current || 0),
      registrationExpiry: vehicle.registration_expiry,
      insuranceExpiry: vehicle.insurance_expiry,
      fuelEfficiency: vehicle.fuel_efficiency || 10,
      requiredRestrictions: vehicle.required_restrictions || '',
      isOdoDefective: Boolean(vehicle.is_odo_defective),
      oilChangeReminderEnabled: Boolean(vehicle.oil_change_reminder_enabled),
      oilChangeIntervalKm: vehicle.oil_change_interval_km === null || typeof vehicle.oil_change_interval_km === 'undefined'
        ? null
        : Number(vehicle.oil_change_interval_km),
      oilChangeIntervalMonths: vehicle.oil_change_interval_months === null || typeof vehicle.oil_change_interval_months === 'undefined'
        ? null
        : Number(vehicle.oil_change_interval_months),
      oilChangeLastOdometer: vehicle.oil_change_last_odometer === null || typeof vehicle.oil_change_last_odometer === 'undefined'
        ? null
        : Number(vehicle.oil_change_last_odometer),
      oilChangeLastChangedOn: vehicle.oil_change_last_changed_on || '',
      assignedDriver: relatedTrip?.driver || 'Unassigned',
    };
  });

  const driverRecords = drivers.map((driver) => {
    const relatedTrip = activeTripByDriver.get(driver.id);
    const derivedStatus = relatedTrip
      ? ['Checked Out', 'In Transit', 'Overdue'].includes(relatedTrip.tripStatus)
        ? 'on_trip'
        : 'assigned'
      : assignedDriverIds.has(driver.id)
        ? 'assigned'
        : driver.status;

    return {
      id: driver.id,
      dbId: driver.id,
      profileId: driver.profile_id || '',
      fullName: driver.full_name,
      branch: branchMap.get(driver.branch_id)?.name || 'Unknown',
      branchId: driver.branch_id,
      status: derivedStatus,
      licenseNumber: driver.license_number,
      licenseRestrictions: driver.license_restrictions || '',
      licenseExpiry: driver.license_expiry,
      employeeId: driver.employee_id,
      contactNumber: driver.contact_number || '',
      linkedAccountName: driver.profile_id ? profileMap.get(driver.profile_id)?.full_name || '' : '',
      linkedAccountEmail: driver.profile_id ? profileMap.get(driver.profile_id)?.email || '' : '',
    };
  });

  const userRecords = visibleProfiles.map((profile) => ({
    id: profile.id,
    dbId: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: titleCaseRole(roleByUserId.get(profile.id) || 'requester'),
    branch: branchMap.get(profile.branch_id)?.name || 'Unassigned',
    branchId: profile.branch_id,
    serviceRegion: branchMap.get(profile.branch_id)?.service_region || 'other',
  }));

  const maintenanceRecords = maintenanceLogs.map((entry) => ({
    id: entry.id,
    dbId: entry.id,
    vehicle: vehicleMap.get(entry.vehicle_id)?.vehicle_name || 'Unknown vehicle',
    vehicleId: entry.vehicle_id,
    branch: branchMap.get(entry.branch_id)?.name || 'Unknown',
    maintenanceType: entry.maintenance_type,
    scheduleDate: entry.schedule_date,
    completedDate: entry.completed_date,
    provider: entry.provider || '-',
    amount: Number(entry.amount || 0),
    status: entry.status,
  }));

  const incidentRecords = incidents.map((incident) => ({
    id: incident.id,
    branchId: incident.branch_id,
    tripLogId: incident.trip_log_id,
    driverId: incident.driver_id,
    incidentDatetime: incident.incident_datetime,
    vehicle: vehicleMap.get(incident.vehicle_id)?.vehicle_name || 'Unknown vehicle',
    vehicleId: incident.vehicle_id,
    location: incident.location || 'Unknown location',
    description: incident.description,
    status: incident.status,
    photoUrl: Array.isArray(incident.attachment_urls) ? incident.attachment_urls[0] || '' : '',
  }));

  const notificationFeed = notifications.map((notice) => ({
    id: notice.id,
    title: notice.title,
    detail: notice.message,
    tone: notice.notification_type,
    sourceKey: notice.source_key || '',
    sourceDate: notice.source_date || '',
    createdAt: notice.created_at || '',
    branchId: notice.branch_id || null,
  }));

  const auditRecords = auditLogs.map((entry) => {
    const actorProfile = entry.actor_id ? profileMap.get(entry.actor_id) : null;
    const afterData = entry.after_data && typeof entry.after_data === 'object' ? entry.after_data : {};

    return {
      id: entry.id,
      actor: actorProfile?.full_name || 'System',
      actorRole: actorProfile ? titleCaseRole(roleByUserId.get(entry.actor_id) || 'requester') : String(afterData.actorRole || 'System'),
      category: inferAuditCategory(entry.target_table, entry.action, afterData),
      action: entry.action,
      target: entry.target_label || entry.target_id || entry.target_table,
      branch: branchMap.get(entry.branch_id)?.name || 'Unassigned',
      source: String(afterData.source || 'database log'),
      details: summarizeAuditDetails(afterData),
      timestamp: entry.created_at,
    };
  });

  return {
    branches: computeBranchUtilization(visibleBranches, vehicles, visibleProfiles, drivers),
    requestRecords,
    tripRecords,
    userRecords,
    vehicleRecords,
    vehicleTypeRecords: vehicleTypes.map((type) => ({ id: type.id, name: type.name })),
    driverRecords,
    maintenanceRecords,
    incidentRecords,
    notificationFeed,
    auditRecords,
    panayFuelPricing: panayFuelPricing || EMPTY_PANAY_FUEL_PRICING,
  };
}

export async function createLiveRequest(client, currentSessionUser, requestForm, existingCount, options = {}) {
  const requestNo = formatRequestNumber(new Date(), existingCount + 1);
  const selectedVehicleId = requestForm.assignedVehicleId || null;
  const selectedDriverId = requestForm.assignedDriverId || null;
  const forcedApproverId = String(options?.forcedApproverId || '').trim() || null;
  const normalizedRole = String(currentSessionUser?.role || '').trim().toLowerCase();
  const isApproverRequest = normalizedRole === 'approver';
  let resolvedApproverId = forcedApproverId;
  const passengerNames = Array.isArray(requestForm.passengerNames)
    ? requestForm.passengerNames.map((name) => String(name || '').trim()).filter(Boolean)
    : [];

  if (isApproverRequest && !resolvedApproverId) {
    resolvedApproverId = await resolveAdminApproverId(client, currentSessionUser.branchId);
  }

  if (isApproverRequest && !resolvedApproverId) {
    throw new Error('No admin approver account is available for this branch.');
  }

  await Promise.all([
    assertVehicleIsAvailable(client, selectedVehicleId),
    assertDriverIsAvailable(client, selectedDriverId),
    assertDriverMatchesVehicleRestrictions(client, selectedDriverId, selectedVehicleId),
  ]);

  const requestInsertPayload = {
    request_no: requestNo,
    requested_by: currentSessionUser.id,
    branch_id: currentSessionUser.branchId,
    purpose: requestForm.purpose.trim(),
    destination: requestForm.destination.trim(),
    departure_datetime: requestForm.departureDatetime,
    expected_return_datetime: requestForm.expectedReturnDatetime,
    passenger_count: Number(requestForm.passengerCount || 1),
    notes: requestForm.notes.trim(),
    fuel_requested: Boolean(requestForm.fuelRequested),
    fuel_amount: Number(requestForm.fuelAmount || 0),
    fuel_liters: Number(requestForm.fuelLiters || 0),
    estimated_kms: Number(requestForm.estimatedKms || 0),
    fuel_remarks: requestForm.fuelRemarks?.trim() || '',
    fuel_product: requestForm.fuelProduct?.trim() || null,
    fuel_quote_price_per_liter: requestForm.fuelQuotePricePerLiter === null || typeof requestForm.fuelQuotePricePerLiter === 'undefined'
      ? null
      : Number(requestForm.fuelQuotePricePerLiter || 0),
    fuel_quote_source: requestForm.fuelQuoteSource?.trim() || null,
    fuel_quote_observed_at: requestForm.fuelQuoteObservedAt || null,
    fuel_quote_location: requestForm.fuelQuoteLocation?.trim() || null,
    fuel_quote_province: requestForm.fuelQuoteProvince?.trim() || null,
    fuel_quote_municipality: requestForm.fuelQuoteMunicipality?.trim() || null,
    status: 'Pending Approval',
    approver_id: resolvedApproverId,
    assigned_vehicle_id: selectedVehicleId,
    assigned_driver_id: selectedDriverId,
    created_by: currentSessionUser.id,
  };

  const { data: insertedRequest, error } = await insertVehicleRequest(client, requestInsertPayload);

  if (error) {
    throw error;
  }

  if (passengerNames.length) {
    const { error: passengerInsertError } = await client
      .from('request_passengers')
      .insert(
        passengerNames.map((passengerName) => ({
          request_id: insertedRequest.id,
          passenger_name: passengerName,
          passenger_role: 'Passenger',
          created_by: currentSessionUser.id,
        }))
      );

    if (passengerInsertError) {
      throw passengerInsertError;
    }
  }

  const statusUpdates = [];

  if (selectedVehicleId) {
    statusUpdates.push(
      client
        .from('vehicles')
        .update({ status: 'reserved' })
        .eq('id', selectedVehicleId)
    );
  }

  if (selectedDriverId) {
    statusUpdates.push(
      client
        .from('drivers')
        .update({ status: 'assigned' })
        .eq('id', selectedDriverId)
    );
  }

  if (statusUpdates.length) {
    const updateResults = await Promise.all(statusUpdates);
    const updateError = updateResults.find((result) => result.error)?.error;

    if (updateError) {
      throw updateError;
    }
  }

  return requestNo;
}

export async function checkoutLiveTrip(client, trip, checkoutForm, odometerOut) {
  const normalizedOdometerOut = Number(odometerOut);
  const hasOdometerOut = Number.isFinite(normalizedOdometerOut);
  const tripUpdate = client
    .from('trip_logs')
    .update({
      trip_status: 'Checked Out',
      date_out: checkoutForm.dateOut,
      odometer_out: hasOdometerOut ? normalizedOdometerOut : null,
      fuel_out: checkoutForm.fuelOut,
      condition_out: checkoutForm.conditionOut || '',
    })
    .eq('id', trip.dbId);

  const vehicleUpdate = client
    .from('vehicles')
    .update({
      status: 'in_use',
    })
    .eq('id', trip.vehicleId);

  const driverUpdate = client
    .from('drivers')
    .update({
      status: 'on_trip',
    })
    .eq('id', trip.driverId);

  const [{ error: tripError }, { error: vehicleError }, { error: driverError }] = await Promise.all([tripUpdate, vehicleUpdate, driverUpdate]);

  if (tripError) {
    throw tripError;
  }

  if (vehicleError) {
    throw vehicleError;
  }

  if (driverError) {
    throw driverError;
  }
}

export async function checkinLiveTrip(client, trip, checkinForm, odometerIn) {
  const normalizedOdometerIn = Number(odometerIn);
  const hasOdometerIn = Number.isFinite(normalizedOdometerIn);
  const tripUpdate = client
    .from('trip_logs')
    .update({
      trip_status: 'Returned',
      actual_return_datetime: checkinForm.dateIn,
      date_in: checkinForm.dateIn,
      odometer_in: hasOdometerIn ? normalizedOdometerIn : null,
      fuel_in: checkinForm.fuelIn,
      remarks: checkinForm.remarks,
    })
    .eq('id', trip.dbId);

  const vehiclePayload = {
    status: 'available',
  };

  if (hasOdometerIn) {
    vehiclePayload.odometer_current = normalizedOdometerIn;
  }

  const vehicleUpdate = client
    .from('vehicles')
    .update(vehiclePayload)
    .eq('id', trip.vehicleId);

  const driverUpdate = client
    .from('drivers')
    .update({
      status: 'available',
    })
    .eq('id', trip.driverId);

  const [{ error: tripError }, { error: vehicleError }, { error: driverError }] = await Promise.all([tripUpdate, vehicleUpdate, driverUpdate]);

  if (tripError) {
    throw tripError;
  }

  if (vehicleError) {
    throw vehicleError;
  }

  if (driverError) {
    throw driverError;
  }
}

export async function reviewLiveRequest(client, request, sessionUser, nextStatus, approvalDetailsOrRejectionReason = null) {
  const approvalDetails = nextStatus === 'Approved' && approvalDetailsOrRejectionReason && typeof approvalDetailsOrRejectionReason === 'object'
    ? approvalDetailsOrRejectionReason
    : null;
  const rejectionReason = nextStatus === 'Rejected'
    ? String(approvalDetailsOrRejectionReason || '')
    : '';
  const nextAssignedDriverId = approvalDetails?.assignedDriverId || request.assignedDriverId || null;
  const previousAssignedDriverId = request.assignedDriverId || null;
  const updatePayload = {
    status: nextStatus,
    approver_id: sessionUser.id,
    rejection_reason: nextStatus === 'Rejected' ? rejectionReason.trim() : null,
  };

  if (approvalDetails) {
    updatePayload.assigned_driver_id = nextAssignedDriverId;
    updatePayload.fuel_requested = Boolean(approvalDetails.fuelRequested);
    updatePayload.fuel_amount = Number(approvalDetails.fuelAmount || 0);
    updatePayload.fuel_liters = Number(approvalDetails.fuelLiters || 0);
    updatePayload.estimated_kms = Number(approvalDetails.estimatedKms || 0);
    updatePayload.fuel_remarks = approvalDetails.fuelRemarks?.trim() || '';
    updatePayload.fuel_product = approvalDetails.fuelProduct?.trim() || null;
    updatePayload.fuel_quote_price_per_liter = approvalDetails.fuelQuotePricePerLiter === null || typeof approvalDetails.fuelQuotePricePerLiter === 'undefined'
      ? null
      : Number(approvalDetails.fuelQuotePricePerLiter || 0);
    updatePayload.fuel_quote_source = approvalDetails.fuelQuoteSource?.trim() || null;
    updatePayload.fuel_quote_observed_at = approvalDetails.fuelQuoteObservedAt || null;
    updatePayload.fuel_quote_location = approvalDetails.fuelQuoteLocation?.trim() || null;
    updatePayload.fuel_quote_province = approvalDetails.fuelQuoteProvince?.trim() || null;
    updatePayload.fuel_quote_municipality = approvalDetails.fuelQuoteMunicipality?.trim() || null;
  }

  if (nextStatus === 'Approved') {
    if (nextAssignedDriverId && nextAssignedDriverId !== previousAssignedDriverId) {
      await assertDriverIsAvailable(client, nextAssignedDriverId);
    }

    await assertDriverMatchesVehicleRestrictions(client, nextAssignedDriverId, request.assignedVehicleId || null);

    updatePayload.approved_at = new Date().toISOString();
  }

  const { error } = await updateVehicleRequest(
    client,
    request.dbId || request.requestId || request.id,
    updatePayload
  );

  if (error) {
    throw error;
  }

  if (nextStatus === 'Approved') {
    if (nextAssignedDriverId !== previousAssignedDriverId) {
      const driverUpdates = [];

      if (previousAssignedDriverId) {
        driverUpdates.push(
          client
            .from('drivers')
            .update({ status: 'available' })
            .eq('id', previousAssignedDriverId)
        );
      }

      if (nextAssignedDriverId) {
        driverUpdates.push(
          client
            .from('drivers')
            .update({ status: 'assigned' })
            .eq('id', nextAssignedDriverId)
        );
      }

      if (driverUpdates.length) {
        const driverResults = await Promise.all(driverUpdates);
        const driverUpdateError = driverResults.find((result) => result.error)?.error;

        if (driverUpdateError) {
          throw driverUpdateError;
        }
      }
    }

    await syncTripLogForRequest(client, request.dbId || request.requestId || request.id);
  }

  if (nextStatus === 'Rejected') {
    const releaseUpdates = [];

    if (request.assignedVehicleId) {
      releaseUpdates.push(
        client
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', request.assignedVehicleId)
      );
    }

    if (request.assignedDriverId) {
      releaseUpdates.push(
        client
          .from('drivers')
          .update({ status: 'available' })
          .eq('id', request.assignedDriverId)
      );
    }

    if (releaseUpdates.length) {
      const releaseResults = await Promise.all(releaseUpdates);
      const releaseError = releaseResults.find((result) => result.error)?.error;

      if (releaseError) {
        throw releaseError;
      }
    }
  }
}

export async function updateLiveRequestFuelValues(client, request, fuelDetails) {
  const requestId = request.dbId || request.requestId || request.id;
  const liters = Number(fuelDetails?.fuelLiters || 0);
  const amount = Number(fuelDetails?.fuelAmount || 0);
  const estimatedKms = Number(fuelDetails?.estimatedKms || 0);
  const fuelRemarks = String(fuelDetails?.fuelRemarks || '').trim();

  let result = await client
    .from('vehicle_requests')
    .update({
      fuel_liters: liters,
      fuel_amount: amount,
      estimated_kms: estimatedKms,
      fuel_remarks: fuelRemarks,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'Pending Approval')
    .select('id')
    .maybeSingle();

  if (result.error && isMissingVehicleRequestFuelColumnError(result.error)) {
    result = await client
      .from('vehicle_requests')
      .update(stripVehicleRequestFuelFields({
        fuel_liters: liters,
        fuel_amount: amount,
        estimated_kms: estimatedKms,
        fuel_remarks: fuelRemarks,
        updated_at: new Date().toISOString(),
      }))
      .eq('id', requestId)
      .eq('status', 'Pending Approval')
      .select('id')
      .maybeSingle();
  }

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    throw new Error('This request is no longer pending approval and cannot be edited.');
  }
}

export async function approveLiveTripTicket(client, tripId, approverId) {
  const { error } = await client
    .from('trip_logs')
    .update({
      trip_status: 'Closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId);

  if (error) {
    throw error;
  }
}

export async function updateLiveRequestDriverAssignment(client, request, nextDriverId) {
  const requestId = request.dbId || request.requestId || request.id;
  const previousDriverId = request.assignedDriverId || null;
  const driverId = nextDriverId || null;

  if (!driverId) {
    throw new Error('Select a driver before saving the assignment.');
  }

  if (driverId === previousDriverId) {
    return;
  }

  await assertDriverMatchesVehicleRestrictions(client, driverId, request.assignedVehicleId || null);

  const activeTripStatuses = ['Checked Out', 'In Transit', 'Overdue'];
  const blockingTripStatuses = ['Ready for Release', ...activeTripStatuses];
  const existingTrip = await getTripLogByRequestId(client, requestId);
  const isActiveTrip = Boolean(existingTrip && activeTripStatuses.includes(existingTrip.trip_status));

  if (isActiveTrip) {
    const { data: conflictingTrips, error: conflictError } = await client
      .from('trip_logs')
      .select('id')
      .eq('driver_id', driverId)
      .in('trip_status', blockingTripStatuses)
      .neq('request_id', requestId)
      .limit(1);

    if (conflictError) {
      throw conflictError;
    }

    if (conflictingTrips?.length) {
      throw new Error('The selected driver is already assigned to another active trip.');
    }
  } else {
    await assertDriverIsAvailable(client, driverId);
  }

  const { error: requestError } = await updateVehicleRequest(client, requestId, {
    assigned_driver_id: driverId,
  });

  if (requestError) {
    throw requestError;
  }

  if (existingTrip && (canSyncTripAssignment(existingTrip.trip_status) || isActiveTrip)) {
    const { error: tripError } = await client
      .from('trip_logs')
      .update({ driver_id: driverId })
      .eq('id', existingTrip.id);

    if (tripError) {
      throw tripError;
    }
  } else if (!existingTrip) {
    await syncTripLogForRequest(client, requestId);
  }

  const nextDriverStatus = isActiveTrip ? 'on_trip' : 'assigned';
  const statusUpdates = [
    client
      .from('drivers')
      .update({ status: nextDriverStatus })
      .eq('id', driverId),
  ];

  if (previousDriverId) {
    statusUpdates.push(
      client
        .from('drivers')
        .update({ status: 'available' })
        .eq('id', previousDriverId)
    );
  }

  const statusResults = await Promise.all(statusUpdates);
  const statusError = statusResults.find((result) => result.error)?.error;

  if (statusError) {
    throw statusError;
  }
}

export async function updateLiveRequestVehicleAssignment(client, request, nextVehicleId) {
  const previousVehicleId = request.assignedVehicleId || null;
  const vehicleId = nextVehicleId || null;

  await assertDriverMatchesVehicleRestrictions(client, request.assignedDriverId || null, vehicleId);

  const { error } = await client
    .from('vehicle_requests')
    .update({
      assigned_vehicle_id: vehicleId,
    })
    .eq('id', request.dbId || request.requestId || request.id);

  if (error) {
    throw error;
  }

  await syncTripLogForRequest(client, request.dbId || request.requestId || request.id);

  if (previousVehicleId && previousVehicleId !== vehicleId) {
    const { error: releaseError } = await client
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', previousVehicleId);

    if (releaseError) {
      throw releaseError;
    }
  }

  if (vehicleId && vehicleId !== previousVehicleId) {
    const { error: reserveError } = await client
      .from('vehicles')
      .update({ status: 'reserved' })
      .eq('id', vehicleId);

    if (reserveError) {
      throw reserveError;
    }
  }
}

export async function updateLiveProfile(client, profileForm) {
  const payload = {
    userId: profileForm.id,
    email: profileForm.email.trim().toLowerCase(),
    fullName: profileForm.name.trim(),
    role: normalizeRoleName(profileForm.role),
    branchId: profileForm.branchId || null,
  };

  const { data, error } = await client.functions.invoke('update-user', {
    body: payload,
  });

  if (error) {
    if (isEdgeFunctionUnavailable(error)) {
      return updateLiveProfileFallback(client, payload);
    }

    let message = error.message || 'Unable to update the user account.';

    if (error.context && typeof error.context.json === 'function') {
      const response = await error.context.json().catch(() => null);
      message = response?.error || message;
    }

    throw new Error(message);
  }

  if (data?.error) {
    if (isRecoverableUserRoleWriteError(data.error)) {
      return updateLiveProfileFallback(client, payload);
    }

    throw new Error(data.error);
  }
}

export async function createLiveUser(client, profileForm) {
  const payload = {
    email: profileForm.email.trim().toLowerCase(),
    password: profileForm.password,
    fullName: profileForm.name.trim(),
    role: normalizeRoleName(profileForm.role),
    branchId: profileForm.branchId || null,
  };

  const { data, error } = await client.functions.invoke('create-user', {
    body: payload,
  });

  if (error) {
    if (isEdgeFunctionUnavailable(error)) {
      return createLiveUserFallback(client, profileForm);
    }

    let message = error.message || 'Unable to create the user account.';

    if (error.context && typeof error.context.json === 'function') {
      const response = await error.context.json().catch(() => null);
      message = response?.error || message;
    }

    throw new Error(message);
  }

  if (data?.error) {
    if (isRecoverableUserRoleWriteError(data.error)) {
      return createLiveUserFallback(client, profileForm);
    }

    throw new Error(data.error);
  }

  return data;
}

export async function deleteLiveProfile(client, user) {
  const userId = user.dbId || user.id;
  const { data, error } = await client.functions.invoke('delete-user', {
    body: {
      userId,
    },
  });

  if (error) {
    if (isEdgeFunctionUnavailable(error)) {
      return archiveLiveProfile(client, userId);
    }

    let message = error.message || 'Unable to delete the user account.';

    if (error.context && typeof error.context.json === 'function') {
      const response = await error.context.json().catch(() => null);
      message = response?.error || message;
    }

    throw new Error(message);
  }

  if (data?.error) {
    return archiveLiveProfile(client, userId);
  }
}

export async function saveLiveDriver(client, driverForm) {
  const payload = {
    profile_id: driverForm.profileId || null,
    branch_id: driverForm.branchId,
    employee_id: driverForm.employeeId.trim(),
    full_name: driverForm.fullName.trim(),
    contact_number: driverForm.contactNumber.trim(),
    license_number: driverForm.licenseNumber.trim(),
    license_restrictions: driverForm.licenseRestrictions.trim(),
    license_expiry: driverForm.licenseExpiry,
    status: driverForm.status,
  };

  const query = driverForm.id
    ? client.from('drivers').update(payload).eq('id', driverForm.id).select('id').single()
    : client.from('drivers').insert(payload).select('id').single();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    id: data?.id || driverForm.id || '',
  };
}

export async function deleteLiveDriver(client, driver) {
  const { error } = await client
    .from('drivers')
    .delete()
    .eq('id', driver.dbId || driver.id);

  if (error) {
    throw error;
  }
}

async function resolveVehicleTypeId(client, selectedVehicleType) {
  if (!selectedVehicleType?.name) {
    return selectedVehicleType?.id || null;
  }

  if (selectedVehicleType.id) {
    const { data: typeById, error: typeByIdError } = await client
      .from('vehicle_types')
      .select('id')
      .eq('id', selectedVehicleType.id)
      .maybeSingle();

    if (!typeByIdError && typeById?.id) {
      return typeById.id;
    }
  }

  const { data: existingType, error: existingTypeError } = await client
    .from('vehicle_types')
    .select('id')
    .ilike('name', String(selectedVehicleType.name))
    .limit(1)
    .maybeSingle();

  if (existingTypeError) {
    throw existingTypeError;
  }

  if (existingType?.id) {
    return existingType.id;
  }

  const insertPayload = {
    id: selectedVehicleType.id || undefined,
    name: String(selectedVehicleType.name).trim(),
    description: `${String(selectedVehicleType.name).trim()} vehicle`,
  };
  const { data: insertedType, error: insertTypeError } = await client
    .from('vehicle_types')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertTypeError) {
    const { data: retryType, error: retryTypeError } = await client
      .from('vehicle_types')
      .select('id')
      .ilike('name', String(selectedVehicleType.name))
      .limit(1)
      .maybeSingle();

    if (retryTypeError || !retryType?.id) {
      throw insertTypeError;
    }

    return retryType.id;
  }

  return insertedType?.id || null;
}

export async function saveLiveVehicle(client, vehicleForm, vehicleTypeRecords) {
  const selectedVehicleType = (
    vehicleTypeRecords.find((type) => type.id === vehicleForm.typeId)
    || vehicleTypeRecords.find((type) => String(type.name || '').toLowerCase() === String(vehicleForm.typeId || '').toLowerCase())
    || null
  );
  const resolvedVehicleTypeId = await resolveVehicleTypeId(client, selectedVehicleType);
  const oilChangeIntervalKm = Number.parseInt(String(vehicleForm.oilChangeIntervalKm ?? ''), 10);
  const normalizedOilChangeIntervalKm = Number.isFinite(oilChangeIntervalKm) && oilChangeIntervalKm >= 0
    ? oilChangeIntervalKm
    : null;
  const oilChangeIntervalMonths = Number.parseInt(String(vehicleForm.oilChangeIntervalMonths ?? ''), 10);
  const normalizedOilChangeIntervalMonths = Number.isFinite(oilChangeIntervalMonths) && oilChangeIntervalMonths >= 0
    ? oilChangeIntervalMonths
    : null;
  const oilChangeLastOdometer = Number.parseFloat(String(vehicleForm.oilChangeLastOdometer ?? ''));
  const normalizedOilChangeLastOdometer = Number.isFinite(oilChangeLastOdometer) && oilChangeLastOdometer >= 0
    ? oilChangeLastOdometer
    : null;
  const normalizedOilChangeLastChangedOn = String(vehicleForm.oilChangeLastChangedOn || '').trim() || null;
  const payload = {
    vehicle_type_id: resolvedVehicleTypeId,
    assigned_branch_id: vehicleForm.branchId,
    plate_number: vehicleForm.plateNumber.trim(),
    vehicle_name: vehicleForm.vehicleName.trim(),
    status: vehicleForm.status,
    fuel_type: vehicleForm.fuelType.trim(),
    seating_capacity: Number(vehicleForm.seatingCapacity || 0),
    odometer_current: Number(vehicleForm.odometerCurrent || 0),
    registration_expiry: vehicleForm.registrationExpiry,
    insurance_expiry: vehicleForm.insuranceExpiry,
    required_restrictions: vehicleForm.requiredRestrictions?.trim() || null,
    is_odo_defective: Boolean(vehicleForm.isOdoDefective),
    oil_change_reminder_enabled: Boolean(vehicleForm.oilChangeReminderEnabled),
    oil_change_interval_km: normalizedOilChangeIntervalKm,
    oil_change_interval_months: normalizedOilChangeIntervalMonths,
    oil_change_last_odometer: normalizedOilChangeLastOdometer,
    oil_change_last_changed_on: normalizedOilChangeLastChangedOn,
  };
  const queryBuilder = (nextPayload) => (
    vehicleForm.id
      ? client.from('vehicles').update(nextPayload).eq('id', vehicleForm.id)
      : client.from('vehicles').insert(nextPayload)
  );

  let nextPayload = payload;
  let result = await queryBuilder(nextPayload);

  if (result.error && isMissingVehicleOilChangeColumnsError(result.error)) {
    const {
      oil_change_reminder_enabled,
      oil_change_interval_km,
      oil_change_interval_months,
      oil_change_last_odometer,
      oil_change_last_changed_on,
      ...legacyPayload
    } = nextPayload;
    nextPayload = legacyPayload;
    result = await queryBuilder(nextPayload);
  }

  if (result.error && isMissingVehicleOdoDefectiveColumnError(result.error)) {
    const { is_odo_defective, ...legacyPayload } = nextPayload;
    nextPayload = legacyPayload;
    result = await queryBuilder(nextPayload);
  }

  if (result.error) {
    throw result.error;
  }
}

export async function deleteLiveVehicle(client, vehicle) {
  const { error } = await client
    .from('vehicles')
    .delete()
    .eq('id', vehicle.dbId || vehicle.id);

  if (error) {
    throw error;
  }
}

export async function saveLiveBranch(client, branchForm) {
  const normalizedServiceRegion = branchForm.serviceRegion === 'panay' ? 'panay' : 'other';
  const payload = {
    code: branchForm.code.trim().toUpperCase(),
    name: branchForm.name.trim(),
    address: branchForm.address.trim(),
    service_region: normalizedServiceRegion,
    is_active: branchForm.isActive,
  };

  let result = await (
    branchForm.id
    ? client.from('branches').update(payload).eq('id', branchForm.id)
    : client.from('branches').insert(payload)
  );

  if (result.error && isMissingBranchServiceRegionColumnError(result.error)) {
    const { service_region, ...legacyPayload } = payload;
    result = await (
      branchForm.id
        ? client.from('branches').update(legacyPayload).eq('id', branchForm.id)
        : client.from('branches').insert(legacyPayload)
    );
  }

  if (result.error) {
    throw result.error;
  }
}

export async function deleteLiveBranch(client, branch) {
  const { error } = await client
    .from('branches')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', branch.id);

  if (error) {
    throw error;
  }
}

export async function saveLiveMaintenance(client, maintenanceForm) {
  const payload = {
    vehicle_id: maintenanceForm.vehicleId,
    branch_id: maintenanceForm.branchId,
    maintenance_type: maintenanceForm.maintenanceType.trim(),
    schedule_date: maintenanceForm.scheduleDate,
    completed_date: maintenanceForm.completedDate || null,
    provider: maintenanceForm.provider.trim(),
    amount: Number(maintenanceForm.amount || 0),
    status: maintenanceForm.status,
  };

  const query = maintenanceForm.id
    ? client.from('maintenance_logs').update(payload).eq('id', maintenanceForm.id)
    : client.from('maintenance_logs').insert(payload);

  const { error } = await query;

  if (error) {
    throw error;
  }
}

export async function uploadIncidentPhoto(client, file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `incidents/${fileName}`;

  const { error } = await client.storage
    .from('incidents')
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const { data } = client.storage
    .from('incidents')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function saveLiveIncident(client, incidentForm) {
  const [actorId, incidentContext] = await Promise.all([
    getAuthenticatedUserId(client),
    getVehicleIncidentContext(client, incidentForm.vehicleId),
  ]);

  const payload = {
    vehicle_id: incidentForm.vehicleId,
    branch_id: incidentContext.branchId,
    trip_log_id: incidentContext.tripLogId,
    driver_id: incidentContext.driverId,
    location: incidentForm.location.trim(),
    description: incidentForm.description.trim(),
    status: incidentForm.status,
    attachment_urls: incidentForm.photoUrl ? [incidentForm.photoUrl] : [],
  };

  const query = incidentForm.id
    ? client.from('incident_reports').update(payload).eq('id', incidentForm.id)
    : client.from('incident_reports').insert({
        ...payload,
        incident_datetime: new Date().toISOString(),
        created_by: actorId,
      });

  const { error } = await query;

  if (error) {
    throw error;
  }
}
