import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/AppIcon';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../utils/appHelpers';

const AUDIT_ROWS_PER_PAGE = 8;
const SETTINGS_ROWS_PER_PAGE = 8;

const matchesTextQuery = (values, query) => {
  const normalizedQuery = String(query || '').trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).toLowerCase())
    .join(' ')
    .includes(normalizedQuery);
};

const CSV_TEMPLATES = {
  users: {
    filename: 'users-import-template.csv',
    headers: ['full_name', 'email', 'role', 'branch_code', 'password'],
    rows: [
      {
        full_name: 'Ana Dela Cruz',
        email: 'ana.delacruz@bmpc.local',
        role: 'requester',
        branch_code: 'MAIN',
        password: 'TempPass#2026',
      },
      {
        full_name: 'Marco Reyes',
        email: 'marco.reyes@bmpc.local',
        role: 'driver',
        branch_code: 'NORTH',
        password: 'TempPass#2026',
      },
    ],
  },
  drivers: {
    filename: 'drivers-import-template.csv',
    headers: [
      'full_name',
      'employee_id',
      'branch_code',
      'license_number',
      'license_expiry',
      'contact_number',
      'license_restrictions',
      'status',
      'profile_email',
    ],
    rows: [
      {
        full_name: 'Lara Cruz',
        employee_id: 'BMPC-223',
        branch_code: 'MAIN',
        license_number: 'D02-09-776655',
        license_expiry: '2026-07-10',
        contact_number: '0917-200-1102',
        license_restrictions: 'B B1',
        status: 'assigned',
        profile_email: 'driver.lara@bmpc.local',
      },
      {
        full_name: 'Joel Ramirez',
        employee_id: 'BMPC-310',
        branch_code: 'NORTH',
        license_number: 'D03-05-456123',
        license_expiry: '2026-04-11',
        contact_number: '0917-200-1103',
        license_restrictions: 'B B1 B2',
        status: 'on_trip',
        profile_email: 'driver.joel@bmpc.local',
      },
    ],
  },
  vehicles: {
    filename: 'vehicles-import-template.csv',
    headers: [
      'vehicle_name',
      'plate_number',
      'branch_code',
      'type_name',
      'status',
      'fuel_type',
      'seating_capacity',
      'odometer_current',
      'registration_expiry',
      'insurance_expiry',
      'required_restrictions',
      'is_odo_defective',
      'oil_change_reminder_enabled',
      'oil_change_interval_km',
      'oil_change_interval_months',
      'oil_change_last_odometer',
      'oil_change_last_changed_on',
    ],
    rows: [
      {
        vehicle_name: 'Hilux Field Unit',
        plate_number: 'NAB-1024',
        branch_code: 'MAIN',
        type_name: 'Pickup',
        status: 'available',
        fuel_type: 'Diesel',
        seating_capacity: '5',
        odometer_current: '42155',
        registration_expiry: '2026-05-08',
        insurance_expiry: '2026-04-02',
        required_restrictions: 'B B1',
        is_odo_defective: 'false',
        oil_change_reminder_enabled: 'true',
        oil_change_interval_km: '5000',
        oil_change_interval_months: '6',
        oil_change_last_odometer: '38000',
        oil_change_last_changed_on: '2025-12-15',
      },
      {
        vehicle_name: 'Montero Response',
        plate_number: 'NEF-7730',
        branch_code: 'NORTH',
        type_name: 'SUV',
        status: 'in_use',
        fuel_type: 'Diesel',
        seating_capacity: '7',
        odometer_current: '58201',
        registration_expiry: '2026-06-20',
        insurance_expiry: '2026-03-18',
        required_restrictions: 'B B1 B2',
        is_odo_defective: 'false',
        oil_change_reminder_enabled: 'true',
        oil_change_interval_km: '7000',
        oil_change_interval_months: '6',
        oil_change_last_odometer: '53000',
        oil_change_last_changed_on: '2025-10-01',
      },
      {
        vehicle_name: 'Yamaha Utility Bike',
        plate_number: 'MBK-1007',
        branch_code: 'MAIN',
        type_name: 'Motorcycle',
        status: 'available',
        fuel_type: 'Gasoline',
        seating_capacity: '2',
        odometer_current: '11280',
        registration_expiry: '2026-11-15',
        insurance_expiry: '2026-09-20',
        required_restrictions: 'A A1',
        is_odo_defective: 'false',
        oil_change_reminder_enabled: 'true',
        oil_change_interval_km: '3000',
        oil_change_interval_months: '4',
        oil_change_last_odometer: '9800',
        oil_change_last_changed_on: '2026-02-01',
      },
    ],
  },
};

