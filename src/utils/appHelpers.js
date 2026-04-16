const statusClassMap = {
  available: 'status-green',
  approved: 'status-green',
  assigned: 'status-green',
  returned: 'status-returned',
  completed: 'status-green',
  resolved: 'status-green',
  'checked out': 'status-checkout',
  pending: 'status-amber',
  'pending approval': 'status-amber',
  reserved: 'status-amber',
  'ready for release': 'status-amber',
  scheduled: 'status-amber',
  draft: 'status-slate',
  inactive: 'status-slate',
  leave: 'status-slate',
  rejected: 'status-red',
  cancelled: 'status-red',
  overdue: 'status-red',
  danger: 'status-red',
  'in transit': 'status-blue',
  'in use': 'status-blue',
  'on trip': 'status-blue',
  open: 'status-blue',
  info: 'status-blue',
  maintenance: 'status-purple',
  warning: 'status-purple',
  'incident reported': 'status-purple',
};

export const PRINTABLE_REQUEST_STATUSES = new Set([
  'approved',
  'ready for release',
  'checked out',
  'in transit',
  'returned',
  'overdue',
  'incident reported',
  'closed',
]);

export const REQUEST_HIRED_DRIVER_OPTION_VALUE = '__hired_driver__';

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function toLocalDateTimeInputValue(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function getStartOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function normalizeComparableText(value) {
  return String(value || '').trim().toLowerCase();
}

function findVehicleForTrip(vehicleRecords, trip) {
  if (!trip) {
    return null;
  }

  return vehicleRecords.find((vehicle) => {
    if (trip.vehicleId && vehicle.id === trip.vehicleId) {
      return true;
    }

    const tripVehicle = normalizeComparableText(trip.vehicle);
    if (!tripVehicle) {
      return false;
    }

    return (
      normalizeComparableText(vehicle.vehicleName) === tripVehicle
      || normalizeComparableText(vehicle.plateNumber) === tripVehicle
    );
  }) || null;
}

export function normalizePassengerCount(value) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
}

export function createPassengerNameSlots(count) {
  return Array.from({ length: Math.max(normalizePassengerCount(count) - 1, 0) }, () => '');
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

  if (normalizedType.includes('motorcycle') || normalizedType.includes('motorbike')) {
    return { requiredRestrictions: ['A', 'A1'], label: 'Motorcycle' };
  }

  return null;
}

export function getDriverAssignmentValidation(driver, vehicle) {
  if (!driver) {
    return {
      isValid: true,
      licenseExpired: false,
      restrictionMismatch: false,
      vehicleRequirementMissing: false,
      licenseExpiry: '',
      driverRestrictions: [],
      requiredRestrictions: [],
      vehicleTypeLabel: '',
    };
  }

  const today = getStartOfToday();
  const expiryDate = driver.licenseExpiry ? new Date(`${driver.licenseExpiry}T00:00:00`) : null;
  const licenseExpired = Boolean(expiryDate && expiryDate.getTime() < today.getTime());
  const driverRestrictions = normalizeRestrictionCodes(driver.licenseRestrictions || driver.restrictions);
  
  // Per-vehicle restrictions override type-based defaults
  const vehicleSpecificRestrictions = normalizeRestrictionCodes(vehicle?.requiredRestrictions);
  const vehicleRequirement = vehicleSpecificRestrictions.length > 0
    ? { requiredRestrictions: vehicleSpecificRestrictions, label: vehicle.vehicleName || 'Vehicle' }
    : getVehicleRestrictionRequirement(vehicle?.type);
  const vehicleRequirementMissing = Boolean(
    vehicle
    && !vehicleRequirement
    && ['vehicle', ''].includes(String(vehicle?.type || '').trim().toLowerCase())
  );

  const requiredRestrictions = vehicleRequirement?.requiredRestrictions || [];
  const restrictionMismatch = Boolean(
    !vehicleRequirementMissing
    && vehicleRequirement
    && requiredRestrictions.length
    && !requiredRestrictions.every((restriction) => driverRestrictions.includes(restriction))
  );

  return {
    isValid: !licenseExpired && !restrictionMismatch && !vehicleRequirementMissing,
    licenseExpired,
    restrictionMismatch,
    vehicleRequirementMissing,
    licenseExpiry: driver.licenseExpiry || '',
    driverRestrictions,
    requiredRestrictions,
    vehicleTypeLabel: vehicleRequirement?.label || String(vehicle?.type || '').trim(),
  };
}

export function formatDate(value, withTime = false) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(date);
}

