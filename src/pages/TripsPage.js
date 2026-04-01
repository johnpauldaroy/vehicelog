import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/AppIcon';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { ACTIVE_TRIP_STATUSES, READY_FOR_CHECKOUT } from '../constants/appConfig';
import { formatDate } from '../utils/appHelpers';

export default function TripsPage({
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
  const [detailTripId, setDetailTripId] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const detailTrip = useMemo(
    () => tripRecords.find((trip) => trip.id === detailTripId) || null,
    [detailTripId, tripRecords]
  );
  const selectedCheckoutVehicle = useMemo(() => {
    if (!selectedCheckoutTrip) {
      return null;
    }

    return vehicleRecords?.find(
      (vehicle) => vehicle.id === selectedCheckoutTrip.vehicleId || vehicle.vehicleName === selectedCheckoutTrip.vehicle
    ) || null;
  }, [selectedCheckoutTrip, vehicleRecords]);
  const selectedCheckinVehicle = useMemo(() => {
    if (!selectedCheckinTrip) {
      return null;
    }

    return vehicleRecords?.find(
      (vehicle) => vehicle.id === selectedCheckinTrip.vehicleId || vehicle.vehicleName === selectedCheckinTrip.vehicle
    ) || null;
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

    if (READY_FOR_CHECKOUT.includes(trip.tripStatus)) {
      onCheckoutTripChange(trip.id);
    }

    if (ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)) {
      onCheckinTripChange(trip.id);
    }

    setDetailModalOpen(true);
  }

  function closeTripDetails() {
    setDetailModalOpen(false);
    setDetailTripId('');
  }

  function getTripButtonConfig(trip) {
    if (READY_FOR_CHECKOUT.includes(trip.tripStatus)) {
      return {
        icon: 'release',
        label: 'Release vehicle',
        className: 'button button-primary row-action-button trip-action-button',
      };
    }

    if (ACTIVE_TRIP_STATUSES.includes(trip.tripStatus)) {
      return {
        icon: 'return',
        label: 'Return vehicle',
        className: 'button button-success row-action-button trip-action-button',
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
    ? READY_FOR_CHECKOUT.includes(detailTrip.tripStatus)
      ? 'release'
      : ACTIVE_TRIP_STATUSES.includes(detailTrip.tripStatus)
        ? 'return'
        : 'history'
    : null;

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
                    {detailTrip.vehicle} | {detailTrip.driver} | {detailTrip.origin} to{' '}
                    {detailTrip.destination}
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
                        {detailTrip.vehicle} | {detailTrip.driver}
                      </p>
                    </div>
                    <StatusBadge status={detailTrip.tripStatus} />
                  </div>
                  <div className="trip-action-meta">
                    <span>Route: {detailTrip.origin} to {detailTrip.destination}</span>
                    <span>Expected return: {formatDate(detailTrip.expectedReturn, true)}</span>
                    <span>
                      {detailTrip.dateOut
                        ? `Released: ${formatDate(detailTrip.dateOut, true)}`
                        : 'Vehicle has not been released yet.'}
                    </span>
                    {detailTrip.actualReturnDatetime && (
                      <span>Returned: {formatDate(detailTrip.actualReturnDatetime, true)}</span>
                    )}
                  </div>
                </div>

                {detailMode === 'release' && actionTrip && (
                  <form className="form-grid" onSubmit={onCheckoutSubmit}>
                    <label>
                      <span className="field-label">Date and time out</span>
                      <input
                        className="input"
                        type="datetime-local"
                        value={checkoutForm.dateOut}
                        onChange={(event) => onCheckoutFieldChange('dateOut', event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="field-label">
                        Odometer out
                        {selectedCheckoutVehicle?.isOdoDefective && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--brand-amber, #f59e0b)', fontWeight: '700', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: '99px' }}>DISABLED - NOT REQUIRED</span>
                        )}
                      </span>
                      <input
                        className="input"
                        type="number"
                        value={selectedCheckoutVehicle?.isOdoDefective ? '' : checkoutForm.odometerOut}
                        onChange={(event) => onCheckoutFieldChange('odometerOut', event.target.value)}
                        disabled={selectedCheckoutVehicle?.isOdoDefective}
                        placeholder={selectedCheckoutVehicle?.isOdoDefective ? 'Odometer disabled for this vehicle' : 'Current odometer'}
                      />
                    </label>
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
                    <label className="full-span">
                      <span className="field-label">Condition Notes</span>
                      <textarea
                        className="input textarea"
                        placeholder="Add additional notes about the vehicle condition..."
                        value={checkoutForm.conditionOut}
                        onChange={(event) => onCheckoutFieldChange('conditionOut', event.target.value)}
                      />
                    </label>
                    <div className="full-span form-actions">
                      <button
                        type="submit"
                        className="button button-primary button-solid"
                        disabled={!checkoutForm.tripId}
                      >
                        Release vehicle
                      </button>
                    </div>
                  </form>
                )}

                {detailMode === 'return' && actionTrip && (
                  <form className="form-grid" onSubmit={onCheckinSubmit}>
                    <label>
                      <span className="field-label">Date and time in</span>
                      <input
                        className="input"
                        type="datetime-local"
                        value={checkinForm.dateIn}
                        onChange={(event) => onCheckinFieldChange('dateIn', event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="field-label">
                        Odometer in
                        {selectedCheckinVehicle?.isOdoDefective && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--brand-amber, #f59e0b)', fontWeight: '700', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: '99px' }}>DISABLED - NOT REQUIRED</span>
                        )}
                      </span>
                      <input
                        className="input"
                        type="number"
                        value={selectedCheckinVehicle?.isOdoDefective ? '' : checkinForm.odometerIn}
                        onChange={(event) => onCheckinFieldChange('odometerIn', event.target.value)}
                        disabled={selectedCheckinVehicle?.isOdoDefective}
                        placeholder={selectedCheckinVehicle?.isOdoDefective ? 'Odometer disabled for this vehicle' : (selectedCheckinTrip?.odometerOut ? `Above ${selectedCheckinTrip.odometerOut}` : 'Final odometer')}
                      />
                    </label>
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
                        className="button button-success button-solid"
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
                    <p>
                      Odometer out: {detailTrip.odometerOut || '-'} | Odometer in:{' '}
                      {detailTrip.odometerIn || '-'} | Mileage:{' '}
                      {detailTrip.mileageComputed ? `${detailTrip.mileageComputed} km` : 'Pending'}
                    </p>
                    {detailTrip.tripStatus === 'Returned' && (
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
        <SectionCard title="Trip operations" subtitle="One table for release, active, and returned trips">
          <div className="section-context-note">
            Open any trip from the table to review details. Release and return fields only appear
            inside the detail view for actionable trips.
          </div>
          <div className="table-wrap trip-operations-table-wrap">
            <table className="data-table trip-operations-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Vehicle and driver</th>
                  <th>Status</th>
                  <th>Timing</th>
                  <th>Mileage</th>
                  <th className="vehicle-actions-head">Action</th>
                </tr>
              </thead>
              <tbody>
                {tripRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No trip records found.
                    </td>
                  </tr>
                )}
                {tripRecords.map((trip) => {
                  const buttonConfig = getTripButtonConfig(trip);

                  return (
                    <tr key={trip.id}>
                      <td data-label="Request">
                        <div className="trip-request-head">
                          <strong>{trip.requestNo}</strong>
                          <span className="trip-request-mobile-status">
                            <StatusBadge status={trip.tripStatus} />
                          </span>
                        </div>
                        <span className="cell-subtle">
                          {trip.origin} to {trip.destination}
                        </span>
                      </td>
                      <td data-label="Vehicle and driver">
                        {trip.vehicle}
                        <span className="cell-subtle">{trip.driver}</span>
                      </td>
                      <td data-label="Status" className="trip-status-cell">
                        <StatusBadge status={trip.tripStatus} />
                      </td>
                      <td data-label="Timing">
                        <strong>{trip.dateOut ? `Out ${formatDate(trip.dateOut, true)}` : 'Not released yet'}</strong>
                        <span className="cell-subtle">Due {formatDate(trip.expectedReturn, true)}</span>
                        {trip.actualReturnDatetime && (
                          <span className="cell-subtle">Returned {formatDate(trip.actualReturnDatetime, true)}</span>
                        )}
                      </td>
                      <td data-label="Mileage">
                        {trip.mileageComputed ? `${trip.mileageComputed} km` : 'Pending'}
                        <span className="cell-subtle">
                          {trip.odometerOut ? `Out ${trip.odometerOut}` : 'No check-out reading'}
                        </span>
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
        </SectionCard>
      </div>
    </>
  );
}
