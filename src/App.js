import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AppIcon from './components/AppIcon';
import BrandLogo from './components/BrandLogo';
import PageHero from './components/PageHero';
import { ACTIVE_TRIP_STATUSES, READY_FOR_CHECKOUT, navItems } from './constants/appConfig';
import {
  approveLiveTripTicket,
  checkinLiveTrip,
  checkoutLiveTrip,
  createLiveUser,
  createLiveRequest,
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
  updateLiveProfile,
  updateLiveRequestVehicleAssignment,
  uploadIncidentPhoto,
} from './lib/liveData';
import { supabase } from './lib/supabaseClient';
import AdminSettingsPage from './pages/AdminSettingsPage';
import CompliancePage from './pages/CompliancePage';
import DashboardPage from './pages/DashboardPage';
import RequestsPage from './pages/RequestsPage';
import TripsPage from './pages/TripsPage';
import TripsCalendarPage from './pages/TripsCalendarPage';
import VehiclesPage from './pages/VehiclesPage';
import {
  createId,
  createIncidentForm,
  createRequestForm,
  createRequestNumber,
  daysUntil,
  getLatestActivityTimestamp,
  isSameCalendarDay,
  pickCheckinDefaults,
  pickCheckoutDefaults,
  sortByLatestDate,
} from './utils/appHelpers';

const TOAST_DISMISS_MS = 4200;
const LIVE_BOOTSTRAP_TIMEOUT_MS = 12000;
const SESSION_PROFILE_TIMEOUT_MS = 20000;
const SESSION_CACHE_KEY = 'vehiclelog.sessionUser';
const EMPTY_SESSION_USER = {
  id: '',
  name: '',
  email: '',
  role: 'Requester',
  branch: 'Unassigned',
  branchId: '',
};

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