export function daysUntil(value) {
  const now = getStartOfToday();
  const target = new Date(value);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isSameCalendarDay(value, targetValue) {
  if (!value) {
    return false;
  }

  const left = new Date(value);
  const right = new Date(targetValue);

  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

export function formatStatusLabel(status) {
  return String(status).replace(/_/g, ' ');
}

export function canPrintRequestStatus(status) {
  return PRINTABLE_REQUEST_STATUSES.has(formatStatusLabel(status).toLowerCase());
}

export function toStatusClass(status) {
  return statusClassMap[formatStatusLabel(status).toLowerCase()] || 'status-slate';
}

export function createRequestForm() {
  const departure = new Date();
  departure.setSeconds(0, 0);

  const expectedReturn = new Date(departure);
  expectedReturn.setHours(expectedReturn.getHours() + 8);
  const defaultHiredDriverExpiry = new Date(departure);
  defaultHiredDriverExpiry.setFullYear(defaultHiredDriverExpiry.getFullYear() + 1);

  return {
    purpose: '',
    destination: '',
    departureDatetime: toLocalDateTimeInputValue(departure),
    expectedReturnDatetime: toLocalDateTimeInputValue(expectedReturn),
    passengerCount: '1',
    passengerNames: createPassengerNameSlots(1),
    assignedDriverId: '',
    hiredDriverName: '',
    hiredDriverLicenseNumber: '',
    hiredDriverLicenseRestrictions: '',
    hiredDriverLicenseExpiry: toDateInputValue(defaultHiredDriverExpiry),
    hiredDriverContactNumber: '',
    assignedVehicleId: '',
    notes: '',
    fuelRequested: false,
    fuelAmount: '0',
    fuelLiters: '0',
    estimatedKms: '0',
    fuelRemarks: '',
    fuelProduct: 'diesel',
    fuelQuotePricePerLiter: null,
    fuelQuoteSource: '',
    fuelQuoteObservedAt: '',
    fuelQuoteLocation: '',
    fuelQuoteProvince: '',
    fuelQuoteMunicipality: '',
    fuelAmountManuallyEdited: false,
  };
}

export function pickCheckoutDefaults(tripRecords, vehicleRecords, readyStatuses) {
  const selectedTrip = tripRecords.find((trip) => readyStatuses.includes(trip.tripStatus));
  const vehicle = findVehicleForTrip(vehicleRecords, selectedTrip);
  const now = new Date();
  now.setSeconds(0, 0);

  return {
    tripId: selectedTrip?.id || '',
    dateOut: toLocalDateTimeInputValue(now),
    odometerOut: selectedTrip?.odometerOut
      ? String(selectedTrip.odometerOut)
      : vehicle
        ? String(vehicle.odometerCurrent)
        : '',
    fuelOut: selectedTrip?.fuelOut || '3/4',
    checklist: {
      engine: true,
      fluids: true,
      tires: true,
      lights: true,
      body: true,
      interior: true,
    }
  };
}

export function pickCheckinDefaults(tripRecords, activeStatuses) {
  const selectedTrip = tripRecords.find((trip) => activeStatuses.includes(trip.tripStatus));
  const now = new Date();
  now.setSeconds(0, 0);

  return {
    tripId: selectedTrip?.id || '',
    dateIn: toLocalDateTimeInputValue(now),
    odometerIn: '',
    fuelIn: selectedTrip?.fuelIn || '1/2',
    remarks: 'Fuel receipt uploaded. Slight delay due to bank queue.',
    checklist: {
      engine: true,
      fluids: true,
      tires: true,
      lights: true,
      body: true,
      interior: true,
    }
  };
}

export function createRequestNumber(requestRecords) {
  const nextNumber = String(requestRecords.length + 1).padStart(3, '0');
  const now = new Date();
  return `VR-${now.getFullYear()}-${padNumber(now.getMonth() + 1)}${padNumber(now.getDate())}-${nextNumber}`;
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getLatestActivityTimestamp(trip) {
  return trip.actualReturnDatetime || trip.dateOut || trip.expectedReturn || '';
}

export function sortByLatestDate(left, right, selector) {
  const leftDate = selector(left) ? new Date(selector(left)).getTime() : 0;
  const rightDate = selector(right) ? new Date(selector(right)).getTime() : 0;
  return rightDate - leftDate;
}

export function toEventClass(status) {
  switch (formatStatusLabel(status).toLowerCase()) {
    case 'overdue':
      return 'event-red';
    case 'ready for release':
      return 'event-amber';
    case 'checked out':
    case 'in transit':
      return 'event-blue';
    case 'maintenance':
      return 'event-purple';
    default:
      return 'event-slate';
  }
}

export function createMaintenanceForm(user) {
  return {
    id: '',
    vehicleId: '',
    branchId: user?.branchId || '',
    maintenanceType: '',
    scheduleDate: new Date().toISOString().slice(0, 10),
    completedDate: '',
    provider: '',
    amount: 0,
    status: 'Pending',
  };
}

export function hideMaintenanceModal(modalState, setModalState) {
  setModalState({ ...modalState, open: false });
}

export function createIncidentForm() {
  return {
    id: '',
    vehicleId: '',
    location: '',
    description: '',
    status: 'Open',
    photoFile: null,
    photoUrl: '',
  };
}

export function exportToCSV(data, filename) {
  if (!data || !data.length) return;
  
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      const val = obj[header];
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  const content = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
