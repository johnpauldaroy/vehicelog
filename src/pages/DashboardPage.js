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
  const myRequests = requestRecords.filter((request) => request.requestedBy === currentUser.name);
  const myRequestNumbers = new Set(myRequests.map((request) => request.requestNo));
  const myTrips = tripRecords.filter((trip) => myRequestNumbers.has(trip.requestNo));

  if (isDriver) {
    const readyTrips = tripRecords.filter((trip) => trip.tripStatus === 'Ready for Release');
    const activeTrips = tripRecords.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.tripStatus));
    const driverSummaryItems = [
      {
        label: 'Assigned',
        value: requestRecords.length,
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
      <div className="content-grid">
        <SectionCard title="Assigned requests" subtitle={`Current assignments for ${currentUser.name}`}>
          <SummaryGrid items={driverSummaryItems} />
          <div className="stack-list">
            {requestRecords.length === 0 && (
              <div className="empty-state-panel">No requests are currently assigned to you.</div>
            )}
            {requestRecords.slice(0, 5).map((request) => (
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
            {tripRecords.length === 0 && (
              <div className="empty-state-panel">Trips assigned to your driver account will appear here.</div>
            )}
            {tripRecords.slice(0, 5).map((trip) => (
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
    );
  }

  if (!isAdmin && !isApprover) {
    const requesterSummaryItems = [
      {
        label: 'My requests',
        value: myRequests.length,
        helper: 'Submitted requests',
        tone: 'green',
        icon: 'requests',
      },
      {
        label: 'Pending',
        value: myRequests.filter((request) => request.status === 'Pending Approval').length,
        helper: 'Awaiting approval',
        tone: 'amber',
        icon: 'clock',
      },
      {
        label: 'Ready',
        value: myRequests.filter((request) => request.status === 'Ready for Release').length,
        helper: 'Assigned and cleared',
        tone: 'blue',
        icon: 'check',
      },
    ];

    return (
      <div className="content-grid">
        <SectionCard title="My requests" subtitle={`Latest requests submitted by ${currentUser.name}`}>
          <SummaryGrid items={requesterSummaryItems} />
          <div className="stack-list">
            {myRequests.length === 0 && (
              <div className="empty-state-panel">You have not submitted any requests yet.</div>
            )}
            {myRequests.slice(0, 5).map((request) => (
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
            {myTrips.length === 0 && (
              <div className="empty-state-panel">Trips linked to your requests will appear here once assigned.</div>
            )}
            {myTrips.slice(0, 5).map((trip) => (
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
    );
  }

  if (isApprover) {
    const pendingRequests = requestRecords.filter((request) => request.status === 'Pending Approval');
    const approvedRequests = requestRecords.filter((request) => request.status === 'Approved');
    const liveTrips = tripRecords.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.tripStatus));
    const approverSummaryItems = [
      {
        label: 'Pending approvals',
        value: pendingRequests.length,
        helper: 'Waiting for review',
        tone: 'amber',
        icon: 'clock',
      },
      {
        label: 'Approved',
        value: approvedRequests.length,
        helper: 'Reviewed and cleared',
        tone: 'blue',
        icon: 'check',
      },
      {
        label: 'Live trips',
        value: liveTrips.length,
        helper: 'Checked out or in transit',
        tone: 'green',
        icon: 'trips',
      },
    ];

    return (
      <div className="content-grid">
        <SectionCard title="Approval queue" subtitle={`Requests waiting in ${currentUser.branch}`}>
          <SummaryGrid items={approverSummaryItems} />
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
            {branches.map((branch) => (
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
    );
  }

  const actionableRequests = requestRecords.filter((request) =>
    ['Pending Approval', 'Ready for Release'].includes(request.status)
  );
  const liveTrips = tripRecords.filter((trip) =>
    ACTIVE_TRIP_STATUSES.includes(trip.tripStatus) || trip.tripStatus === 'Ready for Release'
  );
  const tripMixItems = [
    {
      label: 'Ready',
      value: tripRecords.filter((trip) => trip.tripStatus === 'Ready for Release').length,
      helper: 'Queued for dispatch',
      tone: 'amber',
      icon: 'release',
    },
    {
      label: 'Active',
      value: tripRecords.filter((trip) => ['Checked Out', 'In Transit'].includes(trip.tripStatus)).length,
      helper: 'Currently moving',
      tone: 'blue',
      icon: 'trips',
    },
    {
      label: 'Overdue',
      value: tripRecords.filter((trip) => trip.tripStatus === 'Overdue').length,
      helper: 'Need follow-up',
      tone: 'red',
      icon: 'warning',
    },
    {
      label: 'Returned',
      value: tripRecords.filter((trip) => trip.tripStatus === 'Returned').length,
      helper: 'Closed trips',
      tone: 'green',
      icon: 'return',
    },
  ];

  const fleetReadinessItems = [
    {
      label: 'Available',
      value: vehicleRecords.filter((vehicle) => vehicle.status === 'available').length,
      helper: 'Ready to assign',
      tone: 'green',
      icon: 'check',
    },
    {
      label: 'Reserved',
      value: vehicleRecords.filter((vehicle) => vehicle.status === 'reserved').length,
      helper: 'Held for requests',
      tone: 'amber',
      icon: 'clock',
    },
    {
      label: 'In use',
      value: vehicleRecords.filter((vehicle) => vehicle.status === 'in_use').length,
      helper: 'Out on trips',
      tone: 'blue',
      icon: 'trips',
    },
    {
      label: 'Service',
      value: vehicleRecords.filter((vehicle) => vehicle.status === 'maintenance').length,
      helper: 'Under maintenance',
      tone: 'red',
      icon: 'wrench',
    },
    {
      label: 'Inactive',
      value: vehicleRecords.filter((vehicle) => vehicle.status === 'inactive').length,
      helper: 'Unavailable fleet',
      tone: 'slate',
      icon: 'close',
    },
  ];

  const branchLoadItems = branches.map((branch) => ({
    label: branch.name,
    value: branch.utilization,
    valueLabel: `${branch.utilization}%`,
    helper: 'Fleet committed',
    tone: branch.utilization >= 80 ? 'red' : branch.utilization >= 60 ? 'amber' : 'blue',
    icon: 'vehicles',
  }));

  return (
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

      <SectionCard
        className="dashboard-analytics-card"
        title="Operations analytics"
      >
        <div className="dashboard-analytics-grid">
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

          <div className="dashboard-chart-panel">
            <div className="dashboard-chart-head">
              <h4>Branch utilization</h4>
              <p>Compares branch load so dispatch can spot capacity pressure early.</p>
            </div>
            <StatBarChart items={branchLoadItems} ariaLabel="Branch utilization percentages" yMax={100} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
