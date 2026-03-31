import { useState, useMemo } from 'react';
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

  const filterPortalTarget = typeof document !== 'undefined' ? document.getElementById('dashboard-filter-portal') : null;

  const filterBar = (
    <div className="section-card" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', background: 'var(--panel)', border: '1px solid var(--line)', padding: '18px 24px', borderRadius: '20px' }}>
      <div style={{ flex: '1 1 240px', maxWidth: '300px' }}>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Active Branch</label>
        <select 
          className="input" 
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{ width: '100%', background: '#fff' }}
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
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
        {(selectedBranch || selectedDate) && (
           <button 
             type="button" 
             className="button button-secondary" 
             onClick={() => { setSelectedBranch(''); setSelectedDate(''); }}
             style={{ height: '46px', padding: '0 20px' }}
           >
             Clear Filters
           </button>
        )}
      </div>
    </div>
  );

  if (isDriver) {
    const readyTrips = filteredTrips.filter((trip) => trip.tripStatus === 'Ready for Release');
    const activeTrips = filteredTrips.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.tripStatus));
    const driverSummaryItems = [
      {
        label: 'Assigned',
        value: filteredRequests.length,
        helper: 'Requests tied to you',
        tone: 'green',
        icon: 'requests',
      },
      {
        label: 'Ready',
        value: readyTrips.length,
        helper: 'Waiting for release',
        tone: 'amber',
        icon: 'release',
      },
      {
        label: 'Active',
        value: activeTrips.length,
        helper: 'Checked out or in transit',
        tone: 'blue',
        icon: 'trips',
      },
    ];

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

          <SectionCard title="Branch overview" subtitle="Load and movement in your coverage area">
            <div className="stack-list">
              {branches.filter(b => b.name === currentUser.branch).map((branch) => (
                <div key={branch.id}>
                  <div className="between-row">
                    <strong>{branch.name}</strong>
                    <span>{branch.utilization}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${branch.utilization}%` }} />
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

  const fuelOverviewItems = [
    {
      label: 'Fuel Liters',
      value: filteredRequests.reduce((sum, req) => sum + (Number(req.fuelLiters) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      helper: 'Total liters requested',
      tone: 'amber',
      icon: 'vehicles',
    },
    {
      label: 'Est. Distance',
      value: filteredRequests.reduce((sum, req) => sum + (Number(req.estimatedKms) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' km',
      helper: 'Total kms mapped',
      tone: 'blue',
      icon: 'trips',
    },
    {
      label: 'Fuel Cost',
      value: 'PHP ' + filteredRequests.reduce((sum, req) => sum + (Number(req.fuelAmount) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      helper: 'Total requested costs',
      tone: 'green',
      icon: 'check',
    },
  ];
  return (
    <>
      {filterPortalTarget && createPortal(filterBar, filterPortalTarget)}
      <div className="content-grid">
      <SectionCard title="Priority queue" subtitle="Requests that need attention first">
        <div className="stack-list">
          {actionableRequests.length === 0 && (
            <div className="empty-state-panel">The request queue is clear right now.</div>
          )}
          {actionableRequests.slice(0, 6).map((request) => (
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

      <SectionCard title="Live trips" subtitle="Current movement and pending release">
        <div className="stack-list">
          {liveTrips.length === 0 && (
            <div className="empty-state-panel">No trips are active or waiting for release.</div>
          )}
          {liveTrips.slice(0, 6).map((trip) => (
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

      <SectionCard title="Fuel Data Overview" subtitle="High-level fuel consumption and costs requested">
        <SummaryGrid items={fuelOverviewItems} />
      </SectionCard>

      <SectionCard
        className="dashboard-analytics-card"
        title="Operations analytics"
        style={{ gridColumn: '1 / -1' }}
      >
        <div className="dashboard-analytics-grid dashboard-analytics-grid-balanced">
          <div className="dashboard-chart-panel">
            <div className="dashboard-chart-head">
              <h4>Trip status mix</h4>
              <p>Shows where trips are flowing and where follow-up is needed.</p>
            </div>
            <StatBarChart items={tripMixItems} ariaLabel="Trip status distribution" />
          </div>

          <div className="dashboard-chart-panel">
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
        </div>

        <div className="dashboard-chart-panel dashboard-chart-panel-branch dashboard-chart-panel-stacked">
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
