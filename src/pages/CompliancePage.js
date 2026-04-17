import { useState, useMemo } from 'react';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { daysUntil, formatDate, exportToCSV } from '../utils/appHelpers';
import AppIcon from '../components/AppIcon';

export default function CompliancePage({ 
  mode,
  currentUser,
  vehicleRecords, 
  maintenanceRecords, 
  notificationFeed,
  incidentRecords, 
  onOpenMaintenanceModal,
  onOpenIncidentModal
}) {
  const [activeTab, setActiveTab] = useState('watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedExpiryDetails, setSelectedExpiryDetails] = useState(null);

  const isAdmin = mode === 'admin';
  const isApprover = mode === 'approver';
  const isDriver = mode === 'driver';
  const canManageMaintenance = isAdmin || isApprover || isDriver;
  const visibleVehicles = isAdmin ? vehicleRecords : vehicleRecords.filter(v => v.branch === currentUser.branch);
  const insuranceWatch = visibleVehicles.filter((vehicle) => daysUntil(vehicle.insuranceExpiry) <= 30);
  const registrationWatch = visibleVehicles.filter((vehicle) => daysUntil(vehicle.registrationExpiry) <= 30);
  const today = new Date().toISOString().slice(0, 10);

  const oilChangeWatchlist = useMemo(() => {
    const dedupedOilAlerts = new Map();

    (notificationFeed || []).forEach((notice) => {
        const title = String(notice.title || '').toLowerCase();
        const detail = String(notice.detail || '').toLowerCase();
        const sourceKey = String(notice.sourceKey || '').toLowerCase();
        const isOilAlert = sourceKey.startsWith('oil-change-vehicle:')
          || title.includes('oil change')
          || detail.includes('needs oil change');

        if (!isOilAlert) {
          return;
        }

        const dedupeKey = (notice.sourceKey && notice.sourceDate)
          ? `${notice.sourceKey}:${notice.sourceDate}`
          : `${notice.title || ''}|${notice.detail || ''}`;

        if (!dedupedOilAlerts.has(dedupeKey)) {
          dedupedOilAlerts.set(dedupeKey, notice);
        }
      });

    return Array.from(dedupedOilAlerts.values())
      .map((notice) => {
        const detail = String(notice.detail || '').trim();
        const extractedVehicle = detail.match(/^(.+?) needs oil change\./i)?.[1]?.trim() || '';
        const matchedVehicle = vehicleRecords.find((vehicle) => {
          const name = String(vehicle.vehicleName || '').trim();
          const plate = String(vehicle.plateNumber || '').trim();
          const fullLabel = plate ? `${name} (${plate})` : name;
          return extractedVehicle === name || extractedVehicle === fullLabel;
        }) || null;

        return {
          id: `oil-${notice.id}`,
          sourceType: 'oil-alert',
          vehicle: extractedVehicle || 'Vehicle',
          vehicleId: matchedVehicle?.id || '',
          branch: matchedVehicle?.branch || '',
          branchId: matchedVehicle?.branchId || '',
          maintenanceType: 'Oil change due',
          detail,
          scheduleDate: notice.sourceDate || notice.createdAt || today,
          status: 'warning',
          actionable: false,
        };
      });
  }, [notificationFeed, today, vehicleRecords]);

  // Pending items for Watchlist
  const rawPendingMaintenance = maintenanceRecords.filter(m => m.status === 'Pending');
  const pendingMaintenance = isAdmin ? rawPendingMaintenance : rawPendingMaintenance.filter(m => m.branch === currentUser.branch);
  const watchlistRows = [
    ...pendingMaintenance.map((entry) => ({
      ...entry,
      sourceType: 'maintenance',
      status: 'Pending',
      actionable: canManageMaintenance,
    })),
    ...oilChangeWatchlist,
  ];

  // Filtered items for Service History Tab
  const filteredMaintenance = useMemo(() => {
    let records = isAdmin 
      ? maintenanceRecords 
      : maintenanceRecords.filter(m => m.branch === currentUser.branch);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      records = records.filter(m => 
        m.vehicle.toLowerCase().includes(query) || 
        m.maintenanceType.toLowerCase().includes(query) ||
        m.provider?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'All') {
      records = records.filter(m => m.status === statusFilter);
    }

    if (startDate) {
      records = records.filter(m => m.scheduleDate >= startDate);
    }

    if (endDate) {
      records = records.filter(m => m.scheduleDate <= endDate);
    }

    return records;
  }, [isAdmin, maintenanceRecords, currentUser.branch, searchQuery, statusFilter, startDate, endDate]);

  function handleExportCSV() {
    exportToCSV(filteredMaintenance, `Service_History_${new Date().toISOString().slice(0, 10)}`);
  }

  function handleOpenExpiryDetails(type, vehicle) {
    const isInsurance = type === 'insurance';

    setSelectedExpiryDetails({
      type: isInsurance ? 'Insurance' : 'Registration',
      vehicle,
      expiryDate: isInsurance ? vehicle.insuranceExpiry : vehicle.registrationExpiry,
      daysRemaining: daysUntil(isInsurance ? vehicle.insuranceExpiry : vehicle.registrationExpiry),
    });
  }


  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {selectedExpiryDetails && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close expiration details"
            onClick={() => setSelectedExpiryDetails(null)}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Expiration details">
            <section className="modal-card modal-card-compact">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">{selectedExpiryDetails.type} details</p>
                  <h3>{selectedExpiryDetails.vehicle.vehicleName}</h3>
                  <p className="modal-copy">
                    {selectedExpiryDetails.vehicle.plateNumber} | {selectedExpiryDetails.vehicle.branch}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={() => setSelectedExpiryDetails(null)}
                >
                  Close
                </button>
              </div>

              <div className="detail-panel">
                <dl className="detail-list">
                  <div>
                    <dt>Document</dt>
                    <dd>{selectedExpiryDetails.type}</dd>
                  </div>
                  <div>
                    <dt>Expiry date</dt>
                    <dd>{formatDate(selectedExpiryDetails.expiryDate)}</dd>
                  </div>
                  <div>
                    <dt>Days remaining</dt>
                    <dd>{selectedExpiryDetails.daysRemaining} days</dd>
                  </div>
                  <div>
                    <dt>Vehicle status</dt>
                    <dd><StatusBadge status={selectedExpiryDetails.vehicle.status} /></dd>
                  </div>
                  <div>
                    <dt>Plate number</dt>
                    <dd>{selectedExpiryDetails.vehicle.plateNumber}</dd>
                  </div>
                  <div>
                    <dt>Assigned branch</dt>
                    <dd>{selectedExpiryDetails.vehicle.branch}</dd>
                  </div>
                  <div>
                    <dt>Insurance expiry</dt>
                    <dd>{formatDate(selectedExpiryDetails.vehicle.insuranceExpiry)}</dd>
                  </div>
                  <div>
                    <dt>Registration expiry</dt>
                    <dd>{formatDate(selectedExpiryDetails.vehicle.registrationExpiry)}</dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Tab Navigation */}
      <div className="chip-row compliance-tab-row">
        <button
          type="button"
          className={`chip-button compliance-tab-button ${activeTab === 'watchlist' ? 'chip-button-active' : ''}`}
          onClick={() => setActiveTab('watchlist')}
        >
          Watchlist Dashboard
        </button>
        <button
          type="button"
          className={`chip-button compliance-tab-button ${activeTab === 'history' ? 'chip-button-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Service History Hub
        </button>
      </div>

      {activeTab === 'watchlist' ? (
        <>
          {/* Watchlist View */}
          <div className="content-grid-tight">
            <SectionCard title="Priority Watchlist" subtitle="Critical items and pending maintenance requiring immediate attention.">
              <p className="muted" style={{ marginBottom: '16px' }}>Showing high-priority alerts across all categories.</p>

              <div className="table-wrap">
                <table className="data-table compliance-watchlist-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Maintenance / Alert</th>
                      <th>Schedule</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlistRows.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-state">No priority watchlist issues.</td>
                      </tr>
                    ) : (
                      watchlistRows.map((entry) => (
                        <tr
                          key={entry.id}
                          className={entry.actionable ? 'interactive-row' : ''}
                          onClick={entry.actionable ? () => onOpenMaintenanceModal(entry) : undefined}
                        >
                          <td><strong>{entry.vehicle}</strong></td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{entry.maintenanceType}</span>
                            {entry.sourceType === 'oil-alert' && entry.detail && (
                              <p className="cell-subtle" style={{ margin: '4px 0 0 0' }}>{entry.detail}</p>
                            )}
                          </td>
                          <td>
                            <div className="compliance-watchlist-schedule">
                              <StatusBadge status={entry.status} />
                              <span>{formatDate(entry.scheduleDate)}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {entry.sourceType === 'maintenance' && canManageMaintenance && (
                              <button className="row-action-button button-secondary">Edit</button>
                            )}
                            {entry.sourceType === 'oil-alert' && canManageMaintenance && (
                              <button
                                type="button"
                                className="row-action-button button-secondary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (entry.vehicleId) {
                                    onOpenMaintenanceModal({
                                      vehicleId: entry.vehicleId,
                                      vehicle: entry.vehicle,
                                      branch: entry.branch,
                                      branchId: entry.branchId,
                                      maintenanceType: 'Oil Change',
                                      scheduleDate: today,
                                      completedDate: '',
                                      provider: '',
                                      amount: 0,
                                      status: 'Pending',
                                    });
                                  } else {
                                    onOpenMaintenanceModal();
                                  }
                                }}
                              >
                                Log
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <div className="content-grid">
            <SectionCard title="Insurance & Registration" subtitle="Upcoming renewals and document risks.">
              <div className="compliance-columns">
                {/* Same as before but with consistent styling */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <strong>Insurance</strong>
                    {insuranceWatch.length > 0 && <span className="status-badge status-amber" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>{insuranceWatch.length}</span>}
                  </div>
                  <div className="stack-list">
                    {insuranceWatch.length === 0 ? <p className="cell-subtle">No alerts.</p> : insuranceWatch.map(v => (
                       <button
                          key={v.id}
                          type="button"
                          className="list-row interactive-row expiry-item-button"
                          onClick={() => handleOpenExpiryDetails('insurance', v)}
                       >
                          <div><strong>{v.vehicleName}</strong><p className="cell-subtle">{v.plateNumber}</p></div>
                          <span className={daysUntil(v.insuranceExpiry) <= 7 ? 'status-red' : 'status-amber'} style={{ padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>{daysUntil(v.insuranceExpiry)}d</span>
                       </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <strong>Registration</strong>
                    {registrationWatch.length > 0 && <span className="status-badge status-amber" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>{registrationWatch.length}</span>}
                  </div>
                  <div className="stack-list">
                    {registrationWatch.length === 0 ? <p className="cell-subtle">No alerts.</p> : registrationWatch.map(v => (
                       <button
                          key={v.id}
                          type="button"
                          className="list-row interactive-row expiry-item-button"
                          onClick={() => handleOpenExpiryDetails('registration', v)}
                       >
                          <div><strong>{v.vehicleName}</strong><p className="cell-subtle">{v.plateNumber}</p></div>
                          <span className={daysUntil(v.registrationExpiry) <= 7 ? 'status-red' : 'status-amber'} style={{ padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>{daysUntil(v.registrationExpiry)}d</span>
                       </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard 
              title="Safety Incidents" 
              subtitle="Reported vehicle issues."
              action={
                <button 
                  type="button" 
                  className="button button-secondary button-compact"
                  onClick={onOpenIncidentModal}
                >
                  <AppIcon name="warning" className="button-icon" />
                  Add report
                </button>
              }
            >
              <div className="stack-list">
                {/* Filter incidentRecords */}
                {(() => {
                  const visibleIncidents = isAdmin
                    ? incidentRecords
                    : incidentRecords.filter(i => i.branch === currentUser.branch);
                  return (
                    <>
                      {visibleIncidents.length === 0 ? <p className="empty-state">Clear</p> : visibleIncidents.map(i => (
                        <div key={i.id} className="list-row interactive-row" onClick={() => onOpenIncidentModal(i)}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong>{i.vehicle}</strong>
                                <StatusBadge status={i.status} />
                            </div>
                            <p className="cell-subtle" style={{ margin: 0 }}>{i.description}</p>
                            {(i.photo_url || i.photoUrl) && (
                              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AppIcon name="user" style={{ width: '14px', opacity: 0.6 }} />
                                <span className="cell-subtle" style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', fontWeight: 600 }}>Photo attached</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </SectionCard>
          </div>
        </>
      ) : (
        /* History & Management Hub View (Full-Width) */
        <div className="content-grid-tight">
          <SectionCard title="Service History Hub" subtitle="Full historical records and service management for the fleet.">
            <div className="toolbar toolbar-split compliance-history-toolbar">
              <div className="toolbar-left compliance-history-toolbar-left">
                <div className="toolbar-search-wrap">
                  <input 
                    type="text"
                    className="input"
                    placeholder="Search vehicle, type, or provider..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                  <AppIcon name="requests" className="toolbar-search-icon" />
                </div>
                
                <div className="toolbar-controls compliance-history-date-controls">
                  <div className="toolbar-control-group">
                    <span className="toolbar-label">From</span>
                    <input 
                      type="date" 
                      className="input input-compact compliance-date-input" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="toolbar-control-group">
                    <span className="toolbar-label">To</span>
                    <input 
                      type="date" 
                      className="input input-compact compliance-date-input" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      type="button" 
                      className="button button-secondary button-compact"
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="chip-row compliance-status-chip-row">
                  {['All', 'Pending', 'Completed'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`chip-button ${statusFilter === status ? 'chip-button-active' : ''}`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="toolbar-right compliance-history-toolbar-right">
                <button 
                  type="button" 
                  className="button button-secondary"
                  onClick={handleExportCSV}
                  disabled={filteredMaintenance.length === 0}
                >
                  <AppIcon name="email" className="button-icon" />
                  Export CSV
                </button>
                {canManageMaintenance && (
                  <button 
                    type="button" 
                    className="button button-primary"
                    onClick={() => onOpenMaintenanceModal()}
                  >
                    <AppIcon name="wrench" className="button-icon" />
                    Log maintenance
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrap compliance-history-table-wrap">
              <table className="data-table compliance-history-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Provider</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '120px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenance.length === 0 ? (
                    <tr><td colSpan="6" className="empty-state">No matching records.</td></tr>
                  ) : (
                    filteredMaintenance.map((entry) => (
                      <tr
                        key={entry.id}
                        className={canManageMaintenance ? 'interactive-row' : ''}
                        onClick={canManageMaintenance ? () => onOpenMaintenanceModal(entry) : undefined}
                      >
                        <td data-label="Vehicle">
                          <strong>{entry.vehicle}</strong>
                          {isAdmin && <span className="cell-subtle" style={{ fontSize: '0.7rem' }}>{entry.branch}</span>}
                        </td>
                        <td data-label="Type">{entry.maintenanceType}</td>
                        <td data-label="Date">
                          <span>{formatDate(entry.scheduleDate)}</span>
                          {entry.completedDate && <span className="cell-subtle" style={{ color: 'var(--success-text)', fontSize: '0.75rem' }}>Done: {formatDate(entry.completedDate)}</span>}
                        </td>
                        <td data-label="Provider">{entry.provider || '-'}</td>
                        <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {entry.amount ? `PHP ${entry.amount.toLocaleString()}` : '-'}
                        </td>
                        <td data-label="Status"><StatusBadge status={entry.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

