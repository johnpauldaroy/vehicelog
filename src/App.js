import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AppIcon from './components/AppIcon';
import BrandLogo from './components/BrandLogo';
import PageHero from './components/PageHero';
import { ACTIVE_TRIP_STATUSES, READY_FOR_CHECKOUT, navItems } from './constants/appConfig';
import {
  checkinLiveTrip,
  checkoutLiveTrip,
  createLiveUser,
  createLiveRequest,
  deactivateLiveWebPushSubscription,
  deleteLiveBranch,
  deleteLiveDriver,
  deleteLiveProfile,
  deleteLiveVehicle,
  fetchLiveAppData,
  fetchLiveSessionUser,
  reviewLiveRequest,
  saveLiveBranch,
  saveLiveDriver,
  saveLiveIncident,
  saveLiveMaintenance,
  saveLiveVehicle,
  saveLiveWebPushSubscription,
  updateLiveProfile,
  updateLiveRequestDriverAssignment,
  updateLiveRequestFuelValues,
  updateLiveRequestVehicleAssignment,
  uploadIncidentPhoto,
} from './lib/liveData';
import { supabase } from './lib/supabaseClient';
import {
  ensureWebPushSubscription,
  isWebPushSupported,
  unsubscribeWebPushSubscription,
} from './lib/webPushClient';
import AdminSettingsPage from './pages/AdminSettingsPage';
import CompliancePage from './pages/CompliancePage';
import DashboardPage from './pages/DashboardPage';
import RequestsPage from './pages/RequestsPage';
import ReportsPage from './pages/ReportsPage';
import TripsPage from './pages/TripsPage';
import TripsCalendarPage from './pages/TripsCalendarPage';
import VehiclesPage from './pages/VehiclesPage';
import { openApprovedRequestPdf } from './utils/requestPdf';
import {
  canPrintRequestStatus,
  createId,
  createIncidentForm,
  createPassengerNameSlots,
  createRequestForm,
  createRequestNumber,
  daysUntil,
  formatDate,
  getDriverAssignmentValidation,
  getLatestActivityTimestamp,
  isSameCalendarDay,
  normalizePassengerCount,
  pickCheckinDefaults,
  pickCheckoutDefaults,
  REQUEST_HIRED_DRIVER_OPTION_VALUE,
  sortByLatestDate,
} from './utils/appHelpers';

const TOAST_DISMISS_MS = 4200;
const LIVE_BOOTSTRAP_TIMEOUT_MS = 12000;
const SESSION_PROFILE_TIMEOUT_MS = 20000;
const SESSION_CACHE_KEY = 'vehiclelog.sessionUser';
const WEB_PUSH_PUBLIC_KEY = String(process.env.REACT_APP_WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();
const COMPLETED_REQUEST_STATUSES = ['Returned', 'Closed'];
const COMPLETED_TRIP_STATUSES = ['Returned', 'Closed'];
const EMPTY_SESSION_USER = {
  id: '',
  name: '',
  email: '',
  role: 'Requester',
  branch: 'Unassigned',
  branchId: '',
  serviceRegion: 'other',
};

const EMPTY_PANAY_FUEL_PRICING = {
  rows: [],
  lastUpdatedAt: '',
  latestRun: null,
  stationCount: 0,
  topStations: [],
};

const DEFAULT_VEHICLE_TYPE_RECORDS = [
  { id: '20000000-0000-0000-0000-000000000001', name: 'Pickup' },
  { id: '20000000-0000-0000-0000-000000000002', name: 'SUV' },
  { id: '20000000-0000-0000-0000-000000000003', name: 'MPV' },
  { id: '20000000-0000-0000-0000-000000000004', name: 'Sedan' },
  { id: '20000000-0000-0000-0000-000000000005', name: 'Van' },
  { id: '20000000-0000-0000-0000-000000000006', name: 'Motorcycle' },
];

const LICENSE_RESTRICTION_OPTIONS = ['A', 'A1', 'B', 'B1', 'B2', 'C', 'D', 'BE'];
const MAINTENANCE_TYPE_OPTIONS = [
  'Oil Change',
  'Tire Rotation',
  'Brake Repair',
  'Engine Check',
  'General Service',
  'Fuel Filter Replacement',
  'Electrical Repair',
  'Fluid Check/Top-up',
  'Battery Replacement',
  'Scheduled Maintenance',
  'AC Repair',
  'Other Repair',
  'Air Filter Replacement',
  'Cabin Air Filter Replacement',
  'Brake Pad Replacement',
  'Brake Fluid Replacement',
  'Transmission Service',
  'Coolant Flush',
  'Wheel Alignment',
  'Wheel Balancing',
  'Spark Plug Replacement',
  'Suspension Inspection',
  'Steering System Inspection',
  'Drive Belt Replacement',
  'Timing Belt/Chain Service',
  'Clutch Service',
  'Injector Cleaning',
  'Preventive Maintenance Inspection',
  'Safety Inspection',
  'Diagnostic Scan',
];

function normalizeRestrictionSelection(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[,\s/]+/)
        .map((entry) => entry.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function getToastIconName(tone) {
  switch (tone) {
    case 'success':
      return 'check';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'close';
    default:
      return 'alerts';
  }
}

function createLoginForm(email = '') {
  return {
    email,
    password: '',
  };
}

function createPasswordForm() {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
}

function findBranchId(branches, branchName) {
  return branches.find((branch) => branch.name === branchName)?.id || '';
}

function buildBranchSelectOptions(branches, selectedBranchId, selectedBranchName = '') {
  if (!selectedBranchId || branches.some((branch) => branch.id === selectedBranchId)) {
    return branches;
  }

  return [
    ...branches,
    {
      id: selectedBranchId,
      name: selectedBranchName ? `${selectedBranchName} (inactive)` : 'Assigned branch (inactive)',
      isActive: false,
    },
  ];
}

function normalizeComparableText(value) {
  return String(value || '').trim().toLowerCase();
}

function toSortableTime(value) {
  const parsedTime = Date.parse(String(value || ''));
  return Number.isFinite(parsedTime) ? parsedTime : 0;
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

function normalizeCsvHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '_');
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((entry) => normalizeCsvHeader(entry));
  const dataRows = rows.slice(1);

  return dataRows
    .filter((entries) => entries.some((entry) => String(entry || '').trim() !== ''))
    .map((entries) =>
      headers.reduce((mapped, header, headerIndex) => {
        if (!header) {
          return mapped;
        }

        mapped[header] = String(entries[headerIndex] || '').trim();
        return mapped;
      }, {})
    );
}

function getCsvValue(row, keys) {
  for (const key of keys) {
    const value = String(row?.[key] || '').trim();

    if (value) {
      return value;
    }
  }

  return '';
}

function normalizeRoleLabel(value) {
  const normalized = normalizeComparableText(value).replace(/\s+/g, '_');

  switch (normalized) {
    case 'admin':
      return 'Admin';
    case 'approver':
      return 'Approver';
    case 'guard':
      return 'Guard';
    case 'pump_station':
    case 'pumpstation':
    case 'pump':
      return 'Pump Station';
    case 'driver':
      return 'Driver';
    case 'requester':
      return 'Requester';
    default:
      return '';
  }
}

function normalizeDriverStatus(value) {
  const normalized = normalizeComparableText(value).replace(/\s+/g, '_');

  if (['available', 'assigned', 'on_trip', 'inactive', 'leave'].includes(normalized)) {
    return normalized;
  }

  return 'available';
}

function normalizeVehicleStatus(value) {
  const normalized = normalizeComparableText(value).replace(/\s+/g, '_');

  if (['available', 'reserved', 'in_use', 'maintenance', 'inactive'].includes(normalized)) {
    return normalized;
  }

  return 'available';
}

function parseBooleanCsvValue(value, fallback = false) {
  const normalized = normalizeComparableText(value);

  if (!normalized) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'y'].includes(normalized);
}

function generateTemporaryPassword() {
  const randomSeed = Math.random().toString(36).slice(2, 10);
  return `Temp!${randomSeed}9A`;
}

