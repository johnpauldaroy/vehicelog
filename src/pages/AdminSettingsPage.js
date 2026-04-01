import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/AppIcon';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../utils/appHelpers';

export default function AdminSettingsPage({
  isLiveMode,
  branchRecords,
  userRecords,
  driverRecords,
  vehicleRecords,
  auditRecords,
  oilReminderSettings,
  onAddBranch,
  onEditBranch,
  onDeleteBranch,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onSaveOilReminderSettings,
}) {
  const [activeTab, setActiveTab] = useState('users');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditCategory, setAuditCategory] = useState('all');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [selectedDriverDetails, setSelectedDriverDetails] = useState(null);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);
  const [automationForm, setAutomationForm] = useState(() => ({
    enabled: Boolean(oilReminderSettings?.enabled ?? true),
    oilChangeLeadDays: Number(oilReminderSettings?.oilChangeLeadDays ?? 7),
    timezone: String(oilReminderSettings?.timezone || 'Asia/Manila'),
  }));
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);

  useEffect(() => {
    setAutomationForm({
      enabled: Boolean(oilReminderSettings?.enabled ?? true),
      oilChangeLeadDays: Number(oilReminderSettings?.oilChangeLeadDays ?? 7),
      timezone: String(oilReminderSettings?.timezone || 'Asia/Manila'),
    });
  }, [oilReminderSettings]);

  const isAutomationDirty = useMemo(() => (
    Boolean(automationForm.enabled) !== Boolean(oilReminderSettings?.enabled ?? true)
    || Number(automationForm.oilChangeLeadDays ?? 7) !== Number(oilReminderSettings?.oilChangeLeadDays ?? 7)
    || String(automationForm.timezone || 'Asia/Manila') !== String(oilReminderSettings?.timezone || 'Asia/Manila')
  ), [automationForm, oilReminderSettings]);

  const handleAutomationFieldChange = useCallback((field, value) => {
    setAutomationForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleAutomationSave = useCallback(async () => {
    if (typeof onSaveOilReminderSettings !== 'function') {
      return;
    }

    setIsSavingAutomation(true);

    try {
      await onSaveOilReminderSettings({
        enabled: Boolean(automationForm.enabled),
        oilChangeLeadDays: Number.parseInt(String(automationForm.oilChangeLeadDays ?? ''), 10),
        timezone: String(automationForm.timezone || 'Asia/Manila'),
      });
    } catch (error) {
      console.error('Unable to save automation settings.', error);
    } finally {
      setIsSavingAutomation(false);
    }
  }, [automationForm, onSaveOilReminderSettings]);

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

  const tabs = useMemo(
    () => [
      {
        key: 'branches',
        label: 'Branches',
        count: branchRecords.length,
        title: 'Branches',
        subtitle: 'Manage the branch directory used by users, drivers, vehicles, and requests',
        note: 'Add branches here first, then assign them to user profiles, drivers, and vehicles.',
        action: (
          <button type="button" className="button button-primary" onClick={onAddBranch}>
            <AppIcon name="dashboard" className="button-icon" />
            Add branch
          </button>
        ),
        table: (
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
                {branchRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">No branches available.</td>
                  </tr>
                )}
                {branchRecords.map((branch) => (
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
        ),
      },
      {
        key: 'users',
        label: 'Users',
        count: userRecords.length,
        title: 'Users',
        subtitle: 'Edit existing profiles. New auth users must still be created in Supabase Auth.',
        note: 'Email and role are shown for reference. Profile name and branch can be maintained here.',
        action: (
          <button type="button" className="button button-primary" onClick={onAddUser}>
            <AppIcon name="user" className="button-icon" />
            Add user
          </button>
        ),
        table: (
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
                {userRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">No users available.</td>
                  </tr>
                )}
                {userRecords.map((user) => (
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
        ),
      },
      {
        key: 'drivers',
        label: 'Drivers',
        count: driverRecords.length,
        title: 'Drivers',
        subtitle: 'Availability, licensing, and branch assignment',
        note: 'Driver records here control request assignment choices and dispatch readiness.',
        action: (
          <button type="button" className="button button-primary" onClick={onAddDriver}>
            <AppIcon name="people" className="button-icon" />
            Add driver
          </button>
        ),
        table: (
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
                {driverRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">No drivers available.</td>
                  </tr>
                )}
                {driverRecords.map((driver) => (
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
        ),
      },
      {
        key: 'vehicles',
        label: 'Vehicles',
        count: vehicleRecords.length,
        title: 'Vehicles',
        subtitle: 'Fleet master records and assignment readiness',
        note: 'Vehicle status here feeds the requester and assignment availability workflow.',
        action: (
          <button type="button" className="button button-primary" onClick={onAddVehicle}>
            <AppIcon name="vehicles" className="button-icon" />
            Add vehicle
          </button>
        ),
        table: (
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
                {vehicleRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">No vehicles available.</td>
                  </tr>
                )}
                {vehicleRecords.map((vehicle) => (
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
                        <button type="button" className="button button-secondary row-action-button" onClick={() => onEditVehicle(vehicle)}>
                          Edit
                        </button>
                        <button type="button" className="button button-danger row-action-button" onClick={() => onDeleteVehicle(vehicle)}>
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
        ),
      },
      {
        key: 'automation',
        label: 'Automation',
        count: null,
        title: 'Automation',
        subtitle: 'Global reminder controls for maintenance notifications',
        note: 'Configure automatic in-app reminders for oil-change schedules across all branches.',
        action: (
          <button
            type="button"
            className="button button-primary"
            onClick={handleAutomationSave}
            disabled={isSavingAutomation || !isAutomationDirty}
          >
            <AppIcon name="check" className="button-icon" />
            {isSavingAutomation ? 'Saving...' : 'Save automation settings'}
          </button>
        ),
        table: (
          <div className="automation-settings-panel">
            <div className="profile-setting-item automation-toggle-row">
              <div>
                <span className="field-label">Oil-change reminders</span>
                <strong>{automationForm.enabled ? 'Enabled' : 'Disabled'}</strong>
                <span className="cell-subtle">
                  Sends in-app reminders to admins and branch approvers.
                </span>
              </div>
              <label className="automation-toggle-control">
                <input
                  type="checkbox"
                  checked={automationForm.enabled}
                  onChange={(event) => handleAutomationFieldChange('enabled', event.target.checked)}
                />
                <span>Enable</span>
              </label>
            </div>

            <div className="form-grid automation-settings-grid">
              <label>
                <span className="field-label">Lead days</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="60"
                  value={automationForm.oilChangeLeadDays}
                  onChange={(event) => handleAutomationFieldChange('oilChangeLeadDays', event.target.value)}
                />
              </label>
              <label>
                <span className="field-label">Timezone</span>
                <input className="input" type="text" value={automationForm.timezone} readOnly />
              </label>
            </div>

            <div className="section-context-note automation-settings-note">
              <strong>Cadence:</strong> Daily with dedupe
              <span>
                Hourly scheduler checks records, but each user receives at most one reminder per oil-change item per day.
              </span>
              {!isLiveMode && (
                <span>
                  Running without Supabase live mode; changes are stored in local UI state only.
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'audit',
        label: 'Audit trail',
        count: auditRecords.length,
        title: 'Audit trail',
        subtitle: 'Admin history of session, request, dispatch, compliance, and settings activity',
        note: 'This log captures meaningful write actions and security/session events across the workspace.',
        action: null,
        table: (
          <>
            <div className="audit-toolbar">
              <div className="audit-filter-grid">
                <input
                  className="input audit-search-input"
                  placeholder="Search actor, action, request, vehicle, or detail..."
                  value={auditQuery}
                  onChange={(event) => setAuditQuery(event.target.value)}
                />
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
                  Showing {filteredAuditRecords.length} of {auditRecords.length} audit events.
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
                  {filteredAuditRecords.map((entry) => (
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
          </>
        ),
      },
    ],
    [
      automationForm,
      branchRecords,
      auditCategory,
      auditEndDate,
      handleAuditExport,
      handleAutomationFieldChange,
      handleAutomationSave,
      auditQuery,
      auditRecords,
      auditStartDate,
      driverRecords,
      filteredAuditRecords,
      isAutomationDirty,
      isLiveMode,
      isSavingAutomation,
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
      userRecords,
      vehicleRecords,
    ],
  );

  const activePanel = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

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
            <p className="muted settings-note">{activePanel.note}</p>
            {activePanel.action}
          </div>
          {activePanel.table}
        </SectionCard>
      </div>
    </>
  );
}