function createUserSettingsForm(defaultBranchId = '') {
  return {
    id: '',
    name: '',
    email: '',
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
    registrationExpiry: '2026-12-31',
    insurance_expiry: '2026-12-31',
    fuelEfficiency: '10',
    isOdoDefective: false,
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
  const [currentSessionUser, setCurrentSessionUser] = useState(EMPTY_SESSION_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(supabase));
  const [, setIsLiveDataLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedReviewRequest, setSelectedReviewRequest] = useState(null);
  const [selectedAssignmentRequest, setSelectedAssignmentRequest] = useState(null);
  const [assignmentVehicleId, setAssignmentVehicleId] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  const [toast, setToast] = useState(null);
  const cachedSessionUserRef = useRef(readCachedSessionUser());
  const isSigningOutRef = useRef(false);
  const expectedSessionUserIdRef = useRef('');
  const sessionHydrationRef = useRef({ userId: '', promise: null });
  const liveDataRefreshRef = useRef({ userId: '', promise: null });
  const normalizedRole = currentSessionUser.role?.toLowerCase();
  const operationsDay = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const userMode = normalizedRole === 'admin'
    ? 'admin'
    : normalizedRole === 'approver'
      ? 'approver'
      : normalizedRole === 'driver'
        ? 'driver'
      : 'requester';

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
    if (userMode !== 'driver') {
      return records;
    }

    return records.filter(isTripAssignedToCurrentDriver);
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

  const applySessionUser = useCallback((liveUser) => {
    expectedSessionUserIdRef.current = liveUser.id;
    cachedSessionUserRef.current = liveUser;
    writeCachedSessionUser(liveUser);
    setCurrentSessionUser(liveUser);
    setLoginForm({
      email: liveUser.email,
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
          };
          const roleChanged = nextSessionUser.role !== sessionUser.role;
          const branchChanged = nextSessionUser.branchId !== sessionUser.branchId;
          const nameChanged = nextSessionUser.name !== sessionUser.name;

          if (roleChanged || branchChanged || nameChanged) {
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

  const visibleRequestRecords = useMemo(() => {
    if (userMode === 'admin') {
      return requestRecords;
    }

    if (userMode === 'approver') {
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
    return visibleRequestRecords.filter((request) => {
      const haystack = [
        request.requestNo,
        request.requestedBy,
        request.branch,
        request.purpose,
        request.destination,
        request.status,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(requestSearch.toLowerCase());
    });
  }, [requestSearch, visibleRequestRecords]);

  const filteredVehicles = useMemo(() => {
    if (vehicleFilter === 'all') {
      return vehicleRecords;
    }

    return vehicleRecords.filter((vehicle) => vehicle.status === vehicleFilter);
  }, [vehicleFilter, vehicleRecords]);

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

  useEffect(() => {
    if (
      requestForm.assignedDriverId
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
  const userBranchOptions = useMemo(
    () => buildBranchSelectOptions(branchOptions, userSettingsForm.branchId, userSettingsForm.branchName),
    [branchOptions, userSettingsForm.branchId, userSettingsForm.branchName]
  );
  const driverBranchOptions = useMemo(
    () => buildBranchSelectOptions(branchOptions, driverSettingsForm.branchId, driverSettingsForm.branchName),
    [branchOptions, driverSettingsForm.branchId, driverSettingsForm.branchName]
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
  const vehicleBranchOptions = useMemo(
    () => buildBranchSelectOptions(branchOptions, vehicleSettingsForm.branchId, vehicleSettingsForm.branchName),
    [branchOptions, vehicleSettingsForm.branchId, vehicleSettingsForm.branchName]
  );

  const requestStatusSummary = useMemo(
    () => ({
      total: requestRecords.length,
      pendingApproval: requestRecords.filter((request) => request.status === 'Pending Approval').length,
      approved: requestRecords.filter((request) => request.status === 'Approved').length,
      checkedOut: requestRecords.filter((request) => request.status === 'Checked Out').length,
      returned: requestRecords.filter((request) => request.status === 'Returned').length,
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
      returned: visibleRequestRecords.filter((request) => request.status === 'Returned').length,
    }),
    [visibleRequestRecords]
  );

  const tripStatusSummary = useMemo(
    () => ({
      total: visibleTripRecords.length,
      readyForRelease: visibleTripRecords.filter((trip) => READY_FOR_CHECKOUT.includes(trip.tripStatus)).length,
      active: visibleTripRecords.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)).length,
      overdue: visibleTripRecords.filter((trip) => trip.tripStatus === 'Overdue').length,
      returned: visibleTripRecords.filter((trip) => trip.tripStatus === 'Returned').length,
      scheduledToday: visibleTripRecords.filter((trip) =>
        isSameCalendarDay(trip.dateOut || trip.expectedReturn, operationsDay)
      ).length,
    }),
    [operationsDay, visibleTripRecords]
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

  const availableNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(userMode)),
    [userMode]
  );

  const selectedView = availableNavItems.some((item) => item.id === activeView) ? activeView : 'dashboard';
  const activeNavItem = availableNavItems.find((item) => item.id === selectedView) || availableNavItems[0];

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
                label: 'Assigned',
                value: visibleRequestStatusSummary.total,
                helper: 'Requests tied to you',
                icon: 'requests',
              },
              {
                label: 'Ready',
                value: visibleRequestStatusSummary.readyForRelease,
                helper: 'Waiting for release',
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
              { label: 'Assigned', value: tripStatusSummary.total, helper: 'Trip records tied to you', icon: 'trips' },
              { label: 'Ready', value: tripStatusSummary.readyForRelease, helper: 'Waiting for release', icon: 'release' },
              { label: 'Open returns', value: tripStatusSummary.active, helper: 'Need check-in', icon: 'return' },
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
                value: myRequestRecords.filter((request) => request.status === 'Returned').length,
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
    selectedView,
    todayShortLabel,
    tripStatusSummary,
    userMode,
    userRecords.length,
    vehicleRecords.length,
    visibleRequestStatusSummary,
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

  useEffect(() => {
    if (!liveDataError || liveDataError.startsWith('Using your last known branch profile')) {
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
    setAuditRecords((current) => [
      {
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
      },
      ...current,
    ]);
  }

  function handleRequestFormChange(field, value) {
    setRequestForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleLoginFieldChange(field, value) {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }));
    setLoginError('');
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
    setDriverSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleVehicleSettingsFieldChange(field, value) {
    setVehicleSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
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
    const selectedVehicleRecord = vehicleRecords.find(
      (vehicle) => vehicle.vehicleName === selectedTrip?.vehicle
    );

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

  async function handleReviewRequest(request, nextStatus) {
    if (userMode !== 'approver') {
      return;
    }

    if (supabase) {
      try {
        await reviewLiveRequest(supabase, request, currentSessionUser, nextStatus);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'request',
          action: `Marked request as ${nextStatus}`,
          target: request.requestNo,
          branch: request.branch,
          details: `${currentSessionUser.name} changed ${request.requestNo} to ${nextStatus}.`,
        });
        showToast(`${request.requestNo} marked as ${nextStatus.toLowerCase()}.`, 'success', 'Request updated');
      } catch (error) {
        showToast(error.message || `Unable to mark the request as ${nextStatus.toLowerCase()}.`, 'danger', 'Update failed');
      }

      return;
    }

    setRequestRecords((current) =>
      current.map((entry) =>
        entry.id === request.id
          ? {
              ...entry,
              status: nextStatus,
              rejectionReason: nextStatus === 'Rejected' ? entry.rejectionReason || '' : '',
              approver: currentSessionUser.name,
              approverId: currentSessionUser.id,
            }
          : entry
      )
    );
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

    if (userMode !== 'approver' || !selectedReviewRequest) {
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

  async function handleAssignmentSubmit(event) {
    event.preventDefault();

    if (!selectedAssignmentRequest) {
      return;
    }

    const nextVehicle = vehicleRecords.find((vehicle) => vehicle.id === assignmentVehicleId);

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

    if (!userSettingsForm.id) {
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
    setDriverSettingsForm(
      driver
        ? {
            id: driver.id,
            profileId: driver.profileId || '',
            fullName: driver.fullName,
            employeeId: driver.employeeId,
            branchId: driver.branchId || findBranchId(branchRecords, driver.branch),
            branchName: driver.branch,
            status: driver.status,
            licenseNumber: driver.licenseNumber,
            licenseRestrictions: driver.licenseRestrictions || driver.restrictions || '',
            licenseExpiry: driver.licenseExpiry,
            contactNumber: driver.contactNumber || '',
          }
        : createDriverSettingsForm(branchOptions[0]?.id || '')
    );
    setDriverSettingsModalOpen(true);
  }

  function handleCloseDriverSettingsModal() {
    setDriverSettingsModalOpen(false);
  }

  async function handleDriverSettingsSubmit(event) {
    event.preventDefault();

    if (!driverSettingsForm.fullName.trim() || !driverSettingsForm.employeeId.trim()) {
      showToast('Enter the driver name and employee ID.', 'warning', 'Missing details');
      return;
    }

    if (!supabase) {
      showToast('Supabase is not configured for driver changes.', 'danger', 'Settings failed');
      return;
    }

    try {
      await saveLiveDriver(supabase, driverSettingsForm);
      await refreshLiveData(currentSessionUser);
      appendAuditEntry({
        category: 'driver',
        action: driverSettingsForm.id ? 'Updated driver record' : 'Created driver record',
        target: driverSettingsForm.fullName.trim(),
        branch: branchOptions.find((branch) => branch.id === driverSettingsForm.branchId)?.name || currentSessionUser.branch,
        details: `Saved driver ${driverSettingsForm.fullName.trim()} in live mode.`,
      });
      showToast('Driver record updated.', 'success', 'Settings saved');
      handleCloseDriverSettingsModal();
    } catch (error) {
      showToast(error.message || 'Unable to save the driver record.', 'danger', 'Settings failed');
    }
  }

  async function handleDeleteDriver(driver) {
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
    setVehicleSettingsForm(
      vehicle
        ? {
            id: vehicle.id,
            vehicleName: vehicle.vehicleName,
            plateNumber: vehicle.plateNumber,
            branchId: vehicle.branchId || findBranchId(branchRecords, vehicle.branch),
            branchName: vehicle.branch,
            typeId: vehicle.typeId || vehicleTypeRecords.find((type) => type.name === vehicle.type)?.id || vehicle.type,
            status: vehicle.status,
            fuelType: vehicle.fuelType,
            seatingCapacity: String(vehicle.seatingCapacity),
            odometerCurrent: String(vehicle.odometerCurrent),
            registrationExpiry: vehicle.registrationExpiry,
            insuranceExpiry: vehicle.insuranceExpiry,
            fuelEfficiency: String(vehicle.fuelEfficiency || 10),
            isOdoDefective: vehicle.isOdoDefective || false,
          }
        : createVehicleSettingsForm(branchOptions[0]?.id || '', vehicleTypeRecords[0]?.id || '')
    );
    setVehicleSettingsModalOpen(true);
  }

  function handleCloseVehicleSettingsModal() {
    setVehicleSettingsModalOpen(false);
  }

  async function handleVehicleSettingsSubmit(event) {
    event.preventDefault();

    if (!vehicleSettingsForm.vehicleName.trim() || !vehicleSettingsForm.plateNumber.trim()) {
      showToast('Enter the vehicle name and plate number.', 'warning', 'Missing details');
      return;
    }

    if (supabase) {
      try {
        await saveLiveVehicle(supabase, vehicleSettingsForm, vehicleTypeRecords);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'vehicle',
          action: vehicleSettingsForm.id ? 'Updated vehicle record' : 'Created vehicle record',
          target: vehicleSettingsForm.vehicleName.trim(),
          branch: branchOptions.find((branch) => branch.id === vehicleSettingsForm.branchId)?.name || currentSessionUser.branch,
          details: `Saved vehicle ${vehicleSettingsForm.vehicleName.trim()} in live mode.`,
        });
        showToast('Vehicle record updated.', 'success', 'Settings saved');
        handleCloseVehicleSettingsModal();
      } catch (error) {
        showToast(error.message || 'Unable to save the vehicle record.', 'danger', 'Settings failed');
      }

      return;
    }

    const branchName = branchOptions.find((branch) => branch.id === vehicleSettingsForm.branchId)?.name || 'Unassigned';
    const vehicleTypeName = vehicleTypeRecords.find((type) => type.id === vehicleSettingsForm.typeId)?.name || vehicleSettingsForm.typeId;
    const nextVehicle = {
      id: vehicleSettingsForm.id || createId('veh'),
      plateNumber: vehicleSettingsForm.plateNumber.trim(),
      vehicleName: vehicleSettingsForm.vehicleName.trim(),
      type: vehicleTypeName,
      typeId: vehicleSettingsForm.typeId,
      branch: branchName,
      branchId: vehicleSettingsForm.branchId,
      status: vehicleSettingsForm.status,
      fuelType: vehicleSettingsForm.fuelType.trim(),
      seatingCapacity: Number(vehicleSettingsForm.seatingCapacity || 0),
      odometerCurrent: Number(vehicleSettingsForm.odometerCurrent || 0),
      registrationExpiry: vehicleSettingsForm.registrationExpiry,
      insuranceExpiry: vehicleSettingsForm.insuranceExpiry,
      fuelEfficiency: Number(vehicleSettingsForm.fuelEfficiency || 10),
      isOdoDefective: vehicleSettingsForm.isOdoDefective || false,
      assignedDriver: 'Unassigned',
    };

    setVehicleRecords((current) =>
      vehicleSettingsForm.id
        ? current.map((vehicle) => (vehicle.id === vehicleSettingsForm.id ? nextVehicle : vehicle))
        : [nextVehicle, ...current]
    );

    appendAuditEntry({
      category: 'vehicle',
      action: vehicleSettingsForm.id ? 'Updated vehicle record' : 'Created vehicle record',
      target: nextVehicle.vehicleName,
      branch: nextVehicle.branch,
      details: `${vehicleSettingsForm.id ? 'Updated' : 'Created'} ${nextVehicle.type} vehicle ${nextVehicle.vehicleName}.`,
    });
    showToast(`Vehicle ${vehicleSettingsForm.id ? 'updated' : 'added'} successfully.`, 'success', 'Settings saved');
    handleCloseVehicleSettingsModal();
  }

  async function handleDeleteVehicle(vehicle) {
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

  async function handleRequestSubmit(event) {
    event.preventDefault();

    const purpose = requestForm.purpose.trim();
    const destination = requestForm.destination.trim();

    if (!purpose || !destination) {
      showToast('Add a purpose and destination before sending the request.', 'warning', 'Missing details');
      return;
    }

    const selectedVehicle = vehicleRecords.find((vehicle) => vehicle.id === requestForm.assignedVehicleId);
    const selectedDriver = driverRecords.find((driver) => driver.id === requestForm.assignedDriverId);

    if (
      requestForm.assignedVehicleId
      && (
        selectedVehicle?.status !== 'available'
        || unavailableVehicleIds.has(requestForm.assignedVehicleId)
      )
    ) {
      showToast('Choose a vehicle that is currently available.', 'warning', 'Vehicle unavailable');
      return;
    }

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

    if (supabase) {
      try {
        const requestNo = await createLiveRequest(
          supabase,
          currentSessionUser,
          requestForm,
          requestRecords.length
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

    const requestNo = createRequestNumber(requestRecords);
    const nextRequest = {
      id: createId('req'),
      requestNo,
      branch: currentSessionUser.branch,
      requestedBy: currentSessionUser.name,
      purpose,
      destination,
      departureDatetime: requestForm.departureDatetime,
      expectedReturnDatetime: requestForm.expectedReturnDatetime,
      passengerCount: Number(requestForm.passengerCount || 1),
      status: 'Pending Approval',
      approver: 'Pending',
      assignedVehicle: selectedVehicle?.vehicleName || 'Unassigned',
      assignedVehicleId: requestForm.assignedVehicleId || '',
      assignedDriver: selectedDriver?.fullName || 'Unassigned',
      assignedDriverId: requestForm.assignedDriverId || '',
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
    if (requestForm.assignedDriverId) {
      setDriverRecords((current) =>
        current.map((driver) =>
          driver.id === requestForm.assignedDriverId
            ? {
                ...driver,
                status: 'assigned',
              }
            : driver
        )
      );
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
    const odometerOut = Number(checkoutForm.odometerOut);
    const releaseVehicle = vehicleRecords.find((v) => v.id === tripToRelease?.vehicleId);
    const isOdoDefective = releaseVehicle?.isOdoDefective || false;

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
        await checkoutLiveTrip(supabase, tripToRelease, checkoutForm, odometerOut);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'trip',
          action: 'Released trip',
          target: tripToRelease.requestNo,
          branch: tripToRelease.origin,
          details: `Released ${tripToRelease.vehicle} with odometer out ${odometerOut}.`,
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
              dateOut: checkoutForm.dateOut,
              odometerOut,
              fuelOut: checkoutForm.fuelOut,
              conditionOut: checkoutForm.conditionOut,
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
      details: `Released ${tripToRelease.vehicle} with odometer out ${odometerOut}.`,
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
    const odometerIn = Number(checkinForm.odometerIn);
    const returnVehicle = vehicleRecords.find((v) => v.id === tripToClose?.vehicleId);
    const isOdoDefective = returnVehicle?.isOdoDefective || false;

    if (!tripToClose) {
      showToast('Select an active trip before checking a vehicle in.', 'warning', 'Trip required');
      return;
    }

    if (!isOdoDefective && (Number.isNaN(odometerIn) || odometerIn <= Number(tripToClose.odometerOut || 0))) {
      showToast('The return odometer must be higher than the check-out reading.', 'warning', 'Invalid mileage');
      return;
    }

    const mileageComputed = isOdoDefective ? 0 : odometerIn - Number(tripToClose.odometerOut || 0);

    if (supabase) {
      try {
        await checkinLiveTrip(supabase, tripToClose, checkinForm, odometerIn);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'trip',
          action: 'Completed return',
          target: tripToClose.requestNo,
          branch: tripToClose.origin,
          details: `Returned ${tripToClose.vehicle} with ${mileageComputed} km traveled.`,
        });
        showToast(`${tripToClose.vehicle} checked in and mileage updated.`, 'success', 'Vehicle returned');
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
              tripStatus: 'Returned',
              actualReturnDatetime: checkinForm.dateIn,
              dateIn: checkinForm.dateIn,
              odometerIn,
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
              status: 'Returned',
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
              odometerCurrent: odometerIn,
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
      details: `Returned ${tripToClose.vehicle} with ${mileageComputed} km traveled.`,
    });
    pushNotification(
      'Vehicle returned',
      `${tripToClose.vehicle} logged ${mileageComputed} km on return.`,
      'info'
    );
    showToast(`${tripToClose.vehicle} checked in and mileage updated.`, 'success', 'Vehicle returned');
    const nextTripRecords = tripRecords.map((trip) =>
      trip.id === tripToClose.id ? { ...trip, tripStatus: 'Returned' } : trip
    );
    setCheckinForm(
      pickCheckinDefaults(
        getVisibleTripRecords(nextTripRecords),
        ACTIVE_TRIP_STATUSES
      )
    );
    setActiveView('trips');
  }

  async function handleApproveTripTicket(trip) {
    if (userMode !== 'admin') {
      showToast('Only admins can perform final trip ticket approval.', 'warning', 'Permission denied');
      return;
    }

    if (supabase) {
      try {
        await approveLiveTripTicket(supabase, trip.dbId || trip.id, currentSessionUser.id);
        await refreshLiveData(currentSessionUser);
        appendAuditEntry({
          category: 'trip',
          action: 'Approved trip ticket',
          target: trip.requestNo,
          branch: trip.origin,
          details: `${currentSessionUser.name} performed final audit and closed ${trip.requestNo}.`,
        });
        showToast(`Trip ticket for ${trip.requestNo} approved and closed.`, 'success', 'Trip completed');
      } catch (error) {
        showToast(error.message || 'Unable to approve the trip ticket.', 'danger', 'Approval failed');
      }

      return;
    }

    setTripRecords((current) =>
      current.map((entry) =>
        entry.id === trip.id
          ? {
              ...entry,
              tripStatus: 'Closed',
            }
          : entry
      )
    );
    appendAuditEntry({
      category: 'trip',
      action: 'Approved trip ticket',
      target: trip.requestNo,
      branch: trip.origin,
      details: `${currentSessionUser.name} performed final audit and closed ${trip.requestNo}.`,
    });
    showToast(`Trip ticket for ${trip.requestNo} approved and closed.`, 'success', 'Trip completed');
  }


  async function handleLogout() {
    const emailToRemember = currentSessionUser.email;
    const currentUserName = currentSessionUser.name;

    isSigningOutRef.current = true;
    setMobileNavOpen(false);
    setRequestModalOpen(false);
    setActiveView('dashboard');
    setIsPasswordVisible(false);
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
      setLoginError('Enter your email and password to continue.');
      return;
    }

    if (!supabase) {
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

  if (isBootstrapping) {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-card-bootstrapping">
          <div className="auth-brand auth-logo-pulse">
            <BrandLogo compact className="auth-brand-logo" />
            <div className="auth-brand-copy">
              <strong>Vehicle Management System</strong>
            </div>
          </div>
          <p className="auth-kicker">Live workspace</p>
          <h1 className="auth-connecting-title">Connecting</h1>
          
          <div className="auth-loader-track">
            <div className="auth-loader-progress" />
          </div>

          <p className="auth-copy">
            Checking your live session and preparing the workspace.
          </p>
          {liveDataError && <p className="auth-error">{liveDataError}</p>}
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
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
            {liveDataError && <p className="auth-error">{liveDataError}</p>}
            {loginError && <p className="auth-error">{loginError}</p>}
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
            {availableNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${selectedView === item.id ? 'nav-item-active' : ''}`}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileNavOpen(false);
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
            <button type="button" className="button button-secondary topbar-profile" onClick={handleOpenProfileModal}>
              <AppIcon name="user" className="button-icon" />
              Profile
            </button>
            <button type="button" className="button button-secondary topbar-logout" onClick={handleLogout}>
              <AppIcon name="logout" className="button-icon" />
              Log out
            </button>
          </div>
        </header>

        <PageHero heroContent={heroContent} onAction={handleHeroAction} />

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
            driverOptions={requestDriverOptions}
            vehicleOptions={requestVehicleOptions}
            assignmentVehicleOptions={assignmentVehicleOptions}
            onOpenRequestModal={handleOpenRequestModal}
            onCloseRequestModal={() => setRequestModalOpen(false)}
            onRequestFormChange={handleRequestFormChange}
            onRequestSubmit={handleRequestSubmit}
            rejectionModalOpen={rejectionModalOpen}
            assignmentModalOpen={assignmentModalOpen}
            rejectionRemarks={rejectionRemarks}
            selectedReviewRequest={selectedReviewRequest}
            selectedAssignmentRequest={selectedAssignmentRequest}
            assignmentVehicleId={assignmentVehicleId}
            onCloseRejectionModal={handleCloseRejectionModal}
            onCloseAssignmentModal={handleCloseAssignmentModal}
            onAssignmentVehicleChange={setAssignmentVehicleId}
            onRejectionRemarksChange={setRejectionRemarks}
            onRejectRequest={handleRejectRequest}
            onOpenAssignmentModal={handleOpenAssignmentModal}
            onAssignmentSubmit={handleAssignmentSubmit}
            onApproveRequest={handleReviewRequest}
            onRejectSubmit={handleRejectSubmit}
          />
        )}
        {selectedView === 'trips' && (
          <TripsPage
            tripRecords={visibleTripRecords}
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
            onApproveTripTicket={handleApproveTripTicket}
          />
        )}
        {selectedView === 'calendar' && (
          <TripsCalendarPage tripRecords={visibleTripRecords} />
        )}
        {selectedView === 'vehicles' && (
          <VehiclesPage
            vehicleFilter={vehicleFilter}
            setVehicleFilter={setVehicleFilter}
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
            incidentRecords={incidentRecords}
            onOpenMaintenanceModal={handleOpenMaintenanceModal}
            onOpenIncidentModal={handleOpenIncidentModal}
          />
        )}
        {selectedView === 'settings' && (
          <AdminSettingsPage
            isLiveMode={Boolean(supabase)}
            branchRecords={branchRecords}
            userRecords={userRecords}
            driverRecords={driverRecords}
            vehicleRecords={vehicleRecords}
            auditRecords={auditRecords}
            onAddBranch={() => handleOpenBranchSettingsModal()}
            onEditBranch={handleOpenBranchSettingsModal}
            onDeleteBranch={handleDeleteBranch}
            onAddUser={() => handleOpenUserSettingsModal()}
            onEditUser={handleOpenUserSettingsModal}
            onDeleteUser={handleDeleteUser}
            onAddDriver={() => handleOpenDriverSettingsModal()}
            onEditDriver={handleOpenDriverSettingsModal}
            onDeleteDriver={handleDeleteDriver}
            onAddVehicle={() => handleOpenVehicleSettingsModal()}
            onEditVehicle={handleOpenVehicleSettingsModal}
            onDeleteVehicle={handleDeleteVehicle}
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
                        ? 'Live mode edits the selected profile, role assignment, and branch.'
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
                      disabled={Boolean(userSettingsForm.id)}
                    />
                  </label>
                  <label>
                    <span className="field-label">Role</span>
                    <select
                      className="input"
                      value={userSettingsForm.role}
                      onChange={(event) => handleUserSettingsFieldChange('role', event.target.value)}
                    >
                      {['Admin', 'Approver', 'Driver', 'Requester'].map((role) => (
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
                  {!userSettingsForm.id && (
                    <>
                      <label>
                        <span className="field-label">Temporary password</span>
                        <input
                          className="input"
                          type="password"
                          value={userSettingsForm.password}
                          onChange={(event) => handleUserSettingsFieldChange('password', event.target.value)}
                        />
                      </label>
                      <label>
                        <span className="field-label">Confirm password</span>
                        <input
                          className="input"
                          type="password"
                          value={userSettingsForm.confirmPassword}
                          onChange={(event) => handleUserSettingsFieldChange('confirmPassword', event.target.value)}
                        />
                      </label>
                    </>
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
                    <select className="input" value={driverSettingsForm.branchId} onChange={(event) => handleDriverSettingsFieldChange('branchId', event.target.value)}>
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
                    <input className="input" value={driverSettingsForm.licenseRestrictions} onChange={(event) => handleDriverSettingsFieldChange('licenseRestrictions', event.target.value)} />
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
                    <select className="input" value={vehicleSettingsForm.branchId} onChange={(event) => handleVehicleSettingsFieldChange('branchId', event.target.value)}>
                      {vehicleBranchOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Type</span>
                    <select className="input" value={vehicleSettingsForm.typeId} onChange={(event) => handleVehicleSettingsFieldChange('typeId', event.target.value)}>
                      {vehicleTypeRecords.map((type) => (
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
                    <input className="input" value={vehicleSettingsForm.fuelType} onChange={(event) => handleVehicleSettingsFieldChange('fuelType', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Seating capacity</span>
                    <input className="input" type="number" min="1" value={vehicleSettingsForm.seatingCapacity} onChange={(event) => handleVehicleSettingsFieldChange('seatingCapacity', event.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Odometer</span>
                    <input className="input" type="number" min="0" value={vehicleSettingsForm.odometerCurrent} onChange={(event) => handleVehicleSettingsFieldChange('odometerCurrent', event.target.value)} />
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
                      placeholder="e.g. Oil Change, Tire Check"
                      value={maintenanceForm.maintenanceType} 
                      onChange={(event) => handleMaintenanceFieldChange('maintenanceType', event.target.value)} 
                    />
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
    </div>
  );
}

export default App;
