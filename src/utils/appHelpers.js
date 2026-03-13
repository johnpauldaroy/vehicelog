const statusClassMap = {
  available: 'status-green',
  approved: 'status-green',
  assigned: 'status-green',
  returned: 'status-green',
  completed: 'status-green',
  resolved: 'status-green',
  'checked out': 'status-green',
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
  const now = new Date('2026-03-11T00:00:00');
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

export function toStatusClass(status) {
  return statusClassMap[formatStatusLabel(status).toLowerCase()] || 'status-slate';
}

export function createRequestForm() {
  return {
    purpose: '',
    destination: '',
    departureDatetime: '2026-03-12T07:30',
    expectedReturnDatetime: '2026-03-12T18:00',
    passengerCount: '1',
    assignedDriverId: '',
    notes: '',
    fuelRequested: false,
    fuelAmount: '0',
    fuelLiters: '0',
    estimatedKms: '0',
    fuelRemarks: '',
  };
}

export function pickCheckoutDefaults(tripRecords, vehicleRecords, readyStatuses) {
  const selectedTrip = tripRecords.find((trip) => readyStatuses.includes(trip.tripStatus));
  const vehicle = vehicleRecords.find((entry) => entry.vehicleName === selectedTrip?.vehicle);

  return {
    tripId: selectedTrip?.id || '',
    dateOut: '2026-03-11T09:00',
    odometerOut: selectedTrip?.odometerOut
      ? String(selectedTrip.odometerOut)
      : vehicle
        ? String(vehicle.odometerCurrent)
        : '',
    fuelOut: selectedTrip?.fuelOut || '3/4',
    conditionOut: 'No visible damage. Spare tire and OR/CR confirmed.',
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

  return {
    tripId: selectedTrip?.id || '',
    dateIn: '2026-03-11T14:15',
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
  return `VR-2026-0311-${nextNumber}`;
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
