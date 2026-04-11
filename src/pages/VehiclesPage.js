import { useEffect, useState } from 'react';
import AppIcon from '../components/AppIcon';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import {
  daysUntil,
  formatDate,
  formatStatusLabel,
  getLatestActivityTimestamp,
} from '../utils/appHelpers';

export default function VehiclesPage({
  vehicleFilter,
  setVehicleFilter,
  vehicleBranchFilter,
  setVehicleBranchFilter,
  vehicleBranchOptions,
  filteredVehicles,
  selectedVehicle,
  selectedVehicleTrips,
  selectedVehicleMaintenance,
  onSelectVehicle,
}) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [pendingVehicleId, setPendingVehicleId] = useState('');
  const latestTrip = selectedVehicleTrips[0] || null;
  const latestMaintenance = selectedVehicleMaintenance[0] || null;

  useEffect(() => {
    if (!selectedVehicle) {
      setDetailModalOpen(false);
      setPendingVehicleId('');
      return;
    }

    if (pendingVehicleId && selectedVehicle.id === pendingVehicleId) {
      setDetailModalOpen(true);
      setPendingVehicleId('');
    }
  }, [pendingVehicleId, selectedVehicle]);

  function handleOpenVehicleDetails(vehicleId) {
    onSelectVehicle(vehicleId);

    if (selectedVehicle?.id === vehicleId) {
      setDetailModalOpen(true);
      setPendingVehicleId('');
      return;
    }

    setPendingVehicleId(vehicleId);
  }

  function handleCloseVehicleDetails() {
    setDetailModalOpen(false);
    setPendingVehicleId('');
  }

  return (
    <>
      {detailModalOpen && selectedVehicle && (
        <>
          <button
            type="button"
            className="app-backdrop modal-backdrop"
            aria-label="Close vehicle details"
            onClick={handleCloseVehicleDetails}
          />
          <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Vehicle details">
            <section className="modal-card vehicle-detail-modal">
              <div className="modal-head">
                <div>
                  <p className="eyebrow">Vehicle details</p>
                  <h3>{selectedVehicle.vehicleName}</h3>
                  <p className="modal-copy">
                    {selectedVehicle.plateNumber} | {selectedVehicle.branch} | {selectedVehicle.type}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary modal-close"
                  onClick={handleCloseVehicleDetails}
                >
                  Close
                </button>
              </div>

              <div className="detail-panel vehicle-detail-modal-panel">
                <div className="detail-hero">
                  <div className="detail-icon">VH</div>
                  <div>
                    <h4>{selectedVehicle.vehicleName}</h4>
                    <p>
                      {selectedVehicle.plateNumber} | {selectedVehicle.branch}
                    </p>
                  </div>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Fuel type</dt>
                    <dd>{selectedVehicle.fuelType}</dd>
                  </div>
                  <div>
                    <dt>Capacity</dt>
                    <dd>{selectedVehicle.seatingCapacity} seats</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge status={selectedVehicle.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Latest trip</dt>
                    <dd>{latestTrip ? latestTrip.destination : 'No trip recorded yet'}</dd>
                  </div>
                </dl>

                <div className="stack-list">
                  <strong>Recent activity</strong>
                  {latestTrip ? (
                    <div className="list-row">
                      <div>
                        <strong>{latestTrip.tripStatus}</strong>
                        <p>
                          {latestTrip.requestNo} | {latestTrip.driver}
                        </p>
                      </div>
                      <span>{formatDate(getLatestActivityTimestamp(latestTrip), true)}</span>
                    </div>
                  ) : (
                    <div className="list-row">
                      <div>
                        <strong>No recent trip</strong>
                        <p>This vehicle has no dispatch history yet.</p>
                      </div>
                    </div>
                  )}
                  {latestMaintenance ? (
                    <div className="list-row">
                      <div>
                        <strong>{latestMaintenance.status}</strong>
                        <p>{latestMaintenance.maintenanceType}</p>
                      </div>
                      <span>{formatDate(latestMaintenance.completedDate || latestMaintenance.scheduleDate)}</span>
                    </div>
                  ) : (
                    <div className="list-row">
                      <div>
                        <strong>No maintenance update</strong>
                        <p>No service activity is recorded for this vehicle.</p>
                      </div>
                    </div>
                  )}
                  <div className="list-row">
                    <div>
                      <strong>Document watch</strong>
                      <p>
                        Insurance in {daysUntil(selectedVehicle.insuranceExpiry)} days. Registration in{' '}
                        {daysUntil(selectedVehicle.registrationExpiry)} days.
                      </p>
                    </div>
                    <span>{selectedVehicle.odometerCurrent.toLocaleString()} km</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      <div className="content-grid-tight">
        <SectionCard title="Fleet list" subtitle="Filtered results for the selected status and branch">
          <div className="toolbar">
            <div className="chip-row">
              {['all', 'available', 'reserved', 'in_use', 'maintenance', 'inactive'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`chip-button ${vehicleFilter === filter ? 'chip-button-active' : ''}`}
                  onClick={() => setVehicleFilter(filter)}
                >
                  {formatStatusLabel(filter)}
                </button>
              ))}
            </div>
            <div className="toolbar-controls">
              <div className="toolbar-control-group">
                <label className="toolbar-label" htmlFor="vehicle-branch-filter">Branch</label>
                <select
                  id="vehicle-branch-filter"
                  className="input"
                  value={vehicleBranchFilter}
                  onChange={(event) => setVehicleBranchFilter(event.target.value)}
                >
                  <option value="">All branches</option>
                  {vehicleBranchOptions.map((branchName) => (
                    <option key={branchName} value={branchName}>
                      {branchName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Vehicle</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Odometer</th>
                  <th>Expiry watch</th>
                  <th className="vehicle-actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No vehicles match the current filters.
                    </td>
                  </tr>
                )}
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.plateNumber}</td>
                    <td>
                      {vehicle.vehicleName}
                      <span className="cell-subtle">
                        {vehicle.type} | {vehicle.assignedDriver}
                      </span>
                    </td>
                    <td>{vehicle.branch}</td>
                    <td>
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td>{vehicle.odometerCurrent.toLocaleString()} km</td>
                    <td>
                      Reg {formatDate(vehicle.registrationExpiry)}
                      <span className="cell-subtle">Ins {formatDate(vehicle.insuranceExpiry)}</span>
                    </td>
                    <td className="vehicle-actions-cell">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button button-secondary row-action-button"
                          onClick={() => handleOpenVehicleDetails(vehicle.id)}
                        >
                          <AppIcon name="eye" className="button-icon" />
                          View details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