function generateHiredDriverEmployeeId() {
  const timestampFragment = Date.now().toString().slice(-6);
  const randomFragment = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HIR-${timestampFragment}-${randomFragment}`;
}

function shouldSuppressLiveDataToast(message) {
  const normalizedMessage = String(message || '').toLowerCase();

  return (
    normalizedMessage.includes('live data took too long to load')
    || normalizedMessage.includes('your live profile took too long to load')
    || normalizedMessage.includes('session check took too long')
  );
}

function createUserSettingsForm(defaultBranchId = '') {
  return {
    id: '',
    name: '',
    email: '',
    initialEmail: '',
    role: 'Requester',
    branchId: defaultBranchId,
    branchName: '',
    password: '',
    confirmPassword: '',
  };
}

function createBranchSettingsForm() {
  return {
    id: '',
    code: '',
    name: '',
    address: '',
    serviceRegion: 'other',
    isActive: true,
  };
}

function createDriverSettingsForm(defaultBranchId = '') {
  return {
    id: '',
    profileId: '',
    fullName: '',
    employeeId: '',
    branchId: defaultBranchId,
    branchName: '',
    status: 'available',
    licenseNumber: '',
    licenseRestrictions: '',
    licenseExpiry: '2026-12-31',
    contactNumber: '',
  };
}

function createVehicleSettingsForm(defaultBranchId = '', defaultTypeId = '') {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: '',
    vehicleName: '',
    plateNumber: '',
    branchId: defaultBranchId,
    branchName: '',
    typeId: defaultTypeId,
    status: 'available',
    fuelType: '',
    seatingCapacity: '4',
    odometerCurrent: '0',
    oilChangeReminderEnabled: false,
    oilChangeIntervalKm: '5000',
    oilChangeIntervalMonths: '6',
    oilChangeLastOdometer: '0',
    oilChangeLastChangedOn: today,
    registrationExpiry: '2026-12-31',
    insuranceExpiry: '2026-12-31',
    fuelEfficiency: '10',
    isOdoDefective: false,
    requiredRestrictions: '',
  };
}

function createMaintenanceForm(defaultVehicleId = '', defaultBranchId = '') {
  return {
    id: '',
    vehicleId: defaultVehicleId,
    branchId: defaultBranchId,
    maintenanceType: '',
    scheduleDate: new Date().toISOString().slice(0, 10),
    completedDate: '',
    provider: '',
    amount: '0',
    status: 'Pending',
    remarks: '',
  };
}

function createRequestApprovalForm(request = null) {
  return {
    assignedDriverId: request?.assignedDriverId || '',
    fuelRequested: Boolean(request?.fuelRequested),
    fuelAmount: String(request?.fuelAmount ?? 0),
    fuelLiters: String(request?.fuelLiters ?? 0),
    estimatedKms: String(request?.estimatedKms ?? 0),
    fuelRemarks: request?.fuelRemarks || '',
    fuelProduct: request?.fuelProduct || 'diesel',
    fuelQuotePricePerLiter: request?.fuelQuotePricePerLiter ?? null,
    fuelQuoteSource: request?.fuelQuoteSource || '',
    fuelQuoteObservedAt: request?.fuelQuoteObservedAt || '',
    fuelQuoteLocation: request?.fuelQuoteLocation || '',
    fuelQuoteProvince: request?.fuelQuoteProvince || '',
    fuelQuoteMunicipality: request?.fuelQuoteMunicipality || '',
  };
}

function withTimeout(promise, message, timeoutMs = LIVE_BOOTSTRAP_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function readCachedSessionUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_CACHE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue?.id || !parsedValue?.email) {
      return null;
    }

    return parsedValue;
  } catch (_error) {
    return null;
  }
}

function writeCachedSessionUser(sessionUser) {
  if (typeof window === 'undefined' || !sessionUser?.id) {
    return;
  }

  try {
    window.localStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        branch: sessionUser.branch,
        branchId: sessionUser.branchId,
        serviceRegion: sessionUser.serviceRegion || 'other',
      })
    );
  } catch (_error) {
    // Ignore storage failures and keep runtime auth flow intact.
  }
}

function clearCachedSessionUser() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
  } catch (_error) {
    // Ignore storage failures and keep runtime auth flow intact.
  }
}

function readCachedSessionUserForId(authUserId) {
  const cachedUser = readCachedSessionUser();

  if (!cachedUser || cachedUser.id !== authUserId) {
    return null;
  }

  return cachedUser;
}

function App() {
  const initialCachedSessionUserRef = useRef(readCachedSessionUser());
  const initialCachedSessionUser = initialCachedSessionUserRef.current;
  const [currentSessionUser, setCurrentSessionUser] = useState(() => initialCachedSessionUser || EMPTY_SESSION_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(initialCachedSessionUser));
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(supabase && !initialCachedSessionUser));
  const [, setIsLiveDataLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [requestDetailsModalOpen, setRequestDetailsModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedReviewRequest, setSelectedReviewRequest] = useState(null);
  const [selectedAssignmentRequest, setSelectedAssignmentRequest] = useState(null);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [assignmentVehicleId, setAssignmentVehicleId] = useState('');
  const [requestApprovalForm, setRequestApprovalForm] = useState(() => createRequestApprovalForm());
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [vehicleBranchFilter, setVehicleBranchFilter] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileOverflowNavOpen, setMobileOverflowNavOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [topbarNotificationsOpen, setTopbarNotificationsOpen] = useState(false);
  const [tripDetailFocus, setTripDetailFocus] = useState(null);
  const [branchRecords, setBranchRecords] = useState([]);
  const [userRecords, setUserRecords] = useState([]);
  const [requestRecords, setRequestRecords] = useState([]);
  const [tripRecords, setTripRecords] = useState([]);
  const [vehicleRecords, setVehicleRecords] = useState([]);
  const [vehicleTypeRecords, setVehicleTypeRecords] = useState([]);
  const [driverRecords, setDriverRecords] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [incidentRecords, setIncidentRecords] = useState([]);
  const [notificationFeed, setNotificationFeed] = useState([]);
  const [auditRecords, setAuditRecords] = useState([]);
  const [panayFuelPricing, setPanayFuelPricing] = useState(EMPTY_PANAY_FUEL_PRICING);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [loginForm, setLoginForm] = useState(createLoginForm);
  const [passwordForm, setPasswordForm] = useState(createPasswordForm);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [userSettingsModalOpen, setUserSettingsModalOpen] = useState(false);
  const [branchSettingsModalOpen, setBranchSettingsModalOpen] = useState(false);
  const [driverSettingsModalOpen, setDriverSettingsModalOpen] = useState(false);
  const [vehicleSettingsModalOpen, setVehicleSettingsModalOpen] = useState(false);
  const [branchSettingsForm, setBranchSettingsForm] = useState(() => createBranchSettingsForm());
  const [userSettingsForm, setUserSettingsForm] = useState(() => createUserSettingsForm());
  const [driverSettingsForm, setDriverSettingsForm] = useState(() => createDriverSettingsForm());
  const [vehicleSettingsForm, setVehicleSettingsForm] = useState(() => createVehicleSettingsForm());
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState(() => createMaintenanceForm());
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState(() => createIncidentForm());
  const [loginError, setLoginError] = useState('');
  const [liveDataError, setLiveDataError] = useState('');
  const [requestForm, setRequestForm] = useState(createRequestForm);
  const [checkoutForm, setCheckoutForm] = useState(() => pickCheckoutDefaults([], [], READY_FOR_CHECKOUT));
  const [checkinForm, setCheckinForm] = useState(() => pickCheckinDefaults([], ACTIVE_TRIP_STATUSES));
  const [settingsImportProgress, setSettingsImportProgress] = useState({
    scope: '',
    label: '',
    processed: 0,
    total: 0,
    isActive: false,
  });
  const [toast, setToast] = useState(null);
  const cachedSessionUserRef = useRef(initialCachedSessionUser);
  const pushSubscriptionSyncRef = useRef({ userId: '', promise: null });
  const topbarNotificationsRef = useRef(null);
  const isSigningOutRef = useRef(false);
  const expectedSessionUserIdRef = useRef('');
  const sessionHydrationRef = useRef({ userId: '', promise: null });
  const liveDataRefreshRef = useRef({ userId: '', promise: null });
  const normalizedRole = String(currentSessionUser.role || '').toLowerCase().replace(/\s+/g, '_');
  const operationsDay = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const userMode = normalizedRole === 'admin'
    ? 'admin'
    : normalizedRole === 'approver'
      ? 'approver'
      : normalizedRole === 'guard'
        ? 'guard'
      : normalizedRole === 'pump_station'
        ? 'pump_station'
      : normalizedRole === 'driver'
        ? 'driver'
      : 'requester';
  const canManageVehicleSettings = userMode === 'admin' || userMode === 'approver';
  const canManageDriverSettings = userMode === 'admin' || userMode === 'approver';
  const approverManagedBranchId = useMemo(() => {
    if (userMode !== 'approver') {
      return '';
    }

    if (currentSessionUser.branchId) {
      return currentSessionUser.branchId;
    }

    return branchRecords.find(
      (branch) => normalizeComparableText(branch.name) === normalizeComparableText(currentSessionUser.branch)
    )?.id || '';
  }, [branchRecords, currentSessionUser.branch, currentSessionUser.branchId, userMode]);
  const isVehicleInApproverScope = useCallback((vehicle) => {
    if (!vehicle) {
      return false;
    }

    if (userMode !== 'approver') {
      return true;
    }

    if (approverManagedBranchId && vehicle.branchId) {
      return vehicle.branchId === approverManagedBranchId;
    }

    return normalizeComparableText(vehicle.branch) === normalizeComparableText(currentSessionUser.branch);
  }, [approverManagedBranchId, currentSessionUser.branch, userMode]);
  const isDriverInApproverScope = useCallback((driver) => {
    if (!driver) {
      return false;
    }

    if (userMode !== 'approver') {
      return true;
    }

    if (approverManagedBranchId && driver.branchId) {
      return String(driver.branchId) === String(approverManagedBranchId);
    }

    return normalizeComparableText(driver.branch) === normalizeComparableText(currentSessionUser.branch);
  }, [approverManagedBranchId, currentSessionUser.branch, userMode]);

  const currentDriverRecord = useMemo(() => {
    const sessionUserId = currentSessionUser.id;
    const sessionEmail = normalizeComparableText(currentSessionUser.email);
    const sessionName = normalizeComparableText(currentSessionUser.name);

    return (
      driverRecords.find((driver) => driver.profileId && driver.profileId === sessionUserId)
      || driverRecords.find((driver) => normalizeComparableText(driver.linkedAccountEmail) === sessionEmail)
      || driverRecords.find((driver) => normalizeComparableText(driver.fullName) === sessionName)
      || null
    );
  }, [currentSessionUser.email, currentSessionUser.id, currentSessionUser.name, driverRecords]);

  const isDriverNameMatch = useCallback((value) => {
    const normalizedValue = normalizeComparableText(value);

    if (!normalizedValue) {
      return false;
    }

    return [
      currentSessionUser.name,
      currentDriverRecord?.fullName,
    ].some((candidate) => normalizeComparableText(candidate) === normalizedValue);
  }, [currentDriverRecord?.fullName, currentSessionUser.name]);

  const isRequestAssignedToCurrentDriver = useCallback((request) => {
    if (currentDriverRecord?.id && request.assignedDriverId === currentDriverRecord.id) {
      return true;
    }

    return isDriverNameMatch(request.assignedDriver);
  }, [currentDriverRecord?.id, isDriverNameMatch]);

  const isTripAssignedToCurrentDriver = useCallback((trip) => {
    if (currentDriverRecord?.id && trip.driverId === currentDriverRecord.id) {
      return true;
    }

    return isDriverNameMatch(trip.driver);
  }, [currentDriverRecord?.id, isDriverNameMatch]);

  const getVisibleTripRecords = useCallback((records) => {
    const scopedRecords = userMode === 'driver'
      ? records.filter(isTripAssignedToCurrentDriver)
      : [...records];

    return scopedRecords.sort((left, right) => {
      const byLatestActivity = sortByLatestDate(left, right, getLatestActivityTimestamp);

      if (byLatestActivity !== 0) {
        return byLatestActivity;
      }

      const byRequestNo = String(right.requestNo || '').localeCompare(String(left.requestNo || ''));

      if (byRequestNo !== 0) {
        return byRequestNo;
      }

      return String(right.id || '').localeCompare(String(left.id || ''));
    });
  }, [isTripAssignedToCurrentDriver, userMode]);

  useEffect(() => {
    if (!vehicleRecords.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicleRecords[0]?.id || '');
    }
  }, [selectedVehicleId, vehicleRecords]);

  useEffect(() => {
    const visibleTrips = getVisibleTripRecords(tripRecords);
    const selectedTripStillReady = visibleTrips.some(
      (trip) => trip.id === checkoutForm.tripId && READY_FOR_CHECKOUT.includes(trip.tripStatus)
    );

    if (!selectedTripStillReady) {
      setCheckoutForm(pickCheckoutDefaults(visibleTrips, vehicleRecords, READY_FOR_CHECKOUT));
    }
  }, [checkoutForm.tripId, getVisibleTripRecords, tripRecords, vehicleRecords]);

  useEffect(() => {
    const visibleTrips = getVisibleTripRecords(tripRecords);
    const selectedTripStillActive = visibleTrips.some(
      (trip) => trip.id === checkinForm.tripId && ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)
    );

    if (!selectedTripStillActive) {
      setCheckinForm(pickCheckinDefaults(visibleTrips, ACTIVE_TRIP_STATUSES));
    }
  }, [checkinForm.tripId, getVisibleTripRecords, tripRecords]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, TOAST_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!topbarNotificationsOpen || typeof window === 'undefined') {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!topbarNotificationsRef.current) {
        return;
      }

      if (!topbarNotificationsRef.current.contains(event.target)) {
        setTopbarNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setTopbarNotificationsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [topbarNotificationsOpen]);

  const applySessionUser = useCallback((liveUser) => {
    const normalizedSessionUser = {
      ...liveUser,
      serviceRegion: liveUser?.serviceRegion || 'other',
    };

    expectedSessionUserIdRef.current = normalizedSessionUser.id;
    cachedSessionUserRef.current = normalizedSessionUser;
    writeCachedSessionUser(normalizedSessionUser);
    setCurrentSessionUser(normalizedSessionUser);
    setLoginForm({
      email: normalizedSessionUser.email,
      password: '',
    });
    setIsPasswordVisible(false);
    setIsAuthenticated(true);
    setLiveDataError('');
  }, []);

  const clearAppData = useCallback(() => {
    setBranchRecords([]);
    setUserRecords([]);
    setRequestRecords([]);
    setTripRecords([]);
    setVehicleRecords([]);
    setVehicleTypeRecords([]);
    setDriverRecords([]);
    setMaintenanceRecords([]);
    setIncidentRecords([]);
    setNotificationFeed([]);
    setAuditRecords([]);
    setPanayFuelPricing(EMPTY_PANAY_FUEL_PRICING);
  }, []);

  const refreshLiveData = useCallback(async (sessionUser) => {
    if (!supabase || !sessionUser?.id) {
      return;
    }

    if (
      liveDataRefreshRef.current.userId === sessionUser.id
      && liveDataRefreshRef.current.promise
    ) {
      return liveDataRefreshRef.current.promise;
    }

    setIsLiveDataLoading(true);

    const refreshPromise = withTimeout(
      fetchLiveAppData(supabase),
      'Live data took too long to load. Refresh the page and try again.'
    )
      .then((liveData) => {
        if (expectedSessionUserIdRef.current !== sessionUser.id) {
          return liveData;
        }

        const authoritativeSessionUser = liveData.userRecords.find((user) => user.id === sessionUser.id);

        if (authoritativeSessionUser) {
          const nextSessionUser = {
            id: authoritativeSessionUser.id,
            name: authoritativeSessionUser.name,
            email: authoritativeSessionUser.email,
            role: authoritativeSessionUser.role,
            branch: authoritativeSessionUser.branch,
            branchId: authoritativeSessionUser.branchId,
            serviceRegion: authoritativeSessionUser.serviceRegion || 'other',
          };
          const roleChanged = nextSessionUser.role !== sessionUser.role;
          const branchChanged = nextSessionUser.branchId !== sessionUser.branchId;
          const serviceRegionChanged = nextSessionUser.serviceRegion !== (sessionUser.serviceRegion || 'other');
          const nameChanged = nextSessionUser.name !== sessionUser.name;

          if (roleChanged || branchChanged || serviceRegionChanged || nameChanged) {
            applySessionUser(nextSessionUser);
          }
        }

        setBranchRecords(liveData.branches);
        setUserRecords(liveData.userRecords);
        setRequestRecords(liveData.requestRecords);
        setTripRecords(liveData.tripRecords);
        setVehicleRecords(liveData.vehicleRecords);
        setVehicleTypeRecords(liveData.vehicleTypeRecords);
        setDriverRecords(liveData.driverRecords);
        setMaintenanceRecords(liveData.maintenanceRecords);
        setIncidentRecords(liveData.incidentRecords);
        setNotificationFeed(liveData.notificationFeed);
        setAuditRecords(liveData.auditRecords || []);
        setPanayFuelPricing(liveData.panayFuelPricing || EMPTY_PANAY_FUEL_PRICING);
        setLiveDataError('');
        return liveData;
      })
      .catch((error) => {
        if (expectedSessionUserIdRef.current === sessionUser.id) {
          setLiveDataError(error.message || 'Unable to load live vehicle management data.');
        }

        throw error;
      })
      .finally(() => {
        if (liveDataRefreshRef.current.promise === refreshPromise) {
          liveDataRefreshRef.current = { userId: '', promise: null };
        }

        setIsLiveDataLoading(false);
      });

    liveDataRefreshRef.current = {
      userId: sessionUser.id,
      promise: refreshPromise,
    };

    return refreshPromise;
  }, [applySessionUser]);

  const tryRestoreCachedSessionUser = useCallback((authUserId) => {
    if (isSigningOutRef.current) {
      return null;
    }

    const cachedUser = readCachedSessionUserForId(authUserId) || (
      cachedSessionUserRef.current?.id === authUserId ? cachedSessionUserRef.current : null
    );

    if (!cachedUser) {
      return null;
    }

    applySessionUser(cachedUser);
    void refreshLiveData(cachedUser).catch(() => {});
    setLiveDataError('Using your last known branch profile while live profile sync retries.');
    return cachedUser;
  }, [applySessionUser, refreshLiveData]);

  const hydrateAuthenticatedSession = useCallback(async (authUserId) => {
    if (!supabase || !authUserId) {
      return null;
    }

    if (
      sessionHydrationRef.current.userId === authUserId
      && sessionHydrationRef.current.promise
    ) {
      return sessionHydrationRef.current.promise;
    }

    const hydrationPromise = withTimeout(
      fetchLiveSessionUser(supabase, authUserId),
      'Your live profile took too long to load. Sign in again and retry.',
      SESSION_PROFILE_TIMEOUT_MS
    )
      .then((liveUser) => {
        if (expectedSessionUserIdRef.current !== authUserId) {
          return null;
        }

        applySessionUser(liveUser);
        void refreshLiveData(liveUser).catch(() => {});
        return liveUser;
      })
      .finally(() => {
        if (sessionHydrationRef.current.promise === hydrationPromise) {
          sessionHydrationRef.current = { userId: '', promise: null };
        }
      });

    sessionHydrationRef.current = {
      userId: authUserId,
      promise: hydrationPromise,
    };

    return hydrationPromise;
  }, [applySessionUser, refreshLiveData]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;

    async function bootstrapSession() {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          'Session check took too long. Refresh the page or sign in again.'
        );

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        if (data.session?.user) {
          expectedSessionUserIdRef.current = data.session.user.id;
          try {
            await hydrateAuthenticatedSession(data.session.user.id);
          } catch (error) {
            if (!tryRestoreCachedSessionUser(data.session.user.id)) {
              throw error;
            }
          }
        } else {
          expectedSessionUserIdRef.current = '';
          setCurrentSessionUser(EMPTY_SESSION_USER);
          setIsAuthenticated(false);
          clearAppData();
        }
      } catch (error) {
        if (isMounted) {
          setCurrentSessionUser(EMPTY_SESSION_USER);
          setIsAuthenticated(false);
          clearAppData();
          setLiveDataError(error.message || 'Unable to connect to Supabase.');
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrapSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      if (isSigningOutRef.current) {
        if (!session?.user) {
          expectedSessionUserIdRef.current = '';
          setCurrentSessionUser(EMPTY_SESSION_USER);
          setIsAuthenticated(false);
          clearAppData();
          setIsLiveDataLoading(false);
          isSigningOutRef.current = false;
        }

        return;
      }

      if (session?.user) {
        try {
          expectedSessionUserIdRef.current = session.user.id;
          await hydrateAuthenticatedSession(session.user.id);
        } catch (error) {
          if (!tryRestoreCachedSessionUser(session.user.id)) {
            expectedSessionUserIdRef.current = '';
            setCurrentSessionUser(EMPTY_SESSION_USER);
            setIsAuthenticated(false);
            clearAppData();
            setLiveDataError(error.message || 'Unable to load your live profile.');
          }
        }
      } else {
        expectedSessionUserIdRef.current = '';
        setCurrentSessionUser(EMPTY_SESSION_USER);
        setIsAuthenticated(false);
        clearAppData();
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [clearAppData, hydrateAuthenticatedSession, tryRestoreCachedSessionUser]);

  useEffect(() => {
    if (!supabase || !isAuthenticated || !currentSessionUser.id) {
      return undefined;
    }

    if (!WEB_PUSH_PUBLIC_KEY || !isWebPushSupported()) {
      return undefined;
    }

    if (
      pushSubscriptionSyncRef.current.userId === currentSessionUser.id
      && pushSubscriptionSyncRef.current.promise
    ) {
      return undefined;
    }

    let isCancelled = false;

    const syncPromise = (async () => {
      const result = await ensureWebPushSubscription(WEB_PUSH_PUBLIC_KEY);

      if (isCancelled || result.status !== 'subscribed' || !result.subscription) {
        return;
      }

      await saveLiveWebPushSubscription(supabase, result.subscription, navigator.userAgent || '');
    })()
      .catch(() => {
        // Keep push registration best-effort without blocking workspace load.
      })
      .finally(() => {
        if (pushSubscriptionSyncRef.current.promise === syncPromise) {
          pushSubscriptionSyncRef.current = { userId: '', promise: null };
        }
      });

    pushSubscriptionSyncRef.current = {
      userId: currentSessionUser.id,
      promise: syncPromise,
    };

    return () => {
      isCancelled = true;
    };
  }, [currentSessionUser.id, isAuthenticated]);

  const visibleRequestRecords = useMemo(() => {
    if (userMode === 'admin') {
      return requestRecords;
    }

    if (userMode === 'approver' || userMode === 'guard' || userMode === 'pump_station') {
      return requestRecords.filter((request) => request.branch === currentSessionUser.branch);
    }

    if (userMode === 'driver') {
      const driverRequests = requestRecords.filter((request) =>
        isRequestAssignedToCurrentDriver(request)
        || request.requestedBy === currentSessionUser.name
      );

      return Array.from(
        new Map(driverRequests.map((request) => [request.id, request])).values()
      );
    }

    return requestRecords.filter((request) => request.requestedBy === currentSessionUser.name);
  }, [
    currentSessionUser.branch,
    currentSessionUser.name,
    isRequestAssignedToCurrentDriver,
    requestRecords,
    userMode,
  ]);

  const visibleTripRecords = useMemo(
    () => getVisibleTripRecords(tripRecords),
    [getVisibleTripRecords, tripRecords]
  );

  const filteredRequests = useMemo(() => {
    function getRequestSortValue(request) {
      const createdTime = Date.parse(request.createdAt || '');

      if (Number.isFinite(createdTime)) {
        return createdTime;
      }

      const departureTime = Date.parse(request.departureDatetime || '');

      if (Number.isFinite(departureTime)) {
        return departureTime;
      }

      const requestNoMatch = String(request.requestNo || '').match(/^VR-(\d{4})-(\d{4})-(\d+)$/);

      if (requestNoMatch) {
        return Number(`${requestNoMatch[1]}${requestNoMatch[2]}${requestNoMatch[3]}`);
      }

      return 0;
    }

    return visibleRequestRecords
      .filter((request) => {
        const haystack = [
          request.requestNo,
          request.requestedBy,
          request.branch,
          request.purpose,
          request.destination,
          Array.isArray(request.passengerNames) ? request.passengerNames.join(' ') : '',
          request.status,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(requestSearch.toLowerCase());
      })
      .sort((left, right) => {
        const sortDifference = getRequestSortValue(right) - getRequestSortValue(left);

        if (sortDifference !== 0) {
          return sortDifference;
        }

        return String(right.requestNo || '').localeCompare(String(left.requestNo || ''));
      });
  }, [requestSearch, visibleRequestRecords]);
  const branchScopedRequestRecords = useMemo(() => {
    if (userMode === 'admin') {
      return requestRecords;
    }

    if (currentSessionUser.branchId) {
      return requestRecords.filter((request) => String(request.branchId || '') === String(currentSessionUser.branchId));
    }

    const currentBranchName = normalizeComparableText(currentSessionUser.branch);
    return requestRecords.filter((request) => normalizeComparableText(request.branch) === currentBranchName);
  }, [currentSessionUser.branch, currentSessionUser.branchId, requestRecords, userMode]);
  const branchScopedRequestStatusSummary = useMemo(
    () => ({
      total: branchScopedRequestRecords.length,
      pendingApproval: branchScopedRequestRecords.filter((request) => request.status === 'Pending Approval').length,
      approved: branchScopedRequestRecords.filter((request) => request.status === 'Approved').length,
      readyForRelease: branchScopedRequestRecords.filter((request) => request.status === 'Ready for Release').length,
      checkedOut: branchScopedRequestRecords.filter((request) => request.status === 'Checked Out').length,
      returned: branchScopedRequestRecords.filter((request) => COMPLETED_REQUEST_STATUSES.includes(request.status)).length,
    }),
    [branchScopedRequestRecords]
  );

  const fleetVehicleBranchOptions = useMemo(() => {
    const branchNames = new Set();

    branchRecords.forEach((branch) => {
      const branchName = String(branch?.name || '').trim();
      if (branchName) {
        branchNames.add(branchName);
      }
    });

    vehicleRecords.forEach((vehicle) => {
      const branchName = String(vehicle?.branch || '').trim();
      if (branchName) {
        branchNames.add(branchName);
      }
    });

    return Array.from(branchNames).sort((left, right) => left.localeCompare(right));
  }, [branchRecords, vehicleRecords]);
  const filteredVehicles = useMemo(() => {
    let records = vehicleRecords;

    if (vehicleFilter !== 'all') {
      records = records.filter((vehicle) => vehicle.status === vehicleFilter);
    }

    if (vehicleBranchFilter) {
      const normalizedSelectedBranch = normalizeComparableText(vehicleBranchFilter);
      records = records.filter((vehicle) => normalizeComparableText(vehicle.branch) === normalizedSelectedBranch);
    }

    return records;
  }, [vehicleBranchFilter, vehicleFilter, vehicleRecords]);
  const branchScopedTripRecords = useMemo(() => {
    if (userMode === 'admin') {
      return tripRecords;
    }

    if (currentSessionUser.branchId) {
      return tripRecords.filter((trip) => String(trip.branchId || '') === String(currentSessionUser.branchId));
    }

    const currentBranchName = normalizeComparableText(currentSessionUser.branch);
    return tripRecords.filter((trip) => normalizeComparableText(trip.branch) === currentBranchName);
  }, [currentSessionUser.branch, currentSessionUser.branchId, tripRecords, userMode]);
  const calendarTripRecords = useMemo(
    () => (userMode === 'driver' ? branchScopedTripRecords : visibleTripRecords),
    [branchScopedTripRecords, userMode, visibleTripRecords]
  );
  const tripsPageTripRecords = useMemo(
    () => (userMode === 'driver' ? branchScopedTripRecords : visibleTripRecords),
    [branchScopedTripRecords, userMode, visibleTripRecords]
  );
  const settingsVehicleRecords = useMemo(() => {
    if (userMode !== 'approver') {
      return vehicleRecords;
    }

    return vehicleRecords.filter((vehicle) => isVehicleInApproverScope(vehicle));
  }, [isVehicleInApproverScope, userMode, vehicleRecords]);
  const settingsDriverRecords = useMemo(() => {
    if (userMode !== 'approver') {
      return driverRecords;
    }

    return driverRecords.filter((driver) => isDriverInApproverScope(driver));
  }, [driverRecords, isDriverInApproverScope, userMode]);
  const settingsUserRecords = useMemo(() => {
    if (userMode !== 'approver') {
      return userRecords;
    }

    return userRecords.filter((user) => {
      if (approverManagedBranchId && user.branchId) {
        return String(user.branchId) === String(approverManagedBranchId);
      }

      return normalizeComparableText(user.branch) === normalizeComparableText(currentSessionUser.branch);
    });
  }, [approverManagedBranchId, currentSessionUser.branch, userMode, userRecords]);

  const unavailableDriverIds = useMemo(() => {
    const ids = new Set();

    requestRecords.forEach((request) => {
      if (
        request.assignedDriverId
        && !['Returned', 'Rejected', 'Closed'].includes(String(request.status || ''))
      ) {
        ids.add(request.assignedDriverId);
      }
    });

    tripRecords.forEach((trip) => {
      if (
        trip.driverId
        && [...READY_FOR_CHECKOUT, ...ACTIVE_TRIP_STATUSES].includes(String(trip.tripStatus || ''))
      ) {
        ids.add(trip.driverId);
      }
    });

    return ids;
  }, [requestRecords, tripRecords]);

  const unavailableVehicleIds = useMemo(() => {
    const ids = new Set();

    requestRecords.forEach((request) => {
      if (
        request.assignedVehicleId
        && !['Returned', 'Rejected', 'Closed'].includes(String(request.status || ''))
      ) {
        ids.add(request.assignedVehicleId);
      }
    });

    tripRecords.forEach((trip) => {
      if (
        trip.vehicleId
        && [...READY_FOR_CHECKOUT, ...ACTIVE_TRIP_STATUSES].includes(String(trip.tripStatus || ''))
      ) {
        ids.add(trip.vehicleId);
      }
    });

    return ids;
  }, [requestRecords, tripRecords]);

  const requestDriverOptions = useMemo(
    () =>
      driverRecords.filter(
        (driver) =>
          driver.branch === currentSessionUser.branch
          && String(driver.status).toLowerCase() === 'available'
          && !unavailableDriverIds.has(driver.id)
      ),
    [currentSessionUser.branch, driverRecords, unavailableDriverIds]
  );

  const requestVehicleOptions = useMemo(
    () =>
      vehicleRecords.filter(
        (vehicle) =>
          vehicle.branch === currentSessionUser.branch
          && vehicle.status === 'available'
          && !unavailableVehicleIds.has(vehicle.id)
      ),
    [currentSessionUser.branch, unavailableVehicleIds, vehicleRecords]
  );

  const assignmentVehicleOptions = useMemo(() => {
    if (!selectedAssignmentRequest) {
      return [];
    }

    return vehicleRecords.filter(
      (vehicle) =>
        vehicle.branch === selectedAssignmentRequest.branch
        && (
          (vehicle.status === 'available' && !unavailableVehicleIds.has(vehicle.id))
          || vehicle.id === selectedAssignmentRequest.assignedVehicleId
      )
    );
  }, [selectedAssignmentRequest, unavailableVehicleIds, vehicleRecords]);

  const requestApprovalDriverOptions = useMemo(() => {
    if (!selectedRequestDetails) {
      return [];
    }

    return driverRecords.filter(
      (driver) =>
        driver.branch === selectedRequestDetails.branch
        && (
          (
            String(driver.status).toLowerCase() === 'available'
            && !unavailableDriverIds.has(driver.id)
          )
          || driver.id === selectedRequestDetails.assignedDriverId
        )
    );
  }, [driverRecords, selectedRequestDetails, unavailableDriverIds]);

  useEffect(() => {
    if (
      requestForm.assignedDriverId
      && requestForm.assignedDriverId !== REQUEST_HIRED_DRIVER_OPTION_VALUE
      && !requestDriverOptions.some((driver) => driver.id === requestForm.assignedDriverId)
    ) {
      setRequestForm((current) => ({
        ...current,
        assignedDriverId: '',
      }));
    }
  }, [requestDriverOptions, requestForm.assignedDriverId]);

  useEffect(() => {
    if (
      requestForm.assignedVehicleId
      && !requestVehicleOptions.some((vehicle) => vehicle.id === requestForm.assignedVehicleId)
    ) {
      setRequestForm((current) => ({
        ...current,
        assignedVehicleId: '',
      }));
    }
  }, [requestForm.assignedVehicleId, requestVehicleOptions]);

  const branchOptions = useMemo(
    () => branchRecords.map((branch) => ({ id: branch.id, name: branch.name, isActive: branch.isActive })),
    [branchRecords]
  );
  const availableVehicleTypeRecords = useMemo(() => {
    const sourceRecords = vehicleTypeRecords.length ? vehicleTypeRecords : [];
    const mergedRecords = sourceRecords.length ? sourceRecords : DEFAULT_VEHICLE_TYPE_RECORDS;
    const seenNames = new Set();

    return mergedRecords.filter((type) => {
      const normalizedName = normalizeComparableText(type?.name);

      if (!normalizedName || seenNames.has(normalizedName)) {
        return false;
      }

      seenNames.add(normalizedName);
      return true;
    });
  }, [vehicleTypeRecords]);
  const selectedDriverRestrictionCodes = useMemo(
    () => normalizeRestrictionSelection(driverSettingsForm.licenseRestrictions),
    [driverSettingsForm.licenseRestrictions]
  );
  const selectedVehicleRestrictionCodes = useMemo(
    () => normalizeRestrictionSelection(vehicleSettingsForm.requiredRestrictions),
    [vehicleSettingsForm.requiredRestrictions]
  );
  const userBranchOptions = useMemo(
    () => buildBranchSelectOptions(branchOptions, userSettingsForm.branchId, userSettingsForm.branchName),
    [branchOptions, userSettingsForm.branchId, userSettingsForm.branchName]
  );
  const driverBranchScopeOptions = useMemo(() => {
    if (userMode !== 'approver') {
      return branchOptions;
    }

    const scopedBranches = branchOptions.filter((branch) => (
      approverManagedBranchId
        ? branch.id === approverManagedBranchId
        : normalizeComparableText(branch.name) === normalizeComparableText(currentSessionUser.branch)
    ));

    return scopedBranches.length ? scopedBranches : branchOptions;
  }, [approverManagedBranchId, branchOptions, currentSessionUser.branch, userMode]);
  const driverBranchOptions = useMemo(
    () => buildBranchSelectOptions(driverBranchScopeOptions, driverSettingsForm.branchId, driverSettingsForm.branchName),
    [driverBranchScopeOptions, driverSettingsForm.branchId, driverSettingsForm.branchName]
  );
  const driverLinkedProfileIds = useMemo(
    () => new Set(driverRecords.map((driver) => driver.profileId).filter(Boolean)),
    [driverRecords]
  );
  const driverAccountOptions = useMemo(
    () =>
      userRecords
        .filter((user) => {
          if (!user.id) {
            return false;
          }

          if (user.id === driverSettingsForm.profileId) {
            return true;
          }

          if (driverLinkedProfileIds.has(user.id)) {
            return false;
          }

          if (driverSettingsForm.branchId && user.branchId && user.branchId !== driverSettingsForm.branchId) {
            return false;
          }

          return true;
        })
        .sort((left, right) => left.name.localeCompare(right.name)),
    [driverLinkedProfileIds, driverSettingsForm.branchId, driverSettingsForm.profileId, userRecords]
  );
  const vehicleBranchScopeOptions = useMemo(() => {
    if (userMode !== 'approver') {
      return branchOptions;
    }

    const scopedBranches = branchOptions.filter((branch) => (
      approverManagedBranchId
        ? branch.id === approverManagedBranchId
        : normalizeComparableText(branch.name) === normalizeComparableText(currentSessionUser.branch)
    ));

    return scopedBranches.length ? scopedBranches : branchOptions;
  }, [approverManagedBranchId, branchOptions, currentSessionUser.branch, userMode]);
  const vehicleBranchOptions = useMemo(
    () => buildBranchSelectOptions(vehicleBranchScopeOptions, vehicleSettingsForm.branchId, vehicleSettingsForm.branchName),
    [vehicleBranchScopeOptions, vehicleSettingsForm.branchId, vehicleSettingsForm.branchName]
  );
  const selectedRequestApprovalVehicle = useMemo(
    () => vehicleRecords.find((vehicle) => vehicle.id === selectedRequestDetails?.assignedVehicleId) || null,
    [selectedRequestDetails?.assignedVehicleId, vehicleRecords]
  );
  const selectedRequestVehicle = useMemo(
    () => vehicleRecords.find((vehicle) => vehicle.id === requestForm.assignedVehicleId) || null,
    [requestForm.assignedVehicleId, vehicleRecords]
  );

  useEffect(() => {
    setRequestForm((current) => {
      const efficiency = Number(selectedRequestVehicle?.fuelEfficiency || 10);
      const liters = Number(current.fuelLiters || 0);
      const nextEstimatedKms = String(liters * efficiency);
      let changed = false;
      const nextForm = { ...current };

      if (current.estimatedKms !== nextEstimatedKms) {
        nextForm.estimatedKms = nextEstimatedKms;
        changed = true;
      }

      if (current.fuelQuotePricePerLiter !== null) {
        nextForm.fuelQuotePricePerLiter = null;
        changed = true;
      }
      if (current.fuelQuoteSource) {
        nextForm.fuelQuoteSource = '';
        changed = true;
      }
      if (current.fuelQuoteObservedAt) {
        nextForm.fuelQuoteObservedAt = '';
        changed = true;
      }
      if (current.fuelQuoteLocation) {
        nextForm.fuelQuoteLocation = '';
        changed = true;
      }

      return changed ? nextForm : current;
    });
  }, [
    requestForm.fuelLiters,
    selectedRequestVehicle?.fuelEfficiency,
  ]);

  const requestStatusSummary = useMemo(
    () => ({
      total: requestRecords.length,
      pendingApproval: requestRecords.filter((request) => request.status === 'Pending Approval').length,
      approved: requestRecords.filter((request) => request.status === 'Approved').length,
      checkedOut: requestRecords.filter((request) => request.status === 'Checked Out').length,
      returned: requestRecords.filter((request) => COMPLETED_REQUEST_STATUSES.includes(request.status)).length,
    }),
    [requestRecords]
  );

  const visibleRequestStatusSummary = useMemo(
    () => ({
      total: visibleRequestRecords.length,
      pendingApproval: visibleRequestRecords.filter((request) => request.status === 'Pending Approval').length,
      approved: visibleRequestRecords.filter((request) => request.status === 'Approved').length,
      readyForRelease: visibleRequestRecords.filter((request) => request.status === 'Ready for Release').length,
      checkedOut: visibleRequestRecords.filter((request) => request.status === 'Checked Out').length,
      returned: visibleRequestRecords.filter((request) => COMPLETED_REQUEST_STATUSES.includes(request.status)).length,
    }),
    [visibleRequestRecords]
  );

  const tripStatusSummary = useMemo(
    () => ({
      total: visibleTripRecords.length,
      readyForRelease: visibleTripRecords.filter((trip) => READY_FOR_CHECKOUT.includes(trip.tripStatus)).length,
      active: visibleTripRecords.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)).length,
      overdue: visibleTripRecords.filter((trip) => trip.tripStatus === 'Overdue').length,
      returned: visibleTripRecords.filter((trip) => COMPLETED_TRIP_STATUSES.includes(trip.tripStatus)).length,
      scheduledToday: visibleTripRecords.filter((trip) =>
        isSameCalendarDay(trip.dateOut || trip.expectedReturn, operationsDay)
      ).length,
    }),
    [operationsDay, visibleTripRecords]
  );
  const calendarTripStatusSummary = useMemo(
    () => ({
      total: calendarTripRecords.length,
      readyForRelease: calendarTripRecords.filter((trip) => READY_FOR_CHECKOUT.includes(trip.tripStatus)).length,
      active: calendarTripRecords.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)).length,
      overdue: calendarTripRecords.filter((trip) => trip.tripStatus === 'Overdue').length,
      returned: calendarTripRecords.filter((trip) => COMPLETED_TRIP_STATUSES.includes(trip.tripStatus)).length,
      scheduledToday: calendarTripRecords.filter((trip) =>
        isSameCalendarDay(trip.dateOut || trip.expectedReturn, operationsDay)
      ).length,
    }),
    [calendarTripRecords, operationsDay]
  );
  const tripsPageTripStatusSummary = useMemo(
    () => ({
      total: tripsPageTripRecords.length,
      readyForRelease: tripsPageTripRecords.filter((trip) => READY_FOR_CHECKOUT.includes(trip.tripStatus)).length,
      active: tripsPageTripRecords.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)).length,
      overdue: tripsPageTripRecords.filter((trip) => trip.tripStatus === 'Overdue').length,
      returned: tripsPageTripRecords.filter((trip) => COMPLETED_TRIP_STATUSES.includes(trip.tripStatus)).length,
      scheduledToday: tripsPageTripRecords.filter((trip) =>
        isSameCalendarDay(trip.dateOut || trip.expectedReturn, operationsDay)
      ).length,
    }),
    [operationsDay, tripsPageTripRecords]
  );

  const fleetSummary = useMemo(
    () => ({
      total: vehicleRecords.length,
      available: vehicleRecords.filter((vehicle) => vehicle.status === 'available').length,
      inUse: vehicleRecords.filter((vehicle) => vehicle.status === 'in_use').length,
      maintenance: vehicleRecords.filter((vehicle) => vehicle.status === 'maintenance').length,
      attention: vehicleRecords.filter(
        (vehicle) =>
          daysUntil(vehicle.insuranceExpiry) <= 30 || daysUntil(vehicle.registrationExpiry) <= 30
      ).length,
    }),
    [vehicleRecords]
  );

  const complianceSummary = useMemo(
    () => ({
      pendingMaintenance: maintenanceRecords.filter((entry) => entry.status === 'Pending').length,
      insuranceWatch: vehicleRecords.filter((vehicle) => daysUntil(vehicle.insuranceExpiry) <= 30).length,
      registrationWatch: vehicleRecords.filter((vehicle) => daysUntil(vehicle.registrationExpiry) <= 30).length,
    }),
    [maintenanceRecords, vehicleRecords]
  );

  const myRequestRecords = useMemo(
    () => requestRecords.filter((request) => request.requestedBy === currentSessionUser.name),
    [currentSessionUser.name, requestRecords]
  );
  const branchAdminApprover = useMemo(() => {
    const normalizedCurrentBranchName = normalizeComparableText(currentSessionUser.branch);
    const isBranchUser = (user) => (
      (currentSessionUser.branchId && String(user.branchId || '') === String(currentSessionUser.branchId))
      || normalizeComparableText(user.branch) === normalizedCurrentBranchName
    );
    const isAdminLikeUser = (user) => {
      const roleMatch = normalizeComparableText(user.role) === 'admin';
      const emailMatch = /\badmin\b/i.test(String(user.email || ''));
      const nameMatch = /\badmin\b/i.test(String(user.name || ''));
      return roleMatch || emailMatch || nameMatch;
    };

    const branchAdminCandidate = userRecords.find((user) => (
      user.id !== currentSessionUser.id
      && isBranchUser(user)
      && isAdminLikeUser(user)
    ));

    if (branchAdminCandidate) {
      return branchAdminCandidate;
    }

    return userRecords.find((user) => (
      user.id !== currentSessionUser.id
      && isAdminLikeUser(user)
    )) || null;
  }, [currentSessionUser.branch, currentSessionUser.branchId, currentSessionUser.id, userRecords]);

  const availableNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(userMode)),
    [userMode]
  );

  const isAdminMobileNavMode = userMode === 'admin' && isMobileViewport;

  const mobileNavPrimaryItems = useMemo(() => {
    if (!isAdminMobileNavMode) {
      return [];
    }

    const primaryOrder = ['dashboard', 'requests', 'trips', 'vehicles'];
    return primaryOrder
      .map((id) => availableNavItems.find((item) => item.id === id))
      .filter(Boolean);
  }, [availableNavItems, isAdminMobileNavMode]);

  const mobileNavSecondaryItems = useMemo(() => {
    if (!isAdminMobileNavMode) {
      return [];
    }

    const secondaryOrder = ['calendar', 'compliance', 'reports', 'settings'];
    return secondaryOrder
      .map((id) => availableNavItems.find((item) => item.id === id))
      .filter(Boolean);
  }, [availableNavItems, isAdminMobileNavMode]);

  const navItemsForRender = useMemo(() => {
    if (!isAdminMobileNavMode) {
      return availableNavItems;
    }

    if (!mobileNavSecondaryItems.length) {
      return mobileNavPrimaryItems;
    }

    return [
      ...mobileNavPrimaryItems,
      { id: '__mobile_more__', label: 'More', icon: 'more', isOverflow: true },
    ];
  }, [availableNavItems, isAdminMobileNavMode, mobileNavPrimaryItems, mobileNavSecondaryItems]);

  const defaultNavView = availableNavItems[0]?.id || 'dashboard';
  const selectedView = availableNavItems.some((item) => item.id === activeView) ? activeView : defaultNavView;
  const activeNavItem = availableNavItems.find((item) => item.id === selectedView) || availableNavItems[0];

  useEffect(() => {
    setTopbarNotificationsOpen(false);
  }, [selectedView]);

  useEffect(() => {
    if (!isAdminMobileNavMode) {
      setMobileOverflowNavOpen(false);
    }
  }, [isAdminMobileNavMode]);

  const selectedVehicle =
    vehicleRecords.find((vehicle) => vehicle.id === selectedVehicleId) || vehicleRecords[0] || null;

  const selectedVehicleTrips = useMemo(() => {
    if (!selectedVehicle) {
      return [];
    }

    return [...tripRecords]
      .filter((trip) => trip.vehicle === selectedVehicle.vehicleName)
      .sort((left, right) => sortByLatestDate(left, right, getLatestActivityTimestamp));
  }, [selectedVehicle, tripRecords]);

  const selectedVehicleMaintenance = useMemo(() => {
    if (!selectedVehicle) {
      return [];
    }

    return [...maintenanceRecords]
      .filter((entry) => entry.vehicle === selectedVehicle.vehicleName)
      .sort((left, right) => sortByLatestDate(left, right, (entry) => entry.completedDate || entry.scheduleDate));
  }, [maintenanceRecords, selectedVehicle]);

  const selectedCheckoutTrip = visibleTripRecords.find((trip) => trip.id === checkoutForm.tripId) || null;
  const selectedCheckinTrip = visibleTripRecords.find((trip) => trip.id === checkinForm.tripId) || null;

  const computedCheckinMileage =
    selectedCheckinTrip && checkinForm.odometerIn
      ? Number(checkinForm.odometerIn) - Number(selectedCheckinTrip.odometerOut || 0)
      : null;

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-PH', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(operationsDay),
    [operationsDay]
  );

  const todayShortLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-PH', {
        month: 'long',
        day: 'numeric',
      }).format(operationsDay),
    [operationsDay]
  );

  const topbarActionNotifications = useMemo(() => {
    const items = [];
    const canReviewRequests = userMode === 'admin' || userMode === 'approver';
    const canUpdateFuel = userMode === 'driver' || userMode === 'requester';
    const canManageTrips = ['admin', 'approver', 'driver'].includes(userMode);
    const nowTimestamp = Date.now();
    const normalizedSessionName = normalizeComparableText(currentSessionUser.name);
    const normalizedDriverName = normalizeComparableText(currentDriverRecord?.fullName);

    if (canReviewRequests) {
      visibleRequestRecords.forEach((request) => {
        if (request.status !== 'Pending Approval') {
          return;
        }

        const departureTime = toSortableTime(request.departureDatetime || request.createdAt);
        const requestNo = request.requestNo || 'Request';

        items.push({
          id: `request-review-${request.id}`,
          requestId: request.id,
          title: `${requestNo} is waiting for approval`,
          detail: `${request.requestedBy || 'Unknown requester'} to ${request.destination || 'Unspecified destination'}`,
          view: 'requests',
          search: request.requestNo || '',
          tone: 'warning',
          priority: 90,
          timestamp: departureTime,
          timestampLabel: departureTime
            ? `Departure ${formatDate(request.departureDatetime || request.createdAt, true)}`
            : 'Open request queue',
          actionLabel: 'Open request queue',
        });
      });
    }

    if (canUpdateFuel) {
      visibleRequestRecords.forEach((request) => {
        if (!request.fuelRequested || !['Pending Approval', 'Ready for Release'].includes(request.status)) {
          return;
        }

        const isOwnedByCurrentUser = request.requestedById && currentSessionUser.id
          ? String(request.requestedById) === String(currentSessionUser.id)
          : normalizeComparableText(request.requestedBy) === normalizedSessionName;
        const isAssignedToCurrentDriver = (currentDriverRecord?.id && request.assignedDriverId)
          ? String(request.assignedDriverId) === String(currentDriverRecord.id)
          : false;
        const isAssignedNameMatch = Boolean(normalizedSessionName) && normalizeComparableText(request.assignedDriver) === normalizedSessionName;
        const isAssignedDriverNameMatch = Boolean(normalizedDriverName) && normalizeComparableText(request.assignedDriver) === normalizedDriverName;

        if (!isOwnedByCurrentUser && !isAssignedToCurrentDriver && !isAssignedNameMatch && !isAssignedDriverNameMatch) {
          return;
        }

        const requestNo = request.requestNo || 'Request';
        const departureTime = toSortableTime(request.departureDatetime || request.createdAt);

        items.push({
          id: `request-fuel-${request.id}`,
          requestId: request.id,
          title: `${requestNo} has fuel details pending`,
          detail: `Fuel authorization for ${request.destination || 'this route'} can still be updated.`,
          view: 'requests',
          search: request.requestNo || '',
          tone: request.status === 'Ready for Release' ? 'info' : 'warning',
          priority: 64,
          timestamp: departureTime,
          timestampLabel: departureTime
            ? `Departure ${formatDate(request.departureDatetime || request.createdAt, true)}`
            : 'Open fuel details',
          actionLabel: 'Open fuel details',
        });
      });
    }

    if (canManageTrips) {
      visibleTripRecords.forEach((trip) => {
        const tripStatus = String(trip.tripStatus || '');
        const requestNo = trip.requestNo || 'Trip';
        const expectedReturnTime = toSortableTime(trip.expectedReturn || trip.createdAt);
        const normalizedTripDriver = normalizeComparableText(trip.driver);
        const isTripAssignedToCurrentDriver = (currentDriverRecord?.id && trip.driverId)
          ? String(trip.driverId) === String(currentDriverRecord.id)
          : (
            (Boolean(normalizedSessionName) && normalizedTripDriver === normalizedSessionName)
            || (Boolean(normalizedDriverName) && normalizedTripDriver === normalizedDriverName)
          );
        const needsDriverReturnReminder = userMode === 'driver'
          && isTripAssignedToCurrentDriver
          && ['Checked Out', 'In Transit', 'Overdue'].includes(tripStatus)
          && expectedReturnTime > 0
          && expectedReturnTime <= nowTimestamp;

        if (needsDriverReturnReminder) {
          items.push({
            id: `driver-return-reminder-${trip.id}`,
            tripId: trip.id,
            title: `${requestNo} needs immediate return`,
            detail: `You still need to return ${trip.vehicle || 'your assigned vehicle'} for branch closure.`,
            view: 'trips',
            tone: 'danger',
            priority: 115,
            timestamp: expectedReturnTime,
            timestampLabel: `Expected return ${formatDate(trip.expectedReturn || trip.createdAt, true)}`,
            actionLabel: 'Return vehicle now',
          });
          return;
        }

        if (READY_FOR_CHECKOUT.includes(tripStatus)) {
          const targetTime = toSortableTime(trip.expectedReturn || trip.departureDatetime || trip.createdAt);

          items.push({
            id: `trip-release-${trip.id}`,
            tripId: trip.id,
            title: `${requestNo} is ready for release`,
            detail: `${trip.vehicle || 'Vehicle'} | ${trip.driver || 'Driver not assigned'}`,
            view: 'trips',
            tone: 'warning',
            priority: 82,
            timestamp: targetTime,
            timestampLabel: targetTime ? `Due ${formatDate(trip.expectedReturn || trip.departureDatetime || trip.createdAt, true)}` : 'Open trip actions',
            actionLabel: 'Open trip actions',
          });
          return;
        }

        if (tripStatus === 'Overdue') {
          const overdueTime = toSortableTime(trip.expectedReturn || trip.createdAt);

          items.push({
            id: `trip-overdue-${trip.id}`,
            tripId: trip.id,
            title: `${requestNo} is overdue`,
            detail: `${trip.vehicle || 'Vehicle'} has passed the expected return time.`,
            view: 'trips',
            tone: 'danger',
            priority: 100,
            timestamp: overdueTime,
            timestampLabel: overdueTime ? `Expected return ${formatDate(trip.expectedReturn, true)}` : 'Needs immediate follow-up',
            actionLabel: 'Resolve overdue trip',
          });
          return;
        }

      });
    }

    notificationFeed.forEach((notice) => {
      const tone = String(notice.tone || '').toLowerCase();
      if (!['danger', 'warning'].includes(tone)) {
        return;
      }

      const sourceKey = String(notice.sourceKey || '').toLowerCase();
      const view = sourceKey.includes('trip')
        ? 'trips'
        : sourceKey.includes('request')
          ? 'requests'
          : sourceKey.includes('incident') || sourceKey.includes('maintenance') || sourceKey.includes('vehicle')
            ? 'compliance'
            : 'dashboard';
      const noticeTime = toSortableTime(notice.sourceDate || notice.createdAt);

      items.push({
        id: `feed-${notice.id}`,
        title: notice.title || 'Operations alert',
        detail: notice.detail || 'Review this alert in the workspace.',
        view,
        tone,
        priority: tone === 'danger' ? 92 : 74,
        timestamp: noticeTime,
        timestampLabel: noticeTime ? formatDate(notice.sourceDate || notice.createdAt, true) : 'Open related view',
        actionLabel: 'Open related view',
      });
    });

    const uniqueItems = [];
    const seenIds = new Set();

    items.forEach((item) => {
      if (!item || !item.id || seenIds.has(item.id)) {
        return;
      }

      seenIds.add(item.id);
      uniqueItems.push(item);
    });

    return uniqueItems
      .sort((left, right) => {
        const priorityDelta = right.priority - left.priority;

        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        const timestampDelta = right.timestamp - left.timestamp;

        if (timestampDelta !== 0) {
          return timestampDelta;
        }

        return String(left.title || '').localeCompare(String(right.title || ''));
      });
  }, [
    currentDriverRecord?.fullName,
    currentDriverRecord?.id,
    currentSessionUser.id,
    currentSessionUser.name,
    notificationFeed,
    userMode,
    visibleRequestRecords,
    visibleTripRecords,
  ]);

  const topbarNotificationCount = topbarActionNotifications.length;
  const topbarNotificationCountLabel = topbarNotificationCount > 99 ? '99+' : String(topbarNotificationCount);

  const heroContent = useMemo(() => {
    const actionFor = (view, label) => ({ view, label });

    switch (selectedView) {
      case 'requests':
        if (userMode === 'approver') {
          return {
            kicker: 'Approvals',
            title: 'Review and clear branch requests.',
            description:
              'Track requests waiting for approval in your branch and keep release status visible.',
            primaryAction: null,
            secondaryAction: null,
            spotlights: [
              {
                label: 'Pending',
                value: visibleRequestStatusSummary.pendingApproval,
                helper: 'Need your review',
                icon: 'clock',
              },
              {
                label: 'Ready',
                value: visibleRequestStatusSummary.approved,
                helper: 'Reviewed and cleared',
                icon: 'check',
              },
              {
                label: 'Returned',
                value: visibleRequestStatusSummary.returned,
                helper: 'Completed',
                icon: 'return',
              },
            ],
          };
        }

        if (userMode === 'requester') {
          return {
            kicker: 'Requests',
            title: 'Submit and track your vehicle requests.',
            description:
              'View your request history, monitor approval status, and send a new request without opening the admin workspace.',
            primaryAction: null,
            secondaryAction: null,
            spotlights: [
              {
                label: 'My requests',
                value: myRequestRecords.length,
                helper: 'Submitted entries',
                icon: 'requests',
              },
              {
                label: 'Pending',
                value: myRequestRecords.filter((request) => request.status === 'Pending Approval').length,
                helper: 'Awaiting approval',
                icon: 'clock',
              },
              {
                label: 'Ready',
                value: myRequestRecords.filter((request) => request.status === 'Ready for Release').length,
                helper: 'Assigned and ready',
                icon: 'check',
              },
            ],
          };
        }

        if (userMode === 'guard') {
          return {
            kicker: 'Guard portal',
            title: 'Monitor request status and passenger flow for your branch.',
            description:
              'This read-only view shows all branch request statuses and passenger manifests without exposing trip destinations or assignment details.',
            primaryAction: null,
            secondaryAction: null,
            spotlights: [
              {
                label: 'Branch queue',
                value: visibleRequestStatusSummary.total,
                helper: 'All statuses in scope',
                icon: 'requests',
              },
              {
                label: 'Pending',
                value: visibleRequestStatusSummary.pendingApproval,
                helper: 'Awaiting review',
                icon: 'clock',
              },
              {
                label: 'Passengers',
                value: visibleRequestRecords.reduce((total, request) => total + Number(request.passengerCount || 0), 0),
                helper: 'Riders listed today',
                icon: 'people',
              },
            ],
          };
        }

        if (userMode === 'pump_station') {
          return {
            kicker: 'Pump station',
            title: 'Review approved fuel authorizations only.',
            description:
              'This read-only view shows approved fuel authorizations with fuel details, status, and approver.',
            primaryAction: null,
            secondaryAction: null,
            spotlights: [
              {
                label: 'Approved fuel',
                value: visibleRequestRecords.length,
                helper: 'Approved authorizations in scope',
                icon: 'reports',
              },
              {
                label: 'Total liters',
                value: visibleRequestRecords.reduce((total, request) => total + Number(request.fuelLiters || 0), 0).toFixed(2),
                helper: 'Authorized liters',
                icon: 'vehicles',
              },
              {
                label: 'Total amount',
                value: `₱${visibleRequestRecords.reduce((total, request) => total + Number(request.fuelAmount || 0), 0).toFixed(2)}`,
                helper: 'Authorized fuel value',
                icon: 'check',
              },
            ],
          };
        }

        if (userMode === 'driver') {
          return {
            kicker: 'Assignments',
            title: 'Review the requests routed to your driver account.',
            description:
              'This view is focused on release-ready assignments, active trips, and the requests tied to you.',
            primaryAction: actionFor('trips', 'Open trip actions'),
            secondaryAction: null,
            spotlights: [
              {
                label: 'Branch requests',
                value: branchScopedRequestStatusSummary.total,
                helper: currentSessionUser.branch,
                icon: 'requests',
              },
              {
                label: 'Ready',
                value: branchScopedRequestStatusSummary.readyForRelease,
                helper: 'Waiting for release',
                icon: 'release',
              },
              {
                label: 'Active',
                value: tripsPageTripStatusSummary.active,
                helper: 'Checked out or in transit',
                icon: 'trips',
              },
            ],
          };
        }

        return {
          kicker: 'Request desk',
          title: 'Keep approvals moving without losing context.',
          description:
            'Search the queue, submit new trips, and keep assignments visible in one place.',
          primaryAction: actionFor('request-modal', 'New request'),
          secondaryAction: actionFor('trips', 'Open dispatch'),
          spotlights: [
            { label: 'Pending', value: requestStatusSummary.pendingApproval, helper: 'Waiting on approval', icon: 'clock' },
            { label: 'Ready', value: tripStatusSummary.readyForRelease, helper: 'Assigned and cleared', icon: 'check' },
            { label: 'Returned', value: requestStatusSummary.returned, helper: 'Closed requests', icon: 'return' },
          ],
        };
      case 'trips':
        if (userMode === 'driver') {
          return {
            kicker: 'Trip actions',
            title: 'Release and return the trips assigned to you.',
            description:
              'Open a trip to capture check-out or return details without exposing the full dispatch board.',
            primaryAction: actionFor('requests', 'Open assigned requests'),
            secondaryAction: null,
            spotlights: [
              { label: 'Branch trips', value: tripsPageTripStatusSummary.total, helper: currentSessionUser.branch, icon: 'trips' },
              { label: 'Ready', value: tripsPageTripStatusSummary.readyForRelease, helper: 'Waiting for release', icon: 'release' },
              { label: 'Open returns', value: tripsPageTripStatusSummary.active, helper: 'Need check-in', icon: 'return' },
            ],
          };
        }

        if (userMode === 'guard') {
          return {
            kicker: 'Guard portal',
            title: 'Monitor branch trip status with passenger context.',
            description:
              'This read-only trip view shows status and schedule without exposing route, assignment, or vehicle trip details.',
            primaryAction: null,
            secondaryAction: actionFor('requests', 'Open requests'),
            spotlights: [
              { label: 'Trips', value: visibleTripRecords.length, helper: 'Branch records in scope', icon: 'trips' },
              { label: 'Active', value: tripStatusSummary.active, helper: 'Checked out or in transit', icon: 'release' },
              { label: 'Returned', value: tripStatusSummary.returned, helper: 'Completed returns', icon: 'return' },
            ],
          };
        }

        return {
          kicker: 'Dispatch',
          title: 'Release and close trips from a single desk.',
          description:
            'Handle check-out and return capture without jumping between views.',
          primaryAction: actionFor('requests', 'Open requests'),
          secondaryAction: actionFor('vehicles', 'View fleet'),
          spotlights: [
            { label: 'Live trips', value: tripStatusSummary.active, helper: 'Checked out or in transit', icon: 'trips' },
            { label: 'Ready', value: tripStatusSummary.readyForRelease, helper: 'Approved and waiting', icon: 'release' },
            { label: 'Overdue', value: tripStatusSummary.overdue, helper: 'Needs follow-up', icon: 'warning' },
          ],
        };
      case 'reports':
        return {
          kicker: 'Reporting',
          title: 'Generate operational reports without leaving the workspace.',
          description:
            'Filter branch data, compare request and trip activity, and export the exact report rows you need.',
          primaryAction: null,
          secondaryAction: userMode === 'admin' ? actionFor('settings', 'Open settings') : actionFor('requests', 'Open requests'),
          spotlights: [
            { label: 'Requests', value: visibleRequestRecords.length, helper: 'Records in reporting scope', icon: 'requests' },
            { label: 'Trips', value: visibleTripRecords.length, helper: 'Dispatch records available', icon: 'trips' },
            { label: 'Fuel-authorized', value: visibleRequestRecords.filter((request) => request.fuelRequested).length, helper: 'Requests with fuel support', icon: 'reports' },
          ],
        };
      case 'calendar':
        if (userMode === 'driver') {
          return {
            kicker: 'Branch calendar',
            title: 'Review your branch trip schedule.',
            description:
              'Calendar data is scoped to your branch so all drivers in the same branch see the same schedule.',
            primaryAction: actionFor('requests', 'Open assigned requests'),
            secondaryAction: actionFor('trips', 'Open trip actions'),
            spotlights: [
              { label: 'Branch trips', value: calendarTripStatusSummary.total, helper: currentSessionUser.branch, icon: 'calendar' },
              { label: 'Ready', value: calendarTripStatusSummary.readyForRelease, helper: 'Queued for release', icon: 'release' },
              { label: 'Active', value: calendarTripStatusSummary.active, helper: 'Checked out or in transit', icon: 'trips' },
            ],
          };
        }

        return {
          kicker: 'Calendar',
          title: 'Track scheduled, active, and returning trips by date.',
          description:
            'Use the calendar to review trip load and dispatch timing for the records in your current access scope.',
          primaryAction: actionFor('trips', 'Open dispatch'),
          secondaryAction: actionFor('requests', 'Open requests'),
          spotlights: [
            { label: 'Trips in scope', value: calendarTripStatusSummary.total, helper: 'Calendar-visible records', icon: 'calendar' },
            { label: 'Ready', value: calendarTripStatusSummary.readyForRelease, helper: 'Queued for release', icon: 'release' },
            { label: 'Active', value: calendarTripStatusSummary.active, helper: 'Checked out or in transit', icon: 'trips' },
          ],
        };
      case 'vehicles':
        return {
          kicker: 'Fleet',
          title: 'See what is available before dispatch becomes guesswork.',
          description:
            'Filter the fleet, inspect a vehicle, and surface document risks fast.',
          primaryAction: actionFor('requests', 'Open requests'),
          secondaryAction: actionFor('compliance', 'Open watchlist'),
          spotlightLabel: 'Overall fleet snapshot',
          spotlights: [
            { label: 'Fleet available', value: fleetSummary.available, helper: 'Ready anywhere in the fleet', icon: 'vehicles' },
            { label: 'Assigned', value: fleetSummary.inUse, helper: 'Currently out or allocated', icon: 'trips' },
            { label: 'Needs watch', value: fleetSummary.attention, helper: 'Expiry risk across all vehicles', icon: 'warning' },
          ],
        };
      case 'compliance':
        return {
          kicker: 'Watchlist',
          title: 'Keep service work and expiring documents visible.',
          description:
            'The page is focused on what can block dispatch today, not reporting for reporting’s sake.',
          primaryAction: actionFor('vehicles', 'Back to fleet'),
          secondaryAction: actionFor('dashboard', 'Back to overview'),
          spotlights: [
            { label: 'Maintenance', value: complianceSummary.pendingMaintenance, helper: 'Open service items', icon: 'wrench' },
            { label: 'Insurance', value: complianceSummary.insuranceWatch, helper: 'Within 30 days', icon: 'compliance' },
            { label: 'Registration', value: complianceSummary.registrationWatch, helper: 'Renewals approaching', icon: 'calendar' },
          ],
        };
      case 'settings':
        if (userMode === 'approver') {
          return {
            kicker: 'Branch settings',
            title: 'View branch users, drivers, and vehicles.',
            description:
              'Review branch user profiles plus driver and vehicle records assigned to your branch.',
            primaryAction: actionFor('settings', 'Open settings'),
            secondaryAction: actionFor('requests', 'Back to requests'),
            spotlights: [
              { label: 'Branch users', value: settingsUserRecords.length, helper: currentSessionUser.branch, icon: 'user' },
              { label: 'Branch drivers', value: settingsDriverRecords.length, helper: currentSessionUser.branch, icon: 'people' },
              { label: 'Branch vehicles', value: settingsVehicleRecords.length, helper: currentSessionUser.branch, icon: 'vehicles' },
              { label: 'Driver available', value: settingsDriverRecords.filter((driver) => driver.status === 'available').length, helper: 'Ready for assignment', icon: 'check' },
            ],
          };
        }

        return {
          kicker: 'Admin settings',
          title: 'Manage users, drivers, and vehicles.',
          description:
            'This workspace keeps your master records clean so requests, assignment, and dispatch stay reliable.',
          primaryAction: actionFor('settings', 'Open settings'),
          secondaryAction: actionFor('vehicles', 'Back to fleet'),
          spotlights: [
            { label: 'Users', value: userRecords.length, helper: 'Profile records', icon: 'user' },
            { label: 'Drivers', value: driverRecords.length, helper: 'Dispatch roster', icon: 'people' },
            { label: 'Vehicles', value: vehicleRecords.length, helper: 'Fleet records', icon: 'vehicles' },
          ],
        };
      case 'maintenance':
        return {
          kicker: 'Service log',
          title: 'Track and log vehicle maintenance.',
          description:
            'Maintain a clean record of service work, providers, and costs to keep the fleet reliable.',
          primaryAction: actionFor('maintenance', 'Open logging'),
          secondaryAction: actionFor('compliance', 'View watchlist'),
          spotlights: [
            { 
              label: 'Total logs', 
              value: maintenanceRecords.filter(m => userMode === 'admin' || m.branch === currentSessionUser.branch).length, 
              helper: 'Service history', 
              icon: 'wrench' 
            },
            { 
              label: 'Pending', 
              value: maintenanceRecords.filter(m => (userMode === 'admin' || m.branch === currentSessionUser.branch) && m.status === 'Pending').length, 
              helper: 'Open items', 
              icon: 'clock' 
            },
            { 
              label: 'Watchlist', 
              value: fleetSummary.attention, 
              helper: 'Expiry risk', 
              icon: 'warning' 
            },
          ],
        };
      case 'dashboard':
      default:
        if (userMode === 'approver') {
          return {
            kicker: 'Approver desk',
            title: `Welcome back, ${currentSessionUser.name}.`,
            description:
              'This view is focused on requests waiting for approval in your branch.',
            primaryAction: actionFor('requests', 'Open approval queue'),
            secondaryAction: null,
            spotlights: [
              {
                label: 'Pending approvals',
                value: visibleRequestStatusSummary.pendingApproval,
                helper: 'Waiting for your review',
                icon: 'clock',
              },
              {
                label: 'Ready',
                value: visibleRequestStatusSummary.approved,
                helper: 'Reviewed and cleared',
                icon: 'check',
              },
              {
                label: 'Alerts',
                value: notificationFeed.length,
                helper: 'Active reminders',
                icon: 'alerts',
              },
            ],
          };
        }

        if (userMode === 'requester') {
          return {
            kicker: 'Requester desk',
            title: `Welcome back, ${currentSessionUser.name}.`,
            description:
              'This view is focused on your own requests, approvals, and assigned trips.',
            primaryAction: actionFor('requests', 'Open my requests'),
            secondaryAction: null,
            spotlights: [
              {
                label: 'My requests',
                value: myRequestRecords.length,
                helper: 'Submitted requests',
                icon: 'requests',
              },
              {
                label: 'Pending',
                value: myRequestRecords.filter((request) => request.status === 'Pending Approval').length,
                helper: 'Waiting for review',
                icon: 'clock',
              },
              {
                label: 'Returned',
                value: myRequestRecords.filter((request) => COMPLETED_REQUEST_STATUSES.includes(request.status)).length,
                helper: 'Completed trips',
                icon: 'return',
              },
            ],
          };
        }

        if (userMode === 'driver') {
          return {
            kicker: 'Driver desk',
            title: `Welcome back, ${currentSessionUser.name}.`,
            description:
              'This view is focused on the requests and trip actions already assigned to your driver account.',
            primaryAction: actionFor('trips', 'Open my trips'),
            secondaryAction: actionFor('requests', 'Open assigned requests'),
            spotlights: [
              {
                label: 'Assigned',
                value: visibleRequestStatusSummary.total,
                helper: 'Requests tied to you',
                icon: 'requests',
              },
              {
                label: 'Ready',
                value: tripStatusSummary.readyForRelease,
                helper: 'Queued for release',
                icon: 'release',
              },
              {
                label: 'Active',
                value: tripStatusSummary.active,
                helper: 'Checked out or in transit',
                icon: 'trips',
              },
            ],
          };
        }

        return {
          kicker: 'Operations',
          title: 'V-PASS',
          description:
            'A tighter branch operations workspace for requests, dispatch, fleet status, and compliance.',
          primaryAction: actionFor('requests', 'New request'),
          secondaryAction: actionFor('trips', 'Open dispatch'),
          spotlights: [
            { label: 'Today', value: tripStatusSummary.scheduledToday, helper: `Trips touching ${todayShortLabel}`, icon: 'calendar' },
            { label: 'Alerts', value: notificationFeed.length, helper: 'Active reminders', icon: 'alerts' },
            { label: 'Fleet ready', value: fleetSummary.available, helper: 'Available vehicles', icon: 'vehicles' },
          ],
        };
    }
  }, [
    complianceSummary,
    currentSessionUser.branch,
    currentSessionUser.name,
    driverRecords.length,
    fleetSummary,
    maintenanceRecords,
    myRequestRecords,
    notificationFeed.length,
    requestStatusSummary,
    branchScopedRequestStatusSummary,
    calendarTripStatusSummary,
    tripsPageTripStatusSummary,
    settingsDriverRecords,
    settingsUserRecords,
    settingsVehicleRecords,
    selectedView,
    todayShortLabel,
    tripStatusSummary,
    userMode,
    userRecords.length,
    vehicleRecords.length,
    visibleRequestRecords,
    visibleRequestStatusSummary,
    visibleTripRecords,
  ]);

  function pushNotification(title, detail, tone) {
    setNotificationFeed((current) => [
      {
        id: createId('ntf'),
        title,
        detail,
        tone,
      },
      ...current,
    ]);
  }

  function showToast(message, tone = 'info', title = 'Latest activity') {
    setToast({
      id: createId('toast'),
      title,
      message,
      tone,
    });
  }

  function startSettingsImportProgress(scope, total, label) {
    setSettingsImportProgress({
      scope,
      label,
      processed: 0,
      total: Math.max(0, Number(total) || 0),
      isActive: true,
    });
  }

  function setSettingsImportProgressStep(scope, processed) {
    setSettingsImportProgress((current) => {
      if (!current.isActive || current.scope !== scope) {
        return current;
      }

      const total = Math.max(0, Number(current.total) || 0);
      const nextProcessed = Math.max(0, Number(processed) || 0);

      return {
        ...current,
        processed: total ? Math.min(nextProcessed, total) : nextProcessed,
      };
    });
  }

  function finishSettingsImportProgress(scope) {
    setSettingsImportProgress((current) => {
      if (current.scope !== scope) {
        return current;
      }

      return {
        ...current,
        isActive: false,
        processed: Math.max(current.processed, current.total),
      };
    });
  }

  useEffect(() => {
    if (!liveDataError || liveDataError.startsWith('Using your last known branch profile')) {
      return;
    }

    if (shouldSuppressLiveDataToast(liveDataError)) {
      return;
    }

    showToast(liveDataError, 'danger', 'Live data');
  }, [liveDataError]);

  function appendAuditEntry({
    actor = currentSessionUser.name,
    actorRole = currentSessionUser.role,
    category,
    action,
    target,
    branch = currentSessionUser.branch,
    source = 'live session',
    details = '',
  }) {
    const nextAuditEntry = {
      id: createId('aud'),
      actor,
      actorRole,
      category,
      action,
      target,
      branch,
      source,
      details,
      timestamp: new Date().toISOString(),
    };

    setAuditRecords((current) => [
      nextAuditEntry,
      ...current,
    ]);

    if (supabase && currentSessionUser.id) {
      const branchId = branchOptions.find((entry) => entry.name === branch)?.id || currentSessionUser.branchId || null;

      supabase
        .from('audit_logs')
        .insert({
          actor_id: currentSessionUser.id,
          branch_id: branchId,
          action,
          target_table: category || 'session',
          target_label: target,
          after_data: {
            category,
            source,
            details,
            actorRole,
          },
        })
        .then(({ error }) => {
          if (error) {
            console.error('Unable to persist audit log.', error);
          }
        });
    }
  }

  function handleRequestFormChange(field, value) {
    setRequestForm((current) => {
      if (field === 'passengerCount') {
        const passengerCount = String(normalizePassengerCount(value));
        const nextPassengerNames = createPassengerNameSlots(passengerCount).map(
          (_entry, index) => current.passengerNames?.[index] || ''
        );

        return {
          ...current,
          passengerCount,
          passengerNames: nextPassengerNames,
        };
      }

      if (field === 'fuelAmount') {
        return {
          ...current,
          fuelAmount: value,
          fuelAmountManuallyEdited: true,
        };
      }

      if (field === 'fuelRequested') {
        if (!value) {
          return {
            ...current,
            fuelRequested: false,
            fuelAmountManuallyEdited: false,
            fuelQuotePricePerLiter: null,
            fuelQuoteSource: '',
            fuelQuoteObservedAt: '',
            fuelQuoteLocation: '',
          };
        }

        return {
          ...current,
          fuelRequested: true,
          fuelAmountManuallyEdited: false,
        };
      }

      if (
        ['fuelLiters', 'fuelProduct', 'fuelQuoteProvince', 'fuelQuoteMunicipality', 'assignedVehicleId'].includes(field)
      ) {
        const resetMunicipality = field === 'fuelQuoteProvince';
        return {
          ...current,
          [field]: value,
          ...(resetMunicipality ? { fuelQuoteMunicipality: '' } : {}),
          fuelAmountManuallyEdited: false,
        };
      }

      if (field === 'assignedDriverId') {
        if (value === REQUEST_HIRED_DRIVER_OPTION_VALUE) {
          return {
            ...current,
            assignedDriverId: value,
          };
        }

        return {
          ...current,
          assignedDriverId: value,
          hiredDriverName: '',
          hiredDriverLicenseNumber: '',
          hiredDriverLicenseRestrictions: '',
          hiredDriverContactNumber: '',
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function handleRequestPassengerNameChange(index, value) {
    setRequestForm((current) => ({
      ...current,
      passengerNames: createPassengerNameSlots(current.passengerCount).map(
        (_entry, slotIndex) => (slotIndex === index ? value : current.passengerNames?.[slotIndex] || '')
      ),
    }));
  }

  function handleLoginFieldChange(field, value) {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }));
    setLoginError('');
    setLiveDataError('');
  }

  function handlePasswordFieldChange(field, value) {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleUserSettingsFieldChange(field, value) {
    setUserSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleDriverSettingsFieldChange(field, value) {
    if (userMode === 'approver' && field === 'branchId') {
      return;
    }

    setDriverSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleDriverRestrictionToggle(code) {
    setDriverSettingsForm((current) => {
      const selectedRestrictions = normalizeRestrictionSelection(current.licenseRestrictions);
      const nextRestrictions = selectedRestrictions.includes(code)
        ? selectedRestrictions.filter((entry) => entry !== code)
        : [...selectedRestrictions, code];

      return {
        ...current,
        licenseRestrictions: nextRestrictions.join(', '),
      };
    });
  }

  function handleVehicleSettingsFieldChange(field, value) {
    if (userMode === 'approver' && field === 'branchId') {
      return;
    }

    setVehicleSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleVehicleRestrictionToggle(code) {
    setVehicleSettingsForm((current) => {
      const selectedRestrictions = normalizeRestrictionSelection(current.requiredRestrictions);
      const nextRestrictions = selectedRestrictions.includes(code)
        ? selectedRestrictions.filter((entry) => entry !== code)
        : [...selectedRestrictions, code];

      return {
        ...current,
        requiredRestrictions: nextRestrictions.join(', '),
      };
    });
  }

  function handleCheckoutFieldChange(field, value) {
    setCheckoutForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCheckoutChecklistChange(item, value) {
    setCheckoutForm((current) => ({
      ...current,
      checklist: {
        ...current.checklist,
        [item]: value,
      },
    }));
  }

  function handleCheckinFieldChange(field, value) {
    setCheckinForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCheckinChecklistChange(item, value) {
    setCheckinForm((current) => ({
      ...current,
      checklist: {
        ...current.checklist,
        [item]: value,
      },
    }));
  }

  function handleCheckoutTripChange(tripId) {
    const selectedTrip = visibleTripRecords.find((trip) => trip.id === tripId);
    const selectedVehicleRecord = findVehicleForTrip(vehicleRecords, selectedTrip);

    setCheckoutForm((current) => ({
      ...current,
      tripId,
      odometerOut: selectedTrip?.odometerOut
        ? String(selectedTrip.odometerOut)
        : selectedVehicleRecord
          ? String(selectedVehicleRecord.odometerCurrent)
          : '',
      fuelOut: selectedTrip?.fuelOut || current.fuelOut,
    }));
  }

  function handleCheckinTripChange(tripId) {
    setCheckinForm((current) => ({
      ...current,
      tripId,
      odometerIn: '',
    }));
  }

  function handleOpenProfileModal() {
    setPasswordForm(createPasswordForm());
    setProfileModalOpen(true);
  }

  function handleCloseProfileModal() {
    setPasswordForm(createPasswordForm());
    setProfileModalOpen(false);
  }

  function handleOpenAssignmentModal(request) {
    setSelectedAssignmentRequest(request);
    setAssignmentVehicleId(request.assignedVehicleId || '');
    setAssignmentModalOpen(true);
  }

  function handleCloseAssignmentModal() {
    setAssignmentModalOpen(false);
    setSelectedAssignmentRequest(null);
    setAssignmentVehicleId('');
  }

  function handleOpenRequestDetails(request) {
    setSelectedRequestDetails(request);
    setRequestApprovalForm(createRequestApprovalForm(request));
    setRequestDetailsModalOpen(true);
  }

  function handleCloseRequestDetails() {
    setRequestDetailsModalOpen(false);
    setSelectedRequestDetails(null);
    setRequestApprovalForm(createRequestApprovalForm());
  }

  function handleRequestApprovalFieldChange(field, value) {
    setRequestApprovalForm((current) => {
      if (field === 'fuelRequested' || field === 'estimatedKms') {
        return current;
      }

      if (field === 'fuelAmount') {
        return {
          ...current,
          fuelAmount: value,
        };
      }

      if (field === 'fuelLiters') {
        const selectedVehicle = vehicleRecords.find((vehicle) => vehicle.id === selectedRequestDetails?.assignedVehicleId);
        const efficiency = Number(selectedVehicle?.fuelEfficiency || 10);
        const liters = value;

        return {
          ...current,
          fuelLiters: liters,
          estimatedKms: String((Number(liters) || 0) * efficiency),
        };
      }

      if (field === 'fuelProduct') {
        return {
          ...current,
          fuelProduct: String(value || '').trim() || 'diesel',
        };
      }

      if (field === 'fuelRemarks') {
        return {
          ...current,
          fuelRemarks: value,
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function isRequestOwner(request) {
    if (!request) {
      return false;
    }

    if (request.requestedById && currentSessionUser.id) {
      return request.requestedById === currentSessionUser.id;
    }

    return String(request.requestedBy || '').trim() === String(currentSessionUser.name || '').trim();
  }

  function isAssignedDriver(request) {
    if (!request || !currentSessionUser.name) {
      return false;
    }

    return String(request.assignedDriver || '').trim() === String(currentSessionUser.name || '').trim();
  }

  function canEditPendingFuelValues(request) {
    if (!request || !request.fuelRequested) {
      return false;
    }

    const isPending = request.status === 'Pending Approval';
    const isReady = request.status === 'Ready for Release';

    if (!isPending && !isReady) {
      return false;
    }

    // Admin/Approver can edit both pending and ready
    if (userMode === 'approver' || userMode === 'admin') {
      return true;
    }

    // Requester and Assigned Driver can edit both if allowed
    return isRequestOwner(request) || isAssignedDriver(request);
  }

  async function handleSaveRequestFuelEdits(request, fuelFormValues) {
    if (!canEditPendingFuelValues(request)) {
      showToast('Fuel values can only be updated by the requester (if pending) or an admin/approver.', 'warning', 'Update not allowed');
      return false;
    }

    const liters = Number(fuelFormValues?.fuelLiters);
    const amount = Number(fuelFormValues?.fuelAmount);
    const fuelProduct = String(fuelFormValues?.fuelProduct || request.fuelProduct || 'diesel').trim() || 'diesel';

    if (!Number.isFinite(liters) || liters < 0) {
      showToast('Enter a valid fuel liters value (0 or higher).', 'warning', 'Invalid liters');
      return false;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      showToast('Enter a valid fuel amount value (0 or higher).', 'warning', 'Invalid amount');
      return false;
    }

    const selectedVehicle = vehicleRecords.find(
      (vehicle) => vehicle.id === request.assignedVehicleId || vehicle.vehicleName === request.assignedVehicle
    );
    const efficiency = Number(selectedVehicle?.fuelEfficiency || 10);
    const estimatedKms = Number((liters * efficiency).toFixed(2));
    const nextFuelDetails = {
      fuelLiters: liters,
      fuelAmount: Number(amount.toFixed(2)),
      fuelProduct,
      estimatedKms,
      fuelRemarks: fuelFormValues?.fuelRemarks || request.fuelRemarks || '',
    };
    const beforeFuelSnapshot = `${String(request.fuelProduct || 'diesel').replace(/_/g, ' ')} | PHP ${Number(request.fuelAmount || 0).toFixed(2)} / ${Number(request.fuelLiters || 0).toFixed(2)} L`;
    const afterFuelSnapshot = `${String(nextFuelDetails.fuelProduct || 'diesel').replace(/_/g, ' ')} | PHP ${nextFuelDetails.fuelAmount.toFixed(2)} / ${nextFuelDetails.fuelLiters.toFixed(2)} L`;
    const isReady = request.status === 'Ready for Release';
    const requiresReapproval = isReady && userMode !== 'approver' && userMode !== 'admin';

    const updatedRequest = {
      ...request,
      fuelLiters: nextFuelDetails.fuelLiters,
      fuelAmount: nextFuelDetails.fuelAmount,
      fuelProduct: nextFuelDetails.fuelProduct,
      estimatedKms: nextFuelDetails.estimatedKms,
      fuelRemarks: nextFuelDetails.fuelRemarks,
      status: requiresReapproval ? 'Pending Approval' : request.status,
    };

    if (supabase) {
      try {
        await updateLiveRequestFuelValues(supabase, request, nextFuelDetails);
        
        if (requiresReapproval) {
          await reviewLiveRequest(supabase, request, currentSessionUser, 'Pending Approval');
        }

        const liveData = await refreshLiveData(currentSessionUser);
        const refreshedRequest = liveData?.requestRecords?.find((entry) => entry.id === request.id || entry.dbId === request.id || entry.requestId === request.id);

        if (refreshedRequest) {
          setSelectedRequestDetails(refreshedRequest);
          setRequestApprovalForm(createRequestApprovalForm(refreshedRequest));
        }

        appendAuditEntry({
          category: 'request',
          action: requiresReapproval ? 'Updated fuel (triggered re-approval)' : 'Edited pending fuel values',
          target: request.requestNo,
          branch: request.branch,
          details: `${currentSessionUser.name} updated fuel values from ${beforeFuelSnapshot} to ${afterFuelSnapshot}.${requiresReapproval ? ' Request sent back for re-approval.' : ''}`,
        });
        
        showToast(
          requiresReapproval 
            ? `${request.requestNo} updated and sent back for re-approval.`
            : `${request.requestNo} fuel values updated.`, 
          'success', 
          'Fuel updated'
        );
        return true;
      } catch (error) {
        try {
          const liveData = await refreshLiveData(currentSessionUser);
          const refreshedRequest = liveData?.requestRecords?.find((entry) => entry.id === request.id || entry.dbId === request.id || entry.requestId === request.id);

          if (refreshedRequest) {
            setSelectedRequestDetails(refreshedRequest);
            setRequestApprovalForm(createRequestApprovalForm(refreshedRequest));
          }
        } catch (_refreshError) {
          // Keep the original save error as the primary feedback.
        }

        showToast(error.message || 'Unable to save fuel edits.', 'danger', 'Update failed');
        return false;
      }
    }

    setRequestRecords((current) =>
      current.map((entry) => (entry.id === request.id ? updatedRequest : entry))
    );
    setSelectedRequestDetails(updatedRequest);
    setRequestApprovalForm(createRequestApprovalForm(updatedRequest));
    appendAuditEntry({
      category: 'request',
      action: requiresReapproval ? 'Updated fuel (triggered re-approval)' : 'Edited pending fuel values',
      target: request.requestNo,
      branch: request.branch,
      details: `${currentSessionUser.name} updated fuel values from ${beforeFuelSnapshot} to ${afterFuelSnapshot}.${requiresReapproval ? ' Request sent back for re-approval.' : ''}`,
    });
    showToast(
      requiresReapproval 
        ? `${request.requestNo} updated and sent back for re-approval.`
        : `${request.requestNo} fuel values updated.`, 
      'success', 
      'Fuel updated'
    );
    return true;
  }

  async function handleSaveRequestDriverEdits(request, approvalDetails) {
    if (!request || !['approver', 'admin'].includes(userMode)) {
      showToast('Only admins and approvers can edit assigned drivers.', 'warning', 'Update not allowed');
      return false;
    }

    if (request.status !== 'Checked Out') {
      showToast('Driver reassignment is only available for checked-out requests.', 'warning', 'Update not allowed');
      return false;
    }

    if (
      userMode === 'approver'
      && request?.approverId
      && request.approverId !== currentSessionUser.id
    ) {
      showToast('This request is assigned to an admin approver.', 'warning', 'Update blocked');
      return false;
    }

    const nextAssignedDriverId = String(approvalDetails?.assignedDriverId || '').trim();

    if (!nextAssignedDriverId) {
      showToast('Select a driver before saving.', 'warning', 'Driver required');
      return false;
    }

    if (nextAssignedDriverId === request.assignedDriverId) {
      showToast('No driver changes to save.', 'warning', 'No changes');
      return false;
    }

    const selectedDriver = driverRecords.find((driver) => driver.id === nextAssignedDriverId);
    const selectedVehicle = vehicleRecords.find(
      (vehicle) => vehicle.id === request.assignedVehicleId || vehicle.vehicleName === request.assignedVehicle
    );
    const validation = getDriverAssignmentValidation(selectedDriver, selectedVehicle);

    if (!validation.isValid) {
      showToast(getDriverAssignmentValidationMessage(validation), 'warning', 'Driver validation');
      return false;
    }

    const previousDriverName = request.assignedDriver || 'Unassigned';
    const nextDriverName = selectedDriver?.fullName || 'Unassigned';

    if (supabase) {
      try {
        await updateLiveRequestDriverAssignment(
          supabase,
          request,
          nextAssignedDriverId
        );
        const liveData = await refreshLiveData(currentSessionUser);
        const refreshedRequest = liveData?.requestRecords?.find(
          (entry) => entry.id === request.id || entry.dbId === request.id || entry.requestId === request.id
        );

        if (refreshedRequest) {
          setSelectedRequestDetails(refreshedRequest);
          setRequestApprovalForm(createRequestApprovalForm(refreshedRequest));
        }

        appendAuditEntry({
          category: 'request',
          action: 'Updated checked-out driver assignment',
          target: request.requestNo,
          branch: request.branch,
          details: `${currentSessionUser.name} reassigned ${request.requestNo} from ${previousDriverName} to ${nextDriverName}.`,
        });
        showToast(`${request.requestNo} driver assignment updated.`, 'success', 'Assignment updated');
        return true;
      } catch (error) {
        try {
          const liveData = await refreshLiveData(currentSessionUser);
          const refreshedRequest = liveData?.requestRecords?.find(
            (entry) => entry.id === request.id || entry.dbId === request.id || entry.requestId === request.id
          );

          if (refreshedRequest) {
            setSelectedRequestDetails(refreshedRequest);
            setRequestApprovalForm(createRequestApprovalForm(refreshedRequest));
          }
        } catch (_refreshError) {
          // Keep the original save error as the primary feedback.
        }

        showToast(error.message || 'Unable to update the assigned driver.', 'danger', 'Assignment failed');
        return false;
      }
    }

    const requestIdSet = new Set([request.id, request.dbId, request.requestId].filter(Boolean));
    const updatedRequest = {
      ...request,
      assignedDriverId: nextAssignedDriverId,
      assignedDriver: nextDriverName,
    };
    const isActiveTripStatus = ['Checked Out', 'In Transit', 'Overdue'].includes(request.status);

    setRequestRecords((current) =>
      current.map((entry) =>
        entry.id === request.id
          ? updatedRequest
          : entry
      )
    );
    setTripRecords((current) =>
      current.map((trip) =>
        requestIdSet.has(trip.requestId)
          ? {
              ...trip,
              driverId: nextAssignedDriverId,
              driver: nextDriverName,
            }
          : trip
      )
    );
    setDriverRecords((current) =>
      current.map((driver) => {
        if (request.assignedDriverId && driver.id === request.assignedDriverId) {
          return {
            ...driver,
            status: 'available',
          };
        }

        if (driver.id === nextAssignedDriverId) {
          return {
            ...driver,
            status: isActiveTripStatus ? 'on_trip' : 'assigned',
          };
        }

        return driver;
      })
    );
    setSelectedRequestDetails(updatedRequest);
    setRequestApprovalForm(createRequestApprovalForm(updatedRequest));
    appendAuditEntry({
      category: 'request',
      action: 'Updated checked-out driver assignment',
      target: request.requestNo,
      branch: request.branch,
      details: `${currentSessionUser.name} reassigned ${request.requestNo} from ${previousDriverName} to ${nextDriverName}.`,
    });
    showToast(`${request.requestNo} driver assignment updated.`, 'success', 'Assignment updated');
    return true;
  }

  function getDriverAssignmentValidationMessage(validation) {
    const messages = [];

    if (validation.licenseExpired) {
      messages.push(`The selected driver's license expired on ${formatDate(validation.licenseExpiry)}.`);
    }

    if (validation.vehicleRequirementMissing) {
      messages.push('The selected vehicle does not have a configured type or required restriction profile yet. Edit the vehicle record first.');
    }

    if (validation.restrictionMismatch) {
      const currentRestrictions = validation.driverRestrictions.length ? validation.driverRestrictions.join(', ') : 'None';
      const requiredRestrictions = validation.requiredRestrictions.join(', ');
      messages.push(`The selected driver's license restrictions (${currentRestrictions}) do not satisfy the full requirement for ${validation.vehicleTypeLabel || 'the selected vehicle'} (${requiredRestrictions}).`);
    }

    return messages.join(' ');
  }

  async function handleReviewRequest(request, nextStatus, approvalDetails = null) {
    if (!['approver', 'admin'].includes(userMode)) {
      return false;
    }

    if (
      userMode === 'approver'
      && request?.approverId
      && request.approverId !== currentSessionUser.id
    ) {
      showToast('This request is assigned to an admin approver.', 'warning', 'Approval blocked');
      return false;
    }

    const nextAssignedDriverId = approvalDetails?.assignedDriverId ?? request.assignedDriverId;
    const nextAssignedVehicleId = request.assignedVehicleId;

    if (nextStatus === 'Approved') {
      if (!nextAssignedVehicleId) {
        showToast('Assign a vehicle before approving this request.', 'warning', 'Vehicle required');
        return false;
      }

      if (!nextAssignedDriverId) {
        showToast('Assign a driver before approving this request.', 'warning', 'Driver required');
        return false;
      }
    }

    if (nextStatus === 'Approved' && approvalDetails) {
      const selectedDriver = driverRecords.find(
        (driver) => driver.id === nextAssignedDriverId
      );
      const validation = getDriverAssignmentValidation(selectedDriver, selectedRequestApprovalVehicle);

      if (!validation.isValid) {
        showToast(getDriverAssignmentValidationMessage(validation), 'warning', 'Driver validation');
        return false;
      }
    }

    if (supabase) {
      try {
        await reviewLiveRequest(supabase, request, currentSessionUser, nextStatus, approvalDetails);
        await refreshLiveData(currentSessionUser);

        appendAuditEntry({
          category: 'request',
          action: `Marked request as ${nextStatus}`,
          target: request.requestNo,
          branch: request.branch,
          details: `${currentSessionUser.name} changed ${request.requestNo} to ${nextStatus}.`,
        });
        showToast(`${request.requestNo} marked as ${nextStatus.toLowerCase()}.`, 'success', 'Request updated');
        return true;
      } catch (error) {
        try {
          const liveData = await refreshLiveData(currentSessionUser);
          const refreshedRequest = liveData?.requestRecords?.find((entry) => entry.id === request.id || entry.dbId === request.id || entry.requestId === request.id);

          if (refreshedRequest) {
            setSelectedRequestDetails(refreshedRequest);
            setRequestApprovalForm(createRequestApprovalForm(refreshedRequest));
          }
        } catch (_refreshError) {
          // Keep the original approval error as the primary feedback.
        }

        showToast(error.message || `Unable to mark the request as ${nextStatus.toLowerCase()}.`, 'danger', 'Update failed');
        return false;
      }
    }

    const nextAssignedDriver = driverRecords.find((driver) => driver.id === nextAssignedDriverId);
    const previousAssignedDriverId = request.assignedDriverId;
    const approvedAt = nextStatus === 'Approved'
      ? new Date().toISOString()
      : request.approvedAt || '';
    const updatedRequest = {
      ...request,
      status: nextStatus,
      rejectionReason: nextStatus === 'Rejected' ? request.rejectionReason || '' : '',
      approver: currentSessionUser.name,
      approverId: currentSessionUser.id,
      assignedDriverId: nextAssignedDriverId || '',
      assignedDriver: nextAssignedDriver?.fullName || request.assignedDriver,
      fuelRequested: approvalDetails?.fuelRequested ?? request.fuelRequested,
      fuelAmount: Number(approvalDetails?.fuelAmount ?? request.fuelAmount ?? 0),
      fuelLiters: Number(approvalDetails?.fuelLiters ?? request.fuelLiters ?? 0),
      estimatedKms: Number(approvalDetails?.estimatedKms ?? request.estimatedKms ?? 0),
      fuelRemarks: approvalDetails?.fuelRemarks ?? request.fuelRemarks ?? '',
      fuelProduct: approvalDetails?.fuelProduct ?? request.fuelProduct ?? 'diesel',
      fuelQuotePricePerLiter: approvalDetails?.fuelQuotePricePerLiter ?? request.fuelQuotePricePerLiter ?? null,
      fuelQuoteSource: approvalDetails?.fuelQuoteSource ?? request.fuelQuoteSource ?? '',
      fuelQuoteObservedAt: approvalDetails?.fuelQuoteObservedAt ?? request.fuelQuoteObservedAt ?? '',
      fuelQuoteLocation: approvalDetails?.fuelQuoteLocation ?? request.fuelQuoteLocation ?? '',
      fuelQuoteProvince: approvalDetails?.fuelQuoteProvince ?? request.fuelQuoteProvince ?? '',
      fuelQuoteMunicipality: approvalDetails?.fuelQuoteMunicipality ?? request.fuelQuoteMunicipality ?? '',
      approvedAt,
    };

    setRequestRecords((current) =>
      current.map((entry) =>
        entry.id === request.id
          ? updatedRequest
          : entry
      )
    );
    if (nextStatus === 'Approved' && previousAssignedDriverId !== nextAssignedDriverId) {
      setDriverRecords((current) =>
        current.map((driver) => {
          if (previousAssignedDriverId && driver.id === previousAssignedDriverId) {
            return {
              ...driver,
              status: 'available',
            };
          }

          if (nextAssignedDriverId && driver.id === nextAssignedDriverId) {
            return {
              ...driver,
              status: 'assigned',
            };
          }

          return driver;
        })
      );
    }

    if (nextStatus === 'Rejected') {
      if (request.assignedVehicleId) {
        setVehicleRecords((current) =>
          current.map((vehicle) =>
            vehicle.id === request.assignedVehicleId
              ? {
                  ...vehicle,
                  status: 'available',
                }
              : vehicle
          )
        );
      }

      if (request.assignedDriverId) {
        setDriverRecords((current) =>
          current.map((driver) =>
            driver.id === request.assignedDriverId
              ? {
                  ...driver,
                  status: 'available',
                }
              : driver
          )
        );
      }
    }

    appendAuditEntry({
      category: 'request',
      action: `Marked request as ${nextStatus}`,
      target: request.requestNo,
      branch: request.branch,
      details: `${currentSessionUser.name} changed ${request.requestNo} to ${nextStatus}.`,
    });
    showToast(`${request.requestNo} marked as ${nextStatus.toLowerCase()}.`, 'success', 'Request updated');
    return true;
  }

  function handleRejectRequest(request) {
    setSelectedReviewRequest(request);
    setRejectionRemarks(request.rejectionReason || '');
    setRejectionModalOpen(true);
  }

  function handleCloseRejectionModal() {
    setRejectionModalOpen(false);
    setSelectedReviewRequest(null);
    setRejectionRemarks('');
  }

  async function handleRejectSubmit(event) {
    event.preventDefault();

    if (!['approver', 'admin'].includes(userMode) || !selectedReviewRequest) {
      return;
    }

    if (
      userMode === 'approver'
      && selectedReviewRequest?.approverId
      && selectedReviewRequest.approverId !== currentSessionUser.id
    ) {
      showToast('This request is assigned to an admin approver.', 'warning', 'Rejection blocked');
      return;
    }

    const trimmedRemarks = rejectionRemarks.trim();

    if (!trimmedRemarks) {
      showToast('Add rejection remarks before rejecting the request.', 'warning', 'Remarks required');
      return;
    }

    if (supabase) {
      try {
        await reviewLiveRequest(
          supabase,
          selectedReviewRequest,
          currentSessionUser,
          'Rejected',
          trimmedRemarks
        );
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'request',
          action: 'Rejected request',
          target: selectedReviewRequest.requestNo,
          branch: selectedReviewRequest.branch,
          details: `Rejected ${selectedReviewRequest.requestNo} with remarks: ${trimmedRemarks}`,
        });
        showToast(`${selectedReviewRequest.requestNo} marked as rejected.`, 'warning', 'Request rejected');
        handleCloseRejectionModal();
      } catch (error) {
        showToast(error.message || 'Unable to reject the request.', 'danger', 'Update failed');
      }

      return;
    }

    setRequestRecords((current) =>
      current.map((entry) =>
        entry.id === selectedReviewRequest.id
          ? {
              ...entry,
              status: 'Rejected',
              rejectionReason: trimmedRemarks,
              approver: currentSessionUser.name,
              approverId: currentSessionUser.id,
            }
          : entry
      )
    );
    if (selectedReviewRequest.assignedVehicleId) {
      setVehicleRecords((current) =>
        current.map((vehicle) =>
          vehicle.id === selectedReviewRequest.assignedVehicleId
            ? {
                ...vehicle,
                status: 'available',
              }
            : vehicle
        )
      );
    }
    if (selectedReviewRequest.assignedDriverId) {
      setDriverRecords((current) =>
        current.map((driver) =>
          driver.id === selectedReviewRequest.assignedDriverId
            ? {
                ...driver,
                status: 'available',
              }
            : driver
        )
      );
    }
    appendAuditEntry({
      category: 'request',
      action: 'Rejected request',
      target: selectedReviewRequest.requestNo,
      branch: selectedReviewRequest.branch,
      details: `Rejected ${selectedReviewRequest.requestNo} with remarks: ${trimmedRemarks}`,
    });
    showToast(`${selectedReviewRequest.requestNo} marked as rejected.`, 'warning', 'Request rejected');
    handleCloseRejectionModal();
  }

  function handlePrintRequest(request, previewWindow = null) {
    if (!canPrintRequestStatus(request?.status)) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
      showToast('PDF access is only available for approved requests and later statuses.', 'warning', 'PDF unavailable');
      return false;
    }
    return openApprovedRequestPdf(request, previewWindow);
  }

  async function handleAssignmentSubmit(event) {
    event.preventDefault();

    if (!selectedAssignmentRequest) {
      return;
    }

    if (!assignmentVehicleId) {
      showToast('Select a vehicle before saving the assignment.', 'warning', 'Vehicle required');
      return;
    }

    const nextVehicle = vehicleRecords.find((vehicle) => vehicle.id === assignmentVehicleId);
    if (nextVehicle && selectedAssignmentRequest.assignedDriverId) {
      const currentDriver = driverRecords.find((driver) => driver.id === selectedAssignmentRequest.assignedDriverId);
      const validation = getDriverAssignmentValidation(currentDriver, nextVehicle);
      if (!validation.isValid) {
        showToast(getDriverAssignmentValidationMessage(validation), 'warning', 'Driver validation');
        return;
      }
    }

    if (supabase) {
      try {
        await updateLiveRequestVehicleAssignment(
          supabase,
          selectedAssignmentRequest,
          assignmentVehicleId
        );
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'request',
          action: 'Updated vehicle assignment',
          target: selectedAssignmentRequest.requestNo,
          branch: selectedAssignmentRequest.branch,
          details: `Assigned ${nextVehicle?.vehicleName || 'Unassigned'} to ${selectedAssignmentRequest.requestNo}.`,
        });
        showToast(`${selectedAssignmentRequest.requestNo} vehicle assignment updated.`, 'success', 'Assignment updated');
        handleCloseAssignmentModal();
      } catch (error) {
        showToast(error.message || 'Unable to update the assigned vehicle.', 'danger', 'Assignment failed');
      }

      return;
    }

    setRequestRecords((current) =>
      current.map((entry) =>
        entry.id === selectedAssignmentRequest.id
          ? {
              ...entry,
              assignedVehicle: nextVehicle?.vehicleName || 'Unassigned',
              assignedVehicleId: assignmentVehicleId,
            }
          : entry
      )
    );

    setVehicleRecords((current) =>
      current.map((vehicle) => {
        if (
          selectedAssignmentRequest.assignedVehicleId
          && vehicle.id === selectedAssignmentRequest.assignedVehicleId
          && vehicle.status === 'reserved'
        ) {
          return {
            ...vehicle,
            status: 'available',
          };
        }

        if (assignmentVehicleId && vehicle.id === assignmentVehicleId) {
          return {
            ...vehicle,
            status: 'reserved',
          };
        }

        return vehicle;
      })
    );

    appendAuditEntry({
      category: 'request',
      action: 'Updated vehicle assignment',
      target: selectedAssignmentRequest.requestNo,
      branch: selectedAssignmentRequest.branch,
      details: `Assigned ${nextVehicle?.vehicleName || 'Unassigned'} to ${selectedAssignmentRequest.requestNo}.`,
    });
    showToast(`${selectedAssignmentRequest.requestNo} vehicle assignment updated.`, 'success', 'Assignment updated');
    handleCloseAssignmentModal();
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!newPassword || !confirmPassword) {
      showToast('Enter and confirm your new password.', 'warning', 'Missing details');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Use at least 8 characters for the new password.', 'warning', 'Weak password');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'warning', 'Password mismatch');
      return;
    }

    if (!supabase) {
      showToast('Supabase is not configured for password updates.', 'danger', 'Profile settings');
      return;
    }

    if (!currentPassword) {
      showToast('Enter your current password before saving.', 'warning', 'Current password required');
      return;
    }

    try {
      setIsSavingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      appendAuditEntry({
        category: 'security',
        action: 'Changed account password',
        target: currentSessionUser.email,
        details: 'Password updated from profile settings in live mode.',
      });
      showToast('Your password has been updated.', 'success', 'Profile settings');
      handleCloseProfileModal();
    } catch (error) {
      showToast(error.message || 'Unable to update your password.', 'danger', 'Profile settings');
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleOpenUserSettingsModal(user = null) {
    setUserSettingsForm(
      user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            initialEmail: user.email,
            role: user.role,
            branchId: user.branchId || findBranchId(branchRecords, user.branch),
            branchName: user.branch,
            password: '',
            confirmPassword: '',
          }
        : createUserSettingsForm(branchOptions[0]?.id || '')
    );
    setUserSettingsModalOpen(true);
  }

  function handleOpenBranchSettingsModal(branch = null) {
    setBranchSettingsForm(
      branch
        ? {
            id: branch.id,
            code: branch.code || '',
            name: branch.name,
            address: branch.address || '',
            serviceRegion: branch.serviceRegion || 'other',
            isActive: branch.isActive !== false,
          }
        : createBranchSettingsForm()
    );
    setBranchSettingsModalOpen(true);
  }

  function handleCloseBranchSettingsModal() {
    setBranchSettingsModalOpen(false);
  }

  function handleBranchSettingsFieldChange(field, value) {
    setBranchSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleBranchSettingsSubmit(event) {
    event.preventDefault();

    if (!branchSettingsForm.code.trim() || !branchSettingsForm.name.trim()) {
      showToast('Enter a branch code and branch name.', 'warning', 'Missing details');
      return;
    }

    if (supabase) {
      try {
        await saveLiveBranch(supabase, branchSettingsForm);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'branch',
          action: branchSettingsForm.id ? 'Updated branch' : 'Created branch',
          target: branchSettingsForm.name.trim(),
          details: `${branchSettingsForm.id ? 'Updated' : 'Created'} branch ${branchSettingsForm.code.trim().toUpperCase()} in live mode.`,
        });
        showToast(branchSettingsForm.id ? 'Branch updated.' : 'Branch created.', 'success', 'Settings saved');
        handleCloseBranchSettingsModal();
      } catch (error) {
        showToast(error.message || 'Unable to save the branch.', 'danger', 'Settings failed');
      }

      return;
    }

    const nextBranch = {
      id: branchSettingsForm.id || createId('br'),
      code: branchSettingsForm.code.trim().toUpperCase(),
      name: branchSettingsForm.name.trim(),
      address: branchSettingsForm.address.trim(),
      serviceRegion: branchSettingsForm.serviceRegion === 'panay' ? 'panay' : 'other',
      isActive: branchSettingsForm.isActive,
      utilization: branchSettingsForm.id
        ? branchRecords.find((branch) => branch.id === branchSettingsForm.id)?.utilization || 0
        : 0,
      assignedUsers: branchSettingsForm.id
        ? branchRecords.find((branch) => branch.id === branchSettingsForm.id)?.assignedUsers || 0
        : 0,
      assignedDrivers: branchSettingsForm.id
        ? branchRecords.find((branch) => branch.id === branchSettingsForm.id)?.assignedDrivers || 0
        : 0,
      assignedVehicles: branchSettingsForm.id
        ? branchRecords.find((branch) => branch.id === branchSettingsForm.id)?.assignedVehicles || 0
        : 0,
    };

    setBranchRecords((current) =>
      branchSettingsForm.id
        ? current.map((branch) => (branch.id === branchSettingsForm.id ? nextBranch : branch))
        : [...current, nextBranch]
    );

    appendAuditEntry({
      category: 'branch',
      action: branchSettingsForm.id ? 'Updated branch' : 'Created branch',
      target: nextBranch.name,
      details: `${branchSettingsForm.id ? 'Updated' : 'Created'} branch ${nextBranch.code}.`,
    });
    showToast(branchSettingsForm.id ? 'Branch updated.' : 'Branch added.', 'success', 'Settings saved');
    handleCloseBranchSettingsModal();
  }

  async function handleDeleteBranch(branch) {
    if (!window.confirm(`Delete branch "${branch.name}"? Linked records will be preserved and the branch will be removed from the active settings list.`)) {
      return;
    }

    if (supabase) {
      try {
        await deleteLiveBranch(supabase, branch);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'branch',
          action: 'Archived branch',
          target: branch.name,
          details: `Archived branch ${branch.code || branch.name} in live mode.`,
        });
        showToast('Branch removed from the active list.', 'success', 'Settings saved');
      } catch (error) {
        showToast(error.message || 'Unable to archive the branch right now.', 'danger', 'Delete failed');
      }

      return;
    }

    setBranchRecords((current) => current.filter((entry) => entry.id !== branch.id));
    appendAuditEntry({
      category: 'branch',
      action: 'Archived branch',
      target: branch.name,
      details: `Archived branch ${branch.code || branch.name}.`,
    });
    showToast('Branch removed from the active list.', 'success', 'Settings saved');
  }

  function handleCloseUserSettingsModal() {
    setUserSettingsModalOpen(false);
  }

  async function handleUserSettingsSubmit(event) {
    event.preventDefault();

    if (!userSettingsForm.name.trim() || !userSettingsForm.email.trim()) {
      showToast('Enter a name and email for the user profile.', 'warning', 'Missing details');
      return;
    }

    if (!supabase) {
      showToast('Supabase is not configured for profile changes.', 'danger', 'Settings failed');
      return;
    }

    const isEditingUser = Boolean(userSettingsForm.id);
    const hasPasswordInput = Boolean(userSettingsForm.password || userSettingsForm.confirmPassword);

    if (!isEditingUser) {
      if (!userSettingsForm.password) {
        showToast('Enter a temporary password for the new user.', 'warning', 'Password required');
        return;
      }

      if (userSettingsForm.password.length < 8) {
        showToast('Use at least 8 characters for the temporary password.', 'warning', 'Weak password');
        return;
      }

      if (userSettingsForm.password !== userSettingsForm.confirmPassword) {
        showToast('Password and confirmation do not match.', 'warning', 'Password mismatch');
        return;
      }
    } else if (hasPasswordInput) {
      if (!userSettingsForm.password || !userSettingsForm.confirmPassword) {
        showToast('Enter and confirm the new password.', 'warning', 'Missing password');
        return;
      }

      if (userSettingsForm.password.length < 8) {
        showToast('Use at least 8 characters for the new password.', 'warning', 'Weak password');
        return;
      }

      if (userSettingsForm.password !== userSettingsForm.confirmPassword) {
        showToast('New password and confirmation do not match.', 'warning', 'Password mismatch');
        return;
      }
    }

    try {
      let createResult = null;

      if (userSettingsForm.id) {
        await updateLiveProfile(supabase, userSettingsForm);
      } else {
        createResult = await createLiveUser(supabase, userSettingsForm);
      }

      await refreshLiveData(currentSessionUser);
      appendAuditEntry({
        category: 'user',
        action: userSettingsForm.id ? 'Updated user profile' : 'Created user account',
        target: userSettingsForm.email.trim(),
        details: userSettingsForm.id
          ? `Updated user ${userSettingsForm.name.trim()} in live mode.`
          : `Created ${userSettingsForm.role.trim()} account for ${userSettingsForm.name.trim()} in live mode.`,
      });
      showToast(
        userSettingsForm.id
          ? 'User profile updated.'
          : createResult?.requiresEmailConfirmation
            ? 'User account created. Email confirmation may still be required before first login.'
            : 'User account created.',
        'success',
        'Settings saved'
      );
      handleCloseUserSettingsModal();
    } catch (error) {
      showToast(error.message || 'Unable to update the user profile.', 'danger', 'Settings failed');
    }
  }

  async function handleDeleteUser(user) {
    const currentEmail = currentSessionUser.email.toLowerCase();
    const userEmail = user.email.toLowerCase();

    if ((currentSessionUser.id && user.id === currentSessionUser.id) || userEmail === currentEmail) {
      appendAuditEntry({
        category: 'security',
        action: 'Blocked user deletion',
        target: user.email,
        details: 'Attempted to delete the currently signed-in account.',
      });
      showToast('You cannot delete the account you are currently using.', 'warning', 'Delete blocked');
      return;
    }

    if (!window.confirm(`Delete user "${user.name}"? The account will be removed from the active user list.`)) {
      return;
    }

    if (!supabase) {
      showToast('Supabase is not configured for profile deletion.', 'danger', 'Delete failed');
      return;
    }

    try {
      await deleteLiveProfile(supabase, user);
      await refreshLiveData(currentSessionUser);
      appendAuditEntry({
        category: 'user',
        action: 'Removed user profile',
        target: user.email,
        branch: user.branch,
        details: `Removed user ${user.name} from the active user list in live mode.`,
      });
      showToast('User removed from the active list.', 'success', 'Settings saved');
    } catch (error) {
      showToast(error.message || 'Unable to delete the user profile.', 'danger', 'Delete failed');
    }
  }

  function handleOpenDriverSettingsModal(driver = null) {
    if (!canManageDriverSettings) {
      showToast('Only admins and approvers can manage driver settings.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && !approverManagedBranchId) {
      showToast('Your approver account needs a branch assignment before editing drivers.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && driver && !isDriverInApproverScope(driver)) {
      showToast('You can only edit drivers assigned to your branch.', 'warning', 'Permission denied');
      return;
    }

    const defaultDriverBranchId = userMode === 'approver'
      ? approverManagedBranchId
      : (branchOptions[0]?.id || '');

    setDriverSettingsForm(
      driver
        ? {
            id: driver.id,
            profileId: driver.profileId || '',
            fullName: driver.fullName,
            employeeId: driver.employeeId,
            branchId: userMode === 'approver'
              ? approverManagedBranchId
              : (
                  driver.branchId
                  || defaultDriverBranchId
                  || findBranchId(branchRecords, driver.branch)
                ),
            branchName: driver.branch,
            status: driver.status,
            licenseNumber: driver.licenseNumber,
            licenseRestrictions: driver.licenseRestrictions || driver.restrictions || '',
            licenseExpiry: driver.licenseExpiry,
            contactNumber: driver.contactNumber || '',
          }
        : createDriverSettingsForm(defaultDriverBranchId)
    );
    setDriverSettingsModalOpen(true);
  }

  function handleCloseDriverSettingsModal() {
    setDriverSettingsModalOpen(false);
  }

  async function handleDriverSettingsSubmit(event) {
    event.preventDefault();

    if (!canManageDriverSettings) {
      showToast('Only admins and approvers can manage driver settings.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && !approverManagedBranchId) {
      showToast('Your approver account needs a branch assignment before editing drivers.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && driverSettingsForm.id) {
      const existingDriver = driverRecords.find((driver) => driver.id === driverSettingsForm.id);

      if (!isDriverInApproverScope(existingDriver)) {
        showToast('You can only edit drivers assigned to your branch.', 'warning', 'Permission denied');
        return;
      }
    }

    const scopedDriverSettingsForm = userMode === 'approver'
      ? {
          ...driverSettingsForm,
          branchId: approverManagedBranchId,
        }
      : driverSettingsForm;

    if (!scopedDriverSettingsForm.fullName.trim() || !scopedDriverSettingsForm.employeeId.trim()) {
      showToast('Enter the driver name and employee ID.', 'warning', 'Missing details');
      return;
    }

    if (!supabase) {
      showToast('Supabase is not configured for driver changes.', 'danger', 'Settings failed');
      return;
    }

    try {
      await saveLiveDriver(supabase, scopedDriverSettingsForm);
      await refreshLiveData(currentSessionUser);
      appendAuditEntry({
        category: 'driver',
        action: scopedDriverSettingsForm.id ? 'Updated driver record' : 'Created driver record',
        target: scopedDriverSettingsForm.fullName.trim(),
        branch: branchOptions.find((branch) => branch.id === scopedDriverSettingsForm.branchId)?.name || currentSessionUser.branch,
        details: `Saved driver ${scopedDriverSettingsForm.fullName.trim()} in live mode.`,
      });
      showToast('Driver record updated.', 'success', 'Settings saved');
      handleCloseDriverSettingsModal();
    } catch (error) {
      showToast(error.message || 'Unable to save the driver record.', 'danger', 'Settings failed');
    }
  }

  async function handleDeleteDriver(driver) {
    if (!canManageDriverSettings) {
      showToast('Only admins and approvers can delete driver records.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && !approverManagedBranchId) {
      showToast('Your approver account needs a branch assignment before deleting drivers.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && !isDriverInApproverScope(driver)) {
      showToast('You can only delete drivers assigned to your branch.', 'warning', 'Permission denied');
      return;
    }

    if (!window.confirm(`Delete driver "${driver.fullName}"? This cannot be undone.`)) {
      return;
    }

    if (!supabase) {
      showToast('Supabase is not configured for driver deletion.', 'danger', 'Delete failed');
      return;
    }

    try {
      await deleteLiveDriver(supabase, driver);
      await refreshLiveData(currentSessionUser);
      appendAuditEntry({
        category: 'driver',
        action: 'Deleted driver record',
        target: driver.fullName,
        branch: driver.branch,
        details: `Deleted driver ${driver.fullName} in live mode.`,
      });
      showToast('Driver deleted successfully.', 'success', 'Settings saved');
    } catch (error) {
      showToast(error.message || 'Unable to delete the driver record.', 'danger', 'Delete failed');
    }
  }

  function handleOpenMaintenanceModal(maintenance = null) {
    if (!['admin', 'approver', 'driver'].includes(userMode)) {
      showToast('Only admins, approvers, and drivers can log maintenance.', 'warning', 'Permission denied');
      setMaintenanceModalOpen(false);
      return;
    }

    const defaultBranchId = findBranchId(branchRecords, currentSessionUser.branch);

    if (maintenance) {
      const matchedVehicle = vehicleRecords.find((vehicle) => {
        if (maintenance.vehicleId && vehicle.id === maintenance.vehicleId) {
          return true;
        }

        return vehicle.vehicleName === maintenance.vehicle;
      });

      const resolvedBranchId = maintenance.branchId
        || matchedVehicle?.branchId
        || findBranchId(branchRecords, maintenance.branch)
        || defaultBranchId;

      setMaintenanceForm({
        id: maintenance.id,
        vehicleId: maintenance.vehicleId || matchedVehicle?.id || '',
        branchId: resolvedBranchId,
        maintenanceType: maintenance.maintenanceType,
        scheduleDate: maintenance.scheduleDate,
        completedDate: maintenance.completedDate || '',
        provider: maintenance.provider || '',
        amount: String(maintenance.amount ?? 0),
        status: maintenance.status,
        remarks: maintenance.remarks || '',
      });
      setMaintenanceModalOpen(true);
      return;
    }

    setMaintenanceForm(
      createMaintenanceForm(vehicleRecords.find(v => v.branchId === defaultBranchId)?.id || '', defaultBranchId)
    );
    setMaintenanceModalOpen(true);
  }

  function handleCloseMaintenanceModal() {
    setMaintenanceModalOpen(false);
  }

  function handleMaintenanceFieldChange(field, value) {
    setMaintenanceForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleMaintenanceSubmit(event) {
    event.preventDefault();

    if (!['admin', 'approver', 'driver'].includes(userMode)) {
      showToast('Only admins, approvers, and drivers can save maintenance logs.', 'warning', 'Permission denied');
      setMaintenanceModalOpen(false);
      return;
    }

    if (!maintenanceForm.vehicleId || !maintenanceForm.maintenanceType.trim()) {
      showToast('Select a vehicle and enter the maintenance type.', 'warning', 'Missing details');
      return;
    }

    if (supabase) {
      try {
        await saveLiveMaintenance(supabase, maintenanceForm);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'maintenance',
          action: maintenanceForm.id ? 'Updated maintenance log' : 'Created maintenance log',
          target: maintenanceForm.maintenanceType.trim(),
          branch: branchRecords.find((branch) => branch.id === maintenanceForm.branchId)?.name || currentSessionUser.branch,
          details: `Saved maintenance log in live mode for vehicle ${maintenanceForm.vehicleId}.`,
        });
        showToast('Maintenance record saved.', 'success', 'Settings saved');
        handleCloseMaintenanceModal();
      } catch (error) {
        showToast(error.message || 'Unable to save the maintenance record.', 'danger', 'Settings failed');
      }

      return;
    }

    const vehicleRecord = vehicleRecords.find((v) => v.id === maintenanceForm.vehicleId);
    const branchName = branchRecords.find((b) => b.id === maintenanceForm.branchId)?.name || 'Unknown';
    
    const nextLog = {
      id: maintenanceForm.id || createId('mnt'),
      vehicle: vehicleRecord?.vehicleName || 'Unknown vehicle',
      vehicleId: maintenanceForm.vehicleId,
      branch: branchName,
      branchId: maintenanceForm.branchId,
      maintenanceType: maintenanceForm.maintenanceType.trim(),
      scheduleDate: maintenanceForm.scheduleDate,
      completedDate: maintenanceForm.completedDate,
      provider: maintenanceForm.provider.trim(),
      amount: Number(maintenanceForm.amount || 0),
      status: maintenanceForm.status,
      remarks: maintenanceForm.remarks.trim(),
    };

    setMaintenanceRecords((current) =>
      maintenanceForm.id
        ? current.map((log) => (log.id === maintenanceForm.id ? nextLog : log))
        : [nextLog, ...current]
    );

    appendAuditEntry({
      category: 'maintenance',
      action: maintenanceForm.id ? 'Updated maintenance log' : 'Created maintenance log',
      target: nextLog.vehicle,
      branch: nextLog.branch,
      details: `${maintenanceForm.id ? 'Updated' : 'Created'} ${nextLog.maintenanceType} log for ${nextLog.vehicle}.`,
    });
    showToast(`Maintenance log ${maintenanceForm.id ? 'updated' : 'added'} successfully.`, 'success', 'Settings saved');
    handleCloseMaintenanceModal();
  }

  function handleOpenIncidentModal(incident = null) {
    setIncidentForm(
      incident
        ? {
            id: incident.id,
            vehicleId: incident.vehicleId,
            location: incident.location,
            description: incident.description,
            status: incident.status,
            photoUrl: incident.photo_url || incident.photoUrl || '',
            photoFile: null,
          }
        : createIncidentForm()
    );
    setIncidentModalOpen(true);
  }

  function handleCloseIncidentModal() {
    setIncidentModalOpen(false);
  }

  function handleIncidentFieldChange(field, value) {
    setIncidentForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleIncidentSubmit(event) {
    event.preventDefault();

    if (!incidentForm.vehicleId || !incidentForm.location.trim() || !incidentForm.description.trim()) {
      showToast('Select a vehicle and provide the incident location/description.', 'warning', 'Missing details');
      return;
    }

    if (supabase) {
      try {
        let finalPhotoUrl = incidentForm.photoUrl;

        if (incidentForm.photoFile) {
          showToast('Uploading incident photo...', 'info', 'Uploading');
          finalPhotoUrl = await uploadIncidentPhoto(supabase, incidentForm.photoFile);
        }

        await saveLiveIncident(supabase, { ...incidentForm, photoUrl: finalPhotoUrl });
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'incident',
          action: incidentForm.id ? 'Updated safety incident' : 'Created safety incident',
          target: incidentForm.location.trim(),
          details: `Saved safety incident report for vehicle ${incidentForm.vehicleId} in live mode.`,
        });
        showToast('Safety incident report saved.', 'success', 'Settings saved');
        handleCloseIncidentModal();
      } catch (error) {
        showToast(error.message || 'Unable to save the incident report.', 'danger', 'Submission failed');
      }

      return;
    }

    const vehicleRecord = vehicleRecords.find((v) => v.id === incidentForm.vehicleId);
    
    const nextIncident = {
      id: incidentForm.id || createId('inc'),
      vehicle: vehicleRecord?.vehicleName || 'Unknown vehicle',
      vehicleId: incidentForm.vehicleId,
      location: incidentForm.location.trim(),
      description: incidentForm.description.trim(),
      status: incidentForm.status,
    };

    setIncidentRecords((current) =>
      incidentForm.id
        ? current.map((inc) => (inc.id === incidentForm.id ? nextIncident : inc))
        : [nextIncident, ...current]
    );

    appendAuditEntry({
      category: 'incident',
      action: incidentForm.id ? 'Updated safety incident' : 'Created safety incident',
      target: nextIncident.vehicle,
      details: `${incidentForm.id ? 'Updated' : 'Created'} incident at ${nextIncident.location}.`,
    });
    showToast(`Safety incident ${incidentForm.id ? 'updated' : 'added'} successfully.`, 'success', 'Settings saved');
    handleCloseIncidentModal();
  }

  function handleOpenVehicleSettingsModal(vehicle = null) {
    if (!canManageVehicleSettings) {
      showToast('Only admins and approvers can manage vehicle settings.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && !approverManagedBranchId) {
      showToast('Your approver account needs a branch assignment before editing vehicles.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && vehicle && !isVehicleInApproverScope(vehicle)) {
      showToast('You can only edit vehicles assigned to your branch.', 'warning', 'Permission denied');
      return;
    }

    const defaultBranchId = userMode === 'approver'
      ? approverManagedBranchId
      : (branchOptions[0]?.id || '');

    setVehicleSettingsForm(
      vehicle
        ? {
            id: vehicle.id,
            vehicleName: vehicle.vehicleName,
            plateNumber: vehicle.plateNumber,
            branchId: userMode === 'approver'
              ? approverManagedBranchId
              : (vehicle.branchId || findBranchId(branchRecords, vehicle.branch)),
            branchName: vehicle.branch,
            typeId: vehicle.typeId || availableVehicleTypeRecords.find((type) => type.name === vehicle.type)?.id || vehicle.type,
            status: vehicle.status,
            fuelType: vehicle.fuelType,
            seatingCapacity: String(vehicle.seatingCapacity),
            odometerCurrent: String(vehicle.odometerCurrent),
            oilChangeReminderEnabled: Boolean(vehicle.oilChangeReminderEnabled),
            oilChangeIntervalKm: vehicle.oilChangeIntervalKm === null || typeof vehicle.oilChangeIntervalKm === 'undefined'
              ? ''
              : String(vehicle.oilChangeIntervalKm),
            oilChangeIntervalMonths: vehicle.oilChangeIntervalMonths === null || typeof vehicle.oilChangeIntervalMonths === 'undefined'
              ? ''
              : String(vehicle.oilChangeIntervalMonths),
            oilChangeLastOdometer: vehicle.oilChangeLastOdometer === null || typeof vehicle.oilChangeLastOdometer === 'undefined'
              ? String(vehicle.odometerCurrent || 0)
              : String(vehicle.oilChangeLastOdometer),
            oilChangeLastChangedOn: vehicle.oilChangeLastChangedOn || new Date().toISOString().slice(0, 10),
            registrationExpiry: vehicle.registrationExpiry,
            insuranceExpiry: vehicle.insuranceExpiry,
            fuelEfficiency: String(vehicle.fuelEfficiency || 10),
            isOdoDefective: vehicle.isOdoDefective || false,
            requiredRestrictions: vehicle.requiredRestrictions || vehicle.required_restrictions || '',
          }
        : createVehicleSettingsForm(defaultBranchId, availableVehicleTypeRecords[0]?.id || '')
    );
    setVehicleSettingsModalOpen(true);
  }

  function handleCloseVehicleSettingsModal() {
    setVehicleSettingsModalOpen(false);
  }

  async function handleVehicleSettingsSubmit(event) {
    event.preventDefault();

    if (!canManageVehicleSettings) {
      showToast('Only admins and approvers can manage vehicle settings.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && !approverManagedBranchId) {
      showToast('Your approver account needs a branch assignment before editing vehicles.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && vehicleSettingsForm.id) {
      const existingVehicle = vehicleRecords.find((vehicle) => vehicle.id === vehicleSettingsForm.id);

      if (!isVehicleInApproverScope(existingVehicle)) {
        showToast('You can only edit vehicles assigned to your branch.', 'warning', 'Permission denied');
        return;
      }
    }

    const scopedVehicleSettingsForm = userMode === 'approver'
      ? {
          ...vehicleSettingsForm,
          branchId: approverManagedBranchId,
        }
      : vehicleSettingsForm;

    if (!scopedVehicleSettingsForm.vehicleName.trim() || !scopedVehicleSettingsForm.plateNumber.trim()) {
      showToast('Enter the vehicle name and plate number.', 'warning', 'Missing details');
      return;
    }

    const oilChangeIntervalKmValue = Number.parseInt(String(scopedVehicleSettingsForm.oilChangeIntervalKm ?? ''), 10);
    const oilChangeIntervalMonthsValue = Number.parseInt(String(scopedVehicleSettingsForm.oilChangeIntervalMonths ?? ''), 10);
    const hasOilChangeIntervalKm = Number.isFinite(oilChangeIntervalKmValue) && oilChangeIntervalKmValue > 0;
    const hasOilChangeIntervalMonths = Number.isFinite(oilChangeIntervalMonthsValue) && oilChangeIntervalMonthsValue > 0;
    const hasOilChangeLastChangedOn = Boolean(String(scopedVehicleSettingsForm.oilChangeLastChangedOn || '').trim());
    const oilChangeLastOdometerValue = Number.parseFloat(String(scopedVehicleSettingsForm.oilChangeLastOdometer ?? ''));
    const hasOilChangeLastOdometer = String(scopedVehicleSettingsForm.oilChangeLastOdometer ?? '').trim() !== '';

    if (scopedVehicleSettingsForm.oilChangeReminderEnabled && !hasOilChangeIntervalKm && !hasOilChangeIntervalMonths) {
      showToast('Set a change-oil interval in KM or months.', 'warning', 'Oil reminder settings');
      return;
    }

    if (hasOilChangeLastOdometer && !Number.isFinite(oilChangeLastOdometerValue)) {
      showToast('Last oil-change odometer must be a valid number.', 'warning', 'Oil reminder settings');
      return;
    }

    if (hasOilChangeLastOdometer && oilChangeLastOdometerValue < 0) {
      showToast('Last oil-change odometer cannot be negative.', 'warning', 'Oil reminder settings');
      return;
    }

    if (scopedVehicleSettingsForm.oilChangeReminderEnabled && !hasOilChangeLastChangedOn) {
      showToast('Set the last oil-change date to enable reminders.', 'warning', 'Oil reminder settings');
      return;
    }

    if (supabase) {
      try {
        await saveLiveVehicle(supabase, scopedVehicleSettingsForm, availableVehicleTypeRecords);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'vehicle',
          action: scopedVehicleSettingsForm.id ? 'Updated vehicle record' : 'Created vehicle record',
          target: scopedVehicleSettingsForm.vehicleName.trim(),
          branch: branchOptions.find((branch) => branch.id === scopedVehicleSettingsForm.branchId)?.name || currentSessionUser.branch,
          details: `Saved vehicle ${scopedVehicleSettingsForm.vehicleName.trim()} in live mode.`,
        });
        showToast('Vehicle record updated.', 'success', 'Settings saved');
        handleCloseVehicleSettingsModal();
      } catch (error) {
        showToast(error.message || 'Unable to save the vehicle record.', 'danger', 'Settings failed');
      }

      return;
    }

    const branchName = branchOptions.find((branch) => branch.id === scopedVehicleSettingsForm.branchId)?.name || 'Unassigned';
    const vehicleTypeName = availableVehicleTypeRecords.find((type) => type.id === scopedVehicleSettingsForm.typeId)?.name || scopedVehicleSettingsForm.typeId;
    const nextVehicle = {
      id: scopedVehicleSettingsForm.id || createId('veh'),
      plateNumber: scopedVehicleSettingsForm.plateNumber.trim(),
      vehicleName: scopedVehicleSettingsForm.vehicleName.trim(),
      type: vehicleTypeName,
      typeId: scopedVehicleSettingsForm.typeId,
      branch: branchName,
      branchId: scopedVehicleSettingsForm.branchId,
      status: scopedVehicleSettingsForm.status,
      fuelType: scopedVehicleSettingsForm.fuelType.trim(),
      seatingCapacity: Number(scopedVehicleSettingsForm.seatingCapacity || 0),
      odometerCurrent: Number(scopedVehicleSettingsForm.odometerCurrent || 0),
      oilChangeReminderEnabled: Boolean(scopedVehicleSettingsForm.oilChangeReminderEnabled),
      oilChangeIntervalKm: hasOilChangeIntervalKm ? oilChangeIntervalKmValue : null,
      oilChangeIntervalMonths: hasOilChangeIntervalMonths ? oilChangeIntervalMonthsValue : null,
      oilChangeLastOdometer: hasOilChangeLastOdometer && Number.isFinite(oilChangeLastOdometerValue)
        ? oilChangeLastOdometerValue
        : null,
      oilChangeLastChangedOn: hasOilChangeLastChangedOn ? String(scopedVehicleSettingsForm.oilChangeLastChangedOn).trim() : '',
      registrationExpiry: scopedVehicleSettingsForm.registrationExpiry,
      insuranceExpiry: scopedVehicleSettingsForm.insuranceExpiry,
      fuelEfficiency: Number(scopedVehicleSettingsForm.fuelEfficiency || 10),
      requiredRestrictions: scopedVehicleSettingsForm.requiredRestrictions.trim(),
      isOdoDefective: scopedVehicleSettingsForm.isOdoDefective || false,
      assignedDriver: 'Unassigned',
    };

    setVehicleRecords((current) =>
      scopedVehicleSettingsForm.id
        ? current.map((vehicle) => (vehicle.id === scopedVehicleSettingsForm.id ? nextVehicle : vehicle))
        : [nextVehicle, ...current]
    );

    appendAuditEntry({
      category: 'vehicle',
      action: scopedVehicleSettingsForm.id ? 'Updated vehicle record' : 'Created vehicle record',
      target: nextVehicle.vehicleName,
      branch: nextVehicle.branch,
      details: `${scopedVehicleSettingsForm.id ? 'Updated' : 'Created'} ${nextVehicle.type} vehicle ${nextVehicle.vehicleName}.`,
    });
    showToast(`Vehicle ${scopedVehicleSettingsForm.id ? 'updated' : 'added'} successfully.`, 'success', 'Settings saved');
    handleCloseVehicleSettingsModal();
  }

  async function handleDeleteVehicle(vehicle) {
    if (userMode !== 'admin') {
      showToast('Only admins can delete vehicle records.', 'warning', 'Permission denied');
      return;
    }

    if (!window.confirm(`Delete vehicle "${vehicle.vehicleName}"? This cannot be undone.`)) {
      return;
    }

    if (supabase) {
      try {
        await deleteLiveVehicle(supabase, vehicle);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'vehicle',
          action: 'Deleted vehicle record',
          target: vehicle.vehicleName,
          branch: vehicle.branch,
          details: `Deleted vehicle ${vehicle.vehicleName} in live mode.`,
        });
        showToast('Vehicle deleted successfully.', 'success', 'Settings saved');
      } catch (error) {
        showToast(error.message || 'Unable to delete the vehicle record.', 'danger', 'Delete failed');
      }

      return;
    }

    setVehicleRecords((current) => current.filter((entry) => entry.id !== vehicle.id));
    setRequestForm((current) =>
      current.assignedVehicleId === vehicle.id
        ? {
            ...current,
            assignedVehicleId: '',
          }
        : current
    );
    setAssignmentVehicleId((current) => (current === vehicle.id ? '' : current));
    setMaintenanceForm((current) =>
      current.vehicleId === vehicle.id
        ? {
            ...current,
            vehicleId: '',
          }
        : current
    );

    if (vehicleSettingsModalOpen && vehicleSettingsForm.id === vehicle.id) {
      handleCloseVehicleSettingsModal();
    }

    appendAuditEntry({
      category: 'vehicle',
      action: 'Deleted vehicle record',
      target: vehicle.vehicleName,
      branch: vehicle.branch,
      details: `Deleted vehicle ${vehicle.vehicleName} from the workspace.`,
    });
    showToast('Vehicle deleted successfully.', 'success', 'Settings saved');
  }

  function resolveBranchFromCsvToken(token) {
    const normalizedToken = normalizeComparableText(token);

    if (!normalizedToken) {
      return null;
    }

    return branchRecords.find((branch) => (
      normalizeComparableText(branch.id) === normalizedToken
      || normalizeComparableText(branch.code) === normalizedToken
      || normalizeComparableText(branch.name) === normalizedToken
    )) || null;
  }

  function resolveVehicleTypeFromCsvToken(token) {
    const normalizedToken = normalizeComparableText(token);

    if (!normalizedToken) {
      return null;
    }

    return availableVehicleTypeRecords.find((type) => (
      normalizeComparableText(type.id) === normalizedToken
      || normalizeComparableText(type.name) === normalizedToken
    )) || null;
  }

  async function handleImportUsersCsv(file) {
    if (!file) {
      return;
    }

    if (!supabase) {
      showToast('Supabase is required for user CSV import.', 'danger', 'Import failed');
      return;
    }

    const rows = parseCsvText(await file.text());

    if (!rows.length) {
      showToast('The selected CSV has no data rows.', 'warning', 'Import skipped');
      return;
    }

    const importScope = 'users';
    startSettingsImportProgress(importScope, rows.length, 'Importing users CSV');

    try {
      const usersByEmail = new Map(
        userRecords
          .filter((user) => user.email)
          .map((user) => [normalizeComparableText(user.email), user])
      );
      const errors = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const name = getCsvValue(row, ['full_name', 'name']);
        const email = normalizeComparableText(getCsvValue(row, ['email']));
        const roleLabel = normalizeRoleLabel(getCsvValue(row, ['role']));
        const branchToken = getCsvValue(row, ['branch_id', 'branch_code', 'branch_name', 'branch']);
        const branch = resolveBranchFromCsvToken(branchToken);
        const existingUser = usersByEmail.get(email);

        if (!name || !email || !roleLabel || !branch) {
          errors.push(`Row ${rowIndex + 2}: missing/invalid name, email, role, or branch.`);
          setSettingsImportProgressStep(importScope, rowIndex + 1);
          continue;
        }

        try {
          if (existingUser?.id) {
            await updateLiveProfile(supabase, {
              id: existingUser.id,
              name,
              email,
              role: roleLabel,
              branchId: branch.id,
            });
            updatedCount += 1;
          } else {
            const password = getCsvValue(row, ['password', 'temporary_password']) || generateTemporaryPassword();
            await createLiveUser(supabase, {
              name,
              email,
              role: roleLabel,
              branchId: branch.id,
              password,
              confirmPassword: password,
            });
            createdCount += 1;
          }
        } catch (error) {
          errors.push(`Row ${rowIndex + 2}: ${error.message || 'Unable to import user.'}`);
        } finally {
          setSettingsImportProgressStep(importScope, rowIndex + 1);
        }
      }

      let refreshErrorMessage = '';
      try {
        await refreshLiveData(currentSessionUser);
      } catch (error) {
        refreshErrorMessage = error.message || 'Live data refresh failed after import.';
      }
      appendAuditEntry({
        category: 'user',
        action: 'Imported users CSV',
        target: `${createdCount + updatedCount} row(s)`,
        details: `Created ${createdCount}, updated ${updatedCount}, failed ${errors.length}.`,
      });

      if (refreshErrorMessage) {
        showToast(`Users import saved but ${refreshErrorMessage}`, 'warning', 'CSV import');
        return;
      }

      if (errors.length) {
        showToast(`Users import finished with errors. Created ${createdCount}, updated ${updatedCount}, failed ${errors.length}. ${errors[0]}`, 'warning', 'CSV import');
        return;
      }

      showToast(`Users CSV imported. Created ${createdCount}, updated ${updatedCount}.`, 'success', 'CSV import');
    } finally {
      finishSettingsImportProgress(importScope);
    }
  }

  async function handleImportDriversCsv(file) {
    if (!file) {
      return;
    }

    if (!canManageDriverSettings) {
      showToast('Only admins and approvers can import drivers via CSV.', 'warning', 'Permission denied');
      return;
    }

    if (userMode === 'approver' && !approverManagedBranchId) {
      showToast('Your approver account needs a branch assignment before importing drivers.', 'warning', 'Permission denied');
      return;
    }

    if (!supabase) {
      showToast('Supabase is required for driver CSV import.', 'danger', 'Import failed');
      return;
    }

    const rows = parseCsvText(await file.text());

    if (!rows.length) {
      showToast('The selected CSV has no data rows.', 'warning', 'Import skipped');
      return;
    }

    const importScope = 'drivers';
    startSettingsImportProgress(importScope, rows.length, 'Importing drivers CSV');

    try {
      const driversByEmployeeId = new Map(
        driverRecords
          .filter((driver) => driver.employeeId)
          .map((driver) => [normalizeComparableText(driver.employeeId), driver])
      );
      const usersByEmail = new Map(
        userRecords
          .filter((user) => user.email)
          .map((user) => [normalizeComparableText(user.email), user])
      );
      const approverBranchRecord = userMode === 'approver'
        ? branchRecords.find((branch) => String(branch.id) === String(approverManagedBranchId)) || null
        : null;
      const errors = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const fullName = getCsvValue(row, ['full_name', 'name']);
        const employeeId = getCsvValue(row, ['employee_id', 'employee_no', 'employee']);
        const branchToken = getCsvValue(row, ['branch_id', 'branch_code', 'branch_name', 'branch']);
        const parsedBranch = resolveBranchFromCsvToken(branchToken);
        const branch = userMode === 'approver' && !branchToken
          ? approverBranchRecord
          : parsedBranch;
        const licenseNumber = getCsvValue(row, ['license_number']);
        const licenseExpiry = getCsvValue(row, ['license_expiry']);
        const contactNumber = getCsvValue(row, ['contact_number', 'contact']);
        const licenseRestrictions = getCsvValue(row, ['license_restrictions', 'restrictions']);
        const status = normalizeDriverStatus(getCsvValue(row, ['status']));
        const profileEmail = normalizeComparableText(getCsvValue(row, ['profile_email', 'linked_email']));
        const profileId = profileEmail ? (usersByEmail.get(profileEmail)?.id || '') : '';
        const existingDriver = driversByEmployeeId.get(normalizeComparableText(employeeId));

        if (
          userMode === 'approver'
          && branch
          && String(branch.id) !== String(approverManagedBranchId)
        ) {
          errors.push(`Row ${rowIndex + 2}: approver imports can only target your assigned branch.`);
          setSettingsImportProgressStep(importScope, rowIndex + 1);
          continue;
        }

        if (!fullName || !employeeId || !branch || !licenseNumber || !licenseExpiry) {
          errors.push(`Row ${rowIndex + 2}: missing/invalid full_name, employee_id, branch, license_number, or license_expiry.`);
          setSettingsImportProgressStep(importScope, rowIndex + 1);
          continue;
        }

        try {
          await saveLiveDriver(supabase, {
            id: existingDriver?.id || '',
            profileId,
            fullName,
            employeeId,
            branchId: branch.id,
            branchName: branch.name,
            status,
            licenseNumber,
            licenseRestrictions,
            licenseExpiry,
            contactNumber,
          });

          if (existingDriver?.id) {
            updatedCount += 1;
          } else {
            createdCount += 1;
          }
        } catch (error) {
          errors.push(`Row ${rowIndex + 2}: ${error.message || 'Unable to import driver.'}`);
        } finally {
          setSettingsImportProgressStep(importScope, rowIndex + 1);
        }
      }

      let refreshErrorMessage = '';
      try {
        await refreshLiveData(currentSessionUser);
      } catch (error) {
        refreshErrorMessage = error.message || 'Live data refresh failed after import.';
      }
      appendAuditEntry({
        category: 'driver',
        action: 'Imported drivers CSV',
        target: `${createdCount + updatedCount} row(s)`,
        details: `Created ${createdCount}, updated ${updatedCount}, failed ${errors.length}.`,
      });

      if (refreshErrorMessage) {
        showToast(`Drivers import saved but ${refreshErrorMessage}`, 'warning', 'CSV import');
        return;
      }

      if (errors.length) {
        showToast(`Drivers import finished with errors. Created ${createdCount}, updated ${updatedCount}, failed ${errors.length}. ${errors[0]}`, 'warning', 'CSV import');
        return;
      }

      showToast(`Drivers CSV imported. Created ${createdCount}, updated ${updatedCount}.`, 'success', 'CSV import');
    } finally {
      finishSettingsImportProgress(importScope);
    }
  }

  async function handleImportVehiclesCsv(file) {
    if (!file) {
      return;
    }

    if (userMode !== 'admin') {
      showToast('Only admins can import vehicles via CSV.', 'warning', 'Permission denied');
      return;
    }

    if (!supabase) {
      showToast('Supabase is required for vehicle CSV import.', 'danger', 'Import failed');
      return;
    }

    const rows = parseCsvText(await file.text());

    if (!rows.length) {
      showToast('The selected CSV has no data rows.', 'warning', 'Import skipped');
      return;
    }

    const importScope = 'vehicles';
    startSettingsImportProgress(importScope, rows.length, 'Importing vehicles CSV');

    try {
      const vehiclesByPlate = new Map(
        vehicleRecords
          .filter((vehicle) => vehicle.plateNumber)
          .map((vehicle) => [normalizeComparableText(vehicle.plateNumber), vehicle])
      );
      const errors = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const vehicleName = getCsvValue(row, ['vehicle_name', 'name']);
        const plateNumber = getCsvValue(row, ['plate_number', 'plate']);
        const branchToken = getCsvValue(row, ['branch_id', 'branch_code', 'branch_name', 'branch']);
        const typeToken = getCsvValue(row, ['type_id', 'type_name', 'vehicle_type', 'type']);
        const branch = resolveBranchFromCsvToken(branchToken);
        const vehicleType = resolveVehicleTypeFromCsvToken(typeToken);
        const existingVehicle = vehiclesByPlate.get(normalizeComparableText(plateNumber));

        if (!vehicleName || !plateNumber || !branch || !vehicleType) {
          errors.push(`Row ${rowIndex + 2}: missing/invalid vehicle_name, plate_number, branch, or type.`);
          setSettingsImportProgressStep(importScope, rowIndex + 1);
          continue;
        }

        try {
          await saveLiveVehicle(supabase, {
            id: existingVehicle?.id || '',
            vehicleName,
            plateNumber,
            branchId: branch.id,
            branchName: branch.name,
            typeId: vehicleType.id,
            status: normalizeVehicleStatus(getCsvValue(row, ['status'])),
            fuelType: getCsvValue(row, ['fuel_type']) || 'Diesel',
            seatingCapacity: getCsvValue(row, ['seating_capacity']) || '0',
            odometerCurrent: getCsvValue(row, ['odometer_current']) || '0',
            registrationExpiry: getCsvValue(row, ['registration_expiry']) || null,
            insuranceExpiry: getCsvValue(row, ['insurance_expiry']) || null,
            requiredRestrictions: getCsvValue(row, ['required_restrictions']),
            isOdoDefective: parseBooleanCsvValue(getCsvValue(row, ['is_odo_defective']), false),
            oilChangeReminderEnabled: parseBooleanCsvValue(getCsvValue(row, ['oil_change_reminder_enabled']), false),
            oilChangeIntervalKm: getCsvValue(row, ['oil_change_interval_km']),
            oilChangeIntervalMonths: getCsvValue(row, ['oil_change_interval_months']),
            oilChangeLastOdometer: getCsvValue(row, ['oil_change_last_odometer']),
            oilChangeLastChangedOn: getCsvValue(row, ['oil_change_last_changed_on']) || null,
          }, availableVehicleTypeRecords);

          if (existingVehicle?.id) {
            updatedCount += 1;
          } else {
            createdCount += 1;
          }
        } catch (error) {
          errors.push(`Row ${rowIndex + 2}: ${error.message || 'Unable to import vehicle.'}`);
        } finally {
          setSettingsImportProgressStep(importScope, rowIndex + 1);
        }
      }

      let refreshErrorMessage = '';
      try {
        await refreshLiveData(currentSessionUser);
      } catch (error) {
        refreshErrorMessage = error.message || 'Live data refresh failed after import.';
      }
      appendAuditEntry({
        category: 'vehicle',
        action: 'Imported vehicles CSV',
        target: `${createdCount + updatedCount} row(s)`,
        details: `Created ${createdCount}, updated ${updatedCount}, failed ${errors.length}.`,
      });

      if (refreshErrorMessage) {
        showToast(`Vehicles import saved but ${refreshErrorMessage}`, 'warning', 'CSV import');
        return;
      }

      if (errors.length) {
        showToast(`Vehicles import finished with errors. Created ${createdCount}, updated ${updatedCount}, failed ${errors.length}. ${errors[0]}`, 'warning', 'CSV import');
        return;
      }

      showToast(`Vehicles CSV imported. Created ${createdCount}, updated ${updatedCount}.`, 'success', 'CSV import');
    } finally {
      finishSettingsImportProgress(importScope);
    }
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();

    const purpose = requestForm.purpose.trim();
    const destination = requestForm.destination.trim();
    const passengerCount = normalizePassengerCount(requestForm.passengerCount);
    const passengerNames = createPassengerNameSlots(passengerCount).map(
      (_entry, index) => String(requestForm.passengerNames?.[index] || '').trim()
    );

    if (!purpose || !destination) {
      showToast('Add a purpose and destination before sending the request.', 'warning', 'Missing details');
      return;
    }

    if (passengerNames.some((name) => !name)) {
      showToast('Add a companion name for every additional passenger beyond the driver.', 'warning', 'Missing passengers');
      return;
    }

    if (requestForm.fuelRequested) {
      if (!requestForm.fuelProduct) {
        showToast('Select a fuel product for the requested fuel authorization.', 'warning', 'Fuel product required');
        return;
      }

      if (Number(requestForm.fuelLiters || 0) <= 0) {
        showToast('Enter a valid number of liters for fuel authorization.', 'warning', 'Fuel liters required');
        return;
      }
    }

    const selectedVehicle = vehicleRecords.find((vehicle) => vehicle.id === requestForm.assignedVehicleId);
    const isHiredDriverSelected = requestForm.assignedDriverId === REQUEST_HIRED_DRIVER_OPTION_VALUE;
    const canCreateHiredDriver = userMode === 'admin' || userMode === 'approver';
    let selectedDriver = isHiredDriverSelected
      ? null
      : driverRecords.find((driver) => driver.id === requestForm.assignedDriverId);
    let resolvedAssignedDriverId = isHiredDriverSelected ? '' : requestForm.assignedDriverId;
    let hiredDriverPayload = null;
    let hiredLocalDriver = null;
    const driverAssignmentValidation = getDriverAssignmentValidation(selectedDriver, selectedVehicle);

    if (!requestForm.assignedVehicleId || !selectedVehicle) {
      showToast('Select a vehicle before submitting the trip request.', 'warning', 'Vehicle required');
      return;
    }

    if (
      selectedVehicle.status !== 'available'
      || unavailableVehicleIds.has(requestForm.assignedVehicleId)
    ) {
      showToast('Choose a vehicle that is currently available.', 'warning', 'Vehicle unavailable');
      return;
    }

    if (isHiredDriverSelected) {
      if (!canCreateHiredDriver) {
        showToast('Only admin/approver accounts can add hired drivers.', 'warning', 'Permission denied');
        return;
      }

      const hiredDriverName = String(requestForm.hiredDriverName || '').trim();
      const hiredDriverLicenseNumber = String(requestForm.hiredDriverLicenseNumber || '').trim();
      const hiredDriverLicenseRestrictions = String(requestForm.hiredDriverLicenseRestrictions || '').trim();
      const hiredDriverLicenseExpiry = String(requestForm.hiredDriverLicenseExpiry || '').trim();
      const hiredDriverContactNumber = String(requestForm.hiredDriverContactNumber || '').trim();

      if (!hiredDriverName || !hiredDriverLicenseNumber || !hiredDriverLicenseExpiry) {
        showToast('Complete hired driver name, license number, and license expiry.', 'warning', 'Missing hired driver details');
        return;
      }

      const branchId = currentSessionUser.branchId || findBranchId(branchRecords, currentSessionUser.branch);

      if (!branchId) {
        showToast('Unable to resolve branch for the hired driver record.', 'warning', 'Branch required');
        return;
      }

      const hiredDriverValidation = getDriverAssignmentValidation(
        {
          fullName: hiredDriverName,
          licenseRestrictions: hiredDriverLicenseRestrictions,
          licenseExpiry: hiredDriverLicenseExpiry,
        },
        selectedVehicle
      );

      if (!hiredDriverValidation.isValid) {
        showToast(getDriverAssignmentValidationMessage(hiredDriverValidation), 'warning', 'Driver validation');
        return;
      }

      hiredDriverPayload = {
        id: '',
        profileId: '',
        branchId,
        employeeId: generateHiredDriverEmployeeId(),
        fullName: hiredDriverName,
        contactNumber: hiredDriverContactNumber,
        licenseNumber: hiredDriverLicenseNumber,
        licenseRestrictions: hiredDriverLicenseRestrictions,
        licenseExpiry: hiredDriverLicenseExpiry,
        status: 'available',
      };
    } else {
      if (
        requestForm.assignedDriverId
        && (
          String(selectedDriver?.status || '').toLowerCase() !== 'available'
          || unavailableDriverIds.has(requestForm.assignedDriverId)
        )
      ) {
        showToast('Choose a driver that is currently available.', 'warning', 'Driver unavailable');
        return;
      }

      if (requestForm.assignedDriverId && !driverAssignmentValidation.isValid) {
        showToast(getDriverAssignmentValidationMessage(driverAssignmentValidation), 'warning', 'Driver validation');
        return;
      }
    }

    const forcedApproverId = userMode === 'approver'
      ? branchAdminApprover?.id || null
      : null;
    const forcedApproverName = userMode === 'approver'
      ? branchAdminApprover?.name || 'Pending'
      : 'Pending';

    if (supabase) {
      try {
        if (hiredDriverPayload) {
          const createdDriver = await saveLiveDriver(supabase, hiredDriverPayload);
          resolvedAssignedDriverId = String(createdDriver?.id || '').trim();

          if (!resolvedAssignedDriverId) {
            throw new Error('Unable to create the hired driver record.');
          }

          selectedDriver = {
            ...hiredDriverPayload,
            id: resolvedAssignedDriverId,
          };
        }

        const requestNo = await createLiveRequest(
          supabase,
          currentSessionUser,
          {
            ...requestForm,
            assignedDriverId: resolvedAssignedDriverId,
            passengerCount,
            passengerNames,
          },
          requestRecords.length,
          {
            forcedApproverId,
          }
        );

        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          actor: currentSessionUser.name,
          actorRole: currentSessionUser.role,
          category: 'request',
          action: 'Submitted vehicle request',
          target: requestNo,
          details: `Submitted live request for ${requestForm.destination.trim()}.`,
        });
        setRequestSearch('');
        setRequestForm(createRequestForm());
        showToast(`${requestNo} added to the request queue.`, 'success', 'Request submitted');
        setRequestModalOpen(false);
        setActiveView('requests');
      } catch (error) {
        showToast(error.message || 'Unable to submit the request to Supabase.', 'danger', 'Submission failed');
      }

      return;
    }

    if (hiredDriverPayload) {
      resolvedAssignedDriverId = createId('drv');
      selectedDriver = {
        id: resolvedAssignedDriverId,
        dbId: resolvedAssignedDriverId,
        profileId: '',
        fullName: hiredDriverPayload.fullName,
        employeeId: hiredDriverPayload.employeeId,
        branch: currentSessionUser.branch,
        branchId: hiredDriverPayload.branchId,
        status: 'available',
        licenseNumber: hiredDriverPayload.licenseNumber,
        licenseRestrictions: hiredDriverPayload.licenseRestrictions,
        licenseExpiry: hiredDriverPayload.licenseExpiry,
        contactNumber: hiredDriverPayload.contactNumber,
        linkedAccountName: '',
        linkedAccountEmail: '',
      };
      hiredLocalDriver = selectedDriver;
    }

    const requestNo = createRequestNumber(requestRecords);
    const nextRequest = {
      id: createId('req'),
      createdAt: new Date().toISOString(),
      requestNo,
      branch: currentSessionUser.branch,
      requestedBy: currentSessionUser.name,
      purpose,
      destination,
      departureDatetime: requestForm.departureDatetime,
      expectedReturnDatetime: requestForm.expectedReturnDatetime,
      passengerCount,
      passengerNames,
      status: 'Pending Approval',
      assignedVehicle: selectedVehicle?.vehicleName || 'Unassigned',
      assignedVehicleId: requestForm.assignedVehicleId || '',
      assignedDriver: selectedDriver?.fullName || 'Unassigned',
      assignedDriverId: resolvedAssignedDriverId || '',
      fuelRequested: requestForm.fuelRequested,
      fuelAmount: Number(requestForm.fuelAmount || 0),
      fuelLiters: Number(requestForm.fuelLiters || 0),
      estimatedKms: Number(requestForm.estimatedKms || 0),
      fuelRemarks: requestForm.fuelRemarks.trim(),
      fuelProduct: requestForm.fuelProduct || 'diesel',
      fuelQuotePricePerLiter: requestForm.fuelQuotePricePerLiter,
      fuelQuoteSource: requestForm.fuelQuoteSource || '',
      fuelQuoteObservedAt: requestForm.fuelQuoteObservedAt || '',
      fuelQuoteLocation: requestForm.fuelQuoteLocation || '',
      fuelQuoteProvince: requestForm.fuelQuoteProvince || '',
      fuelQuoteMunicipality: requestForm.fuelQuoteMunicipality || '',
      approverId: forcedApproverId || '',
      approver: forcedApproverName,
    };

    setRequestRecords((current) => [nextRequest, ...current]);
    if (requestForm.assignedVehicleId) {
      setVehicleRecords((current) =>
        current.map((vehicle) =>
          vehicle.id === requestForm.assignedVehicleId
            ? {
                ...vehicle,
                status: 'reserved',
              }
            : vehicle
        )
      );
    }
    if (resolvedAssignedDriverId || hiredLocalDriver) {
      setDriverRecords((current) => {
        const nextDrivers = hiredLocalDriver ? [hiredLocalDriver, ...current] : [...current];
        return nextDrivers.map((driver) =>
          driver.id === resolvedAssignedDriverId
            ? {
                ...driver,
                status: 'assigned',
              }
            : driver
        );
      });
    }
    appendAuditEntry({
      category: 'request',
      action: 'Submitted vehicle request',
      target: requestNo,
      details: `Submitted request for ${destination} with purpose "${purpose}".`,
    });
    pushNotification('Request added', `${requestNo} is now waiting for approval.`, 'info');
    setRequestSearch('');
    setRequestForm(createRequestForm());
    showToast(`${requestNo} added to the request queue.`, 'success', 'Request submitted');
    setRequestModalOpen(false);
    setActiveView('requests');
  }

  function handleOpenRequestModal() {
    setRequestModalOpen(true);
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();

    const tripToRelease = visibleTripRecords.find((trip) => trip.id === checkoutForm.tripId);
    const releaseTimestamp = new Date().toISOString();
    const checkoutPayload = {
      ...checkoutForm,
      dateOut: releaseTimestamp,
    };
    const odometerOut = Number(checkoutForm.odometerOut);
    const releaseVehicle = findVehicleForTrip(vehicleRecords, tripToRelease);
    const isOdoDefective = Boolean(releaseVehicle?.isOdoDefective);
    const resolvedOdometerOut = isOdoDefective ? null : odometerOut;
    const odometerOutLabel = isOdoDefective
      ? 'N/A (odometer disabled)'
      : String(resolvedOdometerOut);

    if (!tripToRelease) {
      showToast('Select a trip that is ready for release.', 'warning', 'Trip required');
      return;
    }

    if (!isOdoDefective && (Number.isNaN(odometerOut) || odometerOut <= 0)) {
      showToast('Enter a valid odometer reading before check-out.', 'warning', 'Mileage required');
      return;
    }

    if (supabase) {
      try {
        await checkoutLiveTrip(supabase, tripToRelease, checkoutPayload, resolvedOdometerOut);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'trip',
          action: 'Released trip',
          target: tripToRelease.requestNo,
          branch: tripToRelease.origin,
          details: `Released ${tripToRelease.vehicle} with odometer out ${odometerOutLabel}.`,
        });
        showToast(`${tripToRelease.vehicle} checked out successfully.`, 'success', 'Vehicle released');
        setActiveView('trips');
      } catch (error) {
        showToast(error.message || 'Unable to release the trip in Supabase.', 'danger', 'Release failed');
      }

      return;
    }

    setTripRecords((current) =>
      current.map((trip) =>
        trip.id === tripToRelease.id
          ? {
              ...trip,
              tripStatus: 'Checked Out',
              dateOut: releaseTimestamp,
              odometerOut: resolvedOdometerOut,
              fuelOut: checkoutForm.fuelOut,
              conditionOut: checkoutForm.conditionOut || '',
            }
          : trip
      )
    );

    setRequestRecords((current) =>
      current.map((request) =>
        request.requestNo === tripToRelease.requestNo
          ? {
              ...request,
              status: 'Checked Out',
            }
          : request
      )
    );

    setVehicleRecords((current) =>
      current.map((vehicle) =>
        vehicle.vehicleName === tripToRelease.vehicle
          ? {
              ...vehicle,
              status: 'in_use',
              assignedDriver: tripToRelease.driver,
            }
          : vehicle
      )
    );

    setDriverRecords((current) =>
      current.map((driver) =>
        driver.id === tripToRelease.driverId
          ? {
              ...driver,
              status: 'on_trip',
            }
          : driver
      )
    );

    appendAuditEntry({
      category: 'trip',
      action: 'Released trip',
      target: tripToRelease.requestNo,
      branch: tripToRelease.origin,
      details: `Released ${tripToRelease.vehicle} with odometer out ${odometerOutLabel}.`,
    });
    pushNotification(
      'Vehicle released',
      `${tripToRelease.vehicle} left for ${tripToRelease.requestNo}.`,
      'info'
    );
    showToast(`${tripToRelease.vehicle} checked out successfully.`, 'success', 'Vehicle released');
    const nextTripRecords = tripRecords.map((trip) =>
      trip.id === tripToRelease.id ? { ...trip, tripStatus: 'Checked Out' } : trip
    );
    setCheckoutForm(
      pickCheckoutDefaults(
        getVisibleTripRecords(nextTripRecords),
        vehicleRecords,
        READY_FOR_CHECKOUT
      )
    );
    setActiveView('trips');
  }

  async function handleCheckinSubmit(event) {
    event.preventDefault();

    const tripToClose = visibleTripRecords.find((trip) => trip.id === checkinForm.tripId);
    const returnTimestamp = new Date().toISOString();
    const checkinPayload = {
      ...checkinForm,
      dateIn: returnTimestamp,
    };
    const odometerIn = Number(checkinForm.odometerIn);
    const returnVehicle = findVehicleForTrip(vehicleRecords, tripToClose);
    const isOdoDefective = Boolean(returnVehicle?.isOdoDefective);
    const resolvedOdometerIn = isOdoDefective ? null : odometerIn;

    if (!tripToClose) {
      showToast('Select an active trip before checking a vehicle in.', 'warning', 'Trip required');
      return;
    }

    if (!isOdoDefective && (Number.isNaN(odometerIn) || odometerIn <= Number(tripToClose.odometerOut || 0))) {
      showToast('The return odometer must be higher than the check-out reading.', 'warning', 'Invalid mileage');
      return;
    }

    const mileageComputed = isOdoDefective ? 0 : odometerIn - Number(tripToClose.odometerOut || 0);
    const mileageSummary = isOdoDefective
      ? 'Returned with odometer disabled (mileage skipped).'
      : `Returned ${tripToClose.vehicle} with ${mileageComputed} km traveled.`;

    if (supabase) {
      try {
        await checkinLiveTrip(supabase, tripToClose, checkinPayload, resolvedOdometerIn);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'trip',
          action: 'Completed return',
          target: tripToClose.requestNo,
          branch: tripToClose.origin,
          details: mileageSummary,
        });
        showToast(`${tripToClose.vehicle} checked in and trip closed.`, 'success', 'Vehicle returned');
        setActiveView('trips');
      } catch (error) {
        showToast(error.message || 'Unable to check the trip back in to Supabase.', 'danger', 'Check-in failed');
      }

      return;
    }

    setTripRecords((current) =>
      current.map((trip) =>
        trip.id === tripToClose.id
          ? {
              ...trip,
              tripStatus: 'Closed',
              actualReturnDatetime: returnTimestamp,
              dateIn: returnTimestamp,
              odometerIn: resolvedOdometerIn,
              fuelIn: checkinForm.fuelIn,
              remarks: checkinForm.remarks,
              mileageComputed,
            }
          : trip
      )
    );

    setRequestRecords((current) =>
      current.map((request) =>
        request.requestNo === tripToClose.requestNo
          ? {
              ...request,
              status: 'Closed',
            }
          : request
      )
    );

    setVehicleRecords((current) =>
      current.map((vehicle) =>
        vehicle.vehicleName === tripToClose.vehicle
          ? {
              ...vehicle,
              status: 'available',
              odometerCurrent: isOdoDefective
                ? vehicle.odometerCurrent
                : odometerIn,
              assignedDriver: tripToClose.driver,
            }
          : vehicle
      )
    );

    setDriverRecords((current) =>
      current.map((driver) =>
        driver.id === tripToClose.driverId
          ? {
              ...driver,
              status: 'available',
            }
          : driver
      )
    );

    appendAuditEntry({
      category: 'trip',
      action: 'Completed return',
      target: tripToClose.requestNo,
      branch: tripToClose.origin,
      details: mileageSummary,
    });
    pushNotification(
      'Vehicle returned',
      `${tripToClose.vehicle} logged ${mileageComputed} km on return.`,
      'info'
    );
    showToast(`${tripToClose.vehicle} checked in and trip closed.`, 'success', 'Vehicle returned');
    const nextTripRecords = tripRecords.map((trip) =>
      trip.id === tripToClose.id ? { ...trip, tripStatus: 'Closed' } : trip
    );
    setCheckinForm(
      pickCheckinDefaults(
        getVisibleTripRecords(nextTripRecords),
        ACTIVE_TRIP_STATUSES
      )
    );
    setActiveView('trips');
  }

  async function handleLogout() {
    const emailToRemember = currentSessionUser.email;
    const currentUserName = currentSessionUser.name;
    const hadSessionUserId = Boolean(currentSessionUser.id);

    if (supabase && hadSessionUserId && WEB_PUSH_PUBLIC_KEY && isWebPushSupported()) {
      try {
        await deactivateLiveWebPushSubscription(supabase);
      } catch (_error) {
        // Continue logout flow even when push deactivation is unavailable.
      }
    }

    if (WEB_PUSH_PUBLIC_KEY && isWebPushSupported()) {
      try {
        await unsubscribeWebPushSubscription();
      } catch (_error) {
        // Continue logout flow even when local push unsubscribe fails.
      }
    }

    isSigningOutRef.current = true;
    pushSubscriptionSyncRef.current = { userId: '', promise: null };
    setMobileNavOpen(false);
    setRequestModalOpen(false);
    setActiveView('dashboard');
    setIsPasswordVisible(false);
    setTopbarNotificationsOpen(false);
    setTripDetailFocus(null);
    setToast(null);
    setLoginError('');
    expectedSessionUserIdRef.current = '';
    cachedSessionUserRef.current = null;
    clearCachedSessionUser();
    sessionHydrationRef.current = { userId: '', promise: null };
    liveDataRefreshRef.current = { userId: '', promise: null };
    setIsLiveDataLoading(false);
    clearAppData();
    setCurrentSessionUser(EMPTY_SESSION_USER);
    setIsAuthenticated(false);
    setLoginForm({
      email: emailToRemember,
      password: '',
    });

    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        isSigningOutRef.current = false;
        showToast(error.message || 'Unable to sign out right now.', 'danger', 'Sign out failed');
        return;
      }
    }

    appendAuditEntry({
      category: 'session',
      action: 'Signed out',
      target: emailToRemember,
      details: `${currentUserName} signed out of the workspace.`,
    });

    if (!supabase) {
      isSigningOutRef.current = false;
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    const normalizedEmail = loginForm.email.trim().toLowerCase();
    const normalizedPassword = loginForm.password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setLiveDataError('');
      setLoginError('Enter your email and password to continue.');
      return;
    }

    if (!supabase) {
      setLiveDataError('');
      setLoginError('Supabase is not configured for this workspace.');
      return;
    }

    try {
      setIsBootstrapping(true);
      setLoginError('');
      setLiveDataError('');

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        }),
        'Sign-in took too long. Check your connection and try again.'
      );

      if (error) {
        throw error;
      }

      const authUserId = data.user?.id || data.session?.user?.id;

      if (!authUserId) {
        throw new Error('Signed in, but no Supabase user was returned.');
      }

      cachedSessionUserRef.current = null;
      clearCachedSessionUser();
      expectedSessionUserIdRef.current = authUserId;
      let liveUser;

      try {
        liveUser = await hydrateAuthenticatedSession(authUserId);
      } catch (error) {
        liveUser = tryRestoreCachedSessionUser(authUserId);

        if (!liveUser) {
          throw error;
        }
      }

      if (!liveUser) {
        throw new Error('Your session changed before the workspace finished loading.');
      }

      appendAuditEntry({
        actor: liveUser.name,
        actorRole: liveUser.role,
        category: 'session',
        action: 'Signed in',
        target: liveUser.email,
        branch: liveUser.branch,
        details: `${liveUser.name} authenticated through Supabase.`,
      });
    } catch (error) {
      cachedSessionUserRef.current = null;
      clearCachedSessionUser();
      setIsAuthenticated(false);
      setLiveDataError('');
      setLoginError(error.message || 'Unable to sign in to Supabase.');
      appendAuditEntry({
        actor: normalizedEmail,
        actorRole: 'Unknown',
        category: 'session',
        action: 'Failed sign-in',
        target: normalizedEmail,
        branch: 'Unknown',
        details: error.message || 'Supabase sign-in failed.',
      });
    } finally {
      setIsBootstrapping(false);
    }
  }

  function handleHeroAction(action) {
    if (action === 'request-modal') {
      handleOpenRequestModal();
      return;
    }

    setActiveView(action);
  }

  function handleTopbarNotificationToggle() {
    setTopbarNotificationsOpen((open) => !open);
  }

  function handleTopbarNotificationAction(notification) {
    if (!notification) {
      return;
    }

    setTopbarNotificationsOpen(false);
    const normalizedRequestId = String(notification.requestId || '').trim();
    const normalizedTripId = String(notification.tripId || '').trim();
    const targetRequest = normalizedRequestId
      ? visibleRequestRecords.find((request) => String(request.id || '').trim() === normalizedRequestId)
      : null;
    const targetTrip = normalizedTripId
      ? visibleTripRecords.find((trip) => String(trip.id || '').trim() === normalizedTripId)
      : null;

    if (notification.view === 'requests' && notification.search) {
      setRequestSearch(notification.search);
    }

    if (targetRequest) {
      setActiveView('requests');
      handleOpenRequestDetails(targetRequest);
      return;
    }

    const fallbackView = defaultNavView || selectedView;
    const nextView = availableNavItems.some((item) => item.id === notification.view)
      ? notification.view
      : fallbackView;

    if (targetTrip) {
      setTripDetailFocus({
        token: createId('trip-focus'),
        tripId: targetTrip.id,
      });
    }

    if (nextView) {
      setActiveView(nextView);
    }
  }

  if (!isAuthenticated) {
    const authErrorMessage = [loginError, liveDataError]
      .filter(Boolean)
      .find((message) => !shouldSuppressLiveDataToast(message)) || '';

    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <BrandLogo compact className="auth-brand-logo" />
            <div className="auth-brand-copy">
              <strong>Vehicle Management System</strong>
            </div>
          </div>
          <p className="auth-kicker">Secure branch access</p>
          <p className="auth-copy">
            Access the Vehicle Management System with your branch account.
          </p>
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label className="auth-field">
              <span className="field-label">Email</span>
              <span className="auth-input-wrap">
                <span className="auth-input-leading">
                  <AppIcon name="email" className="auth-input-icon" />
                </span>
                <input
                  className="input auth-input"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => handleLoginFieldChange('email', event.target.value)}
                  placeholder="name@branch.com"
                />
              </span>
            </label>
            <label className="auth-field">
              <span className="field-label">Password</span>
              <span className="auth-input-wrap">
                <span className="auth-input-leading">
                  <AppIcon name="lock" className="auth-input-icon" />
                </span>
                <input
                  className="input auth-input auth-input-has-toggle"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(event) => handleLoginFieldChange('password', event.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                >
                  <AppIcon name={isPasswordVisible ? 'eye-off' : 'eye'} />
                </button>
              </span>
            </label>
            {authErrorMessage && <p className="auth-error">{authErrorMessage}</p>}
            <button type="submit" className="button button-primary auth-submit" disabled={isBootstrapping}>
              <AppIcon name="dashboard" className="button-icon" />
              {isBootstrapping ? 'Signing in...' : 'Log in'}
            </button>
          </form>

        </section>
      </main>
    );
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell-sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="brand-block">
          <div className="brand-identity">
            <div className="brand-mark">
              <BrandLogo compact className="brand-mark-logo" />
            </div>
            <div className="brand-copy">
              <h1>Vehicle Management System</h1>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            <AppIcon name="menu" />
          </button>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-title">Menu</p>
          <nav className="nav-list">
            {navItemsForRender.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${(item.isOverflow
                  ? mobileOverflowNavOpen || mobileNavSecondaryItems.some((entry) => entry.id === selectedView)
                  : selectedView === item.id)
                  ? 'nav-item-active'
                  : ''}`}
                onClick={() => {
                  if (item.isOverflow) {
                    setMobileOverflowNavOpen((open) => !open);
                    return;
                  }

                  setActiveView(item.id);
                  setMobileNavOpen(false);
                  setMobileOverflowNavOpen(false);
                }}
              >
                <span className="nav-item-icon">
                  <AppIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{currentSessionUser.name}</strong>
            <p>{currentSessionUser.branch}</p>
          </div>
          <span className="sidebar-role-chip">{currentSessionUser.role}</span>
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          type="button"
          className="app-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-button"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              Menu
            </button>
            <div>
              <p className="eyebrow">{todayLabel}</p>
              <h2>{activeNavItem.label}</h2>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-notification-shell" ref={topbarNotificationsRef}>
              <button
                type="button"
                className="button button-secondary topbar-notifications-button"
                aria-label={topbarNotificationCount > 0 ? `${topbarNotificationCount} action notifications` : 'No action notifications'}
                aria-expanded={topbarNotificationsOpen}
                aria-haspopup="dialog"
                onClick={handleTopbarNotificationToggle}
              >
                <AppIcon name="alerts" className="button-icon" />
                <span className="topbar-button-label">Alerts</span>
                {topbarNotificationCount > 0 && (
                  <span className="topbar-notification-badge" aria-hidden="true">
                    {topbarNotificationCountLabel}
                  </span>
                )}
              </button>
              {topbarNotificationsOpen && (
                <section className="topbar-notification-popover" role="dialog" aria-label="Action notifications">
                  <div className="topbar-notification-head">
                    <strong>Need action</strong>
                    <span>
                      {topbarNotificationCount > 0
                        ? `${topbarNotificationCount} active item${topbarNotificationCount === 1 ? '' : 's'}`
                        : 'No pending actions right now'}
                    </span>
                  </div>
                  <div className="topbar-notification-list">
                    {topbarNotificationCount === 0 && (
                      <p className="topbar-notification-empty">You are all caught up.</p>
                    )}
                    {topbarActionNotifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className={`topbar-notification-item topbar-notification-item-${notification.tone}`}
                        onClick={() => handleTopbarNotificationAction(notification)}
                      >
                        <div className="topbar-notification-item-head">
                          <strong>{notification.title}</strong>
                          <span>{notification.actionLabel}</span>
                        </div>
                        <p>{notification.detail}</p>
                        {notification.timestampLabel && (
                          <span className="topbar-notification-item-meta">{notification.timestampLabel}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <button
              type="button"
              className="button button-secondary topbar-profile"
              aria-label="Open profile"
              onClick={handleOpenProfileModal}
            >
              <AppIcon name="user" className="button-icon" />
              <span className="topbar-button-label">Profile</span>
            </button>
            <button
              type="button"
              className="button button-secondary topbar-logout"
              aria-label="Log out"
              onClick={handleLogout}
            >
              <AppIcon name="logout" className="button-icon" />
              <span className="topbar-button-label">Log out</span>
            </button>
          </div>
        </header>

        <div id="dashboard-filter-portal"></div>
        {selectedView !== 'reports' && !(selectedView === 'dashboard' && userMode === 'admin') && (
          <PageHero heroContent={heroContent} onAction={handleHeroAction} />
        )}

        {toast && (
          <section className={`toast-notification toast-${toast.tone}`} key={toast.id} role="status" aria-live="polite">
            <div className="toast-icon-wrap">
              <AppIcon name={getToastIconName(toast.tone)} />
            </div>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <AppIcon name="close" />
            </button>
          </section>
        )}

        {selectedView === 'dashboard' && (
          <DashboardPage
            mode={userMode}
            currentUser={currentSessionUser}
            branches={branchRecords}
            requestRecords={visibleRequestRecords}
            tripRecords={visibleTripRecords}
            vehicleRecords={vehicleRecords}
            notificationFeed={notificationFeed}
            panayFuelPricing={panayFuelPricing}
          />
        )}
        {selectedView === 'requests' && (
          <RequestsPage
            mode={userMode}
            currentUser={currentSessionUser}
            requestSearch={requestSearch}
            setRequestSearch={setRequestSearch}
            filteredRequests={filteredRequests}
            requestModalOpen={requestModalOpen}
            requestForm={requestForm}
            requestApprovalForm={requestApprovalForm}
            driverOptions={requestDriverOptions}
            vehicleOptions={requestVehicleOptions}
            allVehicleRecords={vehicleRecords}
            assignmentVehicleOptions={assignmentVehicleOptions}
            requestApprovalDriverOptions={requestApprovalDriverOptions}
            onOpenRequestModal={handleOpenRequestModal}
            onCloseRequestModal={() => setRequestModalOpen(false)}
            onRequestFormChange={handleRequestFormChange}
            onRequestApprovalFieldChange={handleRequestApprovalFieldChange}
            onRequestPassengerNameChange={handleRequestPassengerNameChange}
            onRequestSubmit={handleRequestSubmit}
            rejectionModalOpen={rejectionModalOpen}
            assignmentModalOpen={assignmentModalOpen}
            requestDetailsModalOpen={requestDetailsModalOpen}
            rejectionRemarks={rejectionRemarks}
            selectedReviewRequest={selectedReviewRequest}
            selectedAssignmentRequest={selectedAssignmentRequest}
            selectedRequestDetails={selectedRequestDetails}
            assignmentVehicleId={assignmentVehicleId}
            onCloseRejectionModal={handleCloseRejectionModal}
            onCloseAssignmentModal={handleCloseAssignmentModal}
            onOpenRequestDetails={handleOpenRequestDetails}
            onCloseRequestDetails={handleCloseRequestDetails}
            onSaveRequestFuelEdits={handleSaveRequestFuelEdits}
            onSaveRequestDriverEdits={handleSaveRequestDriverEdits}
            onAssignmentVehicleChange={setAssignmentVehicleId}
            onRejectionRemarksChange={setRejectionRemarks}
            onRejectRequest={handleRejectRequest}
            onOpenAssignmentModal={handleOpenAssignmentModal}
            onAssignmentSubmit={handleAssignmentSubmit}
            onApproveRequest={handleReviewRequest}
            onPrintRequest={handlePrintRequest}
            onRejectSubmit={handleRejectSubmit}
          />
        )}
        {selectedView === 'trips' && (
          <TripsPage
            mode={userMode}
            currentUserName={currentSessionUser.name}
            currentDriverId={currentDriverRecord?.id || ''}
            currentDriverName={currentDriverRecord?.fullName || ''}
            tripRecords={tripsPageTripRecords}
            vehicleRecords={vehicleRecords}
            checkoutForm={checkoutForm}
            checkinForm={checkinForm}
            selectedCheckoutTrip={selectedCheckoutTrip}
            selectedCheckinTrip={selectedCheckinTrip}
            computedCheckinMileage={computedCheckinMileage}
            onCheckoutFieldChange={handleCheckoutFieldChange}
            onCheckoutTripChange={handleCheckoutTripChange}
            onCheckoutSubmit={handleCheckoutSubmit}
            onCheckinFieldChange={handleCheckinFieldChange}
            onCheckinTripChange={handleCheckinTripChange}
            onCheckinSubmit={handleCheckinSubmit}
            onCheckoutChecklistChange={handleCheckoutChecklistChange}
            onCheckinChecklistChange={handleCheckinChecklistChange}
            tripDetailFocus={tripDetailFocus}
            onTripDetailFocusHandled={(token) => {
              setTripDetailFocus((current) => (current?.token === token ? null : current));
            }}
          />
        )}
        {selectedView === 'calendar' && (
          <TripsCalendarPage tripRecords={calendarTripRecords} />
        )}
        {selectedView === 'reports' && (
          <ReportsPage
            mode={userMode}
            currentUser={currentSessionUser}
            branchRecords={branchRecords}
            requestRecords={visibleRequestRecords}
            tripRecords={visibleTripRecords}
            vehicleRecords={vehicleRecords}
            maintenanceRecords={maintenanceRecords}
            incidentRecords={incidentRecords}
          />
        )}
        {selectedView === 'vehicles' && (
          <VehiclesPage
            vehicleFilter={vehicleFilter}
            setVehicleFilter={setVehicleFilter}
            vehicleBranchFilter={vehicleBranchFilter}
            setVehicleBranchFilter={setVehicleBranchFilter}
            vehicleBranchOptions={fleetVehicleBranchOptions}
            filteredVehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            selectedVehicleTrips={selectedVehicleTrips}
            selectedVehicleMaintenance={selectedVehicleMaintenance}
            onSelectVehicle={setSelectedVehicleId}
          />
        )}
        {selectedView === 'compliance' && (
          <CompliancePage
            mode={userMode}
            currentUser={currentSessionUser}
            vehicleRecords={vehicleRecords}
            maintenanceRecords={maintenanceRecords}
            notificationFeed={notificationFeed}
            incidentRecords={incidentRecords}
            onOpenMaintenanceModal={handleOpenMaintenanceModal}
            onOpenIncidentModal={handleOpenIncidentModal}
          />
        )}
        {selectedView === 'settings' && (
          <AdminSettingsPage
            branchRecords={branchRecords}
            userRecords={settingsUserRecords}
            driverRecords={settingsDriverRecords}
            vehicleRecords={settingsVehicleRecords}
            auditRecords={auditRecords}
            importProgress={settingsImportProgress}
            visibleTabKeys={userMode === 'approver' ? ['users', 'drivers', 'vehicles'] : undefined}
            onAddBranch={() => handleOpenBranchSettingsModal()}
            onEditBranch={handleOpenBranchSettingsModal}
            onDeleteBranch={handleDeleteBranch}
            onAddUser={userMode === 'admin' ? () => handleOpenUserSettingsModal() : undefined}
            onEditUser={userMode === 'admin' ? handleOpenUserSettingsModal : undefined}
            onDeleteUser={userMode === 'admin' ? handleDeleteUser : undefined}
            onImportUsersCsv={userMode === 'admin' ? handleImportUsersCsv : undefined}
            onAddDriver={() => handleOpenDriverSettingsModal()}
            onEditDriver={handleOpenDriverSettingsModal}
            onDeleteDriver={handleDeleteDriver}
            onImportDriversCsv={handleImportDriversCsv}
            onAddVehicle={() => handleOpenVehicleSettingsModal()}
            onEditVehicle={handleOpenVehicleSettingsModal}
            onDeleteVehicle={userMode === 'admin' ? handleDeleteVehicle : undefined}
            onImportVehiclesCsv={userMode === 'admin' ? handleImportVehiclesCsv : undefined}
          />
        )}

        {profileModalOpen && (
          <>
            <button
              type="button"
              className="app-backdrop modal-backdrop"
              aria-label="Close profile settings"
              onClick={handleCloseProfileModal}
            />
            <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Profile settings">
              <section className="modal-card modal-card-compact">
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Profile settings</p>
                    <h3>{currentSessionUser.name}</h3>
                    <p className="modal-copy">
                      Update your account password and review your current role information.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-secondary modal-close"
                    onClick={handleCloseProfileModal}
                  >
                    Close
                  </button>
                </div>

                <div className="profile-settings-grid">
                  <div className="profile-setting-item">
                    <span className="field-label">Email</span>
                    <strong>{currentSessionUser.email}</strong>
                  </div>
                  <div className="profile-setting-item">
                    <span className="field-label">Role</span>
                    <strong>{currentSessionUser.role}</strong>
                  </div>
                  <div className="profile-setting-item">
                    <span className="field-label">Branch</span>
                    <strong>{currentSessionUser.branch}</strong>
                  </div>
                </div>

                <form className="form-grid profile-password-form" onSubmit={handlePasswordSubmit}>
                  <label className="full-span">
                    <span className="field-label">Current password</span>
                    <input
                      className="input"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => handlePasswordFieldChange('currentPassword', event.target.value)}
                      placeholder="Enter your current password"
                    />
                  </label>
                  <label>
                    <span className="field-label">New password</span>
                    <input
                      className="input"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) => handlePasswordFieldChange('newPassword', event.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </label>
                  <label>
                    <span className="field-label">Confirm password</span>
                    <input
                      className="input"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) => handlePasswordFieldChange('confirmPassword', event.target.value)}
                      placeholder="Repeat the new password"
                    />
                  </label>
                  <div className="full-span form-actions">
                    <button type="submit" className="button button-primary button-solid" disabled={isSavingPassword}>
                      <AppIcon name="lock" className="button-icon" />
                      {isSavingPassword ? 'Saving...' : 'Update password'}
                    </button>
                    <span className="muted">Live mode updates the password for your active Supabase account.</span>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}

        {userSettingsModalOpen && (
          <>
            <button
              type="button"
              className="app-backdrop modal-backdrop"
              aria-label="Close user settings"
              onClick={handleCloseUserSettingsModal}
            />
            <div className="modal-shell" role="dialog" aria-modal="true" aria-label="User settings">
              <section className="modal-card modal-card-compact">
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">User settings</p>
                    <h3>{userSettingsForm.id ? 'Edit user' : 'Add user'}</h3>
                    <p className="modal-copy">
                      {userSettingsForm.id
                        ? 'Live mode edits the selected profile, login email, optional password reset, role assignment, and branch.'
                        : 'Create a Supabase Auth account, linked profile, and initial role assignment for this workspace.'}
                    </p>
                  </div>
                  <button type="button" className="button button-secondary modal-close" onClick={handleCloseUserSettingsModal}>
                    Close
                  </button>
                </div>

                <form className="form-grid" onSubmit={handleUserSettingsSubmit}>
                  <label>
                    <span className="field-label">Full name</span>
                    <input className="input" value={userSettingsForm.name} onChange={(event) => handleUserSettingsFieldChange('name', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Email</span>
                    <input
                      className="input"
                      type="email"
                      value={userSettingsForm.email}
                      onChange={(event) => handleUserSettingsFieldChange('email', event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="field-label">Role</span>
                    <select
                      className="input"
                      value={userSettingsForm.role}
                      onChange={(event) => handleUserSettingsFieldChange('role', event.target.value)}
                    >
                      {['Admin', 'Approver', 'Guard', 'Pump Station', 'Driver', 'Requester'].map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Branch</span>
                    <select className="input" value={userSettingsForm.branchId} onChange={(event) => handleUserSettingsFieldChange('branchId', event.target.value)}>
                      {userBranchOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">{userSettingsForm.id ? 'New password (optional)' : 'Temporary password'}</span>
                    <input
                      className="input"
                      type="password"
                      value={userSettingsForm.password}
                      onChange={(event) => handleUserSettingsFieldChange('password', event.target.value)}
                      placeholder={userSettingsForm.id ? 'Leave blank to keep current password' : ''}
                    />
                  </label>
                  <label>
                    <span className="field-label">{userSettingsForm.id ? 'Confirm new password' : 'Confirm password'}</span>
                    <input
                      className="input"
                      type="password"
                      value={userSettingsForm.confirmPassword}
                      onChange={(event) => handleUserSettingsFieldChange('confirmPassword', event.target.value)}
                    />
                  </label>
                  {userSettingsForm.id && (
                    <span className="full-span muted">Leave both password fields blank to keep the current password.</span>
                  )}
                  <div className="full-span form-actions">
                    <button type="submit" className="button button-primary button-solid">
                      {userSettingsForm.id ? 'Save user' : 'Create user'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}

        {branchSettingsModalOpen && (
          <>
            <button
              type="button"
              className="app-backdrop modal-backdrop"
              aria-label="Close branch settings"
              onClick={handleCloseBranchSettingsModal}
            />
            <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Branch settings">
              <section className="modal-card modal-card-compact">
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Branch settings</p>
                    <h3>{branchSettingsForm.id ? 'Edit branch' : 'Add branch'}</h3>
                    <p className="modal-copy">Manage the branch directory used by users, drivers, vehicles, and requests.</p>
                  </div>
                  <button type="button" className="button button-secondary modal-close" onClick={handleCloseBranchSettingsModal}>
                    Close
                  </button>
                </div>

                <form className="form-grid" onSubmit={handleBranchSettingsSubmit}>
                  <label>
                    <span className="field-label">Branch code</span>
                    <input
                      className="input"
                      value={branchSettingsForm.code}
                      onChange={(event) => handleBranchSettingsFieldChange('code', event.target.value)}
                      placeholder="e.g. MAIN"
                    />
                  </label>
                  <label>
                    <span className="field-label">Branch name</span>
                    <input
                      className="input"
                      value={branchSettingsForm.name}
                      onChange={(event) => handleBranchSettingsFieldChange('name', event.target.value)}
                      placeholder="e.g. Main Office"
                    />
                  </label>
                  <label className="full-span">
                    <span className="field-label">Address</span>
                    <input
                      className="input"
                      value={branchSettingsForm.address}
                      onChange={(event) => handleBranchSettingsFieldChange('address', event.target.value)}
                      placeholder="Branch address"
                    />
                  </label>
                  <label>
                    <span className="field-label">Service region</span>
                    <select
                      className="input"
                      value={branchSettingsForm.serviceRegion || 'other'}
                      onChange={(event) => handleBranchSettingsFieldChange('serviceRegion', event.target.value)}
                    >
                      <option value="other">Other</option>
                      <option value="panay">Panay</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select
                      className="input"
                      value={branchSettingsForm.isActive ? 'active' : 'inactive'}
                      onChange={(event) => handleBranchSettingsFieldChange('isActive', event.target.value === 'active')}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <div className="full-span form-actions">
                    <button type="submit" className="button button-primary button-solid">
                      {branchSettingsForm.id ? 'Save branch' : 'Create branch'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}

        {driverSettingsModalOpen && (
          <>
            <button
              type="button"
              className="app-backdrop modal-backdrop"
              aria-label="Close driver settings"
              onClick={handleCloseDriverSettingsModal}
            />
            <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Driver settings">
              <section className="modal-card">
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Driver settings</p>
                    <h3>{driverSettingsForm.id ? 'Edit driver' : 'Add driver'}</h3>
                    <p className="modal-copy">Maintain branch, license, contact, and availability details for dispatch.</p>
                  </div>
                  <button type="button" className="button button-secondary modal-close" onClick={handleCloseDriverSettingsModal}>
                    Close
                  </button>
                </div>

                <form className="form-grid" onSubmit={handleDriverSettingsSubmit}>
                  <label>
                    <span className="field-label">Full name</span>
                    <input className="input" value={driverSettingsForm.fullName} onChange={(event) => handleDriverSettingsFieldChange('fullName', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Employee ID</span>
                    <input className="input" value={driverSettingsForm.employeeId} onChange={(event) => handleDriverSettingsFieldChange('employeeId', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Branch</span>
                    <select
                      className="input"
                      value={driverSettingsForm.branchId}
                      onChange={(event) => handleDriverSettingsFieldChange('branchId', event.target.value)}
                      disabled={userMode === 'approver'}
                    >
                      {driverBranchOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Linked account</span>
                    <select className="input" value={driverSettingsForm.profileId} onChange={(event) => handleDriverSettingsFieldChange('profileId', event.target.value)}>
                      <option value="">No linked account</option>
                      {driverAccountOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email}) - {user.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select className="input" value={driverSettingsForm.status} onChange={(event) => handleDriverSettingsFieldChange('status', event.target.value)}>
                      {['available', 'assigned', 'on_trip', 'inactive', 'leave'].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">License number</span>
                    <input className="input" value={driverSettingsForm.licenseNumber} onChange={(event) => handleDriverSettingsFieldChange('licenseNumber', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Restrictions</span>
                    <div className="selection-chip-grid" role="group" aria-label="Driver license restrictions">
                      {LICENSE_RESTRICTION_OPTIONS.map((restrictionCode) => (
                        <button
                          key={restrictionCode}
                          type="button"
                          className={`chip-button ${selectedDriverRestrictionCodes.includes(restrictionCode) ? 'chip-button-active' : ''}`}
                          aria-pressed={selectedDriverRestrictionCodes.includes(restrictionCode)}
                          onClick={() => handleDriverRestrictionToggle(restrictionCode)}
                        >
                          {restrictionCode}
                        </button>
                      ))}
                    </div>
                    <span className="field-help-text">
                      Selected: {selectedDriverRestrictionCodes.length ? selectedDriverRestrictionCodes.join(', ') : 'No restrictions selected'}
                    </span>
                  </label>
                  <label>
                    <span className="field-label">License expiry</span>
                    <input className="input" type="date" value={driverSettingsForm.licenseExpiry} onChange={(event) => handleDriverSettingsFieldChange('licenseExpiry', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Contact number</span>
                    <input className="input" value={driverSettingsForm.contactNumber} onChange={(event) => handleDriverSettingsFieldChange('contactNumber', event.target.value)} />
                  </label>
                  <div className="full-span form-actions">
                    <button type="submit" className="button button-primary button-solid">Save driver</button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}

        {vehicleSettingsModalOpen && (
          <>
            <button
              type="button"
              className="app-backdrop modal-backdrop"
              aria-label="Close vehicle settings"
              onClick={handleCloseVehicleSettingsModal}
            />
            <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Vehicle settings">
              <section className="modal-card">
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Vehicle settings</p>
                    <h3>{vehicleSettingsForm.id ? 'Edit vehicle' : 'Add vehicle'}</h3>
                    <p className="modal-copy">Maintain the fleet master record that drives assignment availability and compliance tracking.</p>
                  </div>
                  <button type="button" className="button button-secondary modal-close" onClick={handleCloseVehicleSettingsModal}>
                    Close
                  </button>
                </div>

                <form className="form-grid" onSubmit={handleVehicleSettingsSubmit}>
                  <label>
                    <span className="field-label">Vehicle name</span>
                    <input className="input" value={vehicleSettingsForm.vehicleName} onChange={(event) => handleVehicleSettingsFieldChange('vehicleName', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Plate number</span>
                    <input className="input" value={vehicleSettingsForm.plateNumber} onChange={(event) => handleVehicleSettingsFieldChange('plateNumber', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Branch</span>
                    <select
                      className="input"
                      value={vehicleSettingsForm.branchId}
                      onChange={(event) => handleVehicleSettingsFieldChange('branchId', event.target.value)}
                      disabled={userMode === 'approver'}
                    >
                      {vehicleBranchOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Type</span>
                    <select className="input" value={vehicleSettingsForm.typeId} onChange={(event) => handleVehicleSettingsFieldChange('typeId', event.target.value)}>
                      <option value="" disabled>Select vehicle type</option>
                      {availableVehicleTypeRecords.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select className="input" value={vehicleSettingsForm.status} onChange={(event) => handleVehicleSettingsFieldChange('status', event.target.value)}>
                      {['available', 'reserved', 'in_use', 'maintenance', 'inactive'].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Fuel type</span>
                    <select className="input" value={vehicleSettingsForm.fuelType} onChange={(event) => handleVehicleSettingsFieldChange('fuelType', event.target.value)}>
                      <option value="" disabled>Select fuel type</option>
                      {['Diesel', 'Gasoline', 'Electric', 'Hybrid'].map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Required Restrictions</span>
                    <div className="selection-chip-grid" role="group" aria-label="Required license restrictions">
                      {LICENSE_RESTRICTION_OPTIONS.map((restrictionCode) => (
                        <button
                          key={restrictionCode}
                          type="button"
                          className={`chip-button ${selectedVehicleRestrictionCodes.includes(restrictionCode) ? 'chip-button-active' : ''}`}
                          aria-pressed={selectedVehicleRestrictionCodes.includes(restrictionCode)}
                          onClick={() => handleVehicleRestrictionToggle(restrictionCode)}
                        >
                          {restrictionCode}
                        </button>
                      ))}
                    </div>
                    <span className="field-help-text">
                      Selected: {selectedVehicleRestrictionCodes.length ? selectedVehicleRestrictionCodes.join(', ') : 'No specific restriction required'}
                    </span>
                  </label>
                  <label>
                    <span className="field-label">Seating capacity</span>
                    <input className="input" type="number" min="1" value={vehicleSettingsForm.seatingCapacity} onChange={(event) => handleVehicleSettingsFieldChange('seatingCapacity', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Odometer</span>
                    <input className="input" type="number" min="0" value={vehicleSettingsForm.odometerCurrent} onChange={(event) => handleVehicleSettingsFieldChange('odometerCurrent', event.target.value)} />
                  </label>
                  <label className="full-span">
                    <span className="field-label">Oil-change reminder</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={vehicleSettingsForm.oilChangeReminderEnabled}
                        onChange={(event) => handleVehicleSettingsFieldChange('oilChangeReminderEnabled', event.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--brand-amber, #f59e0b)' }}
                      />
                      <span style={{ fontWeight: 600 }}>
                        Enable per-vehicle change-oil reminders
                      </span>
                    </div>
                    <span className="field-help-text">
                      Configure by mileage (example: 5000 km), by month interval, or both.
                    </span>
                  </label>
                  <label>
                    <span className="field-label">Change oil every (km)</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="5000"
                      value={vehicleSettingsForm.oilChangeIntervalKm}
                      onChange={(event) => handleVehicleSettingsFieldChange('oilChangeIntervalKm', event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="field-label">Or every (months)</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="6"
                      value={vehicleSettingsForm.oilChangeIntervalMonths}
                      onChange={(event) => handleVehicleSettingsFieldChange('oilChangeIntervalMonths', event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="field-label">Last oil change odometer</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Current odometer at last oil change"
                      value={vehicleSettingsForm.oilChangeLastOdometer}
                      onChange={(event) => handleVehicleSettingsFieldChange('oilChangeLastOdometer', event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="field-label">Last oil change date</span>
                    <input
                      className="input"
                      type="date"
                      value={vehicleSettingsForm.oilChangeLastChangedOn}
                      onChange={(event) => handleVehicleSettingsFieldChange('oilChangeLastChangedOn', event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="field-label">Registration expiry</span>
                    <input className="input" type="date" value={vehicleSettingsForm.registrationExpiry} onChange={(event) => handleVehicleSettingsFieldChange('registrationExpiry', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Insurance expiry</span>
                    <input className="input" type="date" value={vehicleSettingsForm.insuranceExpiry} onChange={(event) => handleVehicleSettingsFieldChange('insuranceExpiry', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Fuel Efficiency (km/L)</span>
                    <input className="input" type="number" min="1" step="0.1" value={vehicleSettingsForm.fuelEfficiency} onChange={(event) => handleVehicleSettingsFieldChange('fuelEfficiency', event.target.value)} />
                  </label>
                  <label className="full-span" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={vehicleSettingsForm.isOdoDefective}
                      onChange={(event) => handleVehicleSettingsFieldChange('isOdoDefective', event.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--brand-amber, #f59e0b)' }}
                    />
                    <span style={{ fontWeight: '600', color: vehicleSettingsForm.isOdoDefective ? 'var(--brand-amber, #f59e0b)' : 'var(--text-strong)' }}>
                      Odometer is defective / broken
                    </span>
                    {vehicleSettingsForm.isOdoDefective && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>Odometer readings will be optional for this vehicle</span>
                    )}
                  </label>
                  <div className="full-span form-actions">
                    <button type="submit" className="button button-primary button-solid">Save vehicle</button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}

        {maintenanceModalOpen && (
          <>
            <button
              type="button"
              className="app-backdrop modal-backdrop"
              aria-label="Close maintenance logging"
              onClick={handleCloseMaintenanceModal}
            />
            <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Maintenance logging">
              <section className="modal-card">
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Maintenance log</p>
                    <h3>{maintenanceForm.id ? 'Edit log' : 'Log maintenance'}</h3>
                    <p className="modal-copy">Record vehicle service work, providers, and costs.</p>
                  </div>
                  <button type="button" className="button button-secondary modal-close" onClick={handleCloseMaintenanceModal}>
                    Close
                  </button>
                </div>

                <form className="form-grid" onSubmit={handleMaintenanceSubmit}>
                  <label>
                    <span className="field-label">Vehicle</span>
                    <select 
                      className="input" 
                      value={maintenanceForm.vehicleId} 
                      onChange={(event) => handleMaintenanceFieldChange('vehicleId', event.target.value)}
                    >
                      <option value="" disabled>Select vehicle</option>
                      {vehicleRecords
                        .filter(v => userMode === 'admin' || v.branchId === maintenanceForm.branchId)
                        .map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleName} ({vehicle.plateNumber})</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Maintenance type</span>
                    <input 
                      className="input" 
                      list="maintenance-type-options"
                      placeholder="Select or type maintenance type"
                      value={maintenanceForm.maintenanceType} 
                      onChange={(event) => handleMaintenanceFieldChange('maintenanceType', event.target.value)} 
                    />
                    <datalist id="maintenance-type-options">
                      {MAINTENANCE_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                    <span className="muted">Use a standard type from the list, or type a custom maintenance type.</span>
                  </label>
                  <label>
                    <span className="field-label">Provider</span>
                    <input 
                      className="input" 
                      placeholder="Service center name"
                      value={maintenanceForm.provider} 
                      onChange={(event) => handleMaintenanceFieldChange('provider', event.target.value)} 
                    />
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select 
                      className="input" 
                      value={maintenanceForm.status} 
                      onChange={(event) => handleMaintenanceFieldChange('status', event.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Schedule date</span>
                    <input 
                      className="input" 
                      type="date" 
                      value={maintenanceForm.scheduleDate} 
                      onChange={(event) => handleMaintenanceFieldChange('scheduleDate', event.target.value)} 
                    />
                  </label>
                  <label>
                    <span className="field-label">Completion date</span>
                    <input 
                      className="input" 
                      type="date" 
                      value={maintenanceForm.completedDate} 
                      onChange={(event) => handleMaintenanceFieldChange('completedDate', event.target.value)} 
                      disabled={maintenanceForm.status === 'Pending'}
                    />
                  </label>
                  <label>
                    <span className="field-label">Amount (PHP)</span>
                    <input 
                      className="input" 
                      type="number" 
                      min="0"
                      value={maintenanceForm.amount} 
                      onChange={(event) => handleMaintenanceFieldChange('amount', event.target.value)} 
                    />
                  </label>
                  <label className="full-span">
                    <span className="field-label">Remarks</span>
                    <textarea
                      className="input textarea"
                      placeholder="Add notes about the maintenance work done or findings"
                      value={maintenanceForm.remarks}
                      onChange={(event) => handleMaintenanceFieldChange('remarks', event.target.value)}
                    />
                  </label>
                  <div className="full-span form-actions">
                    <button type="submit" className="button button-primary button-solid">Save record</button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}
        {incidentModalOpen && (
          <>
            <button
              type="button"
              className="app-backdrop modal-backdrop"
              aria-label="Close incident reporting"
              onClick={handleCloseIncidentModal}
            />
            <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Incident reporting">
              <section className="modal-card">
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Safety report</p>
                    <h3>{incidentForm.id ? 'Edit report' : 'Report incident'}</h3>
                    <p className="modal-copy">Document safety issues, mechanical failures, or accidents.</p>
                  </div>
                  <button type="button" className="button button-secondary modal-close" onClick={handleCloseIncidentModal}>
                    Close
                  </button>
                </div>

                <form className="form-grid" onSubmit={handleIncidentSubmit}>
                  <label className="full-span">
                    <span className="field-label">Vehicle</span>
                    <select 
                      className="input" 
                      value={incidentForm.vehicleId} 
                      onChange={(event) => handleIncidentFieldChange('vehicleId', event.target.value)}
                    >
                      <option value="" disabled>Select vehicle</option>
                      {vehicleRecords.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleName} ({vehicle.plateNumber})</option>
                      ))}
                    </select>
                  </label>
                  <label className="full-span">
                    <span className="field-label">Location / Area</span>
                    <input 
                      className="input" 
                      placeholder="e.g. SLEX Mamplasan, Branch Parking"
                      value={incidentForm.location} 
                      onChange={(event) => handleIncidentFieldChange('location', event.target.value)} 
                    />
                  </label>
                  <label className="full-span">
                    <span className="field-label">Status</span>
                    <select 
                      className="input" 
                      value={incidentForm.status} 
                      onChange={(event) => handleIncidentFieldChange('status', event.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </label>
                  <label className="full-span">
                    <span className="field-label">Photo Attachment</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="input"
                      onChange={(e) => handleIncidentFieldChange('photoFile', e.target.files[0])}
                    />
                    {incidentForm.photoUrl && (
                      <div className="cell-subtle" style={{ marginTop: '8px' }}>
                        <a href={incidentForm.photoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-blue)' }}>View existing attachment</a>
                      </div>
                    )}
                  </label>
                  <label className="full-span">
                    <span className="field-label">Description of incident</span>
                    <textarea 
                      className="input textarea" 
                      placeholder="Details of what happened..."
                      value={incidentForm.description} 
                      onChange={(event) => handleIncidentFieldChange('description', event.target.value)} 
                    />
                  </label>
                  <div className="full-span form-actions">
                    <button type="submit" className="button button-primary button-solid">Submit report</button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}
      </main>

      {isAdminMobileNavMode && mobileOverflowNavOpen && (
        <>
          <button
            type="button"
            className="app-backdrop mobile-overflow-backdrop"
            aria-label="Close more menu"
            onClick={() => setMobileOverflowNavOpen(false)}
          />
          <section className="mobile-overflow-menu" role="dialog" aria-modal="true" aria-label="More menu">
            <div className="mobile-overflow-menu-head">
              <p className="eyebrow">More</p>
              <button
                type="button"
                className="button button-secondary mobile-overflow-close"
                onClick={() => setMobileOverflowNavOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mobile-overflow-menu-list">
              {mobileNavSecondaryItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mobile-overflow-item ${selectedView === item.id ? 'mobile-overflow-item-active' : ''}`}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileOverflowNavOpen(false);
                  }}
                >
                  <span className="mobile-overflow-item-icon">
                    <AppIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