export default function AdminSettingsPage({
  branchRecords,
  userRecords,
  driverRecords,
  vehicleRecords,
  auditRecords,
  importProgress,
  visibleTabKeys,
  onAddBranch,
  onEditBranch,
  onDeleteBranch,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onImportUsersCsv,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
  onImportDriversCsv,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onImportVehiclesCsv,
}) {
  const [activeTab, setActiveTab] = useState('users');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditCategory, setAuditCategory] = useState('all');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const [branchesCurrentPage, setBranchesCurrentPage] = useState(1);
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [driversCurrentPage, setDriversCurrentPage] = useState(1);
  const [vehiclesCurrentPage, setVehiclesCurrentPage] = useState(1);
  const [branchesQuery, setBranchesQuery] = useState('');
  const [usersQuery, setUsersQuery] = useState('');
  const [driversQuery, setDriversQuery] = useState('');
  const [vehiclesQuery, setVehiclesQuery] = useState('');
  const [selectedDriverDetails, setSelectedDriverDetails] = useState(null);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);
  const normalizedImportScope = String(importProgress?.scope || '').trim().toLowerCase();
  const anyImportInProgress = Boolean(importProgress?.isActive);
  const importTotal = Math.max(0, Number(importProgress?.total || 0));
  const importProcessed = Math.min(importTotal, Math.max(0, Number(importProgress?.processed || 0)));
  const importPercent = importTotal ? Math.round((importProcessed / importTotal) * 100) : 0;
  const importLabel = String(importProgress?.label || 'Importing CSV');

  const renderImportProgress = useCallback((scope) => {
    if (!anyImportInProgress || normalizedImportScope !== scope) {
      return null;
    }

    return (
      <div className="settings-import-progress" role="status" aria-live="polite">
        <div className="settings-import-progress-meta">
          <span className="settings-import-progress-label">{importLabel}</span>
          <span className="settings-import-progress-value">
            {importProcessed}/{importTotal} ({importPercent}%)
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${importPercent}%` }} />
        </div>
      </div>
    );
  }, [anyImportInProgress, importLabel, importPercent, importProcessed, importTotal, normalizedImportScope]);

  const openCsvPicker = useCallback((onImport) => {
    if (typeof onImport !== 'function') {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = () => {
      const file = input.files?.[0];

      if (file) {
        onImport(file);
      }
    };
    input.click();
  }, []);

  const downloadCsvTemplate = useCallback((templateKey) => {
    const template = CSV_TEMPLATES[templateKey];

    if (!template) {
      return;
    }

    const toCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvText = [template.headers, ...(template.rows || []).map((row) => template.headers.map((header) => row?.[header] ?? ''))]
      .map((rowValues) => rowValues.map(toCsvCell).join(','))
      .join('\n')
      .concat('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = template.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, []);

  const filteredAuditRecords = useMemo(() => {
    const normalizedQuery = auditQuery.trim().toLowerCase();
    const startBoundary = auditStartDate ? new Date(`${auditStartDate}T00:00:00`) : null;
    const endBoundary = auditEndDate ? new Date(`${auditEndDate}T23:59:59.999`) : null;

    return [...auditRecords]
      .filter((entry) => {
        const entryTimestamp = new Date(entry.timestamp);

        if (auditCategory !== 'all' && entry.category !== auditCategory) {
          return false;
        }

        if (startBoundary && entryTimestamp < startBoundary) {
          return false;
        }

        if (endBoundary && entryTimestamp > endBoundary) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const haystack = [
          entry.actor,
          entry.actorRole,
          entry.action,
          entry.target,
          entry.branch,
          entry.source,
          entry.details,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  }, [auditCategory, auditEndDate, auditQuery, auditRecords, auditStartDate]);

  const handleAuditExport = useCallback(() => {
    if (!filteredAuditRecords.length) {
      return;
    }

    const headers = ['Timestamp', 'Actor', 'Role', 'Category', 'Action', 'Target', 'Branch', 'Source', 'Details'];
    const rows = filteredAuditRecords.map((entry) => [
      entry.timestamp,
      entry.actor,
      entry.actorRole,
      entry.category,
      entry.action,
      entry.target,
      entry.branch,
      entry.source,
      entry.details || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateSuffix = new Date().toISOString().slice(0, 10);

    link.href = downloadUrl;
    link.download = `audit-trail-${dateSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, [filteredAuditRecords]);

  useEffect(() => {
    setAuditCurrentPage(1);
  }, [auditCategory, auditEndDate, auditQuery, auditStartDate]);

  const auditTotalPages = Math.max(1, Math.ceil(filteredAuditRecords.length / AUDIT_ROWS_PER_PAGE));
  const paginatedAuditRecords = filteredAuditRecords.slice((auditCurrentPage - 1) * AUDIT_ROWS_PER_PAGE, auditCurrentPage * AUDIT_ROWS_PER_PAGE);
  const auditPageStart = filteredAuditRecords.length === 0 ? 0 : (auditCurrentPage - 1) * AUDIT_ROWS_PER_PAGE + 1;
  const auditPageEnd = Math.min(auditCurrentPage * AUDIT_ROWS_PER_PAGE, filteredAuditRecords.length);

  useEffect(() => {
    if (auditCurrentPage > auditTotalPages) {
      setAuditCurrentPage(auditTotalPages);
    }
  }, [auditCurrentPage, auditTotalPages]);

  const filteredBranchRecords = useMemo(
    () =>
      branchRecords.filter((branch) =>
        matchesTextQuery(
          [
            branch.code,
            branch.name,
            branch.address,
            branch.isActive ? 'active' : 'inactive',
            branch.assignedUsers,
            branch.assignedVehicles,
            branch.assignedDrivers,
          ],
          branchesQuery,
        ),
      ),
    [branchRecords, branchesQuery],
  );

  const branchesTotalPages = Math.max(1, Math.ceil(filteredBranchRecords.length / SETTINGS_ROWS_PER_PAGE));
  const paginatedBranchRecords = useMemo(
    () => filteredBranchRecords.slice((branchesCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE, branchesCurrentPage * SETTINGS_ROWS_PER_PAGE),
    [filteredBranchRecords, branchesCurrentPage],
  );
  const branchesPageStart = filteredBranchRecords.length === 0 ? 0 : (branchesCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE + 1;
  const branchesPageEnd = Math.min(branchesCurrentPage * SETTINGS_ROWS_PER_PAGE, filteredBranchRecords.length);

  useEffect(() => {
    setBranchesCurrentPage(1);
  }, [branchesQuery]);

  useEffect(() => {
    if (branchesCurrentPage > branchesTotalPages) {
      setBranchesCurrentPage(branchesTotalPages);
    }
  }, [branchesCurrentPage, branchesTotalPages]);

  const filteredUserRecords = useMemo(
    () =>
      userRecords.filter((user) =>
        matchesTextQuery([user.name, user.email, user.role, user.branch], usersQuery),
      ),
    [userRecords, usersQuery],
  );

  const usersTotalPages = Math.max(1, Math.ceil(filteredUserRecords.length / SETTINGS_ROWS_PER_PAGE));
  const paginatedUserRecords = useMemo(
    () => filteredUserRecords.slice((usersCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE, usersCurrentPage * SETTINGS_ROWS_PER_PAGE),
    [filteredUserRecords, usersCurrentPage],
  );
  const usersPageStart = filteredUserRecords.length === 0 ? 0 : (usersCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE + 1;
  const usersPageEnd = Math.min(usersCurrentPage * SETTINGS_ROWS_PER_PAGE, filteredUserRecords.length);

  useEffect(() => {
    setUsersCurrentPage(1);
  }, [usersQuery]);

  useEffect(() => {
    if (usersCurrentPage > usersTotalPages) {
      setUsersCurrentPage(usersTotalPages);
    }
  }, [usersCurrentPage, usersTotalPages]);

  const filteredDriverRecords = useMemo(
    () =>
      driverRecords.filter((driver) =>
        matchesTextQuery(
          [
            driver.fullName,
            driver.employeeId,
            driver.branch,
            driver.status,
            driver.licenseNumber,
            driver.licenseExpiry,
            driver.licenseRestrictions,
            driver.restrictions,
            driver.contactNumber,
            driver.linkedAccountEmail,
            driver.linkedAccountName,
          ],
          driversQuery,
        ),
      ),
    [driverRecords, driversQuery],
  );

  const driversTotalPages = Math.max(1, Math.ceil(filteredDriverRecords.length / SETTINGS_ROWS_PER_PAGE));
  const paginatedDriverRecords = useMemo(
    () => filteredDriverRecords.slice((driversCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE, driversCurrentPage * SETTINGS_ROWS_PER_PAGE),
    [filteredDriverRecords, driversCurrentPage],
  );
  const driversPageStart = filteredDriverRecords.length === 0 ? 0 : (driversCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE + 1;
  const driversPageEnd = Math.min(driversCurrentPage * SETTINGS_ROWS_PER_PAGE, filteredDriverRecords.length);

  useEffect(() => {
    setDriversCurrentPage(1);
  }, [driversQuery]);

  useEffect(() => {
    if (driversCurrentPage > driversTotalPages) {
      setDriversCurrentPage(driversTotalPages);
    }
  }, [driversCurrentPage, driversTotalPages]);

  const filteredVehicleRecords = useMemo(
    () =>
      vehicleRecords.filter((vehicle) =>
        matchesTextQuery(
          [
            vehicle.vehicleName,
            vehicle.plateNumber,
            vehicle.branch,
            vehicle.status,
            vehicle.type,
            vehicle.fuelType,
            vehicle.seatingCapacity,
            vehicle.odometerCurrent,
            vehicle.requiredRestrictions,
          ],
          vehiclesQuery,
        ),
      ),
    [vehicleRecords, vehiclesQuery],
  );

  const vehiclesTotalPages = Math.max(1, Math.ceil(filteredVehicleRecords.length / SETTINGS_ROWS_PER_PAGE));
  const paginatedVehicleRecords = useMemo(
    () => filteredVehicleRecords.slice((vehiclesCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE, vehiclesCurrentPage * SETTINGS_ROWS_PER_PAGE),
    [filteredVehicleRecords, vehiclesCurrentPage],
  );
  const vehiclesPageStart = filteredVehicleRecords.length === 0 ? 0 : (vehiclesCurrentPage - 1) * SETTINGS_ROWS_PER_PAGE + 1;
  const vehiclesPageEnd = Math.min(vehiclesCurrentPage * SETTINGS_ROWS_PER_PAGE, filteredVehicleRecords.length);

  useEffect(() => {
    setVehiclesCurrentPage(1);
  }, [vehiclesQuery]);

  useEffect(() => {
    if (vehiclesCurrentPage > vehiclesTotalPages) {
      setVehiclesCurrentPage(vehiclesTotalPages);
    }
  }, [vehiclesCurrentPage, vehiclesTotalPages]);

  const allTabs = useMemo(
    () => [
      {
        key: 'branches',
        label: 'Branches',
        count: branchRecords.length,
        title: 'Branches',
        subtitle: 'Manage the branch directory used by users, drivers, vehicles, and requests',
        note: 'Add branches here first, then assign them to user profiles, drivers, and vehicles.',
        searchControl: (
          <input
            className="input settings-search-input"
            placeholder="Search branch code, name, address, status..."
            value={branchesQuery}
            onChange={(event) => setBranchesQuery(event.target.value)}
          />
        ),
        action: (
          <button type="button" className="button button-primary" onClick={onAddBranch}>
            <AppIcon name="dashboard" className="button-icon" />
            Add branch
          </button>
        ),
        table: (
          <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Linked records</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranchRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">{branchesQuery.trim() ? 'No branches match your search.' : 'No branches available.'}</td>
                  </tr>
                )}
                {paginatedBranchRecords.map((branch) => (
                  <tr key={branch.id}>
                    <td>{branch.code || '-'}</td>
                    <td>
                      {branch.name}
                      <span className="cell-subtle">{branch.address || 'No address set'}</span>
                    </td>
                    <td>
                      <StatusBadge status={branch.isActive ? 'Active' : 'Inactive'} />
                    </td>
                    <td>
                      {branch.assignedUsers} users
                      <span className="cell-subtle">
                        {branch.assignedVehicles} vehicles | {branch.assignedDrivers} drivers
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="button button-secondary row-action-button" onClick={() => onEditBranch(branch)}>
                          Edit
                        </button>
                        <button type="button" className="button button-danger row-action-button" onClick={() => onDeleteBranch(branch)}>
                          <AppIcon name="trash" className="button-icon" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="request-pagination">
            <p className="request-pagination-copy">
              {filteredBranchRecords.length === 0
                ? 'No branches to show'
                : `Showing ${branchesPageStart}-${branchesPageEnd} of ${filteredBranchRecords.length} branches`}
            </p>
            <div className="request-pagination-actions">
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setBranchesCurrentPage((page) => Math.max(1, page - 1))}
                disabled={branchesCurrentPage === 1}
              >
                <span className="pagination-label-full">Previous</span>
                <span className="pagination-label-short">Prev</span>
              </button>
              <span className="request-page-indicator">
                <span className="request-page-indicator-full">Page {filteredBranchRecords.length === 0 ? 0 : branchesCurrentPage} of {filteredBranchRecords.length === 0 ? 0 : branchesTotalPages}</span>
                <span className="request-page-indicator-short">{filteredBranchRecords.length === 0 ? 0 : branchesCurrentPage}/{filteredBranchRecords.length === 0 ? 0 : branchesTotalPages}</span>
              </span>
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setBranchesCurrentPage((page) => Math.min(branchesTotalPages, page + 1))}
                disabled={branchesCurrentPage >= branchesTotalPages || filteredBranchRecords.length === 0}
              >
                <span className="pagination-label-full">Next</span>
                <span className="pagination-label-short">Next</span>
              </button>
            </div>
          </div>
          </>
        ),
      },
      {
        key: 'users',
        label: 'Users',
        count: userRecords.length,
        title: 'Users',
        subtitle: 'Edit existing profiles. New auth users must still be created in Supabase Auth.',
        note: 'Email and role are shown for reference. Profile name and branch can be maintained here.',
        searchControl: (
          <input
            className="input settings-search-input"
            placeholder="Search name, email, role, or branch..."
            value={usersQuery}
            onChange={(event) => setUsersQuery(event.target.value)}
          />
        ),
        action: (
          <div className="settings-action-stack">
            <div className="row-actions">
              <button type="button" className="button button-primary" onClick={onAddUser}>
                <AppIcon name="user" className="button-icon" />
                Add user
              </button>
              <button type="button" className="button button-secondary" onClick={() => downloadCsvTemplate('users')}>
                <AppIcon name="download" className="button-icon" />
                Template
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => openCsvPicker(onImportUsersCsv)}
                disabled={anyImportInProgress}
              >
                <AppIcon name="reports" className="button-icon" />
                {normalizedImportScope === 'users' && anyImportInProgress ? 'Importing...' : 'Import CSV'}
              </button>
            </div>
            {renderImportProgress('users')}
          </div>
        ),
        table: (
          <>
          <div className="table-wrap">
            <table className="data-table users-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUserRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">{usersQuery.trim() ? 'No users match your search.' : 'No users available.'}</td>
                  </tr>
                )}
                {paginatedUserRecords.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Name">
                      <div className="user-mobile-head">
                        <span>{user.name}</span>
                        <span className="user-mobile-role">
                          <StatusBadge status={user.role} />
                        </span>
                      </div>
                    </td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Role" className="user-role-cell"><StatusBadge status={user.role} /></td>
                    <td data-label="Branch">{user.branch}</td>
                    <td data-label="Action">
                      <div className="row-actions">
                        <button type="button" className="button button-secondary row-action-button" onClick={() => onEditUser(user)}>
                          Edit
                        </button>
                        <button type="button" className="button button-danger row-action-button" onClick={() => onDeleteUser(user)}>
                          <AppIcon name="trash" className="button-icon" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="request-pagination">
            <p className="request-pagination-copy">
              {filteredUserRecords.length === 0
                ? 'No users to show'
                : `Showing ${usersPageStart}-${usersPageEnd} of ${filteredUserRecords.length} users`}
            </p>
            <div className="request-pagination-actions">
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setUsersCurrentPage((page) => Math.max(1, page - 1))}
                disabled={usersCurrentPage === 1}
              >
                <span className="pagination-label-full">Previous</span>
                <span className="pagination-label-short">Prev</span>
              </button>
              <span className="request-page-indicator">
                <span className="request-page-indicator-full">Page {filteredUserRecords.length === 0 ? 0 : usersCurrentPage} of {filteredUserRecords.length === 0 ? 0 : usersTotalPages}</span>
                <span className="request-page-indicator-short">{filteredUserRecords.length === 0 ? 0 : usersCurrentPage}/{filteredUserRecords.length === 0 ? 0 : usersTotalPages}</span>
              </span>
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setUsersCurrentPage((page) => Math.min(usersTotalPages, page + 1))}
                disabled={usersCurrentPage >= usersTotalPages || filteredUserRecords.length === 0}
              >
                <span className="pagination-label-full">Next</span>
                <span className="pagination-label-short">Next</span>
              </button>
            </div>
          </div>
          </>
        ),
      },
      {
        key: 'drivers',
        label: 'Drivers',
        count: driverRecords.length,
        title: 'Drivers',
        subtitle: 'Availability, licensing, and branch assignment',
        note: 'Driver records here control request assignment choices and dispatch readiness.',
        searchControl: (
          <input
            className="input settings-search-input"
            placeholder="Search driver, employee ID, branch, status, license..."
            value={driversQuery}
            onChange={(event) => setDriversQuery(event.target.value)}
          />
        ),
        action: (
          <div className="settings-action-stack">
            <div className="row-actions">
              <button type="button" className="button button-primary" onClick={onAddDriver}>
                <AppIcon name="people" className="button-icon" />
                Add driver
              </button>
              <button type="button" className="button button-secondary" onClick={() => downloadCsvTemplate('drivers')}>
                <AppIcon name="download" className="button-icon" />
                Template
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => openCsvPicker(onImportDriversCsv)}
                disabled={anyImportInProgress}
              >
                <AppIcon name="reports" className="button-icon" />
                {normalizedImportScope === 'drivers' && anyImportInProgress ? 'Importing...' : 'Import CSV'}
              </button>
            </div>
            {renderImportProgress('drivers')}
          </div>
        ),
        table: (
          <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>License</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDriverRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">{driversQuery.trim() ? 'No drivers match your search.' : 'No drivers available.'}</td>
                  </tr>
                )}
                {paginatedDriverRecords.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      {driver.fullName}
                      <span className="cell-subtle">{driver.employeeId}</span>
                    </td>
                    <td>{driver.branch}</td>
                    <td><StatusBadge status={driver.status} /></td>
                    <td>
                      {driver.licenseNumber}
                      <span className="cell-subtle">{driver.licenseExpiry}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button button-secondary row-action-button"
                          onClick={() => setSelectedDriverDetails(driver)}
                        >
                          <AppIcon name="eye" className="button-icon" />
                          View details
                        </button>
                        <button type="button" className="button button-secondary row-action-button" onClick={() => onEditDriver(driver)}>
                          Edit
                        </button>
                        <button type="button" className="button button-danger row-action-button" onClick={() => onDeleteDriver(driver)}>
                          <AppIcon name="trash" className="button-icon" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="request-pagination">
            <p className="request-pagination-copy">
              {filteredDriverRecords.length === 0
                ? 'No drivers to show'
                : `Showing ${driversPageStart}-${driversPageEnd} of ${filteredDriverRecords.length} drivers`}
            </p>
            <div className="request-pagination-actions">
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setDriversCurrentPage((page) => Math.max(1, page - 1))}
                disabled={driversCurrentPage === 1}
              >
                <span className="pagination-label-full">Previous</span>
                <span className="pagination-label-short">Prev</span>
              </button>
              <span className="request-page-indicator">
                <span className="request-page-indicator-full">Page {filteredDriverRecords.length === 0 ? 0 : driversCurrentPage} of {filteredDriverRecords.length === 0 ? 0 : driversTotalPages}</span>
                <span className="request-page-indicator-short">{filteredDriverRecords.length === 0 ? 0 : driversCurrentPage}/{filteredDriverRecords.length === 0 ? 0 : driversTotalPages}</span>
              </span>
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setDriversCurrentPage((page) => Math.min(driversTotalPages, page + 1))}
                disabled={driversCurrentPage >= driversTotalPages || filteredDriverRecords.length === 0}
              >
                <span className="pagination-label-full">Next</span>
                <span className="pagination-label-short">Next</span>
              </button>
            </div>
          </div>
          </>
        ),
      },
      {
        key: 'vehicles',
        label: 'Vehicles',
        count: vehicleRecords.length,
        title: 'Vehicles',
        subtitle: 'Fleet master records and assignment readiness',
        note: 'Vehicle status here feeds the requester and assignment availability workflow.',
        searchControl: (
          <input
            className="input settings-search-input"
            placeholder="Search vehicle, plate, branch, status, type..."
            value={vehiclesQuery}
            onChange={(event) => setVehiclesQuery(event.target.value)}
          />
        ),
        action: (
          <div className="settings-action-stack">
            <div className="row-actions">
              {typeof onAddVehicle === 'function' && (
                <button type="button" className="button button-primary" onClick={onAddVehicle}>
                  <AppIcon name="vehicles" className="button-icon" />
                  Add vehicle
                </button>
              )}
              {typeof onImportVehiclesCsv === 'function' && (
                <>
                  <button type="button" className="button button-secondary" onClick={() => downloadCsvTemplate('vehicles')}>
                    <AppIcon name="download" className="button-icon" />
                    Template
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => openCsvPicker(onImportVehiclesCsv)}
                    disabled={anyImportInProgress}
                  >
                    <AppIcon name="reports" className="button-icon" />
                    {normalizedImportScope === 'vehicles' && anyImportInProgress ? 'Importing...' : 'Import CSV'}
                  </button>
                </>
              )}
            </div>
            {renderImportProgress('vehicles')}
          </div>
        ),
        table: (
          <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicleRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">{vehiclesQuery.trim() ? 'No vehicles match your search.' : 'No vehicles available.'}</td>
                  </tr>
                )}
                {paginatedVehicleRecords.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.vehicleName}</td>
                    <td>{vehicle.plateNumber}</td>
                    <td>{vehicle.branch}</td>
                    <td><StatusBadge status={vehicle.status} /></td>
                    <td>{vehicle.type}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button button-secondary row-action-button"
                          onClick={() => setSelectedVehicleDetails(vehicle)}
                        >
                          <AppIcon name="eye" className="button-icon" />
                          View details
                        </button>
                        {typeof onEditVehicle === 'function' && (
                          <button type="button" className="button button-secondary row-action-button" onClick={() => onEditVehicle(vehicle)}>
                            Edit
                          </button>
                        )}
                        {typeof onDeleteVehicle === 'function' && (
                          <button type="button" className="button button-danger row-action-button" onClick={() => onDeleteVehicle(vehicle)}>
                            <AppIcon name="trash" className="button-icon" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="request-pagination">
            <p className="request-pagination-copy">
              {filteredVehicleRecords.length === 0
                ? 'No vehicles to show'
                : `Showing ${vehiclesPageStart}-${vehiclesPageEnd} of ${filteredVehicleRecords.length} vehicles`}
            </p>
            <div className="request-pagination-actions">
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setVehiclesCurrentPage((page) => Math.max(1, page - 1))}
                disabled={vehiclesCurrentPage === 1}
              >
                <span className="pagination-label-full">Previous</span>
                <span className="pagination-label-short">Prev</span>
              </button>
              <span className="request-page-indicator">
                <span className="request-page-indicator-full">Page {filteredVehicleRecords.length === 0 ? 0 : vehiclesCurrentPage} of {filteredVehicleRecords.length === 0 ? 0 : vehiclesTotalPages}</span>
                <span className="request-page-indicator-short">{filteredVehicleRecords.length === 0 ? 0 : vehiclesCurrentPage}/{filteredVehicleRecords.length === 0 ? 0 : vehiclesTotalPages}</span>
              </span>
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setVehiclesCurrentPage((page) => Math.min(vehiclesTotalPages, page + 1))}
                disabled={vehiclesCurrentPage >= vehiclesTotalPages || filteredVehicleRecords.length === 0}
              >
                <span className="pagination-label-full">Next</span>
                <span className="pagination-label-short">Next</span>
              </button>
            </div>
          </div>
          </>
        ),
      },
      {
        key: 'audit',
        label: 'Audit trail',
        count: auditRecords.length,
        title: 'Audit trail',
        subtitle: 'Admin history of session, request, dispatch, compliance, and settings activity',
        note: 'This log captures meaningful write actions and security/session events across the workspace.',
        searchControl: (
          <input
            className="input settings-search-input"
            placeholder="Search actor, action, request, vehicle, or detail..."
            value={auditQuery}
            onChange={(event) => setAuditQuery(event.target.value)}
          />
        ),
        action: null,
        table: (
          <>
            <div className="audit-toolbar">
              <div className="audit-filter-grid">
                <label>
                  <span className="field-label">From</span>
                  <input
                    className="input"
                    type="date"
                    value={auditStartDate}
                    onChange={(event) => setAuditStartDate(event.target.value)}
                  />
                </label>
                <label>
                  <span className="field-label">To</span>
                  <input
                    className="input"
                    type="date"
                    value={auditEndDate}
                    onChange={(event) => setAuditEndDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="button button-secondary audit-export-button"
                  onClick={handleAuditExport}
                  disabled={!filteredAuditRecords.length}
                >
                  <AppIcon name="requests" className="button-icon" />
                  Export CSV
                </button>
              </div>
              <div className="toolbar toolbar-split audit-toolbar-lower">
                <div className="chip-row">
                  {['all', 'session', 'request', 'trip', 'branch', 'vehicle', 'user', 'driver', 'maintenance', 'incident', 'settings', 'security'].map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`chip-button ${auditCategory === category ? 'chip-button-active' : ''}`}
                      onClick={() => setAuditCategory(category)}
                    >
                      {category === 'all' ? 'All events' : category}
                    </button>
                  ))}
                </div>
                <p className="muted audit-results-copy">
                  {filteredAuditRecords.length === 0
                    ? `Showing 0 of ${auditRecords.length} audit events.`
                    : `Showing ${auditPageStart}-${auditPageEnd} of ${filteredAuditRecords.length} audit events.`}
                </p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Category</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Branch</th>
                    <th>Source</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditRecords.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-state">No audit entries match the current filters.</td>
                    </tr>
                  )}
                  {paginatedAuditRecords.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>{formatDate(entry.timestamp, true)}</strong>
                      </td>
                      <td>
                        {entry.actor}
                        <span className="cell-subtle">{entry.actorRole}</span>
                      </td>
                      <td>
                        <span className="audit-category-chip">{entry.category}</span>
                      </td>
                      <td>{entry.action}</td>
                      <td>{entry.target}</td>
                      <td>{entry.branch}</td>
                      <td>{entry.source}</td>
                      <td>{entry.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="request-pagination">
              <p className="request-pagination-copy">
                {filteredAuditRecords.length === 0
                  ? 'No audit events to show'
                  : `Showing ${auditPageStart}-${auditPageEnd} of ${filteredAuditRecords.length} audit events`}
              </p>
              <div className="request-pagination-actions">
                <button
                  type="button"
                  className="button button-secondary request-page-button pagination-nav-button"
                  onClick={() => setAuditCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={auditCurrentPage === 1}
                >
                  <span className="pagination-label-full">Previous</span>
                  <span className="pagination-label-short">Prev</span>
                </button>
                <span className="request-page-indicator">
                  <span className="request-page-indicator-full">Page {filteredAuditRecords.length === 0 ? 0 : auditCurrentPage} of {filteredAuditRecords.length === 0 ? 0 : auditTotalPages}</span>
                  <span className="request-page-indicator-short">{filteredAuditRecords.length === 0 ? 0 : auditCurrentPage}/{filteredAuditRecords.length === 0 ? 0 : auditTotalPages}</span>
                </span>
                <button
                  type="button"
                  className="button button-secondary request-page-button pagination-nav-button"
                  onClick={() => setAuditCurrentPage((page) => Math.min(auditTotalPages, page + 1))}
                  disabled={auditCurrentPage >= auditTotalPages || filteredAuditRecords.length === 0}
                >
                  <span className="pagination-label-full">Next</span>
                  <span className="pagination-label-short">Next</span>
                </button>
              </div>
            </div>
          </>
        ),
      },
    ],
    [
      branchRecords,
      branchesCurrentPage,
      branchesPageEnd,
      branchesPageStart,
      branchesQuery,
      branchesTotalPages,
      auditCategory,
      auditEndDate,
      handleAuditExport,
      auditQuery,
      auditCurrentPage,
      auditPageEnd,
      auditPageStart,
      auditRecords,
      auditStartDate,
      auditTotalPages,
      driverRecords,
      driversCurrentPage,
      driversPageEnd,
      driversPageStart,
      driversQuery,
      driversTotalPages,
      filteredBranchRecords,
      filteredAuditRecords,
      filteredDriverRecords,
      filteredUserRecords,
      filteredVehicleRecords,
      onAddBranch,
      onAddUser,
      onAddDriver,
      onAddVehicle,
      onDeleteBranch,
      onDeleteDriver,
      onDeleteUser,
      onDeleteVehicle,
      onEditBranch,
      onEditDriver,
      onEditVehicle,
      onEditUser,
      onImportDriversCsv,
      onImportUsersCsv,
      onImportVehiclesCsv,
      anyImportInProgress,
      normalizedImportScope,
      renderImportProgress,
      downloadCsvTemplate,
      openCsvPicker,
      paginatedBranchRecords,
      paginatedAuditRecords,
      paginatedDriverRecords,
      paginatedUserRecords,
      paginatedVehicleRecords,
      userRecords,
      usersCurrentPage,
      usersPageEnd,
      usersPageStart,
      usersQuery,
      usersTotalPages,
      vehicleRecords,
      vehiclesCurrentPage,
      vehiclesPageEnd,
      vehiclesPageStart,
      vehiclesQuery,
      vehiclesTotalPages,
    ],
  );

  const tabs = useMemo(() => {
    if (!Array.isArray(visibleTabKeys) || !visibleTabKeys.length) {
      return allTabs;
    }

    return allTabs.filter((tab) => visibleTabKeys.includes(tab.key));
  }, [allTabs, visibleTabKeys]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0]?.key || 'users');
    }
  }, [activeTab, tabs]);

  const activePanel = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  if (!activePanel) {
    return null;
  }

  return (
    <>
      {selectedVehicleDetails && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close vehicle details"
            onClick={() => setSelectedVehicleDetails(null)}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Vehicle details">
            <section className="modal-card modal-card-compact">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Vehicle details</p>
                  <h3>{selectedVehicleDetails.vehicleName}</h3>
                  <p className="modal-copy">
                    {selectedVehicleDetails.plateNumber} | {selectedVehicleDetails.branch} | {selectedVehicleDetails.type}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={() => setSelectedVehicleDetails(null)}
                >
                  Close
                </button>
              </div>

              <div className="detail-panel">
                <dl className="detail-list">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge status={selectedVehicleDetails.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Fuel type</dt>
                    <dd>{selectedVehicleDetails.fuelType || '-'}</dd>
                  </div>
                  <div>
                    <dt>Capacity</dt>
                    <dd>{selectedVehicleDetails.seatingCapacity || '-'} seats</dd>
                  </div>
                  <div>
                    <dt>Odometer</dt>
                    <dd>
                      {selectedVehicleDetails.odometerCurrent?.toLocaleString?.() || selectedVehicleDetails.odometerCurrent || '-'} km
                      {selectedVehicleDetails.isOdoDefective && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#f59e0b', fontWeight: '700', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: '99px' }}>DEFECTIVE</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Registration expiry</dt>
                    <dd>{formatDate(selectedVehicleDetails.registrationExpiry)}</dd>
                  </div>
                  <div>
                    <dt>Insurance expiry</dt>
                    <dd>{formatDate(selectedVehicleDetails.insuranceExpiry)}</dd>
                  </div>
                  <div>
                    <dt>Assigned driver</dt>
                    <dd>{selectedVehicleDetails.assignedDriver || 'Unassigned'}</dd>
                  </div>
                  <div>
                    <dt>Plate number</dt>
                    <dd>{selectedVehicleDetails.plateNumber}</dd>
                  </div>
                  <div>
                    <dt>Fuel efficiency</dt>
                    <dd>{selectedVehicleDetails.fuelEfficiency || 10} km/L</dd>
                  </div>
                  <div>
                    <dt>Oil reminder</dt>
                    <dd>{selectedVehicleDetails.oilChangeReminderEnabled ? 'Enabled' : 'Disabled'}</dd>
                  </div>
                  <div>
                    <dt>Oil interval</dt>
                    <dd>
                      {selectedVehicleDetails.oilChangeIntervalKm ? `${selectedVehicleDetails.oilChangeIntervalKm} km` : '-'}
                      {selectedVehicleDetails.oilChangeIntervalMonths ? ` | ${selectedVehicleDetails.oilChangeIntervalMonths} months` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Last oil change</dt>
                    <dd>
                      {selectedVehicleDetails.oilChangeLastOdometer || selectedVehicleDetails.oilChangeLastOdometer === 0
                        ? `${selectedVehicleDetails.oilChangeLastOdometer?.toLocaleString?.() || selectedVehicleDetails.oilChangeLastOdometer} km`
                        : '-'}
                      {selectedVehicleDetails.oilChangeLastChangedOn
                        ? ` | ${formatDate(selectedVehicleDetails.oilChangeLastChangedOn)}`
                        : ''}
                    </dd>
                  </div>
                  {selectedVehicleDetails.requiredRestrictions && (
                    <div>
                      <dt>Required Restrictions</dt>
                      <dd style={{ color: 'var(--brand-amber, #f59e0b)', fontWeight: '700' }}>
                        {selectedVehicleDetails.requiredRestrictions}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </section>
          </div>
        </>
      )}

      {selectedDriverDetails && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close driver details"
            onClick={() => setSelectedDriverDetails(null)}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Driver details">
            <section className="modal-card modal-card-compact">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Driver details</p>
                  <h3>{selectedDriverDetails.fullName}</h3>
                  <p className="modal-copy">
                    {selectedDriverDetails.employeeId} | {selectedDriverDetails.branch}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={() => setSelectedDriverDetails(null)}
                >
                  Close
                </button>
              </div>

              <div className="detail-panel">
                <dl className="detail-list">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge status={selectedDriverDetails.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{selectedDriverDetails.branch || '-'}</dd>
                  </div>
                  <div>
                    <dt>License number</dt>
                    <dd>{selectedDriverDetails.licenseNumber || '-'}</dd>
                  </div>
                  <div>
                    <dt>License expiry</dt>
                    <dd>{formatDate(selectedDriverDetails.licenseExpiry)}</dd>
                  </div>
                  <div>
                    <dt>Restrictions</dt>
                    <dd>{selectedDriverDetails.licenseRestrictions || selectedDriverDetails.restrictions || '-'}</dd>
                  </div>
                  <div>
                    <dt>Contact number</dt>
                    <dd>{selectedDriverDetails.contactNumber || '-'}</dd>
                  </div>
                  <div>
                    <dt>Linked account</dt>
                    <dd>
                      {selectedDriverDetails.linkedAccountEmail
                        ? `${selectedDriverDetails.linkedAccountName || 'Linked user'} (${selectedDriverDetails.linkedAccountEmail})`
                        : 'No linked account'}
                    </dd>
                  </div>
                  <div>
                    <dt>Employee ID</dt>
                    <dd>{selectedDriverDetails.employeeId || '-'}</dd>
                  </div>
                  <div>
                    <dt>Driver ID</dt>
                    <dd>{selectedDriverDetails.id || '-'}</dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        </>
      )}

      <div className="settings-layout">
        <SectionCard title={activePanel.title}>
          <div className="settings-tabs" role="tablist" aria-label="Settings tables">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`settings-tab-button ${activeTab === tab.key ? 'settings-tab-button-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="toolbar settings-toolbar">
            <div className="settings-toolbar-copy">
              <p className="muted settings-note">{activePanel.note}</p>
              {activePanel.searchControl}
            </div>
            {activePanel.action}
          </div>
          {activePanel.table}
        </SectionCard>
      </div>
    </>
  );
}
