import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/AppIcon';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { ACTIVE_TRIP_STATUSES, READY_FOR_CHECKOUT } from '../constants/appConfig';
import { formatDate } from '../utils/appHelpers';

function normalizeComparableText(value) {
  return String(value || '').trim().toLowerCase();
}

function vehicleMatchesTrip(vehicle, trip) {
  if (!vehicle || !trip) {
    return false;
  }

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
}

export default function TripsPage({
  mode,
  currentUserName,
  currentDriverId,
  currentDriverName,
  tripRecords,
  vehicleRecords,
  checkoutForm,
  checkinForm,
  selectedCheckoutTrip,
  selectedCheckinTrip,
  computedCheckinMileage,
  onCheckoutFieldChange,
  onCheckoutTripChange,
  onCheckoutSubmit,
  onCheckinFieldChange,
  onCheckinTripChange,
  onCheckinSubmit,
  onApproveTripTicket,
}) {
  const isGuard = mode === 'guard';
  const isDriver = mode === 'driver';
  const [detailTripId, setDetailTripId] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tripSearch, setTripSearch] = useState('');
  const [tripDateFrom, setTripDateFrom] = useState('');
  const [tripDateTo, setTripDateTo] = useState('');
  const tripsPerPage = 8;

  const detailTrip = useMemo(
    () => tripRecords.find((trip) => trip.id === detailTripId) || null,
    [detailTripId, tripRecords]
  );
  const selectedCheckoutVehicle = useMemo(() => {
    if (!selectedCheckoutTrip) {
      return null;
    }

    return vehicleRecords?.find((vehicle) => vehicleMatchesTrip(vehicle, selectedCheckoutTrip)) || null;
  }, [selectedCheckoutTrip, vehicleRecords]);
  const selectedCheckinVehicle = useMemo(() => {
    if (!selectedCheckinTrip) {
      return null;
    }

    return vehicleRecords?.find((vehicle) => vehicleMatchesTrip(vehicle, selectedCheckinTrip)) || null;
  }, [selectedCheckinTrip, vehicleRecords]);

  useEffect(() => {
    if (!detailTripId) {
      setDetailModalOpen(false);
      return;
    }

    if (!detailTrip) {
      setDetailTripId('');
      setDetailModalOpen(false);
    }
  }, [detailTrip, detailTripId]);

  function openTripDetails(trip) {
    setDetailTripId(trip.id);

    if (!isGuard && READY_FOR_CHECKOUT.includes(trip.tripStatus)) {
      onCheckoutTripChange(trip.id);
    }

    if (!isGuard && canCurrentUserReturnTrip(trip)) {
      onCheckinTripChange(trip.id);
    }

    setDetailModalOpen(true);
  }

  function closeTripDetails() {
    setDetailModalOpen(false);
    setDetailTripId('');
  }

  function normalizePersonName(value) {
    return normalizeComparableText(value)
      .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isTripAssignedToCurrentUser(trip) {
    if (!trip) {
      return false;
    }

    if (currentDriverId && trip.driverId && String(trip.driverId) === String(currentDriverId)) {
      return true;
    }

    const tripDriver = normalizePersonName(trip.driver);

    if (!tripDriver) {
      return false;
    }

    const candidateNames = [currentUserName, currentDriverName]
      .map((name) => normalizePersonName(name))
      .filter(Boolean);

    return candidateNames.some((name) => name === tripDriver);
  }

  function canCurrentUserReturnTrip(trip) {
    return ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)
      && (isDriver || isTripAssignedToCurrentUser(trip));
  }

  function getTripButtonConfig(trip) {
    if (isGuard) {
      return {
        icon: 'eye',
        label: 'View details',
        className: 'button button-secondary row-action-button trip-action-button',
      };
    }

    if (READY_FOR_CHECKOUT.includes(trip.tripStatus)) {
      return {
        icon: 'release',
        label: 'Release vehicle',
        className: 'button button-checkout row-action-button trip-action-button',
      };
    }

    if (canCurrentUserReturnTrip(trip)) {
      return {
        icon: 'return',
        label: 'Return vehicle',
        className: 'button button-return row-action-button trip-action-button',
      };
    }

    if (trip.tripStatus === 'Returned') {
      return {
        icon: 'check',
        label: 'Approve ticket',
        className: 'button button-primary row-action-button trip-action-button',
      };
    }

    return {
      icon: 'eye',
      label: 'View details',
      className: 'button button-secondary row-action-button trip-action-button',
    };
  }

  const detailMode = detailTrip
    ? isGuard
      ? 'history'
      : READY_FOR_CHECKOUT.includes(detailTrip.tripStatus)
      ? 'release'
      : canCurrentUserReturnTrip(detailTrip)
        ? 'return'
        : 'history'
    : null;

  const filteredTripRecords = useMemo(() => {
    const normalizedSearch = String(tripSearch || '').trim().toLowerCase();

    function getTripFilterDate(trip) {
      return (
        trip?.dateOut
        || trip?.actualReturnDatetime
        || trip?.expectedReturn
        || trip?.departureDatetime
        || trip?.createdAt
        || ''
      );
    }

    return tripRecords.filter((trip) => {
      const tripDate = String(getTripFilterDate(trip)).slice(0, 10);

      if (tripDateFrom && tripDate < tripDateFrom) {
        return false;
      }

      if (tripDateTo && tripDate > tripDateTo) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableFields = [
        trip?.requestNo,
        trip?.origin,
        trip?.destination,
        trip?.vehicle,
        trip?.driver,
        trip?.tripStatus,
        trip?.requestedBy,
        Array.isArray(trip?.passengerNames) ? trip.passengerNames.join(' ') : '',
      ];

      return searchableFields.some((value) =>
        String(value || '').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [tripDateFrom, tripDateTo, tripRecords, tripSearch]);

  const sortedTripRecords = useMemo(() => {
    function toSortableTimestamp(value) {
      const millis = new Date(value || '').getTime();
      return Number.isFinite(millis) ? millis : 0;
    }

    function getTripSortTimestamp(trip) {
      return toSortableTimestamp(
        trip?.dateOut
        || trip?.actualReturnDatetime
        || trip?.expectedReturn
        || trip?.departureDatetime
        || trip?.createdAt
      );
    }

    return [...filteredTripRecords].sort((left, right) => {
      const timestampDelta = getTripSortTimestamp(right) - getTripSortTimestamp(left);

      if (timestampDelta !== 0) {
        return timestampDelta;
      }

      const requestNoLeft = String(left?.requestNo || '');
      const requestNoRight = String(right?.requestNo || '');
      const requestNoDelta = requestNoRight.localeCompare(requestNoLeft);

      if (requestNoDelta !== 0) {
        return requestNoDelta;
      }

      return String(right?.id || '').localeCompare(String(left?.id || ''));
    });
  }, [filteredTripRecords]);

  const totalPages = Math.max(1, Math.ceil(sortedTripRecords.length / tripsPerPage));
  const paginatedTripRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * tripsPerPage;
    return sortedTripRecords.slice(startIndex, startIndex + tripsPerPage);
  }, [currentPage, sortedTripRecords]);
  const pageStart = sortedTripRecords.length === 0 ? 0 : (currentPage - 1) * tripsPerPage + 1;
  const pageEnd = Math.min(currentPage * tripsPerPage, sortedTripRecords.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tripSearch, tripDateFrom, tripDateTo]);

  function clearTripFilters() {
    setTripSearch('');
    setTripDateFrom('');
    setTripDateTo('');
  }

  const actionTrip = detailMode === 'release'
    ? selectedCheckoutTrip
    : detailMode === 'return'
      ? selectedCheckinTrip
      : detailTrip;

  return (
    <>
      {detailModalOpen && detailTrip && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close trip details"
            onClick={closeTripDetails}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Trip details">
            <section className="modal-card">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Trip details</p>
                  <h3>{detailTrip.requestNo}</h3>
                  <p className="modal-copy">
                    {isGuard
                      ? `${detailTrip.requestNo} | ${detailTrip.origin} | ${detailTrip.tripStatus}`
                      : `${detailTrip.vehicle} | ${detailTrip.driver} | ${detailTrip.origin} to ${detailTrip.destination}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={closeTripDetails}
                >
                  Close
                </button>
              </div>

              <div className="trip-action-shell">
                <div className="detail-panel trip-action-summary">
                  <div className="between-row trip-action-summary-head">
                    <div>
                      <strong>{detailTrip.requestNo}</strong>
                      <p>
                        {isGuard ? detailTrip.origin : `${detailTrip.vehicle} | ${detailTrip.driver}`}
                      </p>
                    </div>
                    <StatusBadge status={detailTrip.tripStatus} />
                  </div>
                  <div className="trip-action-meta">
                    {!isGuard && <span>Route: {detailTrip.origin} to {detailTrip.destination}</span>}
                    {isGuard && <span>Branch: {detailTrip.origin}</span>}
                    <span>Expected return: {formatDate(detailTrip.expectedReturn, true)}</span>
                    {isGuard && <span>Vehicle: {detailTrip.vehicle || 'Unknown vehicle'}</span>}
                    {isGuard && <span>Requested by: {detailTrip.requestedBy || 'Unknown'}</span>}
                    <span>
                      {detailTrip.dateOut
                        ? `Released: ${formatDate(detailTrip.dateOut, true)}`
                        : 'Vehicle has not been released yet.'}
                    </span>
                    {detailTrip.actualReturnDatetime && (
                      <span>Returned: {formatDate(detailTrip.actualReturnDatetime, true)}</span>
                    )}
                    {isGuard && (
                      <span>
                        Passengers: {Number(detailTrip.passengerCount || 0) <= 1
                          ? (detailTrip.driver || 'Unknown driver')
                          : (detailTrip.passengerNames?.length
                            ? detailTrip.passengerNames.join(', ')
                            : `${Math.max(0, Number(detailTrip.passengerCount || 0) - 1)} passenger(s)`)}
                      </span>
                    )}
                  </div>
                </div>

                {!isGuard && detailMode === 'release' && actionTrip && (
                  <form className="form-grid" onSubmit={onCheckoutSubmit}>
                    <div className="trip-action-info">
                      <span className="field-label">Date and time out</span>
                      <p>Captured automatically using real-time date and time when you click Release vehicle.</p>
                    </div>
                    {selectedCheckoutVehicle?.isOdoDefective ? (
                      <div className="trip-action-info">
                        <span className="field-label">Odometer out</span>
                        <p>Skipped for this vehicle (odometer disabled).</p>
                      </div>
                    ) : (
                      <label>
                        <span className="field-label">Odometer out</span>
                        <input
                          className="input"
                          type="number"
                          value={checkoutForm.odometerOut}
                          onChange={(event) => onCheckoutFieldChange('odometerOut', event.target.value)}
                          placeholder="Current odometer"
                        />
                      </label>
                    )}
                    <label>
                      <span className="field-label">Fuel level out</span>
                      <select
                        className="input"
                        value={checkoutForm.fuelOut}
                        onChange={(event) => onCheckoutFieldChange('fuelOut', event.target.value)}
                      >
                        <option>Full</option>
                        <option>7/8</option>
                        <option>3/4</option>
                        <option>1/2</option>
                      </select>
                    </label>
                    <div className="trip-action-info">
                      <span className="field-label">Assigned trip</span>
                      <p>{actionTrip.vehicle} is assigned to {actionTrip.driver}.</p>
                    </div>
                    <div className="full-span form-actions">
                      <button
                        type="submit"
                        className="button button-checkout button-solid"
                        disabled={!checkoutForm.tripId}
                      >
                        Release vehicle
                      </button>
                    </div>
                  </form>
                )}

                {!isGuard && detailMode === 'return' && actionTrip && (
                  <form className="form-grid" onSubmit={onCheckinSubmit}>
                    <div className="trip-action-info">
                      <span className="field-label">Date and time in</span>
                      <p>Captured automatically using real-time date and time when you click Return vehicle.</p>
                    </div>
                    {selectedCheckinVehicle?.isOdoDefective ? (
                      <div className="trip-action-info">
                        <span className="field-label">Odometer in</span>
                        <p>Skipped for this vehicle (odometer disabled).</p>
                      </div>
                    ) : (
                      <label>
                        <span className="field-label">Odometer in</span>
                        <input
                          className="input"
                          type="number"
                          value={checkinForm.odometerIn}
                          onChange={(event) => onCheckinFieldChange('odometerIn', event.target.value)}
                          placeholder={selectedCheckinTrip?.odometerOut ? `Above ${selectedCheckinTrip.odometerOut}` : 'Final odometer'}
                        />
                      </label>
                    )}
                    <label>
                      <span className="field-label">Fuel level in</span>
                      <select
                        className="input"
                        value={checkinForm.fuelIn}
                        onChange={(event) => onCheckinFieldChange('fuelIn', event.target.value)}
                      >
                        <option>Full</option>
                        <option>7/8</option>
                        <option>3/4</option>
                        <option>1/2</option>
                      </select>
                    </label>
                    <label>
                      <span className="field-label">Mileage</span>
                      <input
                        className="input"
                        value={selectedCheckinVehicle?.isOdoDefective ? 'Skipped (odometer disabled)' : computedCheckinMileage !== null ? `${computedCheckinMileage} km` : 'Pending'}
                        readOnly
                      />
                    </label>
                    <label className="full-span">
                      <span className="field-label">Return Remarks</span>
                      <textarea
                        className="input textarea"
                        placeholder="Add any observations or issues found during the trip..."
                        value={checkinForm.remarks}
                        onChange={(event) => onCheckinFieldChange('remarks', event.target.value)}
                      />
                    </label>
                    <div className="full-span form-actions">
                      <button
                        type="submit"
                        className="button button-return button-solid"
                        disabled={!checkinForm.tripId}
                      >
                        Return vehicle
                      </button>
                    </div>
                  </form>
                )}

                {detailMode === 'history' && (
                  <div className="detail-panel trip-action-info">
                    <span className="field-label">Trip summary</span>
                    {isGuard ? (
                      <p>
                        Status: {detailTrip.tripStatus} | Branch: {detailTrip.origin} | Expected return:{' '}
                        {formatDate(detailTrip.expectedReturn, true)}
                      </p>
                    ) : (
                      <p>
                        Odometer out: {detailTrip.odometerOut || '-'} | Odometer in:{' '}
                        {detailTrip.odometerIn || '-'} | Mileage:{' '}
                        {detailTrip.mileageComputed ? `${detailTrip.mileageComputed} km` : 'Pending'}
                      </p>
                    )}
                    {!isGuard && detailTrip.tripStatus === 'Returned' && (
                      <div className="form-actions" style={{ marginTop: '16px' }}>
                        <button
                          type="button"
                          className="button button-primary button-solid"
                          onClick={() => {
                            onApproveTripTicket(detailTrip);
                            setDetailModalOpen(false);
                          }}
                        >
                          Approve and Close Trip
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      <div className="content-grid-tight">
        <SectionCard
          title={isGuard ? 'Trip monitor' : 'Trip operations'}
          subtitle={isGuard ? 'Read-only branch trip status and passenger visibility' : 'One table for release, active, and returned trips'}
        >
          <div className="toolbar request-toolbar">
            <input
              className="input"
              value={tripSearch}
              onChange={(event) => setTripSearch(event.target.value)}
              placeholder={
                isGuard
                  ? 'Search request no, branch, driver, passenger, or status'
                  : 'Search request no, route, vehicle, driver, or status'
              }
            />
            <div className="request-filter-group">
              <label className="request-date-filter">
                <span className="field-label">From</span>
                <input
                  type="date"
                  className="input"
                  value={tripDateFrom}
                  onChange={(event) => setTripDateFrom(event.target.value)}
                />
              </label>
              <label className="request-date-filter">
                <span className="field-label">To</span>
                <input
                  type="date"
                  className="input"
                  value={tripDateTo}
                  onChange={(event) => setTripDateTo(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="button button-secondary request-filter-clear"
                onClick={clearTripFilters}
                disabled={!tripSearch && !tripDateFrom && !tripDateTo}
              >
                Clear filters
              </button>
            </div>
          </div>
          <div className="section-context-note">
            {isGuard
              ? 'Open any trip to view status, branch schedule, and passenger information. Operational controls are hidden in guard mode.'
              : 'Open any trip from the table to review details. Release and return fields only appear inside the detail view for actionable trips.'}
          </div>
          <div className="table-wrap trip-operations-table-wrap">
            <table className="data-table trip-operations-table">
              <thead>
                <tr>
                  {isGuard && <th>Status</th>}
                  <th>Request</th>
                  <th>{isGuard ? 'Passengers' : 'Vehicle and driver'}</th>
                  {!isGuard && <th>Status</th>}
                  <th>Timing</th>
                  <th>{isGuard ? 'Branch' : 'Mileage'}</th>
                  <th className="vehicle-actions-head">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedTripRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No trip records match your search or date filter.
                    </td>
                  </tr>
                )}
                {paginatedTripRecords.map((trip) => {
                  const buttonConfig = getTripButtonConfig(trip);
                  const isDriverOnlyPassenger = Number(trip.passengerCount || 0) <= 1;
                  const guardPassengerSummary = isDriverOnlyPassenger
                    ? ''
                    : (trip.passengerNames?.length
                      ? trip.passengerNames.join(', ')
                      : `${Math.max(0, Number(trip.passengerCount || 0) - 1)} passenger(s)`);
                  const guardDriverSummary = `Driver: ${trip.driver || 'Unknown driver'}`;

                  return (
                    <tr key={trip.id}>
                      {isGuard && (
                        <td data-label="Status" className="trip-status-cell">
                          <StatusBadge status={trip.tripStatus} />
                        </td>
                      )}
                      <td data-label="Request">
                        <div className="trip-request-head">
                          <strong>{trip.requestNo}</strong>
                          <span className="trip-request-mobile-status">
                            <StatusBadge status={trip.tripStatus} />
                          </span>
                        </div>
                        <span className="cell-subtle">
                          {isGuard ? `Expected return ${formatDate(trip.expectedReturn, true)}` : `${trip.origin} to ${trip.destination}`}
                        </span>
                        {isGuard && (
                          <span className="cell-subtle">Requested by {trip.requestedBy || 'Unknown'}</span>
                        )}
                        {isGuard && (
                          <span className="cell-subtle">Vehicle: {trip.vehicle || 'Unknown vehicle'}</span>
                        )}
                      </td>
                      <td data-label={isGuard ? 'Passengers' : 'Vehicle and driver'}>
                        {isGuard
                          ? guardDriverSummary
                          : trip.vehicle}
                        {(!isGuard || !isDriverOnlyPassenger) && (
                          <span className="cell-subtle">
                            {isGuard ? guardPassengerSummary : trip.driver}
                          </span>
                        )}
                      </td>
                      {!isGuard && (
                        <td data-label="Status" className="trip-status-cell">
                          <StatusBadge status={trip.tripStatus} />
                        </td>
                      )}
                      <td data-label="Timing">
                        <strong>{trip.dateOut ? `Out ${formatDate(trip.dateOut, true)}` : 'Not released yet'}</strong>
                        <span className="cell-subtle">Due {formatDate(trip.expectedReturn, true)}</span>
                        {trip.actualReturnDatetime && (
                          <span className="cell-subtle">Returned {formatDate(trip.actualReturnDatetime, true)}</span>
                        )}
                      </td>
                      <td data-label={isGuard ? 'Branch' : 'Mileage'}>
                        {isGuard ? trip.origin : (trip.mileageComputed ? `${trip.mileageComputed} km` : 'Pending')}
                        {!isGuard && (
                          <span className="cell-subtle">
                            {trip.odometerOut ? `Out ${trip.odometerOut}` : 'No check-out reading'}
                          </span>
                        )}
                      </td>
                      <td data-label="Action" className="vehicle-actions-cell">
                        <div className="row-actions">
                          <button
                            type="button"
                            className={buttonConfig.className}
                            onClick={() => openTripDetails(trip)}
                          >
                            <AppIcon name={buttonConfig.icon} className="button-icon" />
                            {buttonConfig.label}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="request-pagination">
            <p className="request-pagination-copy">
              {sortedTripRecords.length === 0
                ? 'No trip records to show'
                : `Showing ${pageStart}-${pageEnd} of ${sortedTripRecords.length} trips`}
            </p>
            <div className="request-pagination-actions">
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <span className="pagination-label-full">Previous</span>
                <span className="pagination-label-short">Prev</span>
              </button>
              <span className="request-page-indicator">
                <span className="request-page-indicator-full">Page {currentPage} of {totalPages}</span>
                <span className="request-page-indicator-short">{currentPage}/{totalPages}</span>
              </span>
              <button
                type="button"
                className="button button-secondary request-page-button pagination-nav-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
              >
                <span className="pagination-label-full">Next</span>
                <span className="pagination-label-short">Next</span>
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
