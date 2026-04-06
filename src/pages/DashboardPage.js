import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import BranchUtilizationBoard from '../components/BranchUtilizationBoard';
import SectionCard from '../components/SectionCard';
import StatBarChart from '../components/StatBarChart';
import StatusRingChart from '../components/StatusRingChart';
import StatusBadge from '../components/StatusBadge';
import SummaryGrid from '../components/SummaryGrid';
import { ACTIVE_TRIP_STATUSES } from '../constants/appConfig';
import { formatDate, toStatusClass } from '../utils/appHelpers';

function renderNotifications(notificationFeed, emptyMessage, limit = 3) {
  if (!notificationFeed.length) {
    return <div className="empty-state-panel">{emptyMessage}</div>;
  }

  return (
    <div className="stack-list">
      {notificationFeed.slice(0, limit).map((notice) => (
        <div key={notice.id} className="alert-card">
          <StatusBadge status={notice.tone} />
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage({
  mode,
  currentUser,
  branches,
  requestRecords,
  tripRecords,
  vehicleRecords,
  notificationFeed,
}) {
  const isAdmin = mode === 'admin';
  const isApprover = mode === 'approver';
  const isDriver = mode === 'driver';
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [tripPerformanceStatus, setTripPerformanceStatus] = useState('all');
  const [tripPerformanceVehicle, setTripPerformanceVehicle] = useState('all');
 
   useEffect(() => {
     if (!isAdmin && currentUser?.branch && currentUser.branch !== 'Unassigned') {
       setSelectedBranch(currentUser.branch);
     }
   }, [isAdmin, currentUser?.branch]);

  const filteredRequests = useMemo(() => {
    return requestRecords.filter((request) => {
      const matchBranch = !selectedBranch || request.branch === selectedBranch;
      const matchDate = !selectedDate || (request.departureDatetime && request.departureDatetime.startsWith(selectedDate));
      return matchBranch && matchDate;
    });
  }, [requestRecords, selectedBranch, selectedDate]);

  const filteredTrips = useMemo(() => {
    return tripRecords.filter((trip) => {
      const matchBranch = !selectedBranch || trip.branch === selectedBranch;
      const matchDate = !selectedDate || (trip.expectedReturn && trip.expectedReturn.startsWith(selectedDate));
      return matchBranch && matchDate;
    });
  }, [tripRecords, selectedBranch, selectedDate]);

  const filteredVehicles = useMemo(() => {
    return vehicleRecords.filter((vehicle) => {
      const matchBranch = !selectedBranch || vehicle.branch === selectedBranch;
      return matchBranch;
    });
  }, [vehicleRecords, selectedBranch]);

  const filteredBranches = useMemo(() => {
    if (selectedBranch) {
      return branches.filter((branch) => branch.name === selectedBranch);
    }
    return branches;
  }, [branches, selectedBranch]);

  const tripStatusOptions = useMemo(() => (
    ['all', ...new Set(filteredTrips.map((trip) => trip.tripStatus).filter(Boolean))]
  ), [filteredTrips]);

  const tripVehicleOptions = useMemo(() => {
    const optionsByValue = new Map();

    filteredVehicles.forEach((vehicle) => {
      const vehicleName = String(vehicle.vehicleName || '').trim();
      if (!vehicleName) {
        return;
      }

      const vehicleId = String(vehicle.id || '').trim();
      const optionValue = vehicleId ? `id:${vehicleId}` : `name:${vehicleName.toLowerCase()}`;
      const plateNumber = String(vehicle.plateNumber || '').trim();

      if (!optionsByValue.has(optionValue)) {
        optionsByValue.set(optionValue, {
          value: optionValue,
          vehicleId,
          vehicleName,
          label: plateNumber ? `${vehicleName} (${plateNumber})` : vehicleName,
        });
      }
    });

    return Array.from(optionsByValue.values())
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [filteredVehicles]);

  const normalizedTripPerformanceStatus = (
    tripPerformanceStatus === 'all' || tripStatusOptions.includes(tripPerformanceStatus)
  )
    ? tripPerformanceStatus
    : 'all';

  const normalizedTripPerformanceVehicle = (
    tripPerformanceVehicle === 'all'
    || tripVehicleOptions.some((option) => option.value === tripPerformanceVehicle)
  )
    ? tripPerformanceVehicle
    : 'all';

  const selectedTripVehicleOption = normalizedTripPerformanceVehicle === 'all'
    ? null
    : tripVehicleOptions.find((option) => option.value === normalizedTripPerformanceVehicle) || null;

  const tripsInPerformanceScope = useMemo(
    () => filteredTrips.filter((trip) => (
      (normalizedTripPerformanceStatus === 'all' || trip.tripStatus === normalizedTripPerformanceStatus)
      && (
        !selectedTripVehicleOption
        || (
          (selectedTripVehicleOption.vehicleId && String(trip.vehicleId || '') === selectedTripVehicleOption.vehicleId)
          || String(trip.vehicle || '').trim() === selectedTripVehicleOption.vehicleName
        )
      )
    )),
    [filteredTrips, normalizedTripPerformanceStatus, selectedTripVehicleOption]
  );

  const fleetPerformanceItems = useMemo(() => {
    const tripsByVehicle = new Map();

    tripsInPerformanceScope.forEach((trip) => {
      const vehicleLabel = String(trip.vehicle || 'Unassigned').trim() || 'Unassigned';
      tripsByVehicle.set(vehicleLabel, (tripsByVehicle.get(vehicleLabel) || 0) + 1);
    });

    return Array.from(tripsByVehicle.entries())
      .map(([label, value]) => ({
        label,
        value,
        valueLabel: `${value.toLocaleString()} trip${value === 1 ? '' : 's'}`,
        helper: normalizedTripPerformanceStatus === 'all'
          ? 'All trip statuses'
          : normalizedTripPerformanceStatus,
        tone: value >= 10 ? 'blue' : value >= 5 ? 'amber' : 'slate',
        icon: 'trips',
      }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  }, [normalizedTripPerformanceStatus, tripsInPerformanceScope]);

  const fuelUtilizationByVehicle = useMemo(() => {
    const byVehicle = new Map();

    filteredRequests.forEach((request) => {
      const fuelLiters = Number(request.fuelLiters) || 0;
      const fuelAmount = Number(request.fuelAmount) || 0;
      const hasFuelData = Boolean(request.fuelRequested) || fuelLiters > 0 || fuelAmount > 0;

      if (!hasFuelData) {
        return;
      }

      const vehicleLabel = request.assignedVehicle && request.assignedVehicle !== 'Unassigned'
        ? request.assignedVehicle
        : 'Unassigned';
      const current = byVehicle.get(vehicleLabel) || { liters: 0, amount: 0, requests: 0 };

      current.liters += fuelLiters;
      current.amount += fuelAmount;
      current.requests += 1;
      byVehicle.set(vehicleLabel, current);
    });

    return Array.from(byVehicle.entries())
      .map(([label, metrics]) => ({
        label,
        liters: metrics.liters,
        amount: metrics.amount,
        requests: metrics.requests,
      }))
      .sort((left, right) => right.liters - left.liters || right.amount - left.amount || left.label.localeCompare(right.label));
  }, [filteredRequests]);

  const fuelUtilizationItems = useMemo(() => {
    const tones = ['blue', 'amber', 'green', 'slate', 'red'];

    return fuelUtilizationByVehicle.slice(0, 6).map((entry, index) => ({
      label: entry.label,
      value: Number(entry.liters.toFixed(2)),
      valueLabel: `${entry.liters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`,
      helper: `PHP ${entry.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} across ${entry.requests} request${entry.requests === 1 ? '' : 's'}`,
      tone: tones[index % tones.length],
      icon: 'vehicles',
    }));
  }, [fuelUtilizationByVehicle]);

  const totalFuelCost = useMemo(
    () => fuelUtilizationByVehicle.reduce((sum, entry) => sum + entry.amount, 0),
    [fuelUtilizationByVehicle]
  );

  const fleetPerformancePanel = (
    <div className={`dashboard-chart-panel${isAdmin ? ' dashboard-admin-trend-panel' : ''}`}>
      <div className="dashboard-chart-head">
        <h4>Fleet performance</h4>
        <p>Trips in scope: {tripsInPerformanceScope.length.toLocaleString()}</p>
      </div>

      <div className="dashboard-chart-filters">
        <label className="dashboard-chart-filter">
          <span className="eyebrow">Trip status</span>
          <select className="input" value={tripPerformanceStatus} onChange={(event) => setTripPerformanceStatus(event.target.value)}>
            {tripStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All statuses' : option}
              </option>
            ))}
          </select>
        </label>

        <label className="dashboard-chart-filter">
          <span className="eyebrow">Vehicle</span>
          <select className="input" value={normalizedTripPerformanceVehicle} onChange={(event) => setTripPerformanceVehicle(event.target.value)}>
            <option value="all">
              {isAdmin
                ? (selectedBranch ? 'All branch vehicles' : 'All vehicles')
                : 'All branch vehicles'}
            </option>
            {tripVehicleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {fleetPerformanceItems.length ? (
        <StatBarChart items={fleetPerformanceItems.slice(0, 10)} ariaLabel="Trips per vehicle" />
      ) : (
        <div className="empty-state-panel">No records match the selected chart filters.</div>
      )}
    </div>
  );

  const filterPortalTarget = typeof document !== 'undefined' ? document.getElementById('dashboard-filter-portal') : null;

  const filterBar = (
    <div className="section-card" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', background: 'var(--panel)', border: '1px solid var(--line)', padding: '18px 24px', borderRadius: '20px' }}>
      <div style={{ flex: '1 1 240px', maxWidth: '300px' }}>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Active Branch</label>
        <select 
          className="input" 
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{ width: '100%', background: isAdmin ? '#fff' : 'rgba(0,0,0,0.05)', cursor: isAdmin ? 'default' : 'not-allowed' }}
          disabled={!isAdmin}
        >
          {!isAdmin && currentUser?.branch ? (
            <option value={currentUser.branch}>{currentUser.branch}</option>
          ) : (
            <>
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </>
          )}
        </select>
      </div>
      <div style={{ flex: '1 1 240px', maxWidth: '300px' }}>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Timeframe (Month)</label>
        <input 
          type="month"
          className="input"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ width: '100%', background: '#fff' }}
        />
      </div>
      <div style={{ alignSelf: 'end' }}>
        {(selectedDate || (isAdmin && selectedBranch) || normalizedTripPerformanceVehicle !== 'all' || normalizedTripPerformanceStatus !== 'all') && (
           <button 
             type="button" 
             className="button button-secondary" 
              onClick={() => { 
                if (isAdmin) setSelectedBranch(''); 
                setSelectedDate(''); 
                setTripPerformanceStatus('all');
                setTripPerformanceVehicle('all');
              }}
             style={{ height: '46px', padding: '0 20px' }}
           >
             Clear Filters
           </button>
        )}
      </div>
    </div>
  );

  if (isDriver) {
    return (
      <>
        {filterPortalTarget && createPortal(filterBar, filterPortalTarget)}
        <div className="content-grid">
          <SectionCard title="Assigned requests" subtitle={`Current assignments for ${currentUser.name}`}>
            <div className="stack-list">
              {filteredRequests.length === 0 && (
                <div className="empty-state-panel">No requests are currently assigned to you.</div>
              )}
              {filteredRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="list-row">
                  <div>
                    <strong>{request.requestNo}</strong>
                    <p>
                      {request.destination} | {request.purpose}
                    </p>
                  </div>
                  <div className="list-meta">
                    <StatusBadge status={request.status} />
                    <span>{formatDate(request.departureDatetime, true)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="My trips" subtitle="Trips assigned for release, travel, or return">
            <div className="stack-list">
              {filteredTrips.length === 0 && (
                <div className="empty-state-panel">Trips assigned to your driver account will appear here.</div>
              )}
              {filteredTrips.slice(0, 5).map((trip) => (
                <div key={trip.id} className="timeline-row">
                  <div className={`timeline-marker ${toStatusClass(trip.tripStatus)}`} />
                  <div className="timeline-copy">
                    <strong>{trip.vehicle}</strong>
                    <p>
                      {trip.origin} to {trip.destination}
                    </p>
                    <span>
                      {trip.tripStatus} | Return {formatDate(trip.expectedReturn, true)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>




          <SectionCard title="Updates" subtitle="Latest reminders from operations">
            {renderNotifications(notificationFeed, 'No shared reminders right now.')}
          </SectionCard>
        </div>
      </>
    );
  }

  if (!isAdmin && !isApprover) {
    const filteredMyRequests = filteredRequests.filter((request) => request.requestedBy === currentUser.name);
    const requesterSummaryItems = [
      {
        label: 'My requests',
        value: filteredMyRequests.length,
        helper: 'Submitted requests',
        tone: 'green',
        icon: 'requests',
      },
      {
        label: 'Pending',
        value: filteredMyRequests.filter((request) => request.status === 'Pending Approval').length,
        helper: 'Awaiting approval',
        tone: 'amber',
        icon: 'clock',
      },
      {
        label: 'Ready',
        value: filteredMyRequests.filter((request) => request.status === 'Ready for Release').length,
        helper: 'Assigned and cleared',
        tone: 'blue',
        icon: 'check',
      },
    ];

    const myRequestNumbersFiltered = new Set(filteredMyRequests.map((request) => request.requestNo));
    const filteredMyTrips = filteredTrips.filter((trip) => myRequestNumbersFiltered.has(trip.requestNo));

    return (
      <>
        {filterPortalTarget && createPortal(filterBar, filterPortalTarget)}
        <div className="content-grid">
          <SectionCard title="My requests" subtitle={`Latest requests submitted by ${currentUser.name}`}>
            <SummaryGrid items={requesterSummaryItems} />
            <div className="stack-list">
              {filteredMyRequests.length === 0 && (
                <div className="empty-state-panel">You have not submitted any requests yet.</div>
              )}
              {filteredMyRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="list-row">
                  <div>
                    <strong>{request.requestNo}</strong>
                    <p>
                      {request.destination} | {request.purpose}
                    </p>
                  </div>
                  <div className="list-meta">
                    <StatusBadge status={request.status} />
                    <span>{formatDate(request.departureDatetime, true)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="My trips" subtitle="Assigned and active travel">
            <div className="stack-list">
              {filteredMyTrips.length === 0 && (
                <div className="empty-state-panel">Trips linked to your requests will appear here once assigned.</div>
              )}
              {filteredMyTrips.slice(0, 5).map((trip) => (
                <div key={trip.id} className="timeline-row">
                  <div className={`timeline-marker ${toStatusClass(trip.tripStatus)}`} />
                  <div className="timeline-copy">
                    <strong>{trip.vehicle}</strong>
                    <p>
                      {trip.origin} to {trip.destination}
                    </p>
                    <span>
                      {trip.tripStatus} | Return {formatDate(trip.expectedReturn, true)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>




          <SectionCard title="Updates" subtitle="Latest reminders from operations">
            {renderNotifications(notificationFeed, 'No shared reminders right now.')}
          </SectionCard>
        </div>
      </>
    );
  }

  if (isApprover) {
    const pendingRequests = filteredRequests.filter((request) => request.status === 'Pending Approval');

    return (
      <>
        {filterPortalTarget && createPortal(filterBar, filterPortalTarget)}
        <div className="content-grid">
          <SectionCard title="Approval queue" subtitle={`Requests waiting in ${currentUser.branch}`}>
            <div className="stack-list">
              {pendingRequests.length === 0 && (
                <div className="empty-state-panel">No requests are currently waiting for approval in your branch.</div>
              )}
              {pendingRequests.slice(0, 6).map((request) => (
                <div key={request.id} className="list-row">
                  <div>
                    <strong>{request.requestNo}</strong>
                    <p>
                      {request.requestedBy} to {request.destination}
                    </p>
                  </div>
                  <div className="list-meta">
                    <StatusBadge status={request.status} />
                    <span>{formatDate(request.departureDatetime, true)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Fuel utilization per vehicle"
            subtitle={`Total fuel cost: PHP ${totalFuelCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          >
            {fuelUtilizationItems.length ? (
              <StatBarChart items={fuelUtilizationItems} ariaLabel="Fuel utilization per vehicle" />
            ) : (
              <div className="empty-state-panel">No fuel-authorized requests match the current filters.</div>
            )}
          </SectionCard>

          {fleetPerformancePanel}




          <SectionCard title="Updates" subtitle="Latest reminders from operations">
            {renderNotifications(notificationFeed, 'No shared reminders right now.')}
          </SectionCard>
        </div>
      </>
    );
  }

  const actionableRequests = filteredRequests.filter((request) =>
    ['Pending Approval', 'Ready for Release'].includes(request.status)
  );
  const liveTrips = filteredTrips.filter((trip) =>
    ACTIVE_TRIP_STATUSES.includes(trip.tripStatus) || trip.tripStatus === 'Ready for Release'
  );
  const tripMixItems = [
    {
      label: 'Ready',
      value: filteredTrips.filter((trip) => trip.tripStatus === 'Ready for Release').length,
      helper: 'Queued for dispatch',
      tone: 'amber',
      icon: 'release',
    },
    {
      label: 'Active',
      value: filteredTrips.filter((trip) => ['Checked Out', 'In Transit'].includes(trip.tripStatus)).length,
      helper: 'Currently moving',
      tone: 'blue',
      icon: 'trips',
    },
    {
      label: 'Overdue',
      value: filteredTrips.filter((trip) => trip.tripStatus === 'Overdue').length,
      helper: 'Need follow-up',
      tone: 'red',
      icon: 'warning',
    },
    {
      label: 'Returned',
      value: filteredTrips.filter((trip) => trip.tripStatus === 'Returned').length,
      helper: 'Closed trips',
      tone: 'green',
      icon: 'return',
    },
  ];

  const fleetReadinessItems = [
    {
      label: 'Available',
      value: filteredVehicles.filter((vehicle) => vehicle.status === 'available').length,
      helper: 'Ready to assign',
      tone: 'green',
      icon: 'check',
    },
    {
      label: 'Reserved',
      value: filteredVehicles.filter((vehicle) => vehicle.status === 'reserved').length,
      helper: 'Held for requests',
      tone: 'amber',
      icon: 'clock',
    },
    {
      label: 'In use',
      value: filteredVehicles.filter((vehicle) => vehicle.status === 'in_use').length,
      helper: 'Out on trips',
      tone: 'blue',
      icon: 'trips',
    },
    {
      label: 'Service',
      value: filteredVehicles.filter((vehicle) => vehicle.status === 'maintenance').length,
      helper: 'Under maintenance',
      tone: 'red',
      icon: 'wrench',
    },
    {
      label: 'Inactive',
      value: filteredVehicles.filter((vehicle) => vehicle.status === 'inactive').length,
      helper: 'Unavailable fleet',
      tone: 'slate',
      icon: 'close',
    },
  ];

  const branchLoadItems = filteredBranches.map((branch) => ({
    label: branch.name,
    value: branch.utilization,
    valueLabel: `${branch.utilization}%`,
    helper: 'Fleet committed',
    tone: branch.utilization >= 80 ? 'red' : branch.utilization >= 60 ? 'amber' : 'blue',
    icon: 'vehicles',
  }));

  const requestStatusItems = [
    {
      label: 'Pending',
      value: filteredRequests.filter((request) => request.status === 'Pending Approval').length,
      helper: 'Awaiting branch review',
      tone: 'amber',
    },
    {
      label: 'Approved',
      value: filteredRequests.filter((request) => request.status === 'Approved').length,
      helper: 'Reviewed and approved',
      tone: 'blue',
    },
    {
      label: 'Ready',
      value: filteredRequests.filter((request) => request.status === 'Ready for Release').length,
      helper: 'Ready for dispatch',
      tone: 'green',
    },
    {
      label: 'Rejected',
      value: filteredRequests.filter((request) => request.status === 'Rejected').length,
      helper: 'Denied requests',
      tone: 'red',
    },
  ];

  const hasRequestStatusData = requestStatusItems.some((item) => item.value > 0);
  const activeTripCount = filteredTrips.filter((trip) => ['Checked Out', 'In Transit'].includes(trip.tripStatus)).length;
  const overdueTripCount = filteredTrips.filter((trip) => trip.tripStatus === 'Overdue').length;
  const adminSnapshotItems = [
    {
      label: 'Pending approvals',
      value: filteredRequests.filter((request) => request.status === 'Pending Approval').length,
      helper: 'Awaiting approver review',
      tone: 'amber',
      icon: 'clock',
    },
    {
      label: 'Ready for release',
      value: filteredRequests.filter((request) => request.status === 'Ready for Release').length,
      helper: 'Queued for dispatch',
      tone: 'blue',
      icon: 'release',
    },
    {
      label: 'Active trips',
      value: activeTripCount,
      helper: 'Currently moving vehicles',
      tone: 'green',
      icon: 'trips',
    },
    {
      label: 'Overdue trips',
      value: overdueTripCount,
      helper: 'Need immediate follow-up',
      tone: 'red',
      icon: 'warning',
    },
    {
      label: 'Fuel-authorized',
      value: filteredRequests.filter((request) => request.fuelRequested).length,
      helper: 'Requests with fuel support',
      tone: 'slate',
      icon: 'reports',
    },
  ];

  return (
    <>
      {filterPortalTarget && createPortal(filterBar, filterPortalTarget)}
      <div className="content-grid dashboard-admin-layout">
        <div className="dashboard-admin-top-zone">
          <SectionCard
            className="dashboard-admin-kpi-card"
            title="Operations snapshot"
            subtitle="Immediate dispatch health and workload checks."
          >
            <div className="dashboard-kpi-strip">
              <SummaryGrid items={adminSnapshotItems} />
            </div>
          </SectionCard>

          <SectionCard
            className="dashboard-admin-compact-card"
            title="Priority queue"
            subtitle="Pending approvals and release-ready requests."
          >
            <div className="stack-list dashboard-compact-list">
              {actionableRequests.length === 0 && (
                <div className="empty-state-panel">The request queue is clear right now.</div>
              )}
              {actionableRequests.slice(0, 4).map((request) => (
                <div key={request.id} className="list-row">
                  <div>
                    <strong>{request.requestNo}</strong>
                    <p>
                      {request.requestedBy} to {request.destination}
                    </p>
                  </div>
                  <div className="list-meta">
                    <StatusBadge status={request.status} />
                    <span>{formatDate(request.departureDatetime, true)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            className="dashboard-admin-compact-card"
            title="Live trips"
            subtitle="Ready, active, and overdue trip movement."
          >
            <div className="stack-list dashboard-compact-list">
              {liveTrips.length === 0 && (
                <div className="empty-state-panel">No trips are active or waiting for release.</div>
              )}
              {liveTrips.slice(0, 4).map((trip) => (
                <div key={trip.id} className="timeline-row">
                  <div className={`timeline-marker ${toStatusClass(trip.tripStatus)}`} />
                  <div className="timeline-copy">
                    <strong>{trip.vehicle}</strong>
                    <p>
                      {trip.driver} from {trip.origin} to {trip.destination}
                    </p>
                    <span>
                      {trip.tripStatus} | Return {formatDate(trip.expectedReturn, true)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          className="dashboard-analytics-card dashboard-admin-analytics-card"
          title="Operations analytics"
          subtitle="Chart-first monitoring for dispatch, approval flow, fleet readiness, and fuel utilization."
        >
          <div className="dashboard-analytics-grid dashboard-admin-analytics-grid">
            <div className="dashboard-chart-panel dashboard-admin-chart-panel">
              <div className="dashboard-chart-head">
                <h4>Trip status mix</h4>
                <p>Shows where trips are flowing and where follow-up is needed.</p>
              </div>
              <StatBarChart items={tripMixItems} ariaLabel="Trip status distribution" />
            </div>

            <div className="dashboard-chart-panel dashboard-admin-chart-panel">
              <div className="dashboard-chart-head">
                <h4>Request status mix</h4>
                <p>Tracks approval flow and dispatch readiness for current filters.</p>
              </div>
              {hasRequestStatusData ? (
                <StatBarChart items={requestStatusItems} ariaLabel="Request status distribution" />
              ) : (
                <div className="empty-state-panel">No request records match the current filters.</div>
              )}
            </div>

            <div className="dashboard-chart-panel dashboard-admin-chart-panel">
              <div className="dashboard-chart-head">
                <h4>Fleet readiness</h4>
                <p>Quick view of assignable vehicles versus constrained fleet.</p>
              </div>
              <StatusRingChart
                items={fleetReadinessItems}
                ariaLabel="Fleet readiness distribution"
                centerLabel="vehicles"
              />
            </div>

            <div className="dashboard-chart-panel dashboard-admin-chart-panel">
              <div className="dashboard-chart-head">
                <h4>Fuel utilization per vehicle</h4>
                <p>Total fuel cost: PHP {totalFuelCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              {fuelUtilizationItems.length ? (
                <StatBarChart items={fuelUtilizationItems} ariaLabel="Fuel utilization by vehicle" />
              ) : (
                <div className="empty-state-panel">No fuel-authorized requests match the current filters.</div>
              )}
            </div>

            {fleetPerformancePanel}
          </div>

          <div className="dashboard-chart-panel dashboard-admin-chart-panel dashboard-chart-panel-branch dashboard-chart-panel-stacked">
            <div className="dashboard-chart-head">
              <h4>Branch utilization</h4>
              <p>Compares branch load so dispatch can spot capacity pressure early.</p>
            </div>
            <BranchUtilizationBoard items={branchLoadItems} ariaLabel="Branch utilization ranking" />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
